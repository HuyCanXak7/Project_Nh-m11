
const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const fields = [
        ['loginEmail', 'loginEmailError'],
        ['loginPassword', 'loginPasswordError'],
    ];
    clearAllErrors(fields);

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;
    let hasError = false;

    if (!email) {
        showError('loginEmail', 'loginEmailError', 'Vui lòng nhập email');
        hasError = true;
    } else if (!isValidEmail(email)) {
        showError('loginEmail', 'loginEmailError', 'Email không hợp lệ');
        hasError = true;
    }

    if (!password) {
        showError('loginPassword', 'loginPasswordError', 'Vui lòng nhập mật khẩu');
        hasError = true;
    } else if (password.length < 6) {
        showError('loginPassword', 'loginPasswordError', 'Mật khẩu phải có ít nhất 6 kí tự');
        hasError = true;
    }

    if (hasError) return;

    // const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, remember }) });
    console.log('Login - login.js:37', { email, remember });

    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const user = users.find((u) => u.email === email && u.password === password);

    if (!user) {
        showModal({
            type: 'error',
            title: 'Đăng nhập thất bại!',
            message: 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.',
            buttonText: 'Thử lại',
        });
        return;
    }

    localStorage.setItem('currentUser', JSON.stringify({ email: user.email, fullName: user.username }));

    showModal({
        type: 'success',
        title: 'Đăng nhập thành công!',
        message: `Chào mừng ${user.username} quay lại. Cùng xem hôm nay học được gì nhé!`,
        buttonText: 'Tiếp tục',
        onConfirm: () => {
            window.location.href = 'dashboard.html';
        },
    });
});