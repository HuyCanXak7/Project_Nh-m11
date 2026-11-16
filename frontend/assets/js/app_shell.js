/*
 * Khung trang StudyTrack-E (Editorial Swiss Grid Layout - Figma node-id=0-1 / 13-5):
 * Thanh điều hướng ngang đánh số (01 Tổng quan, 02 Môn học, 03 Học kỳ, 04 Thống kê, 05 Mục tiêu, 06 Nhập điểm),
 * cụm ngày tháng + tìm kiếm + thông báo + menu tài khoản ở góc phải trên cùng.
 */

const $ = (id) => document.getElementById(id);

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
    return div.innerHTML;
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
            <span>StudyTrack</span>
        `;
    }

    // 2. Menu ngang đánh số chuẩn Figma
    const nav = sidebar.querySelector('.sidebar__nav');
    if (nav) {
        nav.innerHTML = `
            <a href="dashboard.html" class="nav-item"><span class="nav-item__num">01</span><span>Tổng quan</span></a>
            <a href="courses.html" class="nav-item"><span class="nav-item__num">02</span><span>Môn học</span></a>
            <a href="semesters.html" class="nav-item"><span class="nav-item__num">03</span><span>Học kỳ</span></a>
            <a href="statistics.html" class="nav-item"><span class="nav-item__num">04</span><span>Thống kê</span></a>
            <a href="goals.html" class="nav-item"><span class="nav-item__num">05</span><span>Mục tiêu</span></a>
            <a href="import.html" class="nav-item"><span class="nav-item__num">06</span><span>Nhập điểm</span></a>
            <a href="transcript.html" class="nav-item"><span class="nav-item__num">07</span><span>Bảng điểm</span></a>
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
        <button type="button" class="topbar-icon-btn" title="Tìm kiếm môn học" onclick="window.location.href='courses.html'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7.5"/><line x1="20" y1="20" x2="16.2" y2="16.2"/></svg>
        </button>
        <button type="button" class="topbar-icon-btn" title="Thông báo" onclick="showToast('Không có thông báo mới')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4Z"/><path d="M10 21a2.5 2.5 0 0 0 4 0"/></svg>
            <span class="topbar-icon-btn__dot"></span>
        </button>
        <div class="topbar-user-wrap" id="topbarUserWrap"></div>
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
            avatarEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
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
        onConfirm: () => {
            if (typeof StorageService !== 'undefined') {
                StorageService.resetToDefault();
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

    toast.style.background = isError ? '#DC2626' : '#0F1F38';
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
    }, 2800);
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
    setupSidebar();
    setupUserMenu();
    highlightActiveSidebar();

    if (session && typeof authApi !== 'undefined' && authApi.me) {
        authApi.me().then(renderUser).catch(() => {});
    }
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    initAppShell();
});
