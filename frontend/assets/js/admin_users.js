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
});

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
