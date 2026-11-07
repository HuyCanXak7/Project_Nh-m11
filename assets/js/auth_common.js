

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