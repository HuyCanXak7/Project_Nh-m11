/**
 * LOGIC ĐIỀU HƯỚNG VÀ TIỆN ÍCH DÙNG CHUNG CỦA ỨNG DỤNG (APP COMMON)
 * Phụ trách: FE Huỳnh Nhơn Nguyên Nghiệp
 */

document.addEventListener('DOMContentLoaded', () => {
  initAppUser();
  highlightActiveNav();
});

function initAppUser() {
  const student = { ...StorageService.getStudent() };
  // Ưu tiên tên của tài khoản đang đăng nhập (session.js)
  const sessionUser = typeof getSession === 'function' ? getSession()?.user : null;
  if (sessionUser?.fullName) student.name = sessionUser.fullName;
  const nameEl = document.getElementById('navStudentName');
  const idEl = document.getElementById('navStudentId');
  const avatarEl = document.getElementById('navStudentAvatar');

  if (nameEl) nameEl.textContent = student.name || 'Sinh viên';
  if (idEl) idEl.textContent = student.student_id ? `MSSV: ${student.student_id}` : '';
  if (avatarEl) {
    if (student.avatar_url) {
      avatarEl.innerHTML = `<img src="${student.avatar_url}" alt="Avatar" class="app-user__avatar-img">`;
    } else {
      const parts = (student.name || 'Sinh viên').trim().split(' ').filter(Boolean);
      const initials = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'SV');
      avatarEl.innerHTML = initials;
    }
  }
}

function highlightActiveNav() {
  const path = window.location.pathname.toLowerCase();
  const links = document.querySelectorAll('.app-nav__link, .mobile-nav__item');
  links.forEach(link => {
    const href = link.getAttribute('href')?.toLowerCase() || '';
    if (href && path.endsWith(href)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function handleLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
    logout(); // session.js: thu hồi refresh token, xóa phiên (PB-03)
  }
}

function handleResetData() {
  if (confirm('Khôi phục lại toàn bộ dữ liệu mẫu ban đầu (Học kỳ, Môn học, Điểm số)?')) {
    StorageService.resetToDefault();
    showToast('Đã khôi phục dữ liệu mẫu ban đầu thành công!');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  }
}

// Bật tắt Toast thông báo nhanh
function showToast(msg, isError = false) {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 999;
      background: var(--text-dark, #1E293B);
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

  toast.style.background = isError ? 'var(--error, #E53E3E)' : 'var(--primary, #3B82F6)';
  toast.innerHTML = isError ? `${msg}` : `${msg}`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
  }, 2800);
}

// Helper đóng modal
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

function openAppModal(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return;
  el.style.display = 'flex';
  requestAnimationFrame(() => {
    el.classList.add('is-open');
  });
}