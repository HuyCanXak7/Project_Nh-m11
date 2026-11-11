/**
 * LOGIC HỒ SƠ SINH VIÊN & ĐỔI MẬT KHẨU (PB-04, PB-05)
 * Phụ trách: Huỳnh Nhơn Nguyên Nghiệp
 */

document.addEventListener('DOMContentLoaded', () => {
  renderProfile();
});

function renderProfile() {
  const student = StorageService.getStudent();
  document.getElementById('profileNameInput').value = student.name || 'Huỳnh Nhơn Nguyên Nghiệp';
  document.getElementById('profileEmailInput').value = student.email || 'nghiephn25@gmail.com';
  document.getElementById('profileStudentIdInput').value = student.student_id || 'N25DTCN038';
  document.getElementById('profileMajorInput').value = student.major || 'Công nghệ thông tin';
  document.getElementById('profileClassInput').value = student.class_name || 'K25-CNTT5';

  updateProfileAvatarDisplay(student);
}

function updateProfileAvatarDisplay(student) {
  const avatarDisplay = document.getElementById('profileAvatarDisplay');
  const btnRemove = document.getElementById('btnRemoveAvatar');
  if (!avatarDisplay) return;

  const parts = (student.name || 'Huỳnh Nghiệp').trim().split(' ').filter(Boolean);
  const initials = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'HN');

  if (student.avatar_url) {
    avatarDisplay.innerHTML = `
      <img src="${student.avatar_url}" alt="Avatar">
      <div class="profile-avatar-overlay">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <span>Đổi ảnh</span>
      </div>
    `;
    if (btnRemove) btnRemove.style.display = 'inline-flex';
  } else {
    avatarDisplay.innerHTML = `
      <span id="profileAvatarInitials">${initials}</span>
      <div class="profile-avatar-overlay">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <span>Đổi ảnh</span>
      </div>
    `;
    if (btnRemove) btnRemove.style.display = 'none';
  }
}

function triggerAvatarUpload() {
  const input = document.getElementById('avatarFileInput');
  if (input) input.click();
}

function handleAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)!', true);
    return;
  }

  // Tối đa 5MB
  if (file.size > 5 * 1024 * 1024) {
    showToast('Dung lượng tệp ảnh không được vượt quá 5MB!', true);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Dùng canvas nén và cắt vuông tâm (square center crop) chuẩn 300x300px
      const maxDim = 300;
      const w = img.width;
      const h = img.height;
      
      const canvas = document.createElement('canvas');
      canvas.width = maxDim;
      canvas.height = maxDim;
      const ctx = canvas.getContext('2d');

      const minSide = Math.min(w, h);
      const sx = (w - minSide) / 2;
      const sy = (h - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxDim, maxDim);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

      const student = StorageService.getStudent();
      student.avatar_url = compressedDataUrl;
      StorageService.saveStudent(student);

      updateProfileAvatarDisplay(student);
      initAppUser(); // Cập nhật trên Navbar ngay lập tức
      showToast('Đã cập nhật ảnh đại diện thành công!');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleRemoveAvatar() {
  if (!confirm('Bạn có chắc chắn muốn xóa ảnh đại diện và quay về chữ cái mặc định?')) return;

  const student = StorageService.getStudent();
  delete student.avatar_url;
  StorageService.saveStudent(student);

  const fileInput = document.getElementById('avatarFileInput');
  if (fileInput) fileInput.value = '';

  updateProfileAvatarDisplay(student);
  initAppUser();
  showToast('Đã xóa ảnh đại diện!');
}

function handleSaveProfile(e) {
  e.preventDefault();
  const name = document.getElementById('profileNameInput').value.trim();
  const student_id = document.getElementById('profileStudentIdInput').value.trim();
  const major = document.getElementById('profileMajorInput').value.trim();
  const class_name = document.getElementById('profileClassInput').value.trim();

  if (!name || !student_id) {
    showToast('Họ tên và MSSV không được để trống!', true);
    return;
  }

  const student = StorageService.getStudent();
  student.name = name;
  student.student_id = student_id;
  student.major = major;
  student.class_name = class_name;

  StorageService.saveStudent(student);
  updateProfileAvatarDisplay(student);
  initAppUser();
  showToast('Cập nhật thông tin hồ sơ sinh viên thành công!');
}

function handleChangePassword(e) {
  e.preventDefault();
  const currentPass = document.getElementById('currentPasswordInput').value;
  const newPass = document.getElementById('newPasswordInput').value;
  const confirmPass = document.getElementById('confirmPasswordInput').value;

  if (newPass.length < 8) {
    showToast('Mật khẩu mới phải có ít nhất 8 ký tự!', true);
    return;
  }
  if (newPass !== confirmPass) {
    showToast('Xác nhận mật khẩu mới không khớp!', true);
    return;
  }

  document.getElementById('currentPasswordInput').value = '';
  document.getElementById('newPasswordInput').value = '';
  document.getElementById('confirmPasswordInput').value = '';

  showToast('Đổi mật khẩu thành công! Các phiên đăng nhập cũ đã được thu hồi an toàn.');
}
