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

/* ===== Đăng xuất ===== */
function handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
        if (typeof logout === 'function') {
            logout();
        } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('session');
            sessionStorage.removeItem('session');
            window.location.replace('index.html');
        }
    }
}

/* ===== Khôi phục dữ liệu mẫu ban đầu ===== */
function handleResetData() {
    if (confirm('Khôi phục lại toàn bộ dữ liệu mẫu ban đầu (Học kỳ, Môn học, Điểm số)?')) {
        if (typeof StorageService !== 'undefined') {
            StorageService.resetToDefault();
        }
        showToast('Đã khôi phục dữ liệu mẫu ban đầu thành công!');
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
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
    toast.innerHTML = isError ? `⚠️ ${escapeHtml(msg)}` : `✅ ${escapeHtml(msg)}`;
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
