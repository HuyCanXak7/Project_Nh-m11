/**
 * LOGIC QUẢN LÝ MÔN HỌC & ĐIỂM SỐ CHUẨN FIGMA STUDYTRACK-E (StudyTrack-E-04-mon-hoc 1)
 * Phụ trách: PB-10 (Tạo môn), PB-11 (Xem), PB-12 (Sửa/Xóa Cascade), PB-13 (Tìm kiếm/Lọc),
 *            PB-14 (Trọng số 100%), PB-15 (Nhập điểm 0-10), PB-16 (Tính điểm), PB-17 (Quy đổi Hệ 4), PB-50 (Học lại)
 */

let currentCourseList = [];
let currentDeletingCourseId = null;
let currentConfiguringCourse = null;
let currentStatusFilter = 'ALL'; // ALL | PASSED | IN_PROGRESS | FAILED

document.addEventListener('DOMContentLoaded', async () => {
  await StorageService.ready;
  initCoursesPage();
});

function initCoursesPage() {
  const tbody = document.getElementById('courseTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 28px; color: #64748B;">
          Đang tải danh sách môn học và điểm số...
        </td>
      </tr>
    `;
  }

  try {
    initSemesterFilterOptions();

    const params = new URLSearchParams(window.location.search);
    const semIdParam = params.get('semId');
    const queryParam = params.get('q');
    const filterEl = document.getElementById('filterSemester');
    const searchEl = document.getElementById('searchCourseInput');

    if (semIdParam && filterEl) {
      filterEl.value = semIdParam;
    } else if (filterEl && !filterEl.value) {
      const sems = StorageService.getSemesters();
      if (sems.length > 0) {
        filterEl.value = sems[sems.length - 1].id;
      }
    }

    if (queryParam && searchEl) {
      searchEl.value = queryParam;
    }

    renderSemesterTabs();
    renderCourses();
  } catch (err) {
    console.error('Lỗi tải danh sách môn học:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11">
            <div class="empty-state" style="padding: 36px 16px; margin: 10px; border-color: #FCA5A5; background: #FEF2F2;">
              <h4 class="empty-state__title" style="color: #991B1B;">Không tải được danh sách môn học</h4>
              <p class="empty-state__desc">Đã xảy ra lỗi khi đọc dữ liệu môn học. Bạn có thể thử tải lại hoặc khôi phục dữ liệu mẫu.</p>
              <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 12px;">
                <button type="button" onclick="initCoursesPage()" class="btn-figma-primary">Thử tải lại</button>
                <button type="button" onclick="handleResetData()" class="btn-figma-outline">Khôi phục dữ liệu mẫu</button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

function formatShortSemName(sem) {
  if (!sem) return '';
  const rawName = (sem.name || '').trim();
  const yr = (sem.academic_year || '').trim();
  if (/hè/i.test(rawName)) {
    const endYr = yr.split('-')[1]?.trim().slice(-2) || '26';
    return `HK hè ${endYr}`;
  }
  const shortName = rawName.replace(/Học kỳ\s*/i, 'HK');
  const shortYr = yr.replace(/20(\d{2})\s*-\s*20(\d{2})/, '$1–$2');
  return shortYr ? `${shortName} ${shortYr}` : shortName;
}

function formatDotDateRange(startStr, endStr) {
  const fmt = (s) => {
    if (!s) return '--.--';
    const parts = s.split('-');
    return parts.length === 3 ? `${parts[2]}.${parts[1]}` : s;
  };
  return `${fmt(startStr)} – ${fmt(endStr)}`;
}

// === 1. DÃY TAB HỌC KỲ NỐI LIỀN & DROPDOWN HỌC KỲ ===
function initSemesterFilterOptions() {
  const semesters = StorageService.getSemesters();
  const selectFilter = document.getElementById('filterSemester');
  const modalSemSelect = document.getElementById('courseSemSelect');

  const optionsHtml = semesters.map(s => `
    <option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.academic_year)})</option>
  `).join('');

  if (selectFilter) {
    const prev = selectFilter.value;
    selectFilter.innerHTML = '<option value="">Tất cả học kỳ</option>' + optionsHtml;
    if ([...selectFilter.options].some(o => o.value === prev)) {
      selectFilter.value = prev;
    }
  }
  if (modalSemSelect) {
    modalSemSelect.innerHTML = optionsHtml;
  }
}

function renderSemesterTabs() {
  const tabsWrap = document.getElementById('courseSemesterTabs');
  if (!tabsWrap) return;

  const semesters = StorageService.getSemesters();
  const allCourses = StorageService.getCourses();
  const activeSemId = document.getElementById('filterSemester')?.value || '';

  const headerSumEl = document.getElementById('courseHeaderSummary');
  if (headerSumEl) {
    headerSumEl.textContent = `${allCourses.length} môn · ${semesters.length} học kỳ`;
  }

  const pillsHtml = semesters.map(sem => {
    const semCourses = allCourses.filter(c => c.semester_id === sem.id);
    const semCalc = GradeCalculator.calculateSemesterGPA(semCourses);
    const isActive = activeSemId === sem.id;
    const gpaText = semCalc.totalCredits > 0 ? semCalc.formattedGPA : '--';

    return `
      <button type="button"
              class="course-sem-tab ${isActive ? 'is-active' : ''}"
              data-semester-id="${escapeHtml(sem.id)}"
              onclick="selectSemesterTab(this.dataset.semesterId)"
              title="${isActive ? 'Nhấn lần nữa để xem tất cả học kỳ' : 'Lọc theo ' + escapeHtml(sem.name)}">
        <span class="course-sem-tab__name">${escapeHtml(formatShortSemName(sem))}</span>
        <span class="course-sem-tab__gpa">${gpaText}</span>
      </button>
    `;
  }).join('');

  tabsWrap.innerHTML = `
    ${pillsHtml}
    <a href="semesters.html" class="course-sem-tab course-sem-tab--add" title="Quản lý hoặc thêm học kỳ mới">
      + Học kỳ mới
    </a>
  `;
}

function selectSemesterTab(semId) {
  const selectFilter = document.getElementById('filterSemester');
  if (selectFilter) {
    selectFilter.value = (selectFilter.value === semId) ? '' : semId;
  }
  renderSemesterTabs();
  handleFilterChange();
}

function setCourseStatusFilter(status) {
  currentStatusFilter = status || 'ALL';
  const buttons = document.querySelectorAll('#courseStatusTabs .course-status-tab');
  buttons.forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.status === currentStatusFilter);
  });
  handleFilterChange();
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

function getCourseState(course) {
  const calc = GradeCalculator.calculateCourseFinalScore(course.components);
  if (!calc.isComplete || calc.finalScore10 === null) {
    return 'IN_PROGRESS';
  }
  return calc.finalScore10 >= 4.0 ? 'PASSED' : 'FAILED';
}

function handleFilterChange() {
  const searchKey = (document.getElementById('searchCourseInput')?.value || '').trim();
  const filterCategory = document.getElementById('filterCategory')?.value || '';
  const btnClear = document.getElementById('btnClearFilter');

  if (btnClear) {
    btnClear.style.display = (searchKey || filterCategory || currentStatusFilter !== 'ALL') ? 'inline-flex' : 'none';
  }

  renderSemesterTabs();
  renderCourses();
}

function handleClearFilter() {
  const searchInput = document.getElementById('searchCourseInput');
  const catFilter = document.getElementById('filterCategory');
  const btnClear = document.getElementById('btnClearFilter');

  if (searchInput) searchInput.value = '';
  if (catFilter) catFilter.value = '';
  currentStatusFilter = 'ALL';
  const buttons = document.querySelectorAll('#courseStatusTabs .course-status-tab');
  buttons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.status === 'ALL'));
  if (btnClear) btnClear.style.display = 'none';

  renderSemesterTabs();
  renderCourses();
  showToast('Đã xóa điều kiện lọc!');
}

function updateSemesterSummaryStrip(semCourses, activeSem) {
  const countEl = document.getElementById('semStripCount');
  const inProgEl = document.getElementById('semStripInProgress');
  const credEl = document.getElementById('semStripCredits');
  const gradedCredEl = document.getElementById('semStripGradedCredits');
  const avg10El = document.getElementById('semStripAvg10');
  const datesEl = document.getElementById('semStripDates');
  const gpa4El = document.getElementById('semStripGpa4');
  const rankBadgeEl = document.getElementById('semStripRankBadge');

  if (activeSem) {
    if (datesEl) datesEl.textContent = formatDotDateRange(activeSem.start_date, activeSem.end_date);
  } else {
    if (datesEl) datesEl.textContent = 'Toàn khóa';
  }

  let totalCredits = 0;
  let gradedCredits = 0;
  let inProgressCount = 0;

  semCourses.forEach(c => {
    const cr = Number(c.credits) || 0;
    totalCredits += cr;
    const calc = GradeCalculator.calculateCourseFinalScore(c.components);
    if (calc.isComplete) {
      gradedCredits += cr;
    } else {
      inProgressCount++;
    }
  });

  const semCalc = activeSem
    ? GradeCalculator.calculateSemesterGPA(semCourses)
    : GradeCalculator.calculateCumulativeGPA(semCourses);

  const gpaVal = activeSem ? (semCalc.gpa || 0) : (semCalc.cumulativeGPA || 0);
  const avg10Val = semCalc.avg10 || 0;
  const rankText = gradedCredits > 0
    ? `${GradeCalculator.getAcademicRank(gpaVal)} · ${gpaVal >= 3.4 ? 'vượt mục tiêu 3.40' : 'mục tiêu 3.40'}`
    : 'Chưa đủ điểm';

  if (countEl) countEl.textContent = String(semCourses.length);
  if (inProgEl) inProgEl.textContent = `${inProgressCount} đang học`;
  if (credEl) credEl.textContent = String(totalCredits);
  if (gradedCredEl) gradedCredEl.textContent = `${gradedCredits} đã có điểm`;
  if (avg10El) avg10El.textContent = avg10Val.toFixed(2);
  if (gpa4El) gpa4El.textContent = gpaVal.toFixed(2);
  if (rankBadgeEl) rankBadgeEl.textContent = rankText;
}

// === 2. XEM VÀ QUẢN LÝ DANH SÁCH MÔN HỌC CHUẨN STUDYTRACK-E ===
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

  const activeSem = semesters.find(s => s.id === filterSemId) || null;
  const semCourses = filterSemId ? allCourses.filter(c => c.semester_id === filterSemId) : allCourses;

  updateSemesterSummaryStrip(semCourses, activeSem);

  let countAll = semCourses.length;
  let countPassed = 0;
  let countInProg = 0;
  let countFailed = 0;
  semCourses.forEach(c => {
    const st = getCourseState(c);
    if (st === 'PASSED') countPassed++;
    else if (st === 'FAILED') countFailed++;
    else countInProg++;
  });

  if (document.getElementById('countStatusAll')) document.getElementById('countStatusAll').textContent = countAll;
  if (document.getElementById('countStatusPassed')) document.getElementById('countStatusPassed').textContent = countPassed;
  if (document.getElementById('countStatusInProgress')) document.getElementById('countStatusInProgress').textContent = countInProg;
  if (document.getElementById('countStatusFailed')) document.getElementById('countStatusFailed').textContent = countFailed;

  currentCourseList = semCourses.filter(c => {
    const code = (c.course_code || '').toLowerCase();
    const name = (c.course_name || '').toLowerCase();
    const nameClean = removeVietnameseTones(c.course_name || '');

    const matchSearch = !rawSearch ||
      code.includes(searchKey) ||
      name.includes(searchKey) ||
      nameClean.includes(searchKeyClean);

    const matchCat = !filterCategory || c.category === filterCategory;
    const state = getCourseState(c);
    const matchStatus = currentStatusFilter === 'ALL' || state === currentStatusFilter;

    return matchSearch && matchCat && matchStatus;
  });

  const statsBadge = document.getElementById('filterStatsBadge');
  const gradedCount = currentCourseList.filter(c => GradeCalculator.calculateCourseFinalScore(c.components).isComplete).length;
  if (statsBadge) {
    statsBadge.innerHTML = `Hiển thị <strong>${currentCourseList.length}</strong> môn của ${activeSem ? escapeHtml(activeSem.name.toLowerCase()) : 'toàn khóa'} · GPA chỉ tính <strong>${gradedCount} môn</strong> đã đủ điểm`;
  }

  if (currentCourseList.length === 0) {
    const hasFilter = !!(rawSearch || filterCategory || currentStatusFilter !== 'ALL');
    tbody.innerHTML = `
      <tr>
        <td colspan="11">
          <div class="empty-state" style="padding: 36px 16px; margin: 10px;">
            <h4 class="empty-state__title">${hasFilter ? 'Không tìm thấy môn học nào phù hợp' : 'Chưa có môn học nào trong học kỳ này'}</h4>
            <p class="empty-state__desc">
              ${hasFilter
                ? 'Không có môn học nào khớp với từ khóa hoặc bộ lọc hiện tại. Bạn có thể xóa bộ lọc để xem lại danh sách đầy đủ.'
                : 'Hãy thêm môn học mới, nhập từ tệp CSV/Excel hoặc nạp dữ liệu mẫu để bắt đầu theo dõi điểm số!'}
            </p>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 12px;">
              ${hasFilter
                ? '<button type="button" onclick="handleClearFilter()" class="btn-figma-outline">✕ Xóa điều kiện lọc</button>'
                : '<button type="button" onclick="handleResetData()" class="btn-figma-outline">Nạp dữ liệu mẫu</button>'}
              <button type="button" onclick="openCreateCourseModal()" class="btn-figma-primary">+ Thêm môn học</button>
            </div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = currentCourseList.map(c => {
    const scoreCalc = GradeCalculator.calculateCourseFinalScore(c.components);
    const grade = GradeCalculator.convertScore10(scoreCalc.finalScore10);
    const comps = Array.isArray(c.components) ? c.components : [];

    const fmtCompScore = (idx) => {
      const cp = comps[idx];
      if (!cp) return '<span class="score-dash">—</span>';
      const hasVal = cp.score !== null && cp.score !== '' && cp.score !== undefined && !isNaN(Number(cp.score));
      return hasVal
        ? `<span class="score-cell" title="${escapeHtml(cp.name)} (${cp.weight_percent}%)">${Number(cp.score).toFixed(1)}</span>`
        : `<span class="score-dash" title="${escapeHtml(cp.name)} (${cp.weight_percent}%): Chưa nhập">—</span>`;
    };

    // Ô điểm chữ kèm ô vuông màu chuẩn StudyTrack-E (■ A, ■ B+, ■ C+)
    let letterHtml = '<span class="score-dash">—</span>';
    if (scoreCalc.isComplete) {
      let sqColor = '#10B981'; // A, A+
      if (grade.letter === 'B+' || grade.letter === 'B') sqColor = 'var(--e-ink)';
      else if (grade.letter !== 'A+' && grade.letter !== 'A') sqColor = '#EF4444';
      letterHtml = `
        <span class="e-grade-cell" title="Hệ 4: ${grade.scale4.toFixed(1)}">
          <i class="e-grade-sq" style="background:${sqColor}"></i>
          <strong>${escapeHtml(grade.letter)}</strong>
        </span>
      `;
    } else if (!scoreCalc.isValidWeight) {
      letterHtml = `<span class="e-grade-cell" style="color:#EF4444;"><strong>!</strong></span>`;
    }

    // Trạng thái môn học chuẩn StudyTrack-E (● Đạt / ○ Đang học / ✕ Chưa đạt)
    let statusHtml = '';
    if (!scoreCalc.isValidWeight) {
      statusHtml = `<span class="course-state course-state--fail">✕ Sai TS (${scoreCalc.totalWeight}%)</span>`;
    } else if (!scoreCalc.isComplete) {
      statusHtml = `<span class="course-state course-state--prog">○ Đang học</span>`;
    } else if (scoreCalc.finalScore10 >= 4.0) {
      statusHtml = `<span class="course-state course-state--pass">● Đạt</span>`;
    } else {
      statusHtml = `<span class="course-state course-state--fail">✕ Chưa đạt</span>`;
    }

    const rowHighlight = !scoreCalc.isComplete ? 'course-row--inprogress' : '';
    const totalScoreClass = scoreCalc.isComplete && scoreCalc.finalScore10 < 7.0
      ? 'course-total-cell course-total-cell--low'
      : 'course-total-cell';

    return `
      <tr class="${rowHighlight}">
        <td class="course-code-cell">${escapeHtml(c.course_code)}</td>
        <td>
          <div class="course-name-wrap">
            <span class="course-name-text">${escapeHtml(c.course_name)}</span>
            ${c.is_retake ? '<span class="badge badge-orange" style="font-size: 10px; padding: 2px 6px;">Học lại</span>' : ''}
          </div>
        </td>
        <td class="course-cat-cell">${escapeHtml(c.category || 'Đại cương')}</td>
        <td class="course-credits-cell">${c.credits}</td>
        <td style="text-align: center; cursor: pointer;" data-course-id="${escapeHtml(c.id)}" onclick="openScoreModal(this.dataset.courseId)">${fmtCompScore(0)}</td>
        <td style="text-align: center; cursor: pointer;" data-course-id="${escapeHtml(c.id)}" onclick="openScoreModal(this.dataset.courseId)">${fmtCompScore(1)}</td>
        <td style="text-align: center; cursor: pointer;" data-course-id="${escapeHtml(c.id)}" onclick="openScoreModal(this.dataset.courseId)">${fmtCompScore(2)}</td>
        <td class="${totalScoreClass}">
          ${scoreCalc.isComplete ? scoreCalc.finalScore10.toFixed(1) : '<span class="score-dash">—</span>'}
        </td>
        <td>${letterHtml}</td>
        <td>${statusHtml}</td>
        <td style="text-align: right; white-space: nowrap;">
          <div class="btn-action-group">
            <button type="button" data-course-id="${escapeHtml(c.id)}" onclick="openScoreModal(this.dataset.courseId)" class="btn-action btn-action--score" title="Nhập / Sửa điểm thành phần">
              <span>Điểm</span>
            </button>
            <button type="button" data-course-id="${escapeHtml(c.id)}" onclick="openComponentsModal(this.dataset.courseId)" class="btn-action btn-action--edit" title="Cấu hình trọng số (${scoreCalc.totalWeight}%)">
              <span>${scoreCalc.totalWeight}%</span>
            </button>
            <button type="button" data-course-id="${escapeHtml(c.id)}" onclick="openEditCourseModal(this.dataset.courseId)" class="btn-action btn-action--edit" title="Sửa môn học">
              <span>Sửa</span>
            </button>
            <button type="button" data-course-id="${escapeHtml(c.id)}" onclick="openDeleteCourseModal(this.dataset.courseId)" class="btn-action btn-action--delete" title="Xóa môn học">
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

  initSemesterFilterOptions();
  document.getElementById('courseModalTitle').textContent = 'Thêm môn học mới';
  document.getElementById('courseIdInput').value = '';
  document.getElementById('courseCodeInput').value = '';
  document.getElementById('courseNameInput').value = '';
  document.getElementById('courseCreditsInput').value = '3';
  document.getElementById('courseCatSelect').value = 'Đại cương';
  document.getElementById('courseRetakeCheckbox').checked = false;
  document.getElementById('courseSemSelect').disabled = false;

  const filterSemId = document.getElementById('filterSemester')?.value;
  if (filterSemId) {
    document.getElementById('courseSemSelect').value = filterSemId;
  }

  openAppModal('courseModal');
}

function openEditCourseModal(courseId) {
  const course = StorageService.getCourseById(courseId);
  if (!course) return;

  initSemesterFilterOptions();
  document.getElementById('courseModalTitle').textContent = 'Chỉnh sửa môn học';
  document.getElementById('courseIdInput').value = course.id;
  document.getElementById('courseCodeInput').value = course.course_code;
  document.getElementById('courseNameInput').value = course.course_name;
  document.getElementById('courseSemSelect').value = course.semester_id;
  document.getElementById('courseSemSelect').disabled = true; // API sửa môn không đổi được học kỳ
  document.getElementById('courseCreditsInput').value = course.credits;
  document.getElementById('courseCatSelect').value = course.category;
  document.getElementById('courseRetakeCheckbox').checked = !!course.is_retake;

  openAppModal('courseModal');
}

async function handleSaveCourse(e) {
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

  if (isNaN(credits) || credits <= 0) {
    showToast('Số tín chỉ phải lớn hơn 0!', true);
    return;
  }

  try {
    await StorageService.saveCourse({
      id: id || undefined,
      course_code,
      course_name,
      semester_id,
      credits,
      category,
      is_retake
    });
  } catch (err) {
    showToast(err.message || 'Không lưu được dữ liệu lên máy chủ.', true);
    return;
  }

  closeAppModal('courseModal');
  renderSemesterTabs();
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

async function executeDeleteCourse() {
  if (!currentDeletingCourseId) return;

  try {
    await StorageService.deleteCourseCascade(currentDeletingCourseId);
  } catch (err) {
    showToast(err.message || 'Không lưu được dữ liệu lên máy chủ.', true);
    return;
  }
  currentDeletingCourseId = null;
  closeAppModal('deleteCourseModal');
  renderSemesterTabs();
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
    <div class="component-row" data-comp-id="${escapeHtml(comp.id || '')}" style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
      <input type="text" class="modal-input comp-name" value="${escapeHtml(comp.name)}" placeholder="Tên cột điểm (ví dụ: Giữa kỳ)" style="flex: 2; height: 42px;" required>
      <div style="display: flex; align-items: center; gap: 4px; flex: 1.2;">
        <input type="number" class="modal-input comp-weight" value="${comp.weight_percent}" min="1" max="100" oninput="updateTotalWeightBar()" placeholder="%" style="height: 42px; text-align: center;" required>
        <span style="font-weight: 700; color: var(--text-gray);">%</span>
      </div>
      <button type="button" data-index="${idx}" onclick="removeComponentRow(Number(this.dataset.index))" class="btn btn-danger btn-sm" style="padding: 6px 10px;">✕</button>
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
    const oldComp = (currentConfiguringCourse?.components || []).find(c => c.id === row.dataset.compId);
    result.push({
      id: oldComp?.id || 'new_' + Date.now() + '_' + idx,
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

async function handleSaveComponents() {
  const comps = getCurrentComponentInputValues();
  const total = comps.reduce((s, c) => s + c.weight_percent, 0);

  if (total !== 100) {
    showToast('Tổng trọng số các thành phần phải đúng 100%!', true);
    return;
  }

  try {
    await StorageService.saveCourseComponents(currentConfiguringCourse.id, comps);
  } catch (err) {
    showToast(err.message || 'Không lưu được dữ liệu lên máy chủ.', true);
    return;
  }
  closeAppModal('componentsModal');
  renderSemesterTabs();
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
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: var(--bg-main); padding: 10px 14px;">
      <div>
        <div style="font-weight: 700; color: var(--text-black);">${escapeHtml(comp.name)}</div>
        <div style="font-size: 11px; color: var(--text-gray); font-weight: 600;">Trọng số: ${comp.weight_percent}%</div>
      </div>
      <div style="width: 110px;">
        <input type="number" step="0.1" min="0" max="10"
               class="modal-input score-input-val"
               data-comp-id="${escapeHtml(comp.id)}"
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

  const el10 = document.getElementById('scorePreview10');
  const elLet = document.getElementById('scorePreviewLetter');
  const el4 = document.getElementById('scorePreview4');
  if (el10) el10.textContent = calc.isComplete ? calc.finalScore10 : '--';
  if (elLet) elLet.textContent = calc.isComplete ? grade.letter : '--';
  if (el4) el4.textContent = calc.isComplete ? grade.scale4.toFixed(1) : '--';
}

async function handleSaveScores() {
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

  try {
    await StorageService.saveCourseScores(currentScoreCourse.id, scoreMap);
  } catch (err) {
    showToast(err.message || 'Không lưu được dữ liệu lên máy chủ.', true);
    return;
  }
  closeAppModal('scoreModal');
  renderSemesterTabs();
  renderCourses();
  showToast('Đã lưu điểm thành phần thành công!');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
