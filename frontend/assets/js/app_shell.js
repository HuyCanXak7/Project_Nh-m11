/*
 * Khung trang StudyTrack-E (Editorial Swiss Grid Layout - Figma node-id=0-1 / 13-5):
 * Thanh điều hướng ngang đánh số (01 Tổng quan, 02 Môn học, 03 Học kỳ, 04 Thống kê, 05 Mục tiêu, 06 Nhập điểm),
 * cụm ngày tháng + tìm kiếm + thông báo + menu tài khoản ở góc phải trên cùng.
 */

const $ = (id) => document.getElementById(id);

const THEME_STORAGE_KEY = 'studytrack_theme';

function getSavedTheme() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('theme-dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (document.body) {
        document.body.classList.toggle('theme-dark', isDark);
    }

    const btn = $('themeToggleBtn');
    if (btn) {
        btn.setAttribute('aria-pressed', String(isDark));
        btn.title = isDark ? 'Chuyển sang giao diện sáng' : 'Bật giao diện tối (Dark Mode)';
        btn.innerHTML = isDark
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }

    const menuLabel = $('themeMenuLabel');
    if (menuLabel) {
        menuLabel.textContent = isDark ? 'Giao diện sáng' : 'Giao diện tối';
    }
}

function playThemeTransitionAnimation(nextTheme, onSwitchMidpoint) {
    if (typeof document === 'undefined' || !document.body) {
        onSwitchMidpoint();
        return;
    }

    document.getElementById('themeTransitionOverlay')?.remove();
    document.documentElement.classList.add('theme-transitioning');

    const overlay = document.createElement('div');
    overlay.id = 'themeTransitionOverlay';
    overlay.setAttribute('aria-hidden', 'true');

    if (nextTheme === 'light') {
        // Chuyển Tối -> Sáng: Mặt trời từ góc dưới-trái bay xéo lên góc trên-phải kéo màn đen qua
        overlay.innerHTML = `
            <div class="theme-curtain-dark"></div>
            <div class="theme-sun-orb">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
                    <circle cx="12" cy="12" r="4.5"/>
                    <path d="M12 1.5v2.5M12 20v2.5M4.57 4.57l1.77 1.77M17.66 17.66l1.77 1.77M1.5 12H4M20 12h2.5M4.57 19.43l1.77-1.77M17.66 6.34l1.77-1.77"/>
                </svg>
            </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(onSwitchMidpoint, 220);
        setTimeout(() => {
            overlay.remove();
            document.documentElement.classList.remove('theme-transitioning');
        }, 980);
    } else {
        // Chuyển Sáng -> Tối: Màn sao từ trên rơi xuống dưới kèm hiệu ứng mờ chuyển mượt
        const veil = document.createElement('div');
        veil.className = 'theme-night-veil';
        overlay.appendChild(veil);

        const starCount = 34;
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('span');
            const isStreak = i % 4 === 0;
            star.className = isStreak ? 'theme-star theme-star--streak' : 'theme-star';
            if (!isStreak) {
                star.textContent = i % 3 === 0 ? '✦' : '★';
                star.style.fontSize = `${10 + (i % 4) * 3}px`;
            }
            star.style.left = `${(i * 3.1 + (i % 5) * 2.7) % 98}%`;
            star.style.setProperty('--delay', `${(i % 7) * 0.045}s`);
            star.style.setProperty('--dur', `${0.68 + (i % 4) * 0.09}s`);
            overlay.appendChild(star);
        }

        document.body.appendChild(overlay);
        setTimeout(onSwitchMidpoint, 390);
        setTimeout(() => {
            overlay.remove();
            document.documentElement.classList.remove('theme-transitioning');
        }, 1020);
    }
}

function toggleTheme() {
    const next = getSavedTheme() === 'dark' ? 'light' : 'dark';
    try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch { /* ignore */ }

    playThemeTransitionAnimation(next, () => {
        applyTheme(next);
        if (typeof showToast === 'function') {
            showToast(next === 'dark' ? 'Đã bật giao diện tối (Dark Mode)' : 'Đã chuyển sang giao diện sáng');
        }
    });
}

applyTheme(getSavedTheme());

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = str;
    // Mã hóa cả dấu nháy để an toàn khi giá trị được đặt trong attribute HTML.
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Hiển thị chênh lệch chuẩn Figma StudyTrack-E: +0.04 hoặc -0.04 */
function trendHtml(delta, digits = 2, unit = '') {
    if (delta === null || delta === undefined) return '';
    const up = delta >= 0;
    const sign = up ? '+' : '-';
    const value = Math.abs(delta).toFixed(digits);
    return `<span class="trend trend--${up ? 'up' : 'down'}">${sign}${value}${unit}</span>`;
}

function formatTopbarDate() {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${days[now.getDay()]}, ${dd}.${mm}.${yyyy}`;
}

/* ===== Chuẩn hóa Thanh Topbar Ngang theo Figma StudyTrack-E ===== */
function upgradeSidebarFigma() {
    const sidebar = $('sidebar');
    if (!sidebar) return;

    // 1. Logo 2 ô vuông (Navy + Mint) + StudyTrack
    const logo = sidebar.querySelector('.sidebar__logo');
    if (logo) {
        logo.innerHTML = `
            <span class="sidebar__logo-squares" aria-hidden="true">
                <i class="sidebar__logo-sq sidebar__logo-sq--navy"></i>
                <i class="sidebar__logo-sq sidebar__logo-sq--mint"></i>
            </span>
            <span>StudyLIMS</span>
        `;
    }

    // 2. Menu ngang đánh số chuẩn Figma
    const nav = sidebar.querySelector('.sidebar__nav');
    if (nav) {
        // Chỉ ADMIN thấy link quản lý tài khoản (PB-29)
        const isAdmin = typeof getSession === 'function' && getSession()?.user?.role === 'ADMIN';
        nav.innerHTML = `
            <a href="dashboard.html" class="nav-item"><span class="nav-item__num">01</span><span>Tổng quan</span></a>
            <a href="courses.html" class="nav-item"><span class="nav-item__num">02</span><span>Môn học</span></a>
            <a href="semesters.html" class="nav-item"><span class="nav-item__num">03</span><span>Học kỳ</span></a>
            <a href="statistics.html" class="nav-item"><span class="nav-item__num">04</span><span>Thống kê</span></a>
            <a href="goals.html" class="nav-item"><span class="nav-item__num">05</span><span>Mục tiêu</span></a>
            <a href="import.html" class="nav-item"><span class="nav-item__num">06</span><span>Nhập điểm</span></a>
            <a href="transcript.html" class="nav-item"><span class="nav-item__num">07</span><span>Bảng điểm</span></a>
            ${isAdmin ? '<a href="admin-user.html" class="nav-item"><span class="nav-item__num">08</span><span>Tài khoản</span></a>' : ''}
        `;
    }

    // 3. Cụm tiện ích bên phải thanh Topbar (Ngày, Tìm kiếm, Chuông, User Menu)
    let rightBox = sidebar.querySelector('.topbar-right');
    if (!rightBox) {
        rightBox = document.createElement('div');
        rightBox.className = 'topbar-right';
        sidebar.appendChild(rightBox);
    }

    const userMenu = $('userMenu');
    // Ẩn nút Khôi phục / Dữ liệu mẫu và chuông thông báo thừa dưới header để header khớp 100% Figma
    document.querySelectorAll('.dash-header__actions > .icon-btn, .dash-header__actions > .btn-reset').forEach(btn => {
        btn.style.display = 'none';
    });

    rightBox.innerHTML = `
        <span class="topbar-date">${formatTopbarDate()}</span>
        <button type="button" class="topbar-icon-btn" id="topbarSearchBtn" title="Tìm kiếm nhanh (Ctrl+K)" aria-label="Tìm kiếm nhanh" onclick="openGlobalSearchModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7.5"/><line x1="20" y1="20" x2="16.2" y2="16.2"/></svg>
        </button>
        <button type="button" class="topbar-icon-btn" title="Thông báo" onclick="showToast('Không có thông báo mới')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4Z"/><path d="M10 21a2.5 2.5 0 0 0 4 0"/></svg>
            <span class="topbar-icon-btn__dot"></span>
        </button>
        <div class="topbar-user-wrap" id="topbarUserWrap"></div>
        <button type="button" class="theme-toggle-icon-btn" id="themeToggleBtn" title="Bật giao diện tối (Dark Mode)" aria-label="Bật hoặc tắt giao diện tối" aria-pressed="false" onclick="toggleTheme()"></button>
    `;

    const wrap = rightBox.querySelector('#topbarUserWrap');
    if (wrap && userMenu) {
        wrap.appendChild(userMenu);
        // Bổ sung liên kết nhanh trong menu tài khoản
        const menuList = userMenu.querySelector('#userMenuList');
        if (menuList && !menuList.dataset.upgraded) {
            menuList.dataset.upgraded = 'true';
            menuList.innerHTML = `
                <li role="none">
                    <a href="profile.html" class="user-menu__item" role="menuitem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                        Hồ sơ cá nhân
                    </a>
                </li>
                <li role="none">
                    <a href="schedule.html" class="user-menu__item" role="menuitem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
                        Thời khóa biểu
                    </a>
                </li>
                <li role="none">
                    <a href="transcript.html" class="user-menu__item" role="menuitem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Bảng điểm & In A4
                    </a>
                </li>
                <li role="none">
                    <button type="button" class="user-menu__item" onclick="toggleTheme()" role="menuitem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                        <span id="themeMenuLabel">Giao diện tối</span>
                    </button>
                </li>
                <li role="none">
                    <button type="button" class="user-menu__item" onclick="handleResetData()" role="menuitem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
                        Khôi phục dữ liệu mẫu
                    </button>
                </li>
                <li role="none">
                    <button type="button" class="user-menu__item user-menu__item--danger" id="logoutBtn" role="menuitem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                        Đăng xuất
                    </button>
                </li>
            `;
        }
    }

    applyTheme(getSavedTheme());
}

function refreshSidebarGoalWidget() {}

/* ===== Header: tên + avatar người dùng đang đăng nhập ===== */
function renderUser(user) {
    if (!user) return;
    const student = (typeof StorageService !== 'undefined') ? StorageService.getStudent() : null;
    const name = user.fullName || user.name || student?.name || user.email || 'Nguyễn Văn A';

    if ($('userName')) $('userName').textContent = name;
    if ($('userChipName')) $('userChipName').textContent = name;

    const avatarEl = $('userAvatar');
    if (avatarEl) {
        let avatarUrl = user.avatar_url || student?.avatar_url;
        if (avatarUrl) {
            // Tạo phần tử ảnh bằng DOM để URL không thể phá vỡ cấu trúc HTML.
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = 'Avatar';
            avatarEl.replaceChildren(img);
        } else {
            const parts = name.trim().split(/\s+/).filter(Boolean);
            const initials = parts.length > 0
                ? parts[parts.length - 1][0].toUpperCase()
                : 'A';
            avatarEl.textContent = initials;
        }
    }
}

/* ===== Tự động đánh dấu mục đang xem trên thanh điều hướng ===== */
function highlightActiveSidebar() {
    const path = window.location.pathname.toLowerCase();
    const items = document.querySelectorAll('.sidebar__nav .nav-item');
    items.forEach(item => {
        const href = item.getAttribute('href')?.toLowerCase() || '';
        if (href && href !== '#' && (path.endsWith('/' + href) || path.endsWith(href))) {
            item.classList.add('is-active');
            item.setAttribute('aria-current', 'page');
        } else if (href && href !== '#') {
            item.classList.remove('is-active');
            item.removeAttribute('aria-current');
        }
    });
}

/* ===== Menu trên mobile ===== */
function setupSidebar() {
    const sidebar = $('sidebar');
    const overlay = $('sidebarOverlay');
    const toggle = $('menuToggle');

    if (!sidebar || !toggle) return;

    const setOpen = (open) => {
        sidebar.classList.toggle('is-open', open);
        if (overlay) overlay.hidden = !open;
        toggle.setAttribute('aria-expanded', open);
    };

    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
    if (overlay) overlay.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

/* ===== Menu tài khoản ===== */
function setupUserMenu() {
    const menu = $('userMenu');
    const toggle = $('userMenuToggle');
    const list = $('userMenuList');

    if (!menu || !toggle || !list) return;

    const setOpen = (open) => {
        list.hidden = !open;
        toggle.setAttribute('aria-expanded', open);
        if (open) list.querySelector('[role="menuitem"]')?.focus();
    };

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(list.hidden);
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !list.hidden) {
            setOpen(false);
            toggle.focus();
        }
    });

    const logoutBtn = $('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/* ===== Bảng xác nhận tùy biến ===== */
function showConfirm({
    type = 'confirm',
    title = 'Xác nhận',
    message = '',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    danger = false,
    icon,
    onConfirm,
} = {}) {
    document.querySelector('.modal-overlay:not([id])')?.remove();

    const defaultIcon = danger
        ? '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>'
        : '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>';
    const svgIcon = icon || defaultIcon;
    const variant = danger ? 'danger' : type;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal modal--${variant}" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
            <div class="modal__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                    stroke-linecap="round" stroke-linejoin="round">${svgIcon}</svg>
            </div>
            <h3 class="modal__title" id="confirmTitle"></h3>
            <p class="modal__message"></p>
            <div class="modal__actions">
                <button type="button" class="modal__btn modal__btn--ghost" data-action="cancel"></button>
                <button type="button" class="modal__btn ${danger ? 'modal__btn--danger' : ''}" data-action="confirm"></button>
            </div>
        </div>`;

    overlay.querySelector('.modal__title').textContent = title;
    overlay.querySelector('.modal__message').textContent = message;
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;

    const close = () => {
        overlay.classList.remove('is-open');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => overlay.remove(), 200);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };

    cancelBtn.addEventListener('click', close);
    confirmBtn.addEventListener('click', () => {
        close();
        onConfirm?.();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    confirmBtn.focus();
}

/* ===== Đăng xuất ===== */
function handleLogout() {
    showConfirm({
        danger: true,
        title: 'Đăng xuất',
        message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
        confirmText: 'Đăng xuất',
        cancelText: 'Ở lại',
        onConfirm: () => {
            if (typeof logout === 'function') {
                logout();
            } else {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('session');
                sessionStorage.removeItem('session');
                window.location.replace('../index.html');
            }
        },
    });
}

/* ===== Nạp dữ liệu mẫu ===== */
function handleResetData() {
    showConfirm({
        danger: false,
        title: 'Khôi phục dữ liệu mẫu',
        message: 'Bạn có muốn khôi phục bộ dữ liệu mẫu 4 học kỳ chuẩn thiết kế để trải nghiệm đầy đủ biểu đồ và bảng điểm không?',
        confirmText: 'Khôi phục',
        cancelText: 'Hủy',
        onConfirm: async () => {
            if (typeof StorageService === 'undefined') return;
            showToast('Đang nạp dữ liệu mẫu lên máy chủ...');
            try {
                await StorageService.resetToDefault();
            } catch (err) {
                showToast(err.message || 'Không nạp được dữ liệu mẫu.', true);
                return;
            }
            showToast('Đã khôi phục dữ liệu mẫu thành công!');
            setTimeout(() => {
                window.location.reload();
            }, 900);
        }
    });
}

/* ===== Quản lý Modal dùng chung (openAppModal & closeAppModal) ===== */
function openAppModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.style.display = 'flex';
    requestAnimationFrame(() => {
        el.classList.add('is-open');
    });
}

function closeAppModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.remove('is-open');
    setTimeout(() => {
        if (!el.classList.contains('is-open')) {
            el.style.display = 'none';
        }
    }, 200);
}

document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
        if (e.target.id) {
            closeAppModal(e.target.id);
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal-overlay.is-open');
        if (openModal && openModal.id) {
            closeAppModal(openModal.id);
        }
    }
});

/* ===== Toast thông báo nhanh ===== */
function showToast(msg, isError = false) {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.style.cssText = `
            position: fixed;
            top: 64px;
            right: 24px;
            z-index: 9999;
            background: #0F1F38;
            color: #fff;
            padding: 11px 18px;
            border-radius: 0;
            font-size: 13px;
            font-weight: 700;
            box-shadow: 0 10px 25px rgba(15, 31, 56, 0.22);
            display: flex;
            align-items: center;
            gap: 10px;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.25s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }

    const isDark = document.documentElement.classList.contains('theme-dark');
    toast.style.background = isError ? '#DC2626' : (isDark ? '#1E293B' : '#0F1F38');
    toast.style.color = '#FFFFFF';
    toast.style.border = isError
        ? '1px solid #FCA5A5'
        : (isDark ? '1px solid #3EE09B' : '1px solid rgba(255,255,255,0.18)');
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
    }, 2800);
}

/* ===== ADMIN đang xem dữ liệu của tài khoản khác: banner + nút thoát ===== */
function renderAdminViewBanner() {
    const target = typeof StorageService !== 'undefined' && StorageService.adminViewAs?.();
    const main = document.querySelector('main.dash');
    if (!target || !main) return;
    const bar = document.createElement('div');
    bar.className = 'app-card no-print';
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'margin: 0 0 16px; padding: 12px 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; border: 2px solid var(--warning, #F5A623);';
    bar.innerHTML = `<span style="flex: 1;">Quản trị: đang xem và chỉnh sửa dữ liệu của <strong>${escapeHtml(target.email)}</strong></span>
        <a href="admin-user.html" class="btn btn-secondary btn-sm">Thoát, về danh sách tài khoản</a>`;
    main.querySelector('.dash-header')?.after(bar) ?? main.prepend(bar);
}

/* ===== PB-31: cảnh báo học tập (GPA kỳ < 2.0 hoặc có môn rớt) — vẽ lại mỗi lần dữ liệu tải lại ===== */
function renderAcademicWarnings() {
    document.getElementById('academicWarnings')?.remove();
    const main = document.querySelector('main.dash');
    if (!main || typeof StorageService === 'undefined' || typeof GradeCalculator === 'undefined') return;
    const warnings = GradeCalculator.getAcademicWarnings(StorageService.getSemesters(), StorageService.getCourses());
    if (warnings.length === 0) return;

    const bar = document.createElement('div');
    bar.id = 'academicWarnings';
    bar.className = 'app-card no-print';
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'margin: 0 0 16px; padding: 12px 20px; border: 2px solid var(--error, #EF4444);';
    bar.innerHTML = `<strong style="color: var(--error, #EF4444);">Cảnh báo học tập</strong>
        <ul style="margin: 6px 0 0 18px;">${warnings.map(w => `<li>${escapeHtml(w.message)}</li>`).join('')}</ul>`;
    const header = main.querySelector('.dash-header');
    if (header) header.after(bar);
    else main.prepend(bar);
}

function initAppShell() {
    if (typeof StorageService !== 'undefined' && typeof StorageService.init === 'function') {
        StorageService.init();
    }

    upgradeSidebarFigma();

    let session = typeof getSession === 'function' ? getSession() : null;
    let user = session?.user;

    if (!user && typeof StorageService !== 'undefined') {
        const student = StorageService.getStudent();
        if (student && (student.name || student.email)) {
            user = {
                fullName: student.name || 'Nguyễn Văn A',
                email: student.email || '',
                avatar_url: student.avatar_url || ''
            };
        }
    }

    if (!user) {
        user = { fullName: 'Nguyễn Văn A', email: '' };
    }

    renderUser(user);
    renderAdminViewBanner();
    setupSidebar();
    setupUserMenu();
    highlightActiveSidebar();

    if (session && typeof StorageService !== 'undefined') {
        StorageService.ready.then(renderAcademicWarnings);
    }

    if (session && typeof authApi !== 'undefined' && authApi.me) {
        authApi.me().then(renderUser).catch(() => {});
    }
    return true;
}

/* ===== Tìm kiếm nhanh toàn hệ thống (Kính lúp Topbar & Ctrl+K) ===== */
function normalizeSearchText(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

function openGlobalSearchModal() {
    document.getElementById('globalSearchOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'globalSearchOverlay';
    overlay.className = 'modal-overlay is-open';
    overlay.innerHTML = `
        <div class="modal global-search-modal" role="dialog" aria-modal="true" aria-label="Tìm kiếm nhanh">
            <div class="global-search__head">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7.5"/><line x1="20" y1="20" x2="16.2" y2="16.2"/></svg>
                <input type="text" id="globalSearchInput" class="global-search__input" placeholder="Tìm mã môn, tên môn học, học kỳ hoặc trang..." autocomplete="off">
                <button type="button" id="globalSearchClose" class="global-search__close" aria-label="Đóng tìm kiếm">✕</button>
            </div>
            <div class="global-search__results" id="globalSearchResults"></div>
        </div>
    `;

    const close = () => {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
    };
    const onKey = (e) => {
        if (e.key === 'Escape') close();
    };

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#globalSearchClose').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#globalSearchInput');
    const resultsEl = overlay.querySelector('#globalSearchResults');

    const pages = [
        { title: '01 Tổng quan', sub: 'Dashboard GPA & Tiến độ học tập', href: 'dashboard.html' },
        { title: '02 Môn học', sub: 'Quản lý môn học, trọng số & điểm thành phần', href: 'courses.html' },
        { title: '03 Học kỳ', sub: 'Danh sách & thời gian các học kỳ', href: 'semesters.html' },
        { title: '04 Thống kê', sub: 'Biểu đồ GPA & phân bố điểm chữ', href: 'statistics.html' },
        { title: '05 Mục tiêu', sub: 'Đặt mục tiêu GPA & mô phỏng What-If', href: 'goals.html' },
        { title: '06 Nhập điểm', sub: 'Nhập điểm từ tệp CSV / Excel (.xlsx)', href: 'import.html' },
        { title: '07 Bảng điểm', sub: 'Xem bảng điểm tổng hợp, xuất CSV/Excel & In A4', href: 'transcript.html' },
        { title: 'Hồ sơ cá nhân', sub: 'Thông tin sinh viên, ảnh đại diện & đổi mật khẩu', href: 'profile.html' }
    ];

    const renderResults = (query) => {
        const q = normalizeSearchText(query).trim();
        const courses = (typeof StorageService !== 'undefined' && StorageService.getCourses) ? StorageService.getCourses() : [];
        const semesters = (typeof StorageService !== 'undefined' && StorageService.getSemesters) ? StorageService.getSemesters() : [];
        const semMap = Object.fromEntries(semesters.map(s => [s.id, s]));

        const matchedCourses = courses.filter(c => {
            if (!q) return true;
            return normalizeSearchText(c.course_code).includes(q) ||
                   normalizeSearchText(c.course_name).includes(q) ||
                   normalizeSearchText(c.category).includes(q);
        }).slice(0, q ? 10 : 5);

        const matchedPages = pages.filter(p => !q || normalizeSearchText(p.title + ' ' + p.sub).includes(q)).slice(0, 5);

        let html = '';
        if (matchedCourses.length > 0) {
            html += `<div class="global-search__section">Môn học (${matchedCourses.length})</div>`;
            html += matchedCourses.map(c => {
                const sem = semMap[c.semester_id];
                const semLabel = sem ? `${sem.name} ${sem.academic_year || ''}` : 'Chưa phân kỳ';
                const targetUrl = `courses.html?semId=${encodeURIComponent(c.semester_id || '')}&q=${encodeURIComponent(c.course_code || c.course_name || '')}`;
                return `
                    <button type="button" class="global-search__item" data-course-code="${escapeHtml(c.course_code)}" data-sem-id="${escapeHtml(c.semester_id || '')}" data-href="${targetUrl}">
                        <span class="global-search__code">${escapeHtml(c.course_code)}</span>
                        <span class="global-search__meta">
                            <strong>${escapeHtml(c.course_name)}</strong>
                            <small>${escapeHtml(semLabel)} · ${c.credits} TC</small>
                        </span>
                        <span class="global-search__go">Mở →</span>
                    </button>
                `;
            }).join('');
        }

        if (matchedPages.length > 0) {
            html += `<div class="global-search__section">Trang chức năng</div>`;
            html += matchedPages.map(p => `
                <a href="${p.href}" class="global-search__item">
                    <span class="global-search__code">TRANG</span>
                    <span class="global-search__meta">
                        <strong>${escapeHtml(p.title)}</strong>
                        <small>${escapeHtml(p.sub)}</small>
                    </span>
                    <span class="global-search__go">Đi tới →</span>
                </a>
            `).join('');
        }

        if (!html) {
            html = `<div class="global-search__empty">Không tìm thấy môn học hoặc trang nào khớp với "${escapeHtml(query)}".</div>`;
        }

        resultsEl.innerHTML = html;

        resultsEl.querySelectorAll('button.global-search__item').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.courseCode || '';
                const semId = btn.dataset.semId || '';
                const href = btn.dataset.href;
                const searchInputOnPage = document.getElementById('searchCourseInput');
                const semFilterOnPage = document.getElementById('filterSemester');
                if (searchInputOnPage && typeof renderCourses === 'function') {
                    if (semFilterOnPage && semId) semFilterOnPage.value = semId;
                    searchInputOnPage.value = code;
                    if (typeof renderSemesterTabs === 'function') renderSemesterTabs();
                    if (typeof handleFilterChange === 'function') handleFilterChange();
                    close();
                    searchInputOnPage.focus();
                } else {
                    window.location.href = href;
                }
            });
        });
    };

    input.addEventListener('input', () => renderResults(input.value));
    renderResults('');
    if (typeof StorageService !== 'undefined') StorageService.ready.then(() => renderResults(input.value));
    setTimeout(() => input.focus(), 30);
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openGlobalSearchModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initAppShell();
});

// Chuyển trang mượt: bấm link trong sidebar / menu tài khoản thì nội dung trượt ra rồi mới điều hướng
document.addEventListener('click', (e) => {
    const link = e.target.closest('.sidebar a[href], .user-menu a[href]');
    if (!link || link.getAttribute('href').startsWith('#') || link.target === '_blank') return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // mở tab mới thì để mặc định
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(() => { location.href = link.href; }, 200);
});
// Bấm Back (trang lấy từ bfcache) thì bỏ trạng thái đang rời trang
window.addEventListener('pageshow', (e) => {
    if (e.persisted) document.body.classList.remove('page-leaving');
});
