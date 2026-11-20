/**
 * QUẢN LÝ & THEO DÕI TÀI KHOẢN SINH VIÊN (PB-29, PB-30, PB-31, PB-32, PB-33):
 * - Chỉ ADMIN được truy cập (mục 08 Tài khoản trên thanh điều hướng).
 * - Xem danh sách toàn bộ tài khoản, tìm kiếm theo email / họ tên / MSSV / ngành học.
 * - Lọc theo vai trò (STUDENT / ADMIN), trạng thái tài khoản (Hoạt động / Đã khóa) và tình trạng học tập (Cảnh báo học vụ / Học lực tốt).
 * - Theo dõi & kiểm tra chi tiết hồ sơ học tập của từng tài khoản sinh viên (GPA tích lũy, tín chỉ đạt, mục tiêu GPA, cảnh báo học vụ, bảng điểm từng học kỳ & môn học).
 * - Khóa / mở khóa tài khoản sinh viên kèm ghi nhận Audit Log.
 * - Xem bảng quy đổi thang điểm chuẩn (BR-04..06).
 */

const adminUser = requireAdmin();
let searchTimer;
let lastRequest = 0;
let cachedEnrichedUsers = [];
let pendingTarget = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!adminUser) return;
    sessionStorage.removeItem('adminViewAs'); // quay về trang này = thoát chế độ xem tài khoản khác

    $('userSearch')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadUsers, 250);
    });

    $('userRoleFilter')?.addEventListener('change', loadUsers);
    $('userStatusFilter')?.addEventListener('change', loadUsers);
    $('userAcademicFilter')?.addEventListener('change', renderFilteredTable);

    $('userTableBody')?.addEventListener('click', (e) => {
        const inspectBtn = e.target.closest('button[data-action="inspect"]');
        if (inspectBtn) {
            openInspectStudentModal(inspectBtn.dataset.id);
            return;
        }
        const viewAsBtn = e.target.closest('button[data-action="view-as"]');
        if (viewAsBtn) {
            viewUserData(viewAsBtn.dataset.id, viewAsBtn.dataset.email);
            return;
        }
        const lockBtn = e.target.closest('button[data-action="toggle-lock"]');
        if (lockBtn) {
            toggleActive(lockBtn);
            return;
        }
        const row = e.target.closest('tr[data-view-id]');
        if (row) {
            viewUserData(row.dataset.viewId, row.dataset.viewEmail);
        }
    });

    $('userTableBody')?.addEventListener('keydown', (e) => {
        const row = e.target.closest('tr[data-view-id]');
        if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            viewUserData(row.dataset.viewId, row.dataset.viewEmail);
        }
    });

    $('lockModalConfirm')?.addEventListener('click', confirmToggle);

    renderGradeScaleTable();
    loadUsers();
});

/**
 * Phân tích dữ liệu học tập của một tài khoản để Admin theo dõi & kiểm tra
 */
function buildStudentAcademicSummary(u) {
    const data = (typeof StorageService !== 'undefined' && typeof StorageService.getStudentDataByUser === 'function')
        ? StorageService.getStudentDataByUser(u)
        : { semesters: [], courses: [], student: {}, goal: null };

    const studentProfile = data.student || {};
    const courses = Array.isArray(data.courses) ? data.courses : [];
    const semesters = Array.isArray(data.semesters) ? data.semesters : [];
    const goal = data.goal || null;

    const studentCode = u.studentCode || studentProfile.student_id || (u.role === 'ADMIN' ? 'ADMIN-01' : 'Chưa cập nhật');
    const major = u.major || studentProfile.major || (u.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Công nghệ thông tin');
    const className = u.className || studentProfile.class_name || 'Chưa cập nhật';

    if (u.role === 'ADMIN') {
        return {
            ...u,
            studentCode,
            major,
            className,
            semesters: [],
            courses: [],
            goal: null,
            academic: {
                isAdmin: true,
                gpa4: null,
                avg10: null,
                passedCredits: 0,
                totalCredits: 0,
                courseCount: 0,
                completedCourses: 0,
                inProgressCourses: 0,
                failedCourses: 0,
                failedCourseNames: [],
                lowGpaSemesters: [],
                rank: 'Quản trị viên',
                hasWarning: false,
                warningReasons: []
            }
        };
    }

    const cum = (typeof GradeCalculator !== 'undefined')
        ? GradeCalculator.calculateCumulativeGPA(courses)
        : { cumulativeGPA: 0, cumulativeAvg10: 0, passedCredits: 0, totalCredits: 0, rank: '--', formattedGPA: '0.00', formattedAvg10: '0.00' };

    let completedCourses = 0;
    let inProgressCourses = 0;
    let failedCourses = 0;
    const failedCourseNames = [];

    courses.forEach((c) => {
        if (typeof GradeCalculator === 'undefined') return;
        const calc = GradeCalculator.calculateCourseFinalScore(c.components);
        if (!calc.isComplete || calc.finalScore10 === null) {
            inProgressCourses++;
        } else {
            completedCourses++;
            if (calc.finalScore10 < 4.0) {
                failedCourses++;
                failedCourseNames.push(`${c.course_code} (${c.course_name})`);
            }
        }
    });

    const lowGpaSemesters = [];
    semesters.forEach((sem) => {
        if (typeof GradeCalculator === 'undefined') return;
        const semCourses = courses.filter((c) => c.semester_id === sem.id);
        const semGpa = GradeCalculator.calculateSemesterGPA(semCourses);
        if (semGpa.totalCredits > 0 && semGpa.gpa < 2.0) {
            lowGpaSemesters.push(`${sem.name} (${sem.academic_year || ''}): GPA ${semGpa.formattedGPA}`);
        }
    });

    const warningReasons = [];
    if (cum.totalCredits > 0 && cum.cumulativeGPA < 2.0) {
        warningReasons.push(`GPA tích lũy thấp (${cum.formattedGPA} < 2.00)`);
    }
    if (failedCourses > 0) {
        warningReasons.push(`Rớt ${failedCourses} môn (${failedCourseNames.slice(0, 2).join(', ')})`);
    }
    if (lowGpaSemesters.length > 0 && warningReasons.length === 0) {
        warningReasons.push(`Có học kỳ GPA < 2.0 (${lowGpaSemesters[0]})`);
    }

    const hasWarning = warningReasons.length > 0;

    return {
        ...u,
        studentCode,
        major,
        className,
        semesters,
        courses,
        goal,
        academic: {
            isAdmin: false,
            gpa4: cum.cumulativeGPA,
            formattedGpa4: cum.formattedGPA,
            avg10: cum.cumulativeAvg10,
            formattedAvg10: cum.formattedAvg10,
            passedCredits: cum.passedCredits,
            totalCredits: cum.totalCredits,
            courseCount: courses.length,
            semesterCount: semesters.length,
            completedCourses,
            inProgressCourses,
            failedCourses,
            failedCourseNames,
            lowGpaSemesters,
            rank: cum.rank,
            hasWarning,
            warningReasons
        }
    };
}

/**
 * Cập nhật 4 thẻ KPI tổng quan hệ thống trên đầu trang Admin
 */
function updateAdminOverviewKpis(allUsers) {
    const total = allUsers.length;
    const students = allUsers.filter((u) => u.role !== 'ADMIN');
    const admins = allUsers.filter((u) => u.role === 'ADMIN');
    const activeCount = allUsers.filter((u) => u.isActive).length;
    const lockedCount = total - activeCount;

    const studentsWithGpa = students.filter((s) => s.academic && s.academic.totalCredits > 0);
    const avgGpa = studentsWithGpa.length > 0
        ? (studentsWithGpa.reduce((acc, s) => acc + (s.academic.gpa4 || 0), 0) / studentsWithGpa.length)
        : 0;

    const warningStudents = students.filter((s) => s.academic && s.academic.hasWarning);
    const goodStudents = studentsWithGpa.filter((s) => (s.academic.gpa4 || 0) >= 2.5);

    if ($('adminStatTotalUsers')) $('adminStatTotalUsers').textContent = total;
    if ($('adminStatRoleBreakdown')) {
        $('adminStatRoleBreakdown').textContent = `${students.length} Sinh viên · ${admins.length} Quản trị viên`;
    }

    if ($('adminStatActiveUsers')) $('adminStatActiveUsers').textContent = `${activeCount} / ${total}`;
    if ($('adminStatLockedNote')) {
        $('adminStatLockedNote').innerHTML = lockedCount > 0
            ? `<span style="color: var(--danger); font-weight: 700;">${lockedCount} tài khoản đang bị khóa</span>`
            : '100% tài khoản đang hoạt động bình thường';
    }

    if ($('adminStatAvgGpa')) $('adminStatAvgGpa').textContent = avgGpa.toFixed(2);
    if ($('adminStatPassRateNote')) {
        $('adminStatPassRateNote').textContent = studentsWithGpa.length > 0
            ? `${goodStudents.length}/${studentsWithGpa.length} SV đạt học lực Khá trở lên`
            : 'Chưa có dữ liệu điểm sinh viên';
    }

    if ($('adminStatWarningStudents')) {
        $('adminStatWarningStudents').textContent = warningStudents.length;
        $('adminStatWarningStudents').style.color = warningStudents.length > 0 ? 'var(--danger)' : '';
    }
    if ($('adminStatWarningNote')) {
        $('adminStatWarningNote').innerHTML = warningStudents.length > 0
            ? `<span style="color: var(--danger); font-weight: 700;">${warningStudents.length} sinh viên cần kiểm tra học vụ</span>`
            : 'Không có sinh viên nào bị cảnh báo học vụ';
    }
}

function setStateRow(html) {
    $('userTableBody').innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 28px;">${html}</td></tr>`;
}

async function loadUsers() {
    const q = ($('userSearch')?.value || '').trim();
    const role = $('userRoleFilter')?.value || 'ALL';
    const status = $('userStatusFilter')?.value || 'all';
    const requestId = ++lastRequest;

    setStateRow('Đang tải danh sách tài khoản và dữ liệu theo dõi sinh viên...');
    try {
        // Lấy toàn bộ danh sách để tính KPI tổng quan hệ thống chính xác
        const allRes = await apiFetch('/admin/users?q=');
        if (requestId !== lastRequest) return;

        const allEnriched = (allRes.items || []).map(buildStudentAcademicSummary);
        updateAdminOverviewKpis(allEnriched);

        // Lọc theo query, role, status
        const qLower = q.toLowerCase();
        cachedEnrichedUsers = allEnriched.filter((u) => {
            const matchQ = !qLower
                || (u.email || '').toLowerCase().includes(qLower)
                || (u.fullName || '').toLowerCase().includes(qLower)
                || (u.studentCode || '').toLowerCase().includes(qLower)
                || (u.major || '').toLowerCase().includes(qLower);
            const matchRole = role === 'ALL' || u.role === role;
            const matchStatus = status === 'all'
                || (status === 'active' && u.isActive)
                || (status === 'locked' && !u.isActive);
            return matchQ && matchRole && matchStatus;
        });

        renderFilteredTable();
    } catch (err) {
        if (requestId !== lastRequest) return;
        if (err.status === 403) {
            window.location.replace('dashboard.html');
            return;
        }
        setStateRow(`${escapeHtml(err.message || 'Không tải được danh sách tài khoản.')}
            <button type="button" class="btn btn-primary btn-sm" style="margin-left: 8px;" onclick="loadUsers()">Thử lại</button>`);
    }
}

function renderFilteredTable() {
    const academicFilter = $('userAcademicFilter')?.value || 'all';
    const q = ($('userSearch')?.value || '').trim();

    const filtered = cachedEnrichedUsers.filter((u) => {
        if (academicFilter === 'all') return true;
        if (u.role === 'ADMIN') return false;
        if (academicFilter === 'warning') return u.academic?.hasWarning;
        if (academicFilter === 'good') return (u.academic?.gpa4 || 0) >= 2.5 && !u.academic?.hasWarning;
        return true;
    });

    if ($('userCount')) {
        $('userCount').textContent = `Hiển thị ${filtered.length} tài khoản`;
    }

    if (!filtered.length) {
        setStateRow(
            q || academicFilter !== 'all'
                ? `Không tìm thấy tài khoản nào khớp bộ lọc hiện tại. <button type="button" class="btn btn-secondary btn-sm" style="margin-left: 8px;" onclick="resetAdminFilters()">Xóa bộ lọc</button>`
                : 'Chưa có tài khoản nào trong hệ thống.'
        );
        return;
    }

    $('userTableBody').innerHTML = filtered.map((u) => {
        const isSelf = u.id === adminUser.id;
        const ac = u.academic || {};
        const createdDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—';

        const roleBadge = u.role === 'ADMIN'
            ? `<span class="badge badge-blue">Quản trị (ADMIN)</span>`
            : `<span class="badge badge-gray">Sinh viên</span>`;

        const statusBadge = u.isActive
            ? `<span class="badge badge-green">● Hoạt động</span>`
            : `<span class="badge badge-red">✕ Đã khóa</span>`;

        let academicMetricsHtml = '<span style="color: var(--e-muted, #64748B); font-size: 12px;">Tài khoản quản trị</span>';
        let academicStatusHtml = '<span class="badge badge-blue">Hệ thống</span>';

        if (u.role !== 'ADMIN') {
            const gpaColor = ac.gpa4 >= 3.2 ? '#059669' : (ac.gpa4 < 2.0 ? '#DC2626' : 'var(--e-ink)');
            academicMetricsHtml = `
                <div style="line-height: 1.35;">
                    <div>GPA: <strong style="font-size: 13.5px; color: ${gpaColor};">${ac.formattedGpa4 || '0.00'}</strong> <span style="color: #64748B; font-size: 11.5px;">(Hệ 10: ${ac.formattedAvg10 || '0.00'})</span></div>
                    <div style="font-size: 11.5px; color: #64748B;">Tín chỉ đạt: <strong>${ac.passedCredits}/${ac.totalCredits} TC</strong> · ${ac.courseCount} môn</div>
                </div>
            `;

            if (ac.hasWarning) {
                academicStatusHtml = `
                    <div>
                        <span class="badge badge-red" title="${escapeHtml(ac.warningReasons.join(' | '))}">⚠ Cảnh báo học vụ</span>
                        <div style="font-size: 11px; color: #DC2626; margin-top: 3px; font-weight: 600;">${escapeHtml(ac.warningReasons[0] || '')}</div>
                    </div>
                `;
            } else {
                const rankBadgeClass = ac.gpa4 >= 3.2 ? 'badge-green' : (ac.gpa4 >= 2.5 ? 'badge-blue' : 'badge-orange');
                academicStatusHtml = `
                    <div>
                        <span class="badge ${rankBadgeClass}">✓ ${escapeHtml(ac.rank || 'Bình thường')}</span>
                        <div style="font-size: 11px; color: #64748B; margin-top: 3px;">${ac.inProgressCourses > 0 ? `Đang học ${ac.inProgressCourses} môn` : 'Đủ điểm các môn'}</div>
                    </div>
                `;
            }
        }

        const inspectBtnHtml = `
            <button type="button" class="btn-action btn-action--score" data-action="inspect" data-id="${escapeHtml(u.id)}" title="Kiểm tra hồ sơ & bảng điểm chi tiết">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Kiểm tra
            </button>
        `;

        const lockBtnHtml = isSelf
            ? `<span class="badge badge-gray" style="padding: 6px 10px;" title="Tài khoản đang đăng nhập">Tài khoản của bạn</span>`
            : `<button type="button" class="btn-action ${u.isActive ? 'btn-action--delete' : 'btn-action--edit'}"
                data-action="toggle-lock" data-id="${escapeHtml(u.id)}" data-active="${u.isActive}" data-email="${escapeHtml(u.email)}">
                ${u.isActive ? 'Khóa TK' : 'Mở khóa'}
               </button>`;

        return `
            <tr ${u.role === 'ADMIN' ? '' : `data-view-id="${escapeHtml(u.id)}" data-view-email="${escapeHtml(u.email)}" tabindex="0" style="cursor: pointer;" title="Bấm để xem điểm, môn học, học kỳ, mục tiêu của sinh viên này"`}>
                <td>
                    <div style="font-weight: 700; color: var(--e-ink);">${escapeHtml(u.email)}</div>
                    <div style="font-size: 11.5px; color: #64748B;">Tạo ngày: ${createdDate}</div>
                </td>
                <td>
                    <div style="font-weight: 700; color: var(--e-ink);">${escapeHtml(u.fullName)}</div>
                    <div style="font-size: 11.5px; color: #64748B;">Lớp: ${escapeHtml(u.className || '—')}</div>
                </td>
                <td>
                    <div class="course-code-cell" style="font-weight: 700; color: var(--e-ink);">${escapeHtml(u.studentCode || '—')}</div>
                    <div style="font-size: 11.5px; color: #64748B;">${escapeHtml(u.major || '—')}</div>
                </td>
                <td style="text-align: center;">${roleBadge}</td>
                <td style="text-align: center;">${academicMetricsHtml}</td>
                <td style="text-align: center;">${academicStatusHtml}</td>
                <td style="text-align: center;">${statusBadge}</td>
                <td style="text-align: right;">
                    <div class="btn-action-group">
                        ${inspectBtnHtml}
                        ${lockBtnHtml}
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function resetAdminFilters() {
    if ($('userSearch')) $('userSearch').value = '';
    if ($('userRoleFilter')) $('userRoleFilter').value = 'ALL';
    if ($('userStatusFilter')) $('userStatusFilter').value = 'all';
    if ($('userAcademicFilter')) $('userAcademicFilter').value = 'all';
    loadUsers();
}

/**
 * Mở Modal Theo dõi & Kiểm tra chi tiết tài khoản sinh viên (Hồ sơ, GPA, Cảnh báo học vụ, Bảng điểm các kỳ)
 */
function openInspectStudentModal(userId) {
    const u = cachedEnrichedUsers.find((item) => item.id === userId);
    if (!u) return;

    const ac = u.academic || {};
    $('inspectStudentTitle').textContent = `${u.fullName} (${u.studentCode || 'Chưa có MSSV'})`;
    $('inspectStudentMeta').innerHTML = `
        Email: <strong>${escapeHtml(u.email)}</strong> ·
        Ngành: <strong>${escapeHtml(u.major || 'Chưa cập nhật')}</strong> ·
        Lớp: <strong>${escapeHtml(u.className || 'Chưa cập nhật')}</strong> ·
        Trạng thái: <strong>${u.isActive ? 'Đang hoạt động' : 'Đã khóa'}</strong>
    `;

    const targetGpa = u.goal?.target_gpa ? Number(u.goal.target_gpa).toFixed(2) : 'Chưa đặt';

    $('inspectStudentKpiGrid').innerHTML = `
        <div style="padding: 14px 16px; border: 1px solid var(--e-border, #CBD5E1); background: var(--e-navy, #0F1F38); color: #FFFFFF;">
            <div style="font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75;">GPA TÍCH LŨY (HỆ 4)</div>
            <div style="font-size: 28px; font-weight: 800; margin-top: 4px;">${ac.formattedGpa4 || '0.00'}</div>
            <div style="font-size: 12px; opacity: 0.85; margin-top: 2px;">Xếp loại: <strong>${escapeHtml(ac.rank || '--')}</strong></div>
        </div>
        <div style="padding: 14px 16px; border: 1px solid var(--e-border, #CBD5E1); background: var(--e-card, #FFFFFF);">
            <div style="font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #64748B;">ĐIỂM TB TÍCH LŨY (HỆ 10)</div>
            <div style="font-size: 28px; font-weight: 800; margin-top: 4px; color: var(--e-ink);">${ac.formattedAvg10 || '0.00'}</div>
            <div style="font-size: 12px; color: #64748B; margin-top: 2px;">Mục tiêu GPA: <strong>${targetGpa}</strong></div>
        </div>
        <div style="padding: 14px 16px; border: 1px solid var(--e-border, #CBD5E1); background: var(--e-card, #FFFFFF);">
            <div style="font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #64748B;">TÍN CHỈ TÍCH LŨY ĐẠT</div>
            <div style="font-size: 28px; font-weight: 800; margin-top: 4px; color: var(--e-ink);">${ac.passedCredits || 0} <span style="font-size: 15px; font-weight: 600; color: #64748B;">/ ${ac.totalCredits || 0} TC</span></div>
            <div style="font-size: 12px; color: #64748B; margin-top: 2px;">${ac.semesterCount || 0} học kỳ · ${ac.courseCount || 0} môn học</div>
        </div>
        <div style="padding: 14px 16px; border: 1px solid var(--e-border, #CBD5E1); background: var(--e-card, #FFFFFF);">
            <div style="font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #64748B;">TIẾN ĐỘ MÔN HỌC</div>
            <div style="font-size: 24px; font-weight: 800; margin-top: 4px; color: var(--e-ink);">${ac.completedCourses || 0} hoàn thành</div>
            <div style="font-size: 12px; color: #64748B; margin-top: 2px;">${ac.inProgressCourses || 0} đang học · <strong style="color: ${ac.failedCourses > 0 ? '#DC2626' : '#059669'};">${ac.failedCourses || 0} môn rớt (F)</strong></div>
        </div>
    `;

    // Khối cảnh báo học vụ
    const alertBox = $('inspectStudentAlertBox');
    if (ac.hasWarning) {
        alertBox.innerHTML = `
            <div class="alert-box alert-danger" style="margin-bottom: 0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div>
                    <div style="font-weight: 800;">PHÁT HIỆN CẢNH BÁO HỌC VỤ CẦN THEO DÕI (BR-16):</div>
                    <div style="font-size: 13px; margin-top: 2px;">${ac.warningReasons.map(escapeHtml).join(' • ')}</div>
                </div>
            </div>
        `;
    } else {
        alertBox.innerHTML = `
            <div style="padding: 12px 16px; border: 1px solid #6EE7B7; background: rgba(16, 185, 129, 0.1); color: #059669; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                <span>✓</span>
                <span>Tình trạng học tập ổn định: Sinh viên đạt chuẩn tiến độ và không có cảnh báo học vụ.</span>
            </div>
        `;
    }

    // Danh sách học kỳ & môn học của sinh viên
    const semContainer = $('inspectStudentSemestersBox');
    const semesters = u.semesters || [];
    const courses = u.courses || [];

    if (!semesters.length && !courses.length) {
        semContainer.innerHTML = `
            <div class="empty-state" style="padding: 32px 16px;">
                <p class="empty-state__desc" style="margin-bottom: 0;">Tài khoản này hiện chưa có dữ liệu học kỳ hoặc môn học nào.</p>
            </div>
        `;
    } else {
        semContainer.innerHTML = semesters.map((sem) => {
            const semCourses = courses.filter((c) => c.semester_id === sem.id);
            const semCalc = (typeof GradeCalculator !== 'undefined')
                ? GradeCalculator.calculateSemesterGPA(semCourses)
                : { formattedGPA: '0.00', formattedAvg10: '0.00', passedCredits: 0, registeredCredits: 0 };

            return `
                <div style="border: 1px solid var(--e-border, #CBD5E1); margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--e-card-alt, #F8FAFC); border-bottom: 1px solid var(--e-border, #CBD5E1); flex-wrap: wrap; gap: 8px;">
                        <div>
                            <strong style="font-size: 14px; color: var(--e-ink);">${escapeHtml(sem.name)} (${escapeHtml(sem.academic_year || '')})</strong>
                            <span style="font-size: 12px; color: #64748B; margin-left: 8px;">${semCourses.length} môn học</span>
                        </div>
                        <div style="font-size: 12px; display: flex; gap: 12px; flex-wrap: wrap;">
                            <span>GPA Kỳ: <strong style="color: ${Number(semCalc.gpa) < 2.0 && semCalc.totalCredits > 0 ? '#DC2626' : 'var(--e-ink)'};">${semCalc.formattedGPA}</strong></span>
                            <span>ĐTB Hệ 10: <strong>${semCalc.formattedAvg10}</strong></span>
                            <span>Tín chỉ đạt: <strong>${semCalc.passedCredits}/${semCalc.registeredCredits} TC</strong></span>
                        </div>
                    </div>
                    <div class="table-wrap" style="border: none;">
                        <table class="app-table course-figma-table">
                            <thead>
                                <tr>
                                    <th style="width: 90px;">MÃ MÔN</th>
                                    <th>TÊN MÔN HỌC</th>
                                    <th style="width: 70px; text-align: center;">TÍN CHỈ</th>
                                    <th>ĐIỂM THÀNH PHẦN</th>
                                    <th style="width: 85px; text-align: center;">HỆ 10</th>
                                    <th style="width: 80px; text-align: center;">ĐIỂM CHỮ</th>
                                    <th style="width: 95px; text-align: center;">KẾT QUẢ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${semCourses.length === 0 ? `
                                    <tr><td colspan="7" style="text-align: center; padding: 14px; color: #64748B;">Chưa có môn học trong học kỳ này</td></tr>
                                ` : semCourses.map((c) => {
                                    const calc = GradeCalculator.calculateCourseFinalScore(c.components);
                                    const grade = GradeCalculator.convertScore10(calc.finalScore10);
                                    const compsText = (c.components || []).map((cp) => {
                                        const has = cp.score !== null && cp.score !== undefined && cp.score !== '';
                                        return `${escapeHtml(cp.name)} (${cp.weight_percent}%): <strong>${has ? Number(cp.score).toFixed(1) : '—'}</strong>`;
                                    }).join(' · ');

                                    return `
                                        <tr>
                                            <td class="course-code-cell">${escapeHtml(c.course_code)}</td>
                                            <td>
                                                <strong style="color: var(--e-ink);">${escapeHtml(c.course_name)}</strong>
                                                ${c.is_retake ? '<span class="badge badge-orange" style="margin-left: 6px; font-size: 10px;">Học lại</span>' : ''}
                                            </td>
                                            <td style="text-align: center; font-weight: 700;">${c.credits}</td>
                                            <td style="font-size: 11.5px; color: #64748B;">${compsText || 'Chưa cấu hình'}</td>
                                            <td style="text-align: center; font-weight: 800; color: ${calc.isComplete && calc.finalScore10 < 4.0 ? '#DC2626' : 'var(--e-ink)'};">
                                                ${calc.isComplete ? calc.finalScore10.toFixed(1) : '—'}
                                            </td>
                                            <td style="text-align: center;">
                                                ${calc.isComplete ? `<span class="badge ${grade.colorClass}">${grade.letter} (${grade.scale4.toFixed(1)})</span>` : '—'}
                                            </td>
                                            <td style="text-align: center;">
                                                <span class="badge ${calc.isComplete ? grade.colorClass : 'badge-gray'}">
                                                    ${calc.isComplete ? grade.status : 'Đang học'}
                                                </span>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');
    }

    const footerAction = $('inspectStudentFooterAction');
    if (footerAction) {
        if (u.id === adminUser.id) {
            footerAction.innerHTML = `<span style="font-size: 12.5px; color: #64748B;">Đang xem dữ liệu trên tài khoản Quản trị của bạn.</span>`;
        } else {
            footerAction.innerHTML = `
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button type="button" class="btn btn-primary btn-sm"
                        onclick="viewUserData('${escapeHtml(u.id)}', '${escapeHtml(u.email)}')">
                        Mở trang Môn học &amp; Điểm của SV này →
                    </button>
                    <button type="button" class="btn ${u.isActive ? 'btn-danger' : 'btn-secondary'} btn-sm"
                        onclick="closeAppModal('inspectStudentModal'); toggleActiveById('${escapeHtml(u.id)}')">
                        ${u.isActive ? 'Khóa tài khoản sinh viên này' : 'Mở khóa tài khoản sinh viên này'}
                    </button>
                </div>
            `;
        }
    }

    openAppModal('inspectStudentModal');
}

// Mở trang Môn học dưới dữ liệu của tài khoản được chọn (StorageService đọc khóa adminViewAs)
function viewUserData(id, email) {
    sessionStorage.setItem('adminViewAs', JSON.stringify({ id, email }));
    window.location.href = 'courses.html';
}

function toggleActiveById(userId) {
    const u = cachedEnrichedUsers.find((item) => item.id === userId);
    if (!u) return;
    openLockConfirmModal({ id: u.id, email: u.email, active: u.isActive });
}

function toggleActive(btn) {
    openLockConfirmModal({
        id: btn.dataset.id,
        email: btn.dataset.email,
        active: btn.dataset.active === 'true'
    });
}

function openLockConfirmModal({ id, email, active }) {
    const lock = Boolean(active);
    pendingTarget = { id, lock };
    $('lockModalBox').classList.toggle('modal--error', lock);
    $('lockModalTitle').textContent = lock ? 'Khóa tài khoản' : 'Mở khóa tài khoản';
    $('lockModalMessage').innerHTML = `Bạn có chắc muốn ${lock ? 'khóa' : 'mở khóa'} tài khoản <strong>${escapeHtml(email)}</strong>?`
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
        if (typeof showToast === 'function') {
            showToast(lock ? 'Đã khóa tài khoản và thu hồi phiên đăng nhập!' : 'Đã mở khóa tài khoản thành công!');
        }
        loadUsers();
    } catch (err) {
        if (err.status === 403) return window.location.replace('dashboard.html');
        confirmBtn.disabled = false;
        $('lockModalError').textContent = err.message || `${lock ? 'Khóa' : 'Mở khóa'} tài khoản thất bại.`;
        $('lockModalError').style.display = 'block';
    }
}

/**
 * Hiển thị bảng quy đổi thang điểm chuẩn (PB-32)
 */
function renderGradeScaleTable() {
    const tbody = $('gradeScaleTableBody');
    if (!tbody || typeof GradeCalculator === 'undefined') return;

    tbody.innerHTML = GradeCalculator.GRADE_SCALE.map((item) => `
        <tr>
            <td style="font-weight: 800; color: var(--e-ink);">${item.min.toFixed(1)} – ${item.max.toFixed(1)}</td>
            <td style="text-align: center;"><span class="badge ${item.colorClass}">${escapeHtml(item.letter)}</span></td>
            <td style="text-align: center; font-weight: 800;">${item.scale4.toFixed(1)}</td>
            <td>${escapeHtml(item.label)}</td>
            <td style="text-align: center;"><span class="badge ${item.colorClass}">${escapeHtml(item.status)}</span></td>
        </tr>
    `).join('');
}

/**
 * Mở Modal Nhật ký quản trị (Audit Log - PB-30)
 */
async function openAuditLogModal() {
    const tbody = $('auditLogTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Đang tải nhật ký quản trị...</td></tr>`;
    }
    openAppModal('auditLogModal');

    try {
        const res = await apiFetch('/admin/audit-logs');
        const logs = res.items || [];
        if (!logs.length) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: #64748B;">Chưa có thao tác khóa/mở khóa tài khoản nào được ghi nhận.</td></tr>`;
            return;
        }
        tbody.innerHTML = logs.map((log) => {
            const timeStr = log.at ? new Date(log.at).toLocaleString('vi-VN') : '—';
            const isLock = log.action === 'USER_LOCK';
            const badge = isLock
                ? `<span class="badge badge-red">Khóa tài khoản (USER_LOCK)</span>`
                : `<span class="badge badge-green">Mở khóa (USER_UNLOCK)</span>`;
            return `
                <tr>
                    <td style="font-size: 12px; color: #64748B;">${escapeHtml(timeStr)}</td>
                    <td>${badge}</td>
                    <td>
                        <strong>${escapeHtml(log.targetEmail || log.targetId)}</strong>
                        ${log.targetName ? `<div style="font-size: 11.5px; color: #64748B;">${escapeHtml(log.targetName)}</div>` : ''}
                    </td>
                    <td style="font-size: 12.5px;">${escapeHtml(log.actorEmail || 'Quản trị viên')}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--danger);">${escapeHtml(err.message || 'Không thể tải nhật ký quản trị.')}</td></tr>`;
        }
    }
}

/**
 * Tạo nhanh 3 tài khoản sinh viên mẫu với các mức học lực khác nhau (Xuất sắc, Khá, Cảnh báo học vụ)
 * để Admin demo và kiểm tra tính năng theo dõi sinh viên ngay lập tức.
 */
async function seedDemoStudentsForAdmin() {
    try {
        const rawDb = localStorage.getItem('mockDb');
        const db = rawDb ? JSON.parse(rawDb) : { users: [], refreshTokens: {}, accessTokens: {}, attempts: {} };

        const demoAccounts = [
            {
                id: 'demo_sv_xuatsac',
                email: 'minhanh.sv@studylims.edu.vn',
                fullName: 'Trần Minh Anh',
                studentCode: '2251120015',
                major: 'Kỹ thuật phần mềm',
                className: 'CNTT-K25A',
                role: 'STUDENT',
                isActive: true,
                createdAt: '2026-09-05T08:30:00.000Z',
                semesters: [
                    { id: 's_ma_1', name: 'Học kỳ 1', academic_year: '2025-2026', start_date: '2025-09-01', end_date: '2026-01-15' },
                    { id: 's_ma_2', name: 'Học kỳ 2', academic_year: '2025-2026', start_date: '2026-02-01', end_date: '2026-06-15' }
                ],
                courses: [
                    {
                        id: 'c_ma_1', semester_id: 's_ma_1', course_code: 'INT1101', course_name: 'Tin học cơ sở 1', credits: 3, category: 'Cơ sở ngành', is_retake: false,
                        components: [{ id: '1', name: 'Quá trình', weight_percent: 10, score: 9.5 }, { id: '2', name: 'Giữa kỳ', weight_percent: 30, score: 9.0 }, { id: '3', name: 'Cuối kỳ', weight_percent: 60, score: 9.2 }]
                    },
                    {
                        id: 'c_ma_2', semester_id: 's_ma_1', course_code: 'INT1306', course_name: 'Cấu trúc dữ liệu và giải thuật', credits: 4, category: 'Cơ sở ngành', is_retake: false,
                        components: [{ id: '4', name: 'Quá trình', weight_percent: 10, score: 9.0 }, { id: '5', name: 'Giữa kỳ', weight_percent: 30, score: 8.8 }, { id: '6', name: 'Cuối kỳ', weight_percent: 60, score: 9.0 }]
                    },
                    {
                        id: 'c_ma_3', semester_id: 's_ma_2', course_code: 'INT1302', course_name: 'Phát triển ứng dụng Web', credits: 3, category: 'Chuyên ngành', is_retake: false,
                        components: [{ id: '7', name: 'Quá trình', weight_percent: 10, score: 9.0 }, { id: '8', name: 'Giữa kỳ', weight_percent: 30, score: 8.5 }, { id: '9', name: 'Cuối kỳ', weight_percent: 60, score: 8.8 }]
                    }
                ]
            },
            {
                id: 'demo_sv_canhbao',
                email: 'quocbao.sv@studylims.edu.vn',
                fullName: 'Lê Quốc Bảo',
                studentCode: '2251120089',
                major: 'Hệ thống thông tin',
                className: 'HTTT-K25B',
                role: 'STUDENT',
                isActive: true,
                createdAt: '2026-09-10T10:15:00.000Z',
                semesters: [
                    { id: 's_qb_1', name: 'Học kỳ 1', academic_year: '2025-2026', start_date: '2025-09-01', end_date: '2026-01-15' }
                ],
                courses: [
                    {
                        id: 'c_qb_1', semester_id: 's_qb_1', course_code: 'BAS1101', course_name: 'Giải tích 1', credits: 4, category: 'Đại cương', is_retake: false,
                        components: [{ id: '1', name: 'Quá trình', weight_percent: 10, score: 4.0 }, { id: '2', name: 'Giữa kỳ', weight_percent: 30, score: 3.5 }, { id: '3', name: 'Cuối kỳ', weight_percent: 60, score: 3.0 }]
                    },
                    {
                        id: 'c_qb_2', semester_id: 's_qb_1', course_code: 'INT1101', course_name: 'Tin học cơ sở 1', credits: 3, category: 'Cơ sở ngành', is_retake: false,
                        components: [{ id: '4', name: 'Quá trình', weight_percent: 10, score: 5.5 }, { id: '5', name: 'Giữa kỳ', weight_percent: 30, score: 5.0 }, { id: '6', name: 'Cuối kỳ', weight_percent: 60, score: 4.5 }]
                    },
                    {
                        id: 'c_qb_3', semester_id: 's_qb_1', course_code: 'BAS1102', course_name: 'Đại số tuyến tính', credits: 3, category: 'Đại cương', is_retake: false,
                        components: [{ id: '7', name: 'Quá trình', weight_percent: 10, score: 3.5 }, { id: '8', name: 'Giữa kỳ', weight_percent: 30, score: 3.0 }, { id: '9', name: 'Cuối kỳ', weight_percent: 60, score: 3.5 }]
                    }
                ]
            },
            {
                id: 'demo_sv_kha',
                email: 'hoangnam.sv@studylims.edu.vn',
                fullName: 'Phạm Hoàng Nam',
                studentCode: '2251120142',
                major: 'Khoa học máy tính',
                className: 'KHMT-K25A',
                role: 'STUDENT',
                isActive: false,
                createdAt: '2026-09-12T14:20:00.000Z',
                semesters: [
                    { id: 's_hn_1', name: 'Học kỳ 1', academic_year: '2025-2026', start_date: '2025-09-01', end_date: '2026-01-15' }
                ],
                courses: [
                    {
                        id: 'c_hn_1', semester_id: 's_hn_1', course_code: 'INT1201', course_name: 'Kỹ thuật lập trình', credits: 3, category: 'Cơ sở ngành', is_retake: false,
                        components: [{ id: '1', name: 'Quá trình', weight_percent: 10, score: 7.5 }, { id: '2', name: 'Giữa kỳ', weight_percent: 30, score: 7.0 }, { id: '3', name: 'Cuối kỳ', weight_percent: 60, score: 7.2 }]
                    },
                    {
                        id: 'c_hn_2', semester_id: 's_hn_1', course_code: 'INT1204', course_name: 'Mạng máy tính', credits: 4, category: 'Cơ sở ngành', is_retake: false,
                        components: [{ id: '4', name: 'Quá trình', weight_percent: 10, score: 7.0 }, { id: '5', name: 'Giữa kỳ', weight_percent: 30, score: 6.8 }, { id: '6', name: 'Cuối kỳ', weight_percent: 60, score: 7.0 }]
                    }
                ]
            }
        ];

        let addedCount = 0;
        demoAccounts.forEach((demo) => {
            const existing = db.users.find((u) => u.email.toLowerCase() === demo.email.toLowerCase());
            const targetId = existing ? existing.id : demo.id;
            if (!existing) {
                db.users.push({
                    id: demo.id,
                    email: demo.email,
                    fullName: demo.fullName,
                    studentCode: demo.studentCode,
                    major: demo.major,
                    className: demo.className,
                    passwordHash: 'demo_hash_student',
                    role: demo.role,
                    isActive: demo.isActive,
                    createdAt: demo.createdAt
                });
                addedCount++;
            } else {
                existing.studentCode = demo.studentCode;
                existing.major = demo.major;
                existing.className = demo.className;
            }

            localStorage.setItem(`app_semesters_${targetId}`, JSON.stringify(demo.semesters));
            localStorage.setItem(`app_courses_${targetId}`, JSON.stringify(demo.courses));
            localStorage.setItem(`app_student_profile_${targetId}`, JSON.stringify({
                student_id: demo.studentCode,
                name: demo.fullName,
                email: demo.email,
                major: demo.major,
                class_name: demo.className
            }));
        });

        localStorage.setItem('mockDb', JSON.stringify(db));
        if (typeof showToast === 'function') {
            showToast(addedCount > 0 ? `Đã nạp ${addedCount} tài khoản sinh viên mẫu để Admin theo dõi & kiểm tra!` : 'Đã làm mới dữ liệu học tập cho các tài khoản sinh viên mẫu!');
        }
        loadUsers();
    } catch (err) {
        console.error('Lỗi tạo SV mẫu:', err);
    }
}
