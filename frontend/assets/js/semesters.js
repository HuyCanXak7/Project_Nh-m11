/**
 * LOGIC QUẢN LÝ DANH SÁCH HỌC KỲ (SEMESTERS PAGE)
 * Phụ trách: PB-06 (Tạo), PB-07 (Xem danh sách), PB-08 (Sửa), PB-09 (Xóa Cascade)
 * Thành viên: FE Huỳnh Nhơn Nguyên Nghiệp (N25DTCN038)
 */

let currentDeletingSemId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSemesters();
});

// === 1. XEM DANH SÁCH HỌC KỲ & EMPTY STATE (PB-07) ===
function renderSemesters() {
  const container = document.getElementById('semesterGrid');
  if (!container) return;

  const semesters = StorageService.getSemesters();
  const allCourses = StorageService.getCourses();

  if (semesters.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon"></div>
        <h3 class="empty-state__title">Chưa có học kỳ nào</h3>
        <p class="empty-state__desc">Hệ thống chưa ghi nhận học kỳ của bạn. Hãy tạo học kỳ đầu tiên để bắt đầu thêm môn học và theo dõi chỉ số điểm nhé!</p>
        <button type="button" onclick="openCreateSemesterModal()" class="btn btn-primary">+ Tạo học kỳ đầu tiên</button>
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

          <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px 14px; border: 1.5px solid rgba(59, 130, 246, 0.2); border-radius: 16px; margin-bottom: 16px;">
            <span style="font-size: 13px; font-weight: 600; color: var(--text-gray);">GPA Học Kỳ (Hệ 4):</span>
            <strong style="font-size: 16px; color: var(--primary); font-weight: 800;">${semGpaData.formattedGPA}</strong>
          </div>
        </div>

        <div class="semester-card__actions">
          <a href="courses.html?semId=${sem.id}" class="btn btn-primary btn-sm" style="flex: 1;">
            Quản lý môn
          </a>
          <button type="button" onclick="openEditSemesterModal('${sem.id}')" class="btn btn-secondary btn-sm" title="Sửa thông tin học kỳ">
            Sửa
          </button>
          <button type="button" onclick="openDeleteSemesterModal('${sem.id}')" class="btn btn-danger btn-sm" title="Xóa học kỳ">
            Xóa
          </button>
        </div>
      </article>
    `;
  }).join('');
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
