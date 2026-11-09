const loginForm = document.getElementById('loginForm');
const loginButton = loginForm.querySelector('.auth-form__submit');
let lockTimer = null;

// Bị đẩy về đây vì hết phiên / tài khoản bị khóa → báo lý do
const flash = popFlash();
if (flash) {
    showModal({ type: 'error', title: 'Bạn đã bị đăng xuất', message: flash, buttonText: 'Đã hiểu' });
}

/** Rate limit (429): khóa nút và đếm ngược */
function lockLogin(seconds) {
    clearInterval(lockTimer);
    let left = Math.max(1, Math.ceil(seconds || 60));

    setSubmitting(loginButton, true, `Thử lại sau ${left}s`);
    lockTimer = setInterval(() => {
        left -= 1;
        if (left <= 0) {
            clearInterval(lockTimer);
            setSubmitting(loginButton, false);
            return;
        }
        loginButton.textContent = `Thử lại sau ${left}s`;
    }, 1000);
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loginButton.disabled) return;

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

    // Màn đăng nhập chỉ kiểm tra không để trống; đúng/sai mật khẩu do BE trả lời
    if (!password) {
        showError('loginPassword', 'loginPasswordError', 'Vui lòng nhập mật khẩu');
        hasError = true;
    }

    if (hasError) return;

    setSubmitting(loginButton, true, 'Đang đăng nhập...');

    try {
        const user = await authApi.login({ email, password, remember });
        setSubmitting(loginButton, false);
        showModal({
            type: 'success',
            title: 'Đăng nhập thành công!',
            message: `Chào mừng ${user.fullName} quay lại. Cùng xem hôm nay học được gì nhé!`,
            buttonText: 'Tiếp tục',
            onConfirm: () => window.location.replace('dashboard.html'),
        });
    } catch (err) {
        setSubmitting(loginButton, false);
        document.getElementById('loginPassword').value = '';

        if (err.status === 429) {
            lockLogin(err.details?.retryAfter);
            showModal({
                type: 'error',
                title: 'Tạm khóa đăng nhập',
                message: `Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${err.details?.retryAfter || 60} giây.`,
                buttonText: 'Đã hiểu',
            });
        } else if (err.status === 403) {
            showModal({ type: 'error', title: 'Tài khoản bị khóa', message: MESSAGES.disabled, buttonText: 'Đóng' });
        } else if (err.status === 401) {
            // Lỗi chung: không nói rõ sai email hay sai mật khẩu
            showModal({ type: 'error', title: 'Đăng nhập thất bại!', message: MESSAGES.invalid, buttonText: 'Thử lại' });
        } else {
            showModal({ type: 'error', title: 'Có lỗi xảy ra', message: err.status === 0 ? MESSAGES.network : 'Vui lòng thử lại sau.', buttonText: 'Đóng' });
            console.error('Login - login.js:90', err);
        }
    }
});