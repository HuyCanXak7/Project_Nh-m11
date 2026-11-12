/*
 * Khung trang có sidebar (StudyTrack layout): header, sidebar, menu tài khoản.
 * Dùng chung cho TOÀN BỘ các trang trong ứng dụng theo thiết kế Figma.
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
    const name = user.fullName || user.name || user.email || 'Sinh viên';
    
    // Trang chủ có lời chào "Xin chào, ...", các trang khác thì không
    if ($('userName')) $('userName').textContent = name;
    if ($('userChipName')) $('userChipName').textContent = name;
    
    // Ảnh đại diện: nếu có upload ảnh thì hiển thị ảnh tròn, nếu chưa có thì hiển thị chữ cái viết tắt
    const avatarEl = $('userAvatar');
    if (avatarEl) {
        let avatarUrl = user.avatar_url;
        if (!avatarUrl && typeof StorageService !== 'undefined') {
            const student = StorageService.getStudent();
            if (student && student.avatar_url) avatarUrl = student.avatar_url;
        }
        
        if (avatarUrl) {
            avatarEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            const parts = name.trim().split(/\s+/).filter(Boolean);
            const initials = parts.length > 1 
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() 
                : (parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'SV');
            avatarEl.textContent = initials;
        }
    }
}

/* ===== Tự động đánh dấu mục đang xem trên thanh điều hướng sidebar ===== */
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

/* ===== Sidebar trên mobile ===== */
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

/* ===== Menu tài khoản (Xem thông tin / Đăng xuất) ===== */
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

    const logoutBtn = $('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/* ===== Bảng xác nhận tùy biến (thay cho confirm() của trình duyệt) ===== */
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
    document.querySelector('.modal-overlay')?.remove();

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

/* ===== Khôi phục dữ liệu mẫu ban đầu ===== */
function handleResetData() {
    showConfirm({
        danger: true,
        tittle: "Khôi phục dự án",
        message: "Bạn có chắc là muốn khôi phục dữ liệu về ban đầu?",
        confirmText: "Khôi phục",
        canelText: "Hủy",
        onConfirm: () => {
            if (typeof StorageService !== 'undefined') {
                StorageService.resetToDefault();
            }
            showToast('Đã khôi phục dữ liệu về ban đầu thành công!');
            setTimeout(() => {
                window.location.reload();
            }, 1200);
        }
    })
}

/* ===== Toast thông báo nhanh ===== */
function showToast(msg, isError = false) {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 9999;
            background: #1E293B;
            color: #fff;
            padding: 12px 20px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 10px 25px rgba(0,0,0,0.25);
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

    toast.style.background = isError ? '#DC2626' : '#2563EB';
    toast.innerHTML = isError ? `${escapeHtml(msg)}` : `${escapeHtml(msg)}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
    }, 2800);
}

/**
 * Gắn header, sidebar, menu tài khoản; gọi một lần ở đầu mỗi trang.
 */
function initAppShell() {
    let session = typeof getSession === 'function' ? getSession() : null;
    let user = session?.user;
    
    if (!user && typeof StorageService !== 'undefined') {
        const student = StorageService.getStudent();
        if (student) {
            user = {
                fullName: student.name || 'Huỳnh Nhơn Nguyên Nghiệp',
                email: student.email || 'nghiephn25@gmail.com',
                avatar_url: student.avatar_url || ''
            };
        }
    }
    
    if (!user) {
        user = { fullName: 'Huỳnh Nhơn Nguyên Nghiệp', email: 'nghiephn25@gmail.com' };
    }

    renderUser(user);
    setupSidebar();
    setupUserMenu();
    highlightActiveSidebar();

    // Đồng bộ nếu có authApi
    if (session && typeof authApi !== 'undefined' && authApi.me) {
        authApi.me().then(renderUser).catch(() => {});
    }
    return true;
}

// Tự động khởi tạo khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    initAppShell();
});
