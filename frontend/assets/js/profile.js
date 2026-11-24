/**
 * LOGIC HỒ SƠ SINH VIÊN & ĐỔI MẬT KHẨU (PB-04, PB-05)
 * Phụ trách: Huỳnh Nhơn Nguyên Nghiệp
 */

document.addEventListener('DOMContentLoaded', () => {
  renderProfile();
});

function renderProfile() {
const user = getSession()?.user || {};
const student = StorageService.getStudent();
document.getElementById('profileNameInput').value = student.name || user.fullName || '';
document.getElementById('profileEmailInput').value = user.email || '';   
document.getElementById('profileStudentIdInput').value = student.student_id || '';
document.getElementById('profileMajorInput').value = student.major || '';
document.getElementById('profileClassInput').value = student.class_name || '';
updateProfileAvatarDisplay({ ...student, name: student.name || user.fullName });

}

function updateProfileAvatarDisplay(student) {
  const avatarDisplay = document.getElementById('profileAvatarDisplay');
  const btnRemove = document.getElementById('btnRemoveAvatar');
  if (!avatarDisplay) return;

  const user = (typeof getSession === 'function' ? getSession()?.user : null) || {};
  const displayName = student.name || user.fullName || user.email || 'Sinh viên';
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'SV');

  if (student.avatar_url) {
    // escapeHtml đã mã hóa dấu nháy nên URL không thể chèn thêm attribute.
    avatarDisplay.innerHTML = `
      <img src="${escapeHtml(student.avatar_url)}" alt="Avatar">
      <div class="profile-avatar-overlay">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <span>Đổi ảnh</span>
      </div>
    `;
    if (btnRemove) btnRemove.style.display = 'inline-flex';
  } else {
    avatarDisplay.innerHTML = `
      <span id="profileAvatarInitials">${escapeHtml(initials)}</span>
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
      if (typeof renderUser === 'function') renderUser(student);
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
  if (typeof renderUser === 'function') renderUser(student);
  showToast('Đã xóa ảnh đại diện!');
}

function setProfileStatus(message, isError = false) {
  const box = document.getElementById('profileSaveStatus');
  if (!box) return;
  if (!message) {
    box.style.display = 'none';
    box.textContent = '';
    return;
  }
  box.style.display = 'block';
  box.style.background = isError ? '#FEF2F2' : '#ECFDF5';
  box.style.border = isError ? '1px solid #FCA5A5' : '1px solid #6EE7B7';
  box.style.color = isError ? '#991B1B' : '#065F46';
  box.textContent = message;
}

async function handleSaveProfile(e) {
  e.preventDefault();
  setProfileStatus('');

  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session || !session.user) {
    const msg = 'Phiên đăng nhập không hợp lệ. Chỉ chủ tài khoản mới có thể sửa hồ sơ cá nhân!';
    setProfileStatus(msg, true);
    showToast(msg, true);
    return;
  }

  const name = document.getElementById('profileNameInput').value.trim();
  const student_id = document.getElementById('profileStudentIdInput').value.trim();
  const major = document.getElementById('profileMajorInput').value.trim();
  const class_name = document.getElementById('profileClassInput').value.trim();

  if (name.length < 2 || !student_id) {
    const msg = 'Họ tên (tối thiểu 2 ký tự) và MSSV không được để trống!';
    setProfileStatus(msg, true);
    showToast(msg, true);
    return;
  }

  const student = StorageService.getStudent();
  student.name = name;
  student.student_id = student_id;
  student.email = session.user.email || student.email || '';
  student.major = major;
  student.class_name = class_name;

  StorageService.saveStudent(student);

  try {
    if (typeof authApi !== 'undefined' && typeof authApi.updateProfile === 'function') {
      await authApi.updateProfile({ fullName: name });
    } else if (typeof saveSession === 'function') {
      saveSession({ ...session, user: { ...session.user, fullName: name } });
    }
  } catch (err) {
    const errMsg = err?.message || 'Không thể đồng bộ hồ sơ tài khoản!';
    setProfileStatus(errMsg, true);
    showToast(errMsg, true);
    return;
  }

  updateProfileAvatarDisplay(student);
  if (typeof renderUser === 'function') renderUser({ ...student, fullName: name });
  const okMsg = 'Cập nhật thông tin hồ sơ sinh viên thành công!';
  setProfileStatus(okMsg, false);
  showToast(okMsg);
}

function setPasswordStatus(message, isError = false) {
  const box = document.getElementById('changePasswordStatus');
  if (!box) return;
  if (!message) {
    box.style.display = 'none';
    box.textContent = '';
    return;
  }
  box.style.display = 'block';
  box.style.background = isError ? '#FEF2F2' : '#ECFDF5';
  box.style.border = isError ? '1px solid #FCA5A5' : '1px solid #6EE7B7';
  box.style.color = isError ? '#991B1B' : '#065F46';
  box.textContent = message;
}

async function handleChangePassword(e) {
  e.preventDefault();
  const currentPass = document.getElementById('currentPasswordInput').value;
  const newPass = document.getElementById('newPasswordInput').value;
  const confirmPass = document.getElementById('confirmPasswordInput').value;
  const btn = document.getElementById('btnChangePassword');

  setPasswordStatus('');

  if (!currentPass) {
    const msg = 'Vui lòng nhập mật khẩu hiện tại!';
    setPasswordStatus(msg, true);
    showToast(msg, true);
    return;
  }
  if (newPass.length < 8) {
    const msg = 'Mật khẩu mới phải có ít nhất 8 ký tự!';
    setPasswordStatus(msg, true);
    showToast(msg, true);
    return;
  }
  if (newPass === currentPass) {
    const msg = 'Mật khẩu mới không được trùng với mật khẩu hiện tại!';
    setPasswordStatus(msg, true);
    showToast(msg, true);
    return;
  }
  if (newPass !== confirmPass) {
    const msg = 'Xác nhận mật khẩu mới không khớp!';
    setPasswordStatus(msg, true);
    showToast(msg, true);
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';
  }

  try {
    if (typeof authApi !== 'undefined' && typeof authApi.changePassword === 'function') {
      await authApi.changePassword({ currentPassword: currentPass, newPassword: newPass });
    }

    document.getElementById('currentPasswordInput').value = '';
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('confirmPasswordInput').value = '';

    const okMsg = 'Đổi mật khẩu thành công! Các refresh token cũ đã được thu hồi.';
    setPasswordStatus(okMsg, false);
    showToast(okMsg);
  } catch (err) {
    const errMsg = err?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại!';
    setPasswordStatus(errMsg, true);
    showToast(errMsg, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Đổi mật khẩu';
    }
  }
}
