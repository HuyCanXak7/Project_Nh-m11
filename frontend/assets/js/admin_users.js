/**
 * QUẢN LÝ TÀI KHOẢN (PB-29): chỉ ADMIN xem danh sách và tìm theo email / họ tên.
 * Chặn ở FE chỉ để trải nghiệm; quyền thật do BE kiểm tra (403 FORBIDDEN).
 */
const adminUser = requireAdmin();
let searchTimer;
let lastRequest = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (!adminUser) return;
    $('userSearch').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadUsers, 300);
    });
    loadUsers();
});

function setStateRow(html) {
    $('userTableBody').innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;">${html}</td></tr>`;
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
            <tr>
                <td>${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.fullName)}</td>
                <td>${escapeHtml(u.studentCode) || '—'}</td>
                <td>${escapeHtml(u.major) || '—'}</td>
                <td>${u.role === 'ADMIN' ? 'Quản trị' : 'Sinh viên'}</td>
                <td>${u.isActive ? 'Hoạt động' : 'Đã khóa'}</td>
                <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
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
