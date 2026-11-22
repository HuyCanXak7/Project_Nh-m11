/**
 * QUẢN LÝ TÀI KHOẢN (PB-29, PB-30): chỉ ADMIN xem, tìm theo email / họ tên, khóa / mở tài khoản.
 * Chặn ở FE chỉ để trải nghiệm; quyền thật do BE kiểm tra (403 FORBIDDEN).
 */
const adminUser = requireAdmin();
let searchTimer;
let lastRequest = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (!adminUser) return;
    sessionStorage.removeItem('adminViewAs'); // quay về trang này = thoát chế độ xem tài khoản khác
    $('userSearch').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadUsers, 300);
    });
    $('userTableBody').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-id]');
        if (btn) return toggleActive(btn);
        const row = e.target.closest('tr[data-view-id]');
        if (row) viewUserData(row.dataset.viewId, row.dataset.viewEmail);
    });
    $('userTableBody').addEventListener('keydown', (e) => {
        const row = e.target.closest('tr[data-view-id]');
        if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            viewUserData(row.dataset.viewId, row.dataset.viewEmail);
        }
    });
    $('lockModalConfirm').addEventListener('click', confirmToggle);
    loadUsers();

    $('scaleAddRow').addEventListener('click', () => $('scaleTableBody').insertAdjacentHTML('beforeend', scaleRowHtml()));
    $('scaleReload').addEventListener('click', loadScale);
    $('scaleSave').addEventListener('click', saveScale);
    $('scaleTableBody').addEventListener('click', (e) => e.target.closest('[data-remove-scale]')?.closest('tr').remove());
    loadScale();
});

/* ===== BẢNG QUY ĐỔI ĐIỂM (PB-32): BE kiểm tra hợp lệ (phủ kín, không chồng lấn), FE chỉ hiện lỗi BE trả về ===== */
function scaleRowHtml(r = {}) {
    const num = (field, max, label) => `<input type="number" class="modal-input" data-field="${field}" min="0" max="${max}" step="0.1"
        value="${r[field] ?? ''}" aria-label="${label}" style="width: 110px; height: 38px;">`;
    return `<tr>
        <td><input type="text" class="modal-input" data-field="letter" maxlength="2" value="${escapeHtml(r.letter || '')}"
            aria-label="Điểm chữ" style="width: 80px; height: 38px;"></td>
        <td>${num('minScore', 10, 'Từ điểm')}</td>
        <td>${num('maxScore', 10, 'Đến điểm')}</td>
        <td>${num('gpa4', 4, 'Điểm hệ 4')}</td>
        <td><button type="button" class="btn btn-danger btn-sm" data-remove-scale>Xóa</button></td>
    </tr>`;
}

function showScaleError(message) {
    $('scaleError').textContent = message;
    $('scaleError').style.display = message ? 'block' : 'none';
}

async function loadScale() {
    showScaleError('');
    try {
        const rows = await apiFetch('/grade-scale');
        $('scaleTableBody').innerHTML = rows.map(scaleRowHtml).join('');
    } catch (err) {
        showScaleError(err.message || 'Không tải được bảng quy đổi điểm.');
    }
}

async function saveScale() {
    const items = [...$('scaleTableBody').rows].map((tr) => Object.fromEntries(
        [...tr.querySelectorAll('[data-field]')].map((input) => [
            input.dataset.field,
            input.dataset.field === 'letter' ? input.value : (input.value === '' ? null : Number(input.value)),
        ])
    ));
    const btn = $('scaleSave');
    btn.disabled = true;
    showScaleError('');
    try {
        const rows = await apiFetch('/grade-scale', { method: 'PUT', body: { items } });
        $('scaleTableBody').innerHTML = rows.map(scaleRowHtml).join('');
        showToast('Đã lưu bảng quy đổi. Điểm và GPA sẽ được tính theo bảng mới.');
    } catch (err) {
        if (err.status === 403) return window.location.replace('dashboard.html');
        // session.js trải mảng details của BE thành object {0: {...}, 1: {...}}
        const reasons = Object.values(err.details || {}).filter((d) => d?.reason)
            .map((d) => (d.field ? `${d.field}: ${d.reason}` : d.reason));
        showScaleError([err.message || 'Lưu bảng quy đổi thất bại.', ...reasons].join(' — '));
    } finally {
        btn.disabled = false;
    }
}

let pendingTarget = null;

// Mở trang Môn học dưới dữ liệu của tài khoản được chọn (StorageService đọc khóa adminViewAs)
function viewUserData(id, email) {
    sessionStorage.setItem('adminViewAs', JSON.stringify({ id, email }));
    window.location.href = 'courses.html';
}

function toggleActive(btn) {
    const lock = btn.dataset.active === 'true';
    pendingTarget = { id: btn.dataset.id, lock };
    $('lockModalBox').classList.toggle('modal--error', lock);
    $('lockModalTitle').textContent = lock ? 'Khóa tài khoản' : 'Mở khóa tài khoản';
    $('lockModalMessage').innerHTML = `Bạn có chắc muốn ${lock ? 'khóa' : 'mở khóa'} tài khoản <strong>${escapeHtml(btn.dataset.email)}</strong>?`
        + (lock ? '<br>Người dùng sẽ bị đăng xuất khỏi mọi thiết bị và không thể đăng nhập.' : '');
    $('lockModalError').style.display = 'none';
    const confirmBtn = $('lockModalConfirm');
    confirmBtn.className = `btn ${lock ? 'btn-danger' : 'btn-primary'}`;
    confirmBtn.textContent = lock ? 'Khóa' : 'Mở khóa';
    confirmBtn.disabled = false;
    openAppModal('lockModal');
}

async function confirmToggle() {
    if (!pendingTarget) return;
    const { id, lock } = pendingTarget;
    const confirmBtn = $('lockModalConfirm');
    confirmBtn.disabled = true;
    try {
        await apiFetch(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { isActive: !lock } });
        closeAppModal('lockModal');
        loadUsers();
    } catch (err) {
        if (err.status === 403) return window.location.replace('dashboard.html');
        confirmBtn.disabled = false;
        $('lockModalError').textContent = err.message || `${lock ? 'Khóa' : 'Mở khóa'} tài khoản thất bại.`;
        $('lockModalError').style.display = 'block';
    }
}

function setStateRow(html) {
    $('userTableBody').innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px;">${html}</td></tr>`;
}

async function loadUsers() {
    const q = $('userSearch').value.trim();
    const requestId = ++lastRequest;
    setStateRow('Đang tải danh sách tài khoản...');
    try {
        const { items, total } = await apiFetch(`/admin/users?q=${encodeURIComponent(q)}`);
        if (requestId !== lastRequest) return; // người dùng đã gõ tiếp, bỏ kết quả cũ
        $('userCount').textContent = `${total} tài khoản`;
        if (!items.length) {
            setStateRow(q ? `Không tìm thấy tài khoản khớp "${escapeHtml(q)}".` : 'Chưa có tài khoản nào.');
            return;
        }
        $('userTableBody').innerHTML = items.map((u) => `
            <tr ${u.role === 'ADMIN' ? '' : `data-view-id="${escapeHtml(u.id)}" data-view-email="${escapeHtml(u.email)}" tabindex="0" style="cursor: pointer;" title="Xem điểm, môn học, học kỳ, mục tiêu"`}>
                <td>${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.fullName)}</td>
                <td>${escapeHtml(u.studentCode) || '—'}</td>
                <td>${escapeHtml(u.major) || '—'}</td>
                <td>${u.role === 'ADMIN' ? 'Quản trị' : 'Sinh viên'}</td>
                <td>${u.isActive ? 'Hoạt động' : 'Đã khóa'}</td>
                <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                <td>${u.id === adminUser.id ? '—' : `<button type="button" class="btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-primary'}"
                    data-id="${escapeHtml(u.id)}" data-active="${u.isActive}" data-email="${escapeHtml(u.email)}">${u.isActive ? 'Khóa' : 'Mở khóa'}</button>`}</td>
            </tr>`).join('');
    } catch (err) {
        if (requestId !== lastRequest) return;
        if (err.status === 403) {
            window.location.replace('dashboard.html');
            return;
        }
        setStateRow(`${escapeHtml(err.message || 'Không tải được danh sách tài khoản.')}
            <button type="button" class="btn btn-primary btn-sm" onclick="loadUsers()">Thử lại</button>`);
    }
}
