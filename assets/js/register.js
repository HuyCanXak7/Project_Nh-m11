
const registerForm = document.getElementById('registerForm');
const agreeTerms = document.getElementById('agreeTerms');
const agreeTermsError = document.getElementById('agreeTermsError');

agreeTerms.addEventListener('change', () => {
    if (agreeTerms.checked) {
        agreeTermsError.textContent = '';
        agreeTermsError.classList.remove('active');
    }
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const fields = [
        ['regEmail', 'regEmailError'],
        ['regUsername', 'regUsernameError'],
        ['regPassword', 'regPasswordError'],
        ['regConfirmPassword', 'regConfirmPasswordError'],
    ];
    clearAllErrors(fields);
    agreeTermsError.textContent = '';
    agreeTermsError.classList.remove('active');

    const email = document.getElementById('regEmail').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    let hasError = false;

    // Email
    if (!email) {
        showError('regEmail', 'regEmailError', 'Vui lòng nhập email');
        hasError = true;
    } else if (!isValidEmail(email)) {
        showError('regEmail', 'regEmailError', 'Email không hợp lệ');
        hasError = true;
    }

    // Username
    if (!username) {
        showError('regUsername', 'regUsernameError', 'Vui lòng nhập tên người dùng');
        hasError = true;
    } else if (username.length < 3) {
        showError('regUsername', 'regUsernameError', 'Tên người dùng phải có ít nhất 3 kí tự');
        hasError = true;
    } else if (!/^[a-zA-Z0-9_À-ɏḀ-ỿ ]+$/.test(username)) {
        showError('regUsername', 'regUsernameError', 'Tên người dùng chỉ chứa chữ, số và dấu gạch dưới');
        hasError = true;
    }

    // Password
    if (!password) {
        showError('regPassword', 'regPasswordError', 'Vui lòng nhập mật khẩu');
        hasError = true;
    } else if (password.length < 6) {
        showError('regPassword', 'regPasswordError', 'Mật khẩu phải có ít nhất 6 kí tự');
        hasError = true;
    }

    // Confirm password
    if (!confirmPassword) {
        showError('regConfirmPassword', 'regConfirmPasswordError', 'Vui lòng nhập lại mật khẩu');
        hasError = true;
    } else if (password && confirmPassword !== password) {
        showError('regConfirmPassword', 'regConfirmPasswordError', 'Mật khẩu không khớp');
        hasError = true;
    }

    // Terms
    if (!agreeTerms.checked) {
        agreeTermsError.textContent = 'Bạn cần đồng ý với điều khoản dịch vụ';
        agreeTermsError.classList.add('active');
        hasError = true;
    }

    if (hasError) return;

    // TODO: thay bằng gọi API thật
    console.log('Register - register.js:81', { email, username });

    showModal({
        type: 'success',
        title: 'Đăng ký thành công!',
        message: `Tài khoản ${username} đã được tạo. Đăng nhập để bắt đầu hành trình của bạn nhé!`,
        buttonText: 'Đăng nhập ngay',
        onConfirm: () => {
            window.location.href = 'index.html';
        },
    });
});