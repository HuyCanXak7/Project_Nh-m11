/*
 * Phiên đăng nhập (PB-01, PB-02, PB-03) — dùng cho MỌI trang.
 *
 *  - Lưu access/refresh token: "Nhớ tài khoản" → localStorage (giữ 7 ngày), không tick → sessionStorage.
 *  - apiFetch(): tự gắn access token; gặp 401 thì tự refresh rồi gửi lại; refresh hỏng → về trang đăng nhập.
 *  - 403 ACCOUNT_DISABLED (is_active = false) → xóa phiên, báo tài khoản bị khóa.
 *  - 429 TOO_MANY_ATTEMPTS → trả retryAfter để trang đăng nhập khóa nút.
 *  - requireAuth() / redirectIfLoggedIn(): chặn route.
 *
 * Khi BE xong: đổi USE_MOCK = false và chỉnh API_BASE. Định dạng lỗi theo PB-41: { code, message, details }.
 */

const API_BASE = 'http://localhost:8000/api/v1';
const USE_MOCK = true;

const SESSION_KEY = 'session';
const FLASH_KEY = 'authFlash';

const MESSAGES = {
    invalid: 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.',
    disabled: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
    expired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    network: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
};

class ApiError extends Error {
    constructor(status, code, message, details = {}) {
        super(message || code);
        this.status = status;     // 0 = lỗi mạng
        this.code = code;
        this.details = details;
    }
}

/* =========================================================
 * Lưu phiên
 * ========================================================= */
function getSession() {
    for (const store of [sessionStorage, localStorage]) {
        try {
            const raw = store.getItem(SESSION_KEY);
            if (raw) return JSON.parse(raw);
        } catch {
            store.removeItem(SESSION_KEY);
        }
    }
    return null;
}

/** tokens = phản hồi từ /auth/login hoặc /auth/refresh: { accessToken, refreshToken, expiresIn, refreshExpiresIn, user } */
function toSession(tokens, previous = {}) {
    const now = Date.now();
    return {
        accessToken: tokens.accessToken,
        accessExpiresAt: now + tokens.expiresIn * 1000,
        refreshToken: tokens.refreshToken ?? previous.refreshToken,
        refreshExpiresAt: tokens.refreshExpiresIn ? now + tokens.refreshExpiresIn * 1000 : previous.refreshExpiresAt,
        user: tokens.user ?? previous.user,
        remember: previous.remember,
    };
}

function saveSession(session) {
    clearSession();
    const store = session.remember ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
    // Xóa cả các key cũ từ bản mock trước để không còn phiên "ma"
    ['session', 'accessToken', 'refreshToken', 'user', 'currentUser'].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
}

/** Thông báo một lần, hiện ở trang đăng nhập sau khi bị đẩy ra */
function setFlash(message) {
    sessionStorage.setItem(FLASH_KEY, message);
}

function popFlash() {
    const message = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    return message;
}

/* =========================================================
 * Chặn route
 * ========================================================= */

/* Trang đăng nhập (index.html) nằm ở gốc frontend/, các trang còn lại nằm trong
 * frontend/pages/. session.js được dùng chung cho cả hai mức nên phải tự tính
 * đường dẫn điều hướng theo vị trí trang hiện tại. */
const inPagesDir = () => /\/pages\//.test(window.location.pathname);
const loginPath = () => (inPagesDir() ? '../index.html' : 'index.html');
const dashboardPath = () => (inPagesDir() ? 'dashboard.html' : 'pages/dashboard.html');

/** Gọi ở đầu các trang cần đăng nhập. Trả về user, hoặc null (đã chuyển về trang đăng nhập). */
function requireAuth() {
    const session = getSession();
    if (session && session.refreshExpiresAt > Date.now()) return session.user;

    if (session) setFlash(MESSAGES.expired);
    clearSession();
    window.location.replace(loginPath());
    return null;
}

/** Gọi ở trang đăng nhập / đăng ký: đã đăng nhập rồi thì vào thẳng Dashboard */
function redirectIfLoggedIn() {
    const session = getSession();
    if (session && session.refreshExpiresAt > Date.now()) {
        window.location.replace(dashboardPath());
    }
}

/** Kết thúc phiên: xóa token, báo lý do, về trang đăng nhập */
function endSession(message) {
    clearSession();
    if (message) setFlash(message);
    window.location.replace(loginPath());
    throw new ApiError(401, 'SESSION_ENDED', message);
}

/* =========================================================
 * Gọi API
 * ========================================================= */
async function request(path, { method = 'GET', body, token } = {}) {
    if (USE_MOCK) return mockServer.handle(method, path, body, token);

    let res;
    try {
        res = await fetch(API_BASE + path, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError(0, 'NETWORK_ERROR', MESSAGES.network);
    }

    const json = await res.json().catch(() => ({}));
    // BE bọc mọi response trong { success, message, data, error: { code, details } }
    const err = json.error || json;
    if (!res.ok) {
        const retryAfter = Number(res.headers.get('Retry-After')) || err.details?.retryAfter;
        throw new ApiError(res.status, err.code, json.message, { ...err.details, retryAfter });
    }
    return 'success' in json ? json.data : json;
}

// Nhiều request cùng gặp 401 thì chỉ refresh MỘT lần
let refreshing = null;

function refreshTokens() {
    refreshing ??= (async () => {
        const session = getSession();
        if (!session) throw new ApiError(401, 'NO_SESSION');
        const tokens = await request('/auth/refresh', { method: 'POST', body: { refreshToken: session.refreshToken } });
        const next = toSession(tokens, session);
        saveSession(next);
        return next.accessToken;
    })().finally(() => { refreshing = null; });
    return refreshing;
}

async function refreshOrEnd() {
    try {
        return await refreshTokens();
    } catch (err) {
        if (err.status === 0) throw err; // mất mạng: giữ phiên, báo lỗi bình thường
        return endSession(err.code === 'ACCOUNT_DISABLED' ? MESSAGES.disabled : MESSAGES.expired);
    }
}

/**
 * Gọi API cần đăng nhập. Ví dụ: const data = await apiFetch('/statistics');
 * Tự refresh access token khi sắp/đã hết hạn.
 */
async function apiFetch(path, options = {}) {
    const session = getSession();
    if (!session) return endSession(MESSAGES.expired);

    // Access token còn dưới 10 giây thì refresh trước cho chắc
    let token = session.accessExpiresAt - 10_000 > Date.now() ? session.accessToken : await refreshOrEnd();

    try {
        return await request(path, { ...options, token });
    } catch (err) {
        if (err.status === 403 && err.code === 'ACCOUNT_DISABLED') return endSession(MESSAGES.disabled);
        if (err.status !== 401) throw err;
        token = await refreshOrEnd();
        return request(path, { ...options, token });
    }
}

/* =========================================================
 * API xác thực
 * ========================================================= */
const authApi = {
    async register({ email, fullName, password }) {
        return request('/auth/register', { method: 'POST', body: { email, fullName, password } });
    },

    async login({ email, password, remember }) {
        const tokens = await request('/auth/login', { method: 'POST', body: { email, password } });
        const session = toSession(tokens, { remember });
        saveSession(session);
        return session.user;
    },

    /** Kiểm tra phiên còn hợp lệ không (token còn hạn, tài khoản chưa bị khóa) */
    async me() {
        const user = await apiFetch('/auth/me');
        const session = getSession();
        if (session) saveSession({ ...session, user });
        return user;
    },

    /** Đổi mật khẩu (PB-05 / T0694E4): xác thực mật khẩu cũ, băm mật khẩu mới và thu hồi refresh token cũ */
    async changePassword({ currentPassword, newPassword }) {
        const res = await apiFetch('/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword },
        });
        const session = getSession();
        if (session && res && res.accessToken && res.refreshToken) {
            saveSession(toSession(res, session));
        }
        return res;
    },
};

/** Đăng xuất (PB-03): thu hồi refresh token ở BE rồi xóa phiên phía client */
async function logout() {
    const session = getSession();
    if (session) {
        try {
            await request('/auth/logout', { method: 'POST', body: { refreshToken: session.refreshToken }, token: session.accessToken });
        } catch {
            // BE lỗi vẫn cho đăng xuất ở client
        }
    }
    clearSession();
    window.location.replace(loginPath()); // replace: bấm Back không quay lại được
}

/* =========================================================
 * BE GIẢ (chỉ dùng khi USE_MOCK = true) — mô phỏng đúng tiêu chí PB-01/PB-02
 * Dữ liệu nằm trong localStorage key "mockDb". Mật khẩu lưu dạng băm SHA-256
 * (BE thật dùng bcrypt), không lưu mật khẩu thô.
 * ========================================================= */
const mockServer = (() => {
    const DB_KEY = 'mockDb';
    const CONFIG = {
        accessTtl: 15 * 60,              // 15 phút
        refreshTtl: 7 * 24 * 60 * 60,    // 7 ngày
        maxAttempts: 5,                  // sai 5 lần...
        attemptWindow: 15 * 60,          // ...trong 15 phút
        lockSeconds: 60,                 // → khóa 60 giây (để demo; BE thật tự quyết)
        latency: 400,
    };

    const now = () => Date.now();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
    const fail = (status, code, message, details) => { throw new ApiError(status, code, message, details); };

    async function hash(email, password) {
        const bytes = new TextEncoder().encode(`${email.toLowerCase()}:${password}`);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    }

    function load() {
        let db;
        try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch { db = null; }
        db ??= { users: [], refreshTokens: {}, accessTokens: {}, attempts: {} };
        return db;
    }

    const save = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db));

    /** Chuyển tài khoản từ bản mock cũ (registeredUsers, mật khẩu thô) sang mockDb (đã băm) */
    async function migrateLegacy(db) {
        const legacy = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        for (const u of legacy) {
            if (!db.users.some((x) => x.email === u.email)) {
                db.users.push({ id: randomToken(), email: u.email, fullName: u.username, passwordHash: await hash(u.email, u.password), isActive: true });
            }
        }
        localStorage.removeItem('registeredUsers');
    }

    function issueTokens(db, user) {
        const accessToken = randomToken();
        const refreshToken = randomToken();
        db.accessTokens[accessToken] = { userId: user.id, expiresAt: now() + CONFIG.accessTtl * 1000 };
        db.refreshTokens[refreshToken] = { userId: user.id, expiresAt: now() + CONFIG.refreshTtl * 1000, revoked: false };
        return {
            accessToken,
            refreshToken,
            expiresIn: CONFIG.accessTtl,
            refreshExpiresIn: CONFIG.refreshTtl,
            user: { id: user.id, email: user.email, fullName: user.fullName },
        };
    }

    function userFromAccess(db, token) {
        const entry = db.accessTokens[token];
        if (!entry || entry.expiresAt <= now()) fail(401, 'TOKEN_EXPIRED', 'Access token hết hạn');
        const user = db.users.find((u) => u.id === entry.userId);
        if (!user) fail(401, 'TOKEN_INVALID', 'Token không hợp lệ');
        if (!user.isActive) fail(403, 'ACCOUNT_DISABLED', MESSAGES.disabled);
        return user;
    }

    const routes = {
        async 'POST /auth/register'(db, { email, fullName, password }) {
            if (db.users.some((u) => u.email === email)) fail(409, 'EMAIL_EXISTS', 'Email này đã được sử dụng');
            if (!password || password.length < 8) fail(400, 'VALIDATION_ERROR', 'Mật khẩu phải có ít nhất 8 kí tự');
            const user = { id: randomToken(), email, fullName, passwordHash: await hash(email, password), isActive: true };
            db.users.push(user);
            return { id: user.id, email, fullName };
        },

        async 'POST /auth/login'(db, { email, password }) {
            const key = email.toLowerCase();
            const attempt = db.attempts[key] ?? { count: 0, firstAt: now(), lockedUntil: 0 };

            if (attempt.lockedUntil > now()) {
                fail(429, 'TOO_MANY_ATTEMPTS', 'Bạn đã đăng nhập sai quá nhiều lần.', { retryAfter: Math.ceil((attempt.lockedUntil - now()) / 1000) });
            }

            const user = db.users.find((u) => u.email.toLowerCase() === key);
            const ok = user && user.passwordHash === await hash(email, password);

            if (!ok) {
                // Đếm cả email không tồn tại → không lộ email nào có trong hệ thống
                if (now() - attempt.firstAt > CONFIG.attemptWindow * 1000) Object.assign(attempt, { count: 0, firstAt: now() });
                attempt.count += 1;
                if (attempt.count >= CONFIG.maxAttempts) {
                    Object.assign(attempt, { count: 0, firstAt: now(), lockedUntil: now() + CONFIG.lockSeconds * 1000 });
                }
                db.attempts[key] = attempt;
                fail(401, 'INVALID_CREDENTIALS', MESSAGES.invalid);
            }

            delete db.attempts[key];
            // Chỉ báo khóa SAU khi đúng mật khẩu, để không lộ thông tin tài khoản
            if (!user.isActive) fail(403, 'ACCOUNT_DISABLED', MESSAGES.disabled);
            return issueTokens(db, user);
        },

        async 'POST /auth/refresh'(db, { refreshToken }) {
            const entry = db.refreshTokens[refreshToken];
            if (!entry || entry.revoked || entry.expiresAt <= now()) fail(401, 'REFRESH_INVALID', MESSAGES.expired);
            const user = db.users.find((u) => u.id === entry.userId);
            if (!user) fail(401, 'REFRESH_INVALID', MESSAGES.expired);
            if (!user.isActive) fail(403, 'ACCOUNT_DISABLED', MESSAGES.disabled);
            entry.revoked = true; // xoay vòng: refresh token cũ chỉ dùng được 1 lần
            return issueTokens(db, user);
        },

        async 'POST /auth/logout'(db, { refreshToken }) {
            if (db.refreshTokens[refreshToken]) db.refreshTokens[refreshToken].revoked = true;
            return { ok: true };
        },

        async 'GET /auth/me'(db, body, token) {
            const user = userFromAccess(db, token);
            return { id: user.id, email: user.email, fullName: user.fullName };
        },

        async 'POST /auth/change-password'(db, { currentPassword, newPassword }, token) {
            const user = userFromAccess(db, token);
            if (!currentPassword || user.passwordHash !== await hash(user.email, currentPassword)) {
                fail(400, 'INVALID_PASSWORD', 'Mật khẩu hiện tại không đúng.');
            }
            if (!newPassword || newPassword.length < 8) {
                fail(400, 'VALIDATION_ERROR', 'Mật khẩu mới phải có ít nhất 8 ký tự.');
            }
            if (newPassword === currentPassword) {
                fail(400, 'VALIDATION_ERROR', 'Mật khẩu mới không được trùng với mật khẩu hiện tại.');
            }

            // Băm mật khẩu mới khi lưu và thu hồi toàn bộ refresh token cũ của tài khoản
            user.passwordHash = await hash(user.email, newPassword);
            Object.values(db.refreshTokens).forEach((entry) => {
                if (entry.userId === user.id) entry.revoked = true;
            });

            return issueTokens(db, user);
        },
    };

    async function handle(method, path, body = {}, token) {
        await sleep(CONFIG.latency);
        const route = routes[`${method} ${path}`];
        if (!route) throw new ApiError(404, 'NOT_FOUND', `Mock chưa có ${method} ${path}`);
        const db = load();
        await migrateLegacy(db);
        try {
            return await route(db, body, token);
        } finally {
            save(db); // lưu cả khi lỗi (để đếm số lần đăng nhập sai)
        }
    }

    /** Công cụ kiểm thử, gõ trong Console của DevTools */
    const tools = {
        users: () => console.table(load().users.map(({ email, fullName, isActive }) => ({ email, fullName, isActive }))),
        /** Mô phỏng cờ is_active trong DB: mockAuth.setActive('a@gmail.com', false) */
        setActive(email, active) {
            const db = load();
            const user = db.users.find((u) => u.email === email);
            if (!user) return console.warn('Không có tài khoản - session.js:378', email);
            user.isActive = active;
            save(db);
            console.info(`${email}: is_active = ${active} - session.js:381`);
        },
        /** Cho access token hết hạn ngay → lần gọi API tới sẽ tự refresh */
        expireAccess() {
            const db = load();
            Object.values(db.accessTokens).forEach((t) => { t.expiresAt = 0; });
            save(db);
            const s = getSession();
            if (s) saveSession({ ...s, accessExpiresAt: 0 });
            console.info('Đã cho access token hết hạn - session.js:390');
        },
        /** Cho cả refresh token hết hạn → bị đưa về trang đăng nhập */
        expireRefresh() {
            const db = load();
            Object.values(db.refreshTokens).forEach((t) => { t.expiresAt = 0; });
            Object.values(db.accessTokens).forEach((t) => { t.expiresAt = 0; });
            save(db);
            const s = getSession();
            if (s) saveSession({ ...s, accessExpiresAt: 0 });
            console.info('Đã cho refresh token hết hạn - session.js:400');
        },
        reset() {
            localStorage.removeItem(DB_KEY);
            clearSession();
            console.info('Đã xóa toàn bộ dữ liệu mock - session.js:405');
        },
    };

    return { handle, tools };
})();

if (USE_MOCK) window.mockAuth = mockServer.tools;