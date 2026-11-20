function showError(inputId, errorId, message) {
    const errorEl = document.getElementById(errorId);
    const inputGroup = document.getElementById(inputId)?.closest('.input-group');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('active');
    }
    inputGroup?.classList.add('error');
}

function clearError(inputId, errorId) {
    const errorEl = document.getElementById(errorId);
    const inputGroup = document.getElementById(inputId)?.closest('.input-group');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('active');
    }
    inputGroup?.classList.remove('error');
}

function clearAllErrors(pairs) {
    pairs.forEach(([inputId, errorId]) => clearError(inputId, errorId));
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const EYE_OPEN = `
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>`;
const EYE_OFF = `
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>`;

document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.togglePassword);
        const willShow = input.type === 'password';
        input.type = willShow ? 'text' : 'password';
        btn.querySelector('svg').innerHTML = willShow ? EYE_OPEN : EYE_OFF;
    });
});

document.querySelectorAll('.input-group__input').forEach(input => {
    input.addEventListener('input', () => {
        const errorEl = input.closest('.input-wrapper')?.querySelector('.input-error');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.remove('active');
        }
        input.closest('.input-group')?.classList.remove('error');
    });
});

function showModal({ type = 'success', title, message, buttonText = 'Đóng', onConfirm } = {}) {
    document.querySelector('.modal-overlay')?.remove();

    const icon = type === 'success'
        ? '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
        : '<path d="M7 7l10 10M17 7L7 17"/>';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal modal--${type}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <div class="modal__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
                    stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
            </div>
            <h3 class="modal__title" id="modalTitle"></h3>
            <p class="modal__message"></p>
            <button type="button" class="modal__btn"></button>
        </div>`;

    overlay.querySelector('.modal__title').textContent = title;
    overlay.querySelector('.modal__message').textContent = message;
    const btn = overlay.querySelector('.modal__btn');
    btn.textContent = buttonText;

    const close = () => {
        overlay.classList.remove('is-open');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => overlay.remove(), 200);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };

    btn.addEventListener('click', () => {
        close();
        onConfirm?.();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    btn.focus();
}

/* ===== Chuyển chế độ Sáng / Tối cho các trang Đăng nhập, Đăng ký, Quên mật khẩu (PB-35 / T0694F3) ===== */
const AUTH_THEME_KEY = 'studytrack_theme';

function getAuthSavedTheme() {
    try {
        return localStorage.getItem(AUTH_THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
}

function applyAuthTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('theme-dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (document.body) {
        document.body.classList.toggle('theme-dark', isDark);
    }

    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.setAttribute('aria-pressed', String(isDark));
        btn.title = isDark ? 'Chuyển sang giao diện sáng' : 'Bật giao diện tối (Dark Mode)';
        btn.innerHTML = isDark
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
}

function playAuthThemeAnimation(nextTheme, onMidpoint) {
    if (!document.body) {
        onMidpoint();
        return;
    }
    document.getElementById('themeTransitionOverlay')?.remove();
    document.documentElement.classList.add('theme-transitioning');

    const overlay = document.createElement('div');
    overlay.id = 'themeTransitionOverlay';
    overlay.setAttribute('aria-hidden', 'true');

    if (nextTheme === 'light') {
        overlay.innerHTML = `
            <div class="theme-curtain-dark"></div>
            <div class="theme-sun-orb">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
                    <circle cx="12" cy="12" r="4.5"/>
                    <path d="M12 1.5v2.5M12 20v2.5M4.57 4.57l1.77 1.77M17.66 17.66l1.77 1.77M1.5 12H4M20 12h2.5M4.57 19.43l1.77-1.77M17.66 6.34l1.77-1.77"/>
                </svg>
            </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(onMidpoint, 220);
        setTimeout(() => {
            overlay.remove();
            document.documentElement.classList.remove('theme-transitioning');
        }, 980);
    } else {
        const veil = document.createElement('div');
        veil.className = 'theme-night-veil';
        overlay.appendChild(veil);

        for (let i = 0; i < 34; i++) {
            const star = document.createElement('span');
            const isStreak = i % 4 === 0;
            star.className = isStreak ? 'theme-star theme-star--streak' : 'theme-star';
            if (!isStreak) {
                star.textContent = i % 3 === 0 ? '✦' : '★';
                star.style.fontSize = `${10 + (i % 4) * 3}px`;
            }
            star.style.left = `${(i * 3.1 + (i % 5) * 2.7) % 98}%`;
            star.style.setProperty('--delay', `${(i % 7) * 0.045}s`);
            star.style.setProperty('--dur', `${0.68 + (i % 4) * 0.09}s`);
            overlay.appendChild(star);
        }

        document.body.appendChild(overlay);
        setTimeout(onMidpoint, 390);
        setTimeout(() => {
            overlay.remove();
            document.documentElement.classList.remove('theme-transitioning');
        }, 1020);
    }
}

function toggleAuthTheme() {
    const next = getAuthSavedTheme() === 'dark' ? 'light' : 'dark';
    try {
        localStorage.setItem(AUTH_THEME_KEY, next);
    } catch { /* ignore */ }
    playAuthThemeAnimation(next, () => applyAuthTheme(next));
}

function initAuthThemeToggle() {
    applyAuthTheme(getAuthSavedTheme());
    if (document.getElementById('themeToggleBtn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'themeToggleBtn';
    btn.className = 'theme-toggle-icon-btn';
    btn.setAttribute('aria-label', 'Bật hoặc tắt giao diện tối');
    btn.addEventListener('click', toggleAuthTheme);

    const authTop = document.querySelector('.auth-top');
    if (authTop) {
        authTop.appendChild(btn);
    } else if (document.body) {
        btn.style.position = 'fixed';
        btn.style.top = '16px';
        btn.style.right = '18px';
        btn.style.zIndex = '60';
        document.body.appendChild(btn);
    }
    applyAuthTheme(getAuthSavedTheme());
}

applyAuthTheme(getAuthSavedTheme());
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthThemeToggle);
} else {
    initAuthThemeToggle();
}

/* ===== Trạng thái đang xử lý của nút submit ===== */
function setSubmitting(button, busy, busyText) {
    if (busy) {
        button.dataset.label ??= button.innerHTML;
        button.disabled = true;
        button.textContent = busyText;
    } else {
        button.disabled = false;
        if (button.dataset.label) button.innerHTML = button.dataset.label;
    }
}
// Chuyển trang mượt: chạy animation trượt ra rồi mới điều hướng
document.querySelectorAll('.auth-top a').forEach((link) => {
    link.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // mở tab mới thì để mặc định
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        e.preventDefault();
        document.body.classList.add('auth-leaving');
        setTimeout(() => { location.href = link.href; }, 250);
    });
});
// Bấm Back (trang lấy từ bfcache) thì bỏ trạng thái đang rời trang
window.addEventListener('pageshow', (e) => {
    if (e.persisted) document.body.classList.remove('auth-leaving');
});
