/**
 * QUẢN LÝ TÀI KHOẢN SINH VIÊN (US-01 → US-06).
 *  - US-01: danh sách sinh viên, tìm theo email / họ tên / MSSV, sắp xếp và phân trang phía server.
 *  - US-02: hồ sơ chi tiết kèm thống kê học kỳ, môn học, GPA tích lũy.
 *  - US-03: khóa / mở khóa tài khoản kèm lý do (BE ghi audit log và thu hồi phiên khi khóa).
 *  - US-05: bảng điểm đầy đủ theo học kỳ.
 *  - US-06: ADMIN sửa điểm thành phần, BE tự tính lại điểm môn và GPA.
 * Chặn ở FE chỉ để trải nghiệm; quyền thật do BE kiểm tra (403 FORBIDDEN).
 */
const adminUser = requireAdmin();
let searchTimer;
let listRequest = 0;
let detailRequest = 0;
let currentPage = 1;
let currentPageSize = 10;
let sortBy = 'createdAt';
let sortOrder = 'desc';
let totalPages = 0;
let pendingTarget = null;
let activeStudent = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!adminUser) return;
    sessionStorage.removeItem('adminViewAs'); // quay về trang này = thoát chế độ xem tài khoản khác

    $('userSearch').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentPage = 1;
            loadUsers();
        }, 300);
    });
    $('userSort').addEventListener('change', () => {
        [sortBy, sortOrder] = $('userSort').value.split(':');
        currentPage = 1;
        loadUsers();
    });
    $('userPageSize').addEventListener('change', () => {
        currentPageSize = Number($('userPageSize').value) || 10;
        currentPage = 1;
        loadUsers();
    });
    $('userPrev').addEventListener('click', () => goToPage(-1));
    $('userNext').addEventListener('click', () => goToPage(1));
    $('userTableBody').addEventListener('click', handleUserTableClick);
    $('userTableBody').addEventListener('keydown', (e) => {
        const row = e.target.closest('tr[data-student-id]');
        if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openStudentDetail(row.dataset.studentId);
        }
    });
    $('studentDetailBody').addEventListener('click', handleStudentDetailClick);
    $('lockModalConfirm').addEventListener('click', confirmToggle);
    loadUsers();

    $('scaleAddRow').addEventListener('click', () => $('scaleTableBody').insertAdjacentHTML('beforeend', scaleRowHtml()));
    $('scaleReload').addEventListener('click', loadScale);
    $('scaleSave').addEventListener('click', saveScale);
    $('scaleTableBody').addEventListener('click', (e) => e.target.closest('[data-remove-scale]')?.closest('tr').remove());
    loadScale();
});

function goToPage(delta) {
    const target = currentPage + delta;
    if (target < 1 || (totalPages > 0 && target > totalPages)) return;
    currentPage = target;
    loadUsers();
}

function handleUserTableClick(e) {
    const button = e.target.closest('button[data-action]');
    if (button) {
        if (button.dataset.action === 'toggle') toggleActive(button);
        if (button.dataset.action === 'detail') openStudentDetail(button.dataset.id);
        return;
    }
    const row = e.target.closest('tr[data-student-id]');
    if (row) openStudentDetail(row.dataset.studentId);
}

function setStateRow(html) {
    $('userTableBody').innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;">${html}</td></tr>`;
}

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
}

/** escapeHtml() của app_shell không mã hóa dấu nháy, nên cần hàm riêng cho attribute. */
function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatScore(value, digits = 1) {
    return value === null || value === undefined ? '—' : Number(value).toFixed(digits);
}

function formatGpa(value) {
    return value === null || value === undefined ? '—' : Number(value).toFixed(2);
}

function formatWeight(value) {
    return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

function statusBadge(isActive) {
    return isActive
        ? '<span class="badge badge-green">Hoạt động</span>'
        : '<span class="badge badge-red">Đã khóa</span>';
}

async function loadUsers() {
    const keyword = $('userSearch').value.trim();
    const requestId = ++listRequest;
    const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(currentPageSize),
        sortBy,
        sortOrder,
    });
    if (keyword) params.set('q', keyword);

    setStateRow('Đang tải danh sách sinh viên...');
    try {
        const { items, meta } = await apiFetch(`/admin/users?${params.toString()}`);
        if (requestId !== listRequest) return; // người dùng đã đổi bộ lọc, bỏ kết quả cũ
        if (meta.totalPages > 0 && currentPage > meta.totalPages) {
            currentPage = meta.totalPages;
            loadUsers();
            return;
        }
        totalPages = meta.totalPages;
        $('userCount').textContent = `${meta.totalItems} sinh viên`;
        renderUserRows(items, keyword);
        renderPagination(meta);
    } catch (err) {
        if (requestId !== listRequest) return;
        if (err.status === 403) {
            window.location.replace('dashboard.html');
            return;
        }
        $('userPagination').style.display = 'none';
        setStateRow(`${escapeHtml(err.message || 'Không tải được danh sách sinh viên.')}
            <button type="button" class="btn btn-primary btn-sm" onclick="loadUsers()">Thử lại</button>`);
    }
}

function renderUserRows(items, keyword) {
    if (!items.length) {
        setStateRow(keyword ? `Không tìm thấy sinh viên khớp "${escapeHtml(keyword)}".` : 'Chưa có sinh viên nào.');
        return;
    }
    $('userTableBody').innerHTML = items.map((u) => `
        <tr data-student-id="${escapeAttr(u.id)}" tabindex="0" style="cursor: pointer;" title="Xem hồ sơ và bảng điểm">
            <td><strong>${escapeHtml(u.studentCode) || '—'}</strong></td>
            <td>${escapeHtml(u.fullName)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${escapeHtml(u.major) || '—'}</td>
            <td>${statusBadge(u.isActive)}</td>
            <td>${formatDate(u.createdAt)}</td>
            <td style="white-space: nowrap;">
                <button type="button" class="btn btn-secondary btn-sm" data-action="detail" data-id="${escapeAttr(u.id)}">Hồ sơ</button>
                <button type="button" class="btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-primary'}"
                    data-action="toggle" data-id="${escapeAttr(u.id)}" data-active="${u.isActive}"
                    data-name="${escapeAttr(u.fullName)}" data-email="${escapeAttr(u.email)}">${u.isActive ? 'Khóa' : 'Mở khóa'}</button>
            </td>
        </tr>`).join('');
}

function renderPagination(meta) {
    $('userPagination').style.display = meta.totalItems ? 'flex' : 'none';
    $('pageInfo').textContent = `Trang ${meta.totalPages ? meta.page : 1} / ${Math.max(meta.totalPages, 1)}`;
    $('userPrev').disabled = meta.page <= 1;
    $('userNext').disabled = meta.totalPages === 0 || meta.page >= meta.totalPages;
}


function openStudentDetail(studentId) {
    if (!studentId) return;
    activeStudent = { id: Number(studentId) };
    $('studentModalTitle').textContent = 'Hồ sơ sinh viên';
    $('studentDetailBody').innerHTML = '<p style="color: var(--text-gray);">Đang tải hồ sơ sinh viên...</p>';
    openAppModal('studentModal');
    loadStudentDetail(studentId);
}

async function loadStudentDetail(studentId) {
    const requestId = ++detailRequest;
    try {
        const [detail, grades] = await Promise.all([
            apiFetch(`/admin/users/${encodeURIComponent(studentId)}`),
            apiFetch(`/admin/users/${encodeURIComponent(studentId)}/grades`),
        ]);
        if (requestId !== detailRequest) return;
        activeStudent = detail.student;
        renderStudentDetail(detail, grades);
    } catch (err) {
        if (requestId !== detailRequest) return;
        if (err.status === 403) {
            window.location.replace('dashboard.html');
            return;
        }
        $('studentDetailBody').innerHTML = `
            <div style="padding: 24px; text-align: center;">
                <p style="color: var(--error); margin-bottom: 16px;">${escapeHtml(err.message || 'Không tải được hồ sơ sinh viên.')}</p>
                <button type="button" class="btn btn-primary btn-sm" data-action="retry-detail" data-id="${escapeAttr(studentId)}">Thử lại</button>
            </div>`;
    }
}

function handleStudentDetailClick(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'toggle') toggleActive(button);
    if (button.dataset.action === 'retry-detail') loadStudentDetail(button.dataset.id);
    if (button.dataset.action === 'save-course') saveCourseScores(button);
}

function statCard(label, value) {
    return `<div style="border: 1px solid var(--e-soft, #E2E8F0); border-radius: 10px; padding: 12px; background: var(--e-tint, #F8FAFC);">
        <div style="font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-gray);">${escapeHtml(label)}</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--text-dark); margin-top: 2px;">${escapeHtml(value ?? '—')}</div>
    </div>`;
}

function renderStudentDetail(detail, grades) {
    const { student, summary } = detail;
    const initials = (student.fullName || 'SV').trim().split(/\s+/).slice(-2)
        .map((part) => part.charAt(0)).join('').toUpperCase();

    $('studentDetailBody').innerHTML = `
        <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start; padding-bottom: 18px; border-bottom: 1px solid var(--e-soft, #E2E8F0);">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--e-mint, #3EE6A8); color: #0B3B2E; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;">${escapeHtml(initials)}</div>
            <div style="flex: 1; min-width: 220px;">
                <div style="font-size: 20px; font-weight: 800; color: var(--text-dark);">${escapeHtml(student.fullName)}</div>
                <div style="color: var(--text-gray); margin: 2px 0 6px;">${escapeHtml(student.email)}</div>
                <div style="font-size: 13px; color: var(--text-gray);">MSSV: <strong>${escapeHtml(student.studentCode) || '—'}</strong> · Ngành: ${escapeHtml(student.major) || '—'} ${statusBadge(student.isActive)}</div>
            </div>
            <button type="button" class="btn btn-sm ${student.isActive ? 'btn-danger' : 'btn-primary'}"
                data-action="toggle" data-id="${escapeAttr(student.id)}" data-active="${student.isActive}"
                data-name="${escapeAttr(student.fullName)}" data-email="${escapeAttr(student.email)}">${student.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin: 18px 0;">
            ${statCard('Học kỳ', summary.semesterCount)}
            ${statCard('Môn học', summary.courseCount)}
            ${statCard('GPA tích lũy', formatGpa(summary.gpa4))}
            ${statCard('Tín chỉ tính GPA', summary.includedCredits)}
            ${statCard('Tín chỉ đạt', summary.passedCredits)}
            ${statCard('Xếp loại', summary.ranking)}
        </div>

        <h3 style="font-size: 16px; margin: 0 0 6px;">Tiến độ học kỳ</h3>
        ${renderSemesterProgress(detail.semesters)}

        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 24px 0 8px;">
            <h3 style="font-size: 16px; margin: 0;">Bảng điểm & sửa điểm</h3>
            <span style="font-size: 12px; color: var(--text-gray);">Điểm thành phần 0–10. Ô để trống sẽ giữ nguyên điểm đã lưu.</span>
        </div>
        <div id="gradeSaveError" role="alert" style="display: none; color: var(--error); font-size: 13px; margin-bottom: 10px;"></div>
        ${renderGradeSections(grades)}`;
}

function renderSemesterProgress(semesters) {
    if (!semesters.length) {
        return '<p style="color: var(--text-gray); font-size: 13px;">Sinh viên chưa có học kỳ nào.</p>';
    }
    return `<div>${semesters.map((semester) => `
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--e-soft, #E2E8F0);">
            <div style="flex: 1; min-width: 220px;">
                <strong>${escapeHtml(semester.name)}</strong>
                <div style="font-size: 12px; color: var(--text-gray);">${escapeHtml(semester.academicYear)} · ${formatDate(semester.startDate)} → ${formatDate(semester.endDate)}</div>
            </div>
            <span style="font-size: 13px;">${semester.courseCount} môn</span>
            <span style="font-size: 13px;">GPA ${formatGpa(semester.gpa4)}</span>
            <span class="badge badge-blue">${escapeHtml(semester.ranking || 'Chưa xếp loại')}</span>
        </div>`).join('')}</div>`;
}


function renderGradeSections(grades) {
    if (!grades.semesters.length) {
        return '<p style="color: var(--text-gray); font-size: 13px;">Chưa có học kỳ nào để hiển thị bảng điểm.</p>';
    }
    return grades.semesters.map((semester) => {
        const rows = semester.courses.length
            ? semester.courses.map(renderCourseRow).join('')
            : '<tr><td colspan="8" style="text-align: center; color: var(--text-gray); padding: 18px;">Học kỳ chưa có môn học.</td></tr>';
        return `<section style="margin-top: 14px;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: baseline; margin-bottom: 6px;">
                <strong>${escapeHtml(semester.name)}</strong>
                <span style="font-size: 12px; color: var(--text-gray);">${escapeHtml(semester.academicYear)} · GPA ${formatGpa(semester.gpa4)} · ${escapeHtml(semester.ranking || '—')}</span>
            </div>
            <div class="table-wrap">
                <table class="app-table">
                    <thead>
                        <tr>
                            <th>Môn học</th>
                            <th>TC</th>
                            <th>Điểm thành phần</th>
                            <th>Điểm môn</th>
                            <th>Chữ</th>
                            <th>Hệ 4</th>
                            <th>Trạng thái</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </section>`;
    }).join('');
}

function renderCourseRow(course) {
    const components = course.components.length
        ? course.components.map((component) => `
            <label style="display: flex; align-items: center; gap: 6px; margin: 2px 0; white-space: nowrap;">
                <span style="font-size: 12px; color: var(--text-gray);">${escapeHtml(component.name)} (${formatWeight(component.weightPercent)}%)</span>
                <input type="number" min="0" max="10" step="0.01" inputmode="decimal"
                    class="modal-input" data-component-id="${component.id}" value="${component.score ?? ''}"
                    aria-label="Điểm ${escapeAttr(component.name)}" style="width: 82px; height: 32px; padding: 4px 8px;">
            </label>`).join('')
        : '<span style="font-size: 12px; color: var(--text-gray);">Chưa cấu hình thành phần điểm.</span>';
    return `<tr data-course-id="${course.id}">
        <td>
            <strong>${escapeHtml(course.code)}</strong>
            <div style="font-size: 12px; color: var(--text-gray);">${escapeHtml(course.name)}${course.isRetake ? ' · Học lại' : ''}</div>
        </td>
        <td>${course.credits}</td>
        <td>${components}</td>
        <td>${formatScore(course.courseGrade10)}</td>
        <td>${course.letterGrade ? `<strong>${escapeHtml(course.letterGrade)}</strong>` : '—'}</td>
        <td>${formatScore(course.grade4)}</td>
        <td>${course.isPassed === null || course.isPassed === undefined
            ? '—'
            : (course.isPassed ? '<span class="badge badge-green">Đạt</span>' : '<span class="badge badge-red">Chưa đạt</span>')}</td>
        <td>${course.components.length
            ? `<button type="button" class="btn btn-primary btn-sm" data-action="save-course" data-course-id="${course.id}">Lưu điểm</button>`
            : '—'}</td>
    </tr>`;
}

function showGradeError(message) {
    const box = $('gradeSaveError');
    if (!box) return;
    box.textContent = message;
    box.style.display = message ? 'block' : 'none';
}

async function saveCourseScores(button) {
    if (!activeStudent) return;
    const row = button.closest('tr[data-course-id]');
    const inputs = row ? [...row.querySelectorAll('input[data-component-id]')] : [];
    const scores = [];

    for (const input of inputs) {
        const raw = input.value.trim();
        if (raw === '') continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0 || value > 10) {
            showGradeError(`Điểm "${input.getAttribute('aria-label')}" phải nằm trong khoảng 0–10.`);
            input.focus();
            return;
        }
        scores.push({ component_id: Number(input.dataset.componentId), score: value });
    }
    if (!scores.length) {
        showGradeError('Vui lòng nhập ít nhất một điểm trước khi lưu.');
        return;
    }

    showGradeError('');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Đang lưu...';
    try {
        await apiFetch(`/admin/users/${activeStudent.id}/courses/${button.dataset.courseId}/scores`, {
            method: 'PUT',
            body: { scores },
        });
        showToast('Đã cập nhật điểm và tính lại GPA.');
        await loadStudentDetail(activeStudent.id);
    } catch (err) {
        if (err.status === 403) {
            window.location.replace('dashboard.html');
            return;
        }
        showGradeError(err.message || 'Không lưu được điểm.');
        button.disabled = false;
        button.textContent = originalText;
    }
}

/* ===== KHÓA / MỞ KHÓA TÀI KHOẢN (US-03) ===== */
function toggleActive(btn) {
    const lock = btn.dataset.active === 'true';
    const name = btn.dataset.name || btn.dataset.email || '';
    pendingTarget = { id: btn.dataset.id, lock, name };
    $('lockModalBox').classList.toggle('modal--error', lock);
    $('lockModalTitle').textContent = lock ? 'Khóa tài khoản' : 'Mở khóa tài khoản';
    $('lockModalMessage').innerHTML = `Bạn có chắc muốn ${lock ? 'khóa' : 'mở khóa'} tài khoản <strong>${escapeHtml(name)}</strong>?`
        + (lock ? '<br>Người dùng sẽ bị đăng xuất khỏi mọi thiết bị và không thể đăng nhập.' : '');
    $('lockModalReason').value = '';
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
    const reason = $('lockModalReason').value.trim();
    const body = { isActive: !lock };
    if (reason) body.reason = reason;

    confirmBtn.disabled = true;
    $('lockModalError').style.display = 'none';
    try {
        await apiFetch(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body });
        closeAppModal('lockModal');
        showToast(lock ? 'Đã khóa tài khoản sinh viên.' : 'Đã mở khóa tài khoản sinh viên.');
        loadUsers();
        if (activeStudent && String(activeStudent.id) === String(id)
            && $('studentModal').style.display !== 'none') {
            loadStudentDetail(activeStudent.id);
        }
    } catch (err) {
        if (err.status === 403) return window.location.replace('dashboard.html');
        confirmBtn.disabled = false;
        $('lockModalError').textContent = err.message || `${lock ? 'Khóa' : 'Mở khóa'} tài khoản thất bại.`;
        $('lockModalError').style.display = 'block';
    }
}

/* ===== BẢNG QUY ĐỔI ĐIỂM (PB-32): BE kiểm tra hợp lệ (phủ kín, không chồng lấn), FE chỉ hiện lỗi BE trả về ===== */
function scaleRowHtml(r = {}) {
    const num = (field, max, label) => `<input type="number" class="modal-input" data-field="${field}" min="0" max="${max}" step="0.1"
        value="${r[field] ?? ''}" aria-label="${label}" style="width: 110px; height: 38px;">`;
    return `<tr>
        <td><input type="text" class="modal-input" data-field="letter" maxlength="2" value="${escapeAttr(r.letter || '')}"
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
