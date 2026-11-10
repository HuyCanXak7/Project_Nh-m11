/*
 * Khung trang có sidebar (Trang chủ, Thống kê): header, sidebar, menu tài khoản.
 * Thứ tự nạp: session.js → app_shell.js → script riêng của trang.
 * (app_common.js là của trang Học kỳ / Môn học, dùng thanh menu ngang)
 */

/* ===== Tiện ích ===== */
const $ = (id) => document.getElementById(id);

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/** Hiển thị chênh lệch: ▲ +0.12 (xanh) hoặc ▼ -0.12 (đỏ) */
function trendHtml(delta, digits = 2, unit = '') {
    if (delta === null || delta === undefined) return '';
    const up = delta >= 0;
    const sign = up ? '+' : '-';
    const value = Math.abs(delta).toFixed(digits);
    return `<span class="trend trend--${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${sign}${value}${unit}</span>`;
}

/* ===== Header: tên + avatar người dùng đang đăng nhập ===== */
function renderUser(user) {
    if (!user) return;
    const name = user.fullName || user.email;
    // Trang chủ có lời chào "Xin chào, ...", các trang khác thì không
    if ($('userName')) $('userName').textContent = name;
    $('userChipName').textContent = name;
    const lastWord = name.trim().split(/\s+/).pop() || '?';
    $('userAvatar').textContent = lastWord.charAt(0).toUpperCase();
}

/* ===== Sidebar trên mobile ===== */
function setupSidebar() {
    const sidebar = $('sidebar');
    const overlay = $('sidebarOverlay');
    const toggle = $('menuToggle');

    const setOpen = (open) => {
        sidebar.classList.toggle('is-open', open);
        overlay.hidden = !open;
        toggle.setAttribute('aria-expanded', open);
    };

    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
    overlay.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

/* ===== Menu tài khoản (Xem thông tin / Đăng xuất) ===== */
function setupUserMenu() {
    const menu = $('userMenu');
    const toggle = $('userMenuToggle');
    const list = $('userMenuList');

    const setOpen = (open) => {
        list.hidden = !open;
        toggle.setAttribute('aria-expanded', open);
        if (open) list.querySelector('[role="menuitem"]')?.focus();
    };

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(list.hidden);
    });

    // Click ra ngoài menu thì đóng
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !list.hidden) {
            setOpen(false);
            toggle.focus();
        }
    });

    $('logoutBtn').addEventListener('click', logout); // logout() nằm trong session.js
}

/**
 * Gắn header, sidebar, menu tài khoản; gọi một lần ở đầu mỗi trang.
 * Trả về false nếu chưa đăng nhập (requireAuth() trong <head> đã chuyển trang) để trang dừng lại.
 */
function initAppShell() {
    const session = getSession();
    if (!session) return false;

    renderUser(session.user);
    setupSidebar();
    setupUserMenu();

    // Hỏi BE phiên còn hợp lệ không: access hết hạn thì tự refresh,
    // tài khoản bị khóa (is_active = false) thì bị đăng xuất ngay.
    const verify = () => authApi.me().then(renderUser).catch(() => {});
    verify();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') verify();
    });
    return true;
}