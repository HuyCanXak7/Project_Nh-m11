/**
 * LOGIC QUẢN LÝ DANH SÁCH HỌC KỲ (SEMESTERS PAGE)
 * Phụ trách: PB-06 (Tạo), PB-07 (Xem danh sách), PB-08 (Sửa), PB-09 (Xóa Cascade)
 * Thành viên: FE Huỳnh Nhơn Nguyên Nghiệp (N25DTCN038)
 */

let currentDeletingSemId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSemesters();
});

// === 1. XEM DANH SÁCH HỌC KỲ & EMPTY / ERROR STATE (PB-07, PB-40) ===
function renderSemesters() {
  const container = document.getElementById('semesterGrid');
  if (!container) return;

  try {
    const semesters = StorageService.getSemesters();
    const allCourses = StorageService.getCourses();

    if (semesters.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state__icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round" style="margin: 0 auto;">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3 class="empty-state__title">Chưa có học kỳ nào</h3>
          <p class="empty-state__desc">Hệ thống chưa ghi nhận học kỳ của bạn. Hãy tạo học kỳ đầu tiên hoặc nạp dữ liệu mẫu để bắt đầu thêm môn học và theo dõi chỉ số điểm nhé!</p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button type="button" onclick="openCreateSemesterModal()" class="btn btn-primary">+ Tạo học kỳ đầu tiên</button>
            <button type="button" onclick="handleResetData()" class="btn btn-secondary">Nạp dữ liệu mẫu</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = semesters.map(sem => {
    const semCourses = allCourses.filter(c => c.semester_id === sem.id);
    const semGpaData = GradeCalculator.calculateSemesterGPA(semCourses);
    const totalCredits = semCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);

    return `
      <article class="semester-card">
        <div>
          <div class="semester-card__head">
            <h3 class="semester-card__name">${escapeHtml(sem.name)}</h3>
            <span class="semester-card__year">${escapeHtml(sem.academic_year)}</span>
          </div>

          <div class="semester-card__dates">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>${formatDate(sem.start_date)} — ${formatDate(sem.end_date)}</span>
          </div>

          <div class="semester-card__stats">
            <div>
              <div class="semester-card__stat-val">${semCourses.length}</div>
              <div class="semester-card__stat-label">Môn học</div>
            </div>
            <div>
              <div class="semester-card__stat-val">${totalCredits}</div>
              <div class="semester-card__stat-label">Tín chỉ</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--e-card); padding: 10px 14px; border: 1.5px solid rgba(59, 130, 246, 0.2); border-radius: 16px; margin-bottom: 16px;">
            <span style="font-size: 13px; font-weight: 600; color: var(--text-gray);">GPA Học Kỳ (Hệ 4):</span>
            <strong style="font-size: 16px; color: var(--primary); font-weight: 800;">${semGpaData.formattedGPA}</strong>
          </div>
        </div>

        <div class="semester-card__actions" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <a href="courses.html?semId=${sem.id}" class="btn btn-primary btn-sm" style="flex: 1; justify-content: center;">
            Quản lý môn
          </a>
          <button type="button" onclick="openEditSemesterModal('${sem.id}')" class="btn-action btn-action--edit" title="Sửa thông tin học kỳ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>Sửa</span>
          </button>
          <button type="button" onclick="openDeleteSemesterModal('${sem.id}')" class="btn-action btn-action--delete" title="Xóa học kỳ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            <span>Xóa</span>
          </button>
        </div>
      </article>
    `;
    }).join('');
  } catch (err) {
    console.error('Lỗi tải danh sách học kỳ:', err);
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; border-color: rgba(239, 68, 68, 0.45); background: #FEF2F2;">
        <h3 class="empty-state__title" style="color: #991B1B;">Không thể tải danh sách học kỳ</h3>
        <p class="empty-state__desc">Đã xảy ra lỗi khi đọc dữ liệu cục bộ. Vui lòng thử tải lại.</p>
        <button type="button" onclick="renderSemesters()" class="btn btn-primary btn-sm">Thử tải lại</button>
      </div>
    `;
  }
}

// === TẠO HỌC KỲ (Task: T0694C9 | PB-06) ===
function openCreateSemesterModal() {
  document.getElementById('semModalTitle').textContent = 'Tạo học kỳ mới';
  document.getElementById('semIdInput').value = '';
  document.getElementById('semNameInput').value = '';
  document.getElementById('semYearInput').value = '2025-2026';
  document.getElementById('semStartInput').value = new Date().toISOString().split('T')[0];
  
  const end = new Date();
  end.setMonth(end.getMonth() + 4);
  document.getElementById('semEndInput').value = end.toISOString().split('T')[0];
  
  hideSemDateError();
  openAppModal('semesterModal');
}

// === 2. SỬA HỌC KỲ (Task: T0694CC | PB-08) ===
function openEditSemesterModal(semId) {
  const sem = StorageService.getSemesterById(semId);
  if (!sem) return;

  document.getElementById('semModalTitle').textContent = 'Chỉnh sửa học kỳ';
  document.getElementById('semIdInput').value = sem.id;
  document.getElementById('semNameInput').value = sem.name;
  document.getElementById('semYearInput').value = sem.academic_year;
  document.getElementById('semStartInput').value = sem.start_date;
  document.getElementById('semEndInput').value = sem.end_date;

  hideSemDateError();
  openAppModal('semesterModal');
}

function handleSaveSemester(e) {
  e.preventDefault();
  const id = document.getElementById('semIdInput').value;
  const name = document.getElementById('semNameInput').value.trim();
  const academic_year = document.getElementById('semYearInput').value.trim();
  const start_date = document.getElementById('semStartInput').value;
  const end_date = document.getElementById('semEndInput').value;

  if (!name || !academic_year || !start_date || !end_date) {
    showToast('Vui lòng điền đầy đủ các thông tin bắt buộc!', true);
    return;
  }

  // Tiêu chí chấp nhận PB-06 / PB-08: Ngày kết thúc không được trước ngày bắt đầu
  if (end_date < start_date) {
    showSemDateError('Ngày kết thúc không được trước ngày bắt đầu!');
    return;
  }

  StorageService.saveSemester({
    id: id || undefined,
    name,
    academic_year,
    start_date,
    end_date
  });

  closeAppModal('semesterModal');
  renderSemesters();
  showToast(id ? 'Cập nhật học kỳ thành công!' : 'Tạo học kỳ mới thành công!');
}

function showSemDateError(msg) {
  const err = document.getElementById('semDateError');
  if (err) {
    err.textContent = `${msg}`;
    err.style.display = 'block';
  }
}

function hideSemDateError() {
  const err = document.getElementById('semDateError');
  if (err) err.style.display = 'none';
}

// === 3. XÓA DÂY CHUYỀN CASCADE (Task: T0694CD | PB-09, PB-46 / BR-17) ===
function openDeleteSemesterModal(semId) {
  const sem = StorageService.getSemesterById(semId);
  if (!sem) return;

  currentDeletingSemId = semId;
  const details = StorageService.getSemesterCascadeDetails(semId);

  document.getElementById('delTargetName').textContent = `"${sem.name} (${sem.academic_year})"`;
  document.getElementById('delCountCourses').textContent = details.courseCount;
  document.getElementById('delCountScores').textContent = details.componentCount;

  const listEl = document.getElementById('delCourseListPreview');
  if (details.courseCount > 0) {
    listEl.innerHTML = details.courseList.map(c => `<li>${escapeHtml(c)}</li>`).join('');
    listEl.style.display = 'block';
  } else {
    listEl.innerHTML = '<li>(Học kỳ này hiện chưa có môn học nào)</li>';
  }

  openAppModal('deleteConfirmModal');
}

function executeDeleteSemester() {
  if (!currentDeletingSemId) return;

  StorageService.deleteSemesterCascade(currentDeletingSemId);
  currentDeletingSemId = null;
  closeAppModal('deleteConfirmModal');
  renderSemesters();
  if (typeof refreshSidebarGoalWidget === 'function') refreshSidebarGoalWidget();
  showToast('Đã xóa học kỳ và toàn bộ dữ liệu môn học liên quan!');
}

// Helper formats
function formatDate(isoStr) {
  if (!isoStr) return '--';
  const parts = isoStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoStr;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
