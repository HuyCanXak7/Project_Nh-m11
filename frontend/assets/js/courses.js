/**
 * LOGIC QUẢN LÝ MÔN HỌC & ĐIỂM SỐ (COURSES PAGE)
 * Phụ trách: PB-10 (Tạo môn), PB-11 (Xem), PB-12 (Sửa/Xóa Cascade), PB-13 (Tìm kiếm/Lọc),
 *            PB-14 (Trọng số 100%), PB-15 (Nhập điểm 0-10), PB-16 (Tính điểm), PB-17 (Quy đổi Hệ 4), PB-50 (Học lại)
 * Thành viên: FE Huỳnh Nhơn Nguyên Nghiệp (N25DTCN038)
 */

let currentCourseList = [];
let currentDeletingCourseId = null;
let currentConfiguringCourse = null;

document.addEventListener('DOMContentLoaded', () => {
  initSemesterFilterOptions();
  
  // Kiểm tra query parameter ?semId=
  const params = new URLSearchParams(window.location.search);
  const semIdParam = params.get('semId');
  if (semIdParam) {
    const filterEl = document.getElementById('filterSemester');
    if (filterEl) filterEl.value = semIdParam;
    const btnClear = document.getElementById('btnClearFilter');
    if (btnClear) btnClear.style.display = 'inline-flex';
  }

  renderCourses();
});

// === 1. TÌM KIẾM VÀ LỌC MÔN HỌC (PB-13) ===
function initSemesterFilterOptions() {
  const semesters = StorageService.getSemesters();
  const selectFilter = document.getElementById('filterSemester');
  const modalSemSelect = document.getElementById('courseSemSelect');

  const optionsHtml = semesters.map(s => `
    <option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.academic_year)})</option>
  `).join('');

  if (selectFilter) {
    selectFilter.innerHTML = '<option value="">Tất cả học kỳ</option>' + optionsHtml;
  }
  if (modalSemSelect) {
    modalSemSelect.innerHTML = optionsHtml;
  }
}

// === BỘ LỌC VÀ TÌM KIẾM MÔN HỌC (Task: T0694D1 | PB-13) ===
function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function handleFilterChange() {
  const searchKey = (document.getElementById('searchCourseInput')?.value || '').trim();
  const filterSemId = document.getElementById('filterSemester')?.value || '';
  const filterCategory = document.getElementById('filterCategory')?.value || '';
  const btnClear = document.getElementById('btnClearFilter');

  if (btnClear) {
    btnClear.style.display = (searchKey || filterSemId || filterCategory) ? 'inline-flex' : 'none';
  }

  renderCourses();
}

function handleClearFilter() {
  const searchInput = document.getElementById('searchCourseInput');
  const semFilter = document.getElementById('filterSemester');
  const catFilter = document.getElementById('filterCategory');
  const btnClear = document.getElementById('btnClearFilter');

  if (searchInput) searchInput.value = '';
  if (semFilter) semFilter.value = '';
  if (catFilter) catFilter.value = '';
  if (btnClear) btnClear.style.display = 'none';

  renderCourses();
  showToast('Đã xóa điều kiện lọc, danh sách đầy đủ đã được hiển thị!');
}

// === 2. XEM VÀ QUẢN LÝ DANH SÁCH MÔN HỌC (Task: T0694CF | PB-11, PB-50) ===
function renderCourses() {
  const tbody = document.getElementById('courseTableBody');
  if (!tbody) return;

  const allCourses = StorageService.getCourses();
  const semesters = StorageService.getSemesters();
  
  const rawSearch = (document.getElementById('searchCourseInput')?.value || '').trim();
  const searchKey = rawSearch.toLowerCase();
  const searchKeyClean = removeVietnameseTones(rawSearch);
  const filterSemId = document.getElementById('filterSemester')?.value || '';
  const filterCategory = document.getElementById('filterCategory')?.value || '';

  // Tiêu chí chấp nhận PB-13: Khớp từ khóa mã/tên môn, lọc theo loại môn (Đại cương/Cơ sở ngành/Chuyên ngành)
  currentCourseList = allCourses.filter(c => {
    const code = (c.course_code || '').toLowerCase();
    const name = (c.course_name || '').toLowerCase();
    const nameClean = removeVietnameseTones(c.course_name || '');

    const matchSearch = !rawSearch ||
      code.includes(searchKey) ||
      name.includes(searchKey) ||
      nameClean.includes(searchKeyClean);

    const matchSem = !filterSemId || c.semester_id === filterSemId;
    const matchCat = !filterCategory || c.category === filterCategory;

    return matchSearch && matchSem && matchCat;
  });

  // Hiển thị thống kê số lượng khớp bộ lọc
  const statsBadge = document.getElementById('filterStatsBadge');
  if (statsBadge) {
    if (rawSearch || filterSemId || filterCategory) {
      statsBadge.innerHTML = `Tìm thấy: <strong style="color: var(--primary);">${currentCourseList.length}</strong>/${allCourses.length} môn`;
    } else {
      statsBadge.innerHTML = `Tổng cộng: <strong>${allCourses.length}</strong> môn`;
    }
  }

  // Tiêu chí chấp nhận PB-13 & PB-40: Trạng thái rỗng và xóa điều kiện lọc
  if (currentCourseList.length === 0) {
    const hasFilter = !!(rawSearch || filterSemId || filterCategory);
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state" style="padding: 40px 16px; margin: 10px 0;">
            <div class="empty-state__icon">
              <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto;">
                <path d="M3 4h8v16H3zM11 4h10v16H11z"/>
              </svg>
            </div>
            <h4 class="empty-state__title">${hasFilter ? 'Không tìm thấy môn học nào phù hợp' : 'Chưa có môn học nào'}</h4>
            <p class="empty-state__desc">
              ${hasFilter
                ? 'Không có môn học nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại. Bạn có thể xóa điều kiện lọc để hiển thị lại toàn bộ môn học.'
                : 'Tài khoản của bạn chưa có môn học nào. Hãy thêm môn học đầu tiên, nhập từ CSV/Excel hoặc nạp dữ liệu mẫu để bắt đầu!'}
            </p>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 12px;">
              ${hasFilter ? '<button type="button" onclick="handleClearFilter()" class="btn btn-secondary btn-sm">✕ Xóa điều kiện lọc</button>' : '<button type="button" onclick="handleResetData()" class="btn btn-secondary btn-sm">Nạp dữ liệu mẫu</button>'}
              <button type="button" onclick="openCreateCourseModal()" class="btn btn-primary btn-sm">+ Thêm môn học</button>
            </div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = currentCourseList.map(c => {
    const sem = semesters.find(s => s.id === c.semester_id);
    const semName = sem ? `${sem.name}` : '--';
    const scoreCalc = GradeCalculator.calculateCourseFinalScore(c.components);
    const grade = GradeCalculator.convertScore10(scoreCalc.finalScore10);

    // Huy hiệu loại môn
    let catBadge = 'badge-blue';
    if (c.category === 'Cơ sở ngành') catBadge = 'badge-orange';
    if (c.category === 'Chuyên ngành') catBadge = 'badge-green';

    return `
      <tr>
        <td style="font-family: monospace; font-weight: 800; color: var(--primary);">
          ${escapeHtml(c.course_code)}
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-black);">${escapeHtml(c.course_name)}</div>
          ${c.is_retake ? '<span class="badge badge-orange" style="margin-top: 4px;">Học lại</span>' : ''}
        </td>
        <td><span class="badge badge-gray">${escapeHtml(semName)}</span></td>
        <td style="text-align: center; font-weight: 700;">${c.credits} TC</td>
        <td><span class="badge ${catBadge}">${escapeHtml(c.category)}</span></td>
        <td>
          <button type="button" onclick="openComponentsModal('${c.id}')" class="btn btn-secondary btn-sm" style="font-size: 11.5px; padding: 4px 10px;">
            ${(c.components || []).length} cột điểm (${scoreCalc.totalWeight}%)
          </button>
        </td>
        <td style="text-align: center; font-weight: 800; font-size: 15px;">
          ${scoreCalc.isComplete
            ? scoreCalc.finalScore10.toFixed(1)
            : (!scoreCalc.isValidWeight
                ? '<span style="color: var(--error); font-size: 12px; font-weight: 700;">Sai trọng số</span>'
                : '<span style="color: var(--text-gray); font-size: 12px; font-weight: 500;">Chưa đủ</span>')}
        </td>
        <td style="text-align: center;">
          ${scoreCalc.isComplete
            ? `<span class="badge ${grade.colorClass}">${grade.letter} (${grade.scale4.toFixed(1)})</span>`
            : `<span class="badge ${!scoreCalc.isValidWeight ? 'badge-red' : 'badge-gray'}">${!scoreCalc.isValidWeight ? 'Lỗi TS' : '--'}</span>`}
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <div class="btn-action-group">
            <button type="button" onclick="openScoreModal('${c.id}')" class="btn-action btn-action--score" title="Nhập / Sửa điểm thành phần">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>Điểm</span>
            </button>
            <button type="button" onclick="openEditCourseModal('${c.id}')" class="btn-action btn-action--edit" title="Chỉnh sửa thông tin môn học">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Sửa</span>
            </button>
            <button type="button" onclick="openDeleteCourseModal('${c.id}')" class="btn-action btn-action--delete" title="Xóa môn học">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              <span>Xóa</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// === 3. TẠO & SỬA MÔN HỌC (PB-10, PB-12, PB-50) ===
function openCreateCourseModal() {
  const semesters = StorageService.getSemesters();
  if (semesters.length === 0) {
    showToast('Vui lòng tạo ít nhất một học kỳ trước khi thêm môn học!', true);
    return;
  }

  document.getElementById('courseModalTitle').textContent = 'Thêm môn học mới';
  document.getElementById('courseIdInput').value = '';
  document.getElementById('courseCodeInput').value = '';
  document.getElementById('courseNameInput').value = '';
  document.getElementById('courseCreditsInput').value = '3';
  document.getElementById('courseCatSelect').value = 'Đại cương';
  document.getElementById('courseRetakeCheckbox').checked = false;

  const filterSemId = document.getElementById('filterSemester')?.value;
  if (filterSemId) {
    document.getElementById('courseSemSelect').value = filterSemId;
  }

  openAppModal('courseModal');
}

// === SỬA VÀ XÓA MÔN HỌC CASCADE (Task: T0694D0 | PB-12, PB-46 / BR-18) ===
function openEditCourseModal(courseId) {
  const course = StorageService.getCourseById(courseId);
  if (!course) return;

  document.getElementById('courseModalTitle').textContent = 'Chỉnh sửa môn học';
  document.getElementById('courseIdInput').value = course.id;
  document.getElementById('courseCodeInput').value = course.course_code;
  document.getElementById('courseNameInput').value = course.course_name;
  document.getElementById('courseSemSelect').value = course.semester_id;
  document.getElementById('courseCreditsInput').value = course.credits;
  document.getElementById('courseCatSelect').value = course.category;
  document.getElementById('courseRetakeCheckbox').checked = !!course.is_retake;

  openAppModal('courseModal');
}

function handleSaveCourse(e) {
  e.preventDefault();
  const id = document.getElementById('courseIdInput').value;
  const course_code = document.getElementById('courseCodeInput').value.trim().toUpperCase();
  const course_name = document.getElementById('courseNameInput').value.trim();
  const semester_id = document.getElementById('courseSemSelect').value;
  const credits = Number(document.getElementById('courseCreditsInput').value);
  const category = document.getElementById('courseCatSelect').value;
  const is_retake = document.getElementById('courseRetakeCheckbox').checked;

  if (!course_code || !course_name || !semester_id) {
    showToast('Vui lòng điền đủ mã môn, tên môn và chọn học kỳ!', true);
    return;
  }

  // Tiêu chí PB-10: Tín chỉ lớn hơn 0
  if (isNaN(credits) || credits <= 0) {
    showToast('Số tín chỉ phải lớn hơn 0!', true);
    return;
  }

  StorageService.saveCourse({
    id: id || undefined,
    course_code,
    course_name,
    semester_id,
    credits,
    category,
    is_retake
  });

  closeAppModal('courseModal');
  renderCourses();
  showToast(id ? 'Cập nhật môn học thành công!' : 'Thêm môn học mới thành công!');
}

// === 4. XÓA MÔN HỌC CASCADE (PB-12, PB-46 / BR-18) ===
function openDeleteCourseModal(courseId) {
  const course = StorageService.getCourseById(courseId);
  if (!course) return;

  currentDeletingCourseId = courseId;
  const details = StorageService.getCourseCascadeDetails(courseId);

  document.getElementById('delCourseTargetName').textContent = `"${course.course_code} - ${course.course_name}"`;
  document.getElementById('delCourseComponentCount').textContent = details.componentCount;

  openAppModal('deleteCourseModal');
}

function executeDeleteCourse() {
  if (!currentDeletingCourseId) return;

  StorageService.deleteCourseCascade(currentDeletingCourseId);
  currentDeletingCourseId = null;
  closeAppModal('deleteCourseModal');
  renderCourses();
  showToast('Đã xóa môn học và toàn bộ điểm thành phần liên quan!');
}

// === 5. CẤU HÌNH THÀNH PHẦN ĐIỂM & TRỌNG SỐ 100% (PB-14) ===
function openComponentsModal(courseId) {
  currentConfiguringCourse = StorageService.getCourseById(courseId);
  if (!currentConfiguringCourse) return;

  document.getElementById('compCourseTitle').textContent = `${currentConfiguringCourse.course_code} - ${currentConfiguringCourse.course_name}`;
  renderComponentsList(currentConfiguringCourse.components || []);
  openAppModal('componentsModal');
}

function renderComponentsList(components) {
  const container = document.getElementById('componentsRowsContainer');
  container.innerHTML = components.map((comp, idx) => `
    <div class="component-row" style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
      <input type="text" class="modal-input comp-name" value="${escapeHtml(comp.name)}" placeholder="Tên cột điểm (ví dụ: Giữa kỳ)" style="flex: 2; height: 42px;" required>
      <div style="display: flex; align-items: center; gap: 4px; flex: 1.2;">
        <input type="number" class="modal-input comp-weight" value="${comp.weight_percent}" min="1" max="100" oninput="updateTotalWeightBar()" placeholder="%" style="height: 42px; text-align: center;" required>
        <span style="font-weight: 700; color: var(--text-gray);">%</span>
      </div>
      <button type="button" onclick="removeComponentRow(${idx})" class="btn btn-danger btn-sm" style="padding: 6px 10px;">✕</button>
    </div>
  `).join('');

  updateTotalWeightBar();
}

function addComponentRow() {
  const currentComps = getCurrentComponentInputValues();
  currentComps.push({ name: 'Thành phần mới', weight_percent: 10, score: null });
  renderComponentsList(currentComps);
}

function removeComponentRow(idx) {
  const currentComps = getCurrentComponentInputValues();
  if (currentComps.length <= 1) {
    showToast('Môn học phải có ít nhất 1 thành phần điểm!', true);
    return;
  }
  currentComps.splice(idx, 1);
  renderComponentsList(currentComps);
}

function getCurrentComponentInputValues() {
  const rows = document.querySelectorAll('.component-row');
  const result = [];
  rows.forEach((row, idx) => {
    const name = row.querySelector('.comp-name').value.trim();
    const weight = Number(row.querySelector('.comp-weight').value) || 0;
    const oldComp = (currentConfiguringCourse?.components || [])[idx];
    result.push({
      id: oldComp?.id || 'comp_' + Date.now() + '_' + idx,
      name: name || 'Cột điểm',
      weight_percent: weight,
      score: oldComp?.score !== undefined ? oldComp.score : null
    });
  });
  return result;
}

function updateTotalWeightBar() {
  const weights = Array.from(document.querySelectorAll('.comp-weight')).map(el => Number(el.value) || 0);
  const total = weights.reduce((sum, w) => sum + w, 0);

  const displayEl = document.getElementById('totalWeightDisplay');
  const barEl = document.getElementById('totalWeightBar');
  const msgEl = document.getElementById('weightValidationMsg');
  const btnSave = document.getElementById('btnSaveComponents');

  displayEl.textContent = `${total}%`;
  barEl.style.width = `${Math.min(total, 100)}%`;

  if (total === 100) {
    barEl.style.background = '#10B981';
    msgEl.textContent = 'Chuẩn! Tổng trọng số đã đạt đúng 100%.';
    msgEl.style.color = '#059669';
    btnSave.disabled = false;
  } else {
    barEl.style.background = total > 100 ? 'var(--error)' : 'var(--primary)';
    msgEl.textContent = `Tổng trọng số hiện tại là ${total}%. Bắt buộc phải đúng 100% mới được lưu.`;
    msgEl.style.color = total > 100 ? 'var(--error)' : '#D97706';
    btnSave.disabled = true;
  }
}

function handleSaveComponents() {
  const comps = getCurrentComponentInputValues();
  const total = comps.reduce((s, c) => s + c.weight_percent, 0);

  if (total !== 100) {
    showToast('Tổng trọng số các thành phần phải đúng 100%!', true);
    return;
  }

  StorageService.saveCourseComponents(currentConfiguringCourse.id, comps);
  closeAppModal('componentsModal');
  renderCourses();
  showToast('Lưu cấu hình thành phần điểm thành công!');
}

// === 6. NHẬP VÀ SỬA ĐIỂM THÀNH PHẦN (PB-15, PB-16, PB-17) ===
let currentScoreCourse = null;

function openScoreModal(courseId) {
  currentScoreCourse = StorageService.getCourseById(courseId);
  if (!currentScoreCourse) return;

  const comps = currentScoreCourse.components || [];
  if (comps.length === 0) {
    showToast('Môn học chưa có thành phần điểm. Vui lòng cấu hình thành phần điểm trước!', true);
    return;
  }

  document.getElementById('scoreCourseTitle').textContent = `${currentScoreCourse.course_code} - ${currentScoreCourse.course_name}`;
  
  const container = document.getElementById('scoreInputsContainer');
  container.innerHTML = comps.map(comp => `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: var(--bg-main); padding: 10px 14px; border-radius: 16px;">
      <div>
        <div style="font-weight: 700; color: var(--text-black);">${escapeHtml(comp.name)}</div>
        <div style="font-size: 11px; color: var(--text-gray); font-weight: 600;">Trọng số: ${comp.weight_percent}%</div>
      </div>
      <div style="width: 110px;">
        <input type="number" step="0.1" min="0" max="10" 
               class="modal-input score-input-val" 
               data-comp-id="${comp.id}" 
               value="${comp.score !== null && comp.score !== undefined ? comp.score : ''}"
               oninput="calculatePreviewScores()"
               placeholder="0.0 - 10" 
               style="text-align: center; font-weight: 800; font-size: 16px; height: 42px;">
      </div>
    </div>
  `).join('');

  calculatePreviewScores();
  openAppModal('scoreModal');
}

function calculatePreviewScores() {
  const inputs = document.querySelectorAll('.score-input-val');
  const comps = currentScoreCourse?.components || [];
  const dummyComps = comps.map(c => {
    const input = Array.from(inputs).find(inp => inp.dataset.compId === c.id);
    const val = input && input.value !== '' ? Number(input.value) : null;
    return { ...c, score: val };
  });

  const calc = GradeCalculator.calculateCourseFinalScore(dummyComps);
  const grade = GradeCalculator.convertScore10(calc.finalScore10);

  document.getElementById('previewScore10').textContent = calc.isComplete ? calc.finalScore10 : '--';
  document.getElementById('previewScoreLetter').textContent = calc.isComplete ? grade.letter : '--';
  document.getElementById('previewScore4').textContent = calc.isComplete ? grade.scale4.toFixed(1) : '--';
}

function handleSaveScores() {
  const inputs = document.querySelectorAll('.score-input-val');
  const scoreMap = {};
  let hasInvalid = false;

  inputs.forEach(input => {
    const compId = input.dataset.compId;
    const val = input.value.trim();
    if (val === '') {
      scoreMap[compId] = null;
    } else {
      const num = Number(val);
      if (isNaN(num) || num < 0 || num > 10) {
        hasInvalid = true;
      } else {
        scoreMap[compId] = Math.round(num * 10) / 10;
      }
    }
  });

  if (hasInvalid) {
    showToast('Điểm nhập vào phải từ 0.0 đến 10.0!', true);
    return;
  }

  StorageService.saveCourseScores(currentScoreCourse.id, scoreMap);
  closeAppModal('scoreModal');
  renderCourses();
  showToast('Đã lưu điểm thành phần thành công!');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
