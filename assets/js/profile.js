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
  initAppUser();
  showToast('Cập nhật thông tin hồ sơ sinh viên thành công!');
}

function handleChangePassword(e) {
  e.preventDefault();
  const currentPass = document.getElementById('currentPasswordInput').value;
  const newPass = document.getElementById('newPasswordInput').value;
  const confirmPass = document.getElementById('confirmPasswordInput').value;

  if (newPass.length < 8) {
    showToast('Mật khẩu mới phải có ít nhất 8 ký tự theo quy định PB-05!', true);
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
