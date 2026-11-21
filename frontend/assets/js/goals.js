/**
 * LOGIC MỤC TIÊU GPA & MÔ PHỎNG WHAT-IF (PB-22, PB-23, PB-24)
 * Phụ trách: Huỳnh Nhơn Nguyên Nghiệp
 */

let simulationCourses = [];

document.addEventListener('DOMContentLoaded', async () => {
  await StorageService.ready;
  initGoalsPage();
});

function initGoalsPage() {
  const tbody = document.getElementById('whatIfTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 24px; color: #64748B;">
          Đang tải dữ liệu mục tiêu GPA và bảng mô phỏng...
        </td>
      </tr>
    `;
  }

  try {
    renderGoalSection();
    initSimulation();
  } catch (err) {
    console.error('Lỗi tải trang Mục tiêu GPA:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 28px; background: #FEF2F2; color: #991B1B;">
            <div style="font-weight: 700; margin-bottom: 8px;">Không thể tải dữ liệu mục tiêu GPA. Vui lòng thử lại.</div>
            <button type="button" onclick="initGoalsPage()" class="btn btn-primary btn-sm">Thử tải lại</button>
          </td>
        </tr>
      `;
    }
  }
}

function renderGoalSection() {
  const goal = StorageService.getGoal();
  const courses = StorageService.getCourses();
  const cum = GradeCalculator.calculateCumulativeGPA(courses);

  document.getElementById('inputTargetGpa').value = goal?.target_gpa ?? '';
  document.getElementById('inputTargetDate').value = goal?.target_date ?? '';
  document.getElementById('inputRemainingCredits').value = goal?.remaining_credits ?? '';
  // Ngày mục tiêu không được ở quá khứ
  document.getElementById('inputTargetDate').min = todayStr();

  // Chưa có mục tiêu → chế độ Tạo; đã có → chế độ Sửa + cho phép Xóa
  document.getElementById('btnSaveGoal').textContent = goal ? 'Cập nhật mục tiêu GPA' : 'Tạo mục tiêu GPA';
  document.getElementById('btnDeleteGoal').hidden = !goal;

  document.getElementById('displayCurrentGpa').textContent = cum.formattedGPA;
  document.getElementById('displayEarnedCredits').textContent = `${cum.passedCredits} TC`;

  calculateRequiredScore(cum, goal);
}

function calculateRequiredScore(cum, goal) {
  const scoreEl = document.getElementById('requiredScoreValue');
  const msgEl = document.getElementById('requiredScoreMsg');

  if (!goal) {
    scoreEl.textContent = '--';
    scoreEl.style.color = 'var(--text-gray)';
    msgEl.textContent = 'Bạn chưa có mục tiêu GPA. Hãy tạo mục tiêu để xem điểm cần đạt.';
    return;
  }

  // Không ép thiếu dữ liệu về 0 (sẽ bị báo nhầm "đã đạt mục tiêu")
  const targetGpa = Number(goal.target_gpa);
  const remainingCredits = Number(goal.remaining_credits);
  if (goal.target_gpa === '' || goal.target_gpa == null || !(targetGpa >= 0 && targetGpa <= 4)) {
    scoreEl.textContent = '--';
    scoreEl.style.color = 'var(--text-gray)';
    msgEl.textContent = 'Mục tiêu thiếu GPA mục tiêu hợp lệ (0 – 4.0). Hãy cập nhật mục tiêu.';
    return;
  }
  if (!(remainingCredits > 0)) {
    scoreEl.textContent = '--';
    scoreEl.style.color = 'var(--text-gray)';
    msgEl.textContent = 'Mục tiêu thiếu số tín chỉ còn lại dự kiến (phải > 0). Hãy cập nhật mục tiêu.';
    return;
  }

  // PB-23: (Mục tiêu × (TC đã học + TC còn lại) − Σ(điểm hệ 4 × TC)) / TC còn lại
  // TC đã học = mọi môn đủ điểm đã vào GPA, kể cả môn F (giống PB-19)
  const earnedCredits = cum.totalCredits;
  const earnedWeighted = cum.totalPoints4;
  const requiredScore = (targetGpa * (earnedCredits + remainingCredits) - earnedWeighted) / remainingCredits;
  // Không có môn đủ điểm thì công thức vẫn đúng (= GPA mục tiêu), chỉ cần nói rõ
  const noDataNote = earnedCredits === 0
    ? '<br><em>Chưa có môn nào đủ điểm, nên điểm cần đạt bằng GPA mục tiêu.</em>'
    : '';

  // So sánh trên giá trị chưa làm tròn; chỉ làm tròn khi hiển thị
  if (requiredScore > 4.0) {
    scoreEl.textContent = requiredScore.toFixed(2);
    scoreEl.style.color = 'var(--error)';
    msgEl.innerHTML = '<strong>MỤC TIÊU KHÔNG KHẢ THI!</strong> Điểm trung bình cần đạt vượt quá thang 4.0 tối đa.' + noDataNote;
  } else if (requiredScore <= 0) {
    scoreEl.textContent = '0.00';
    scoreEl.style.color = '#10B981';
    msgEl.innerHTML = '<strong>XIN CHÚC MỪNG!</strong> Bạn đã đạt mục tiêu GPA từ các môn đã học!';
  } else {
    scoreEl.textContent = requiredScore.toFixed(2);
    scoreEl.style.color = 'var(--primary)';
    msgEl.innerHTML = `Cần đạt trung bình <strong>${requiredScore.toFixed(2)} / 4.0</strong> ở ${remainingCredits} tín chỉ còn lại.` + noDataNote;
  }
}

// Ngày hôm nay theo giờ máy, dạng YYYY-MM-DD (so sánh chuỗi được với input date)
function todayStr() {
  return new Date().toLocaleDateString('sv-SE');
}

function handleSaveGoal(e) {
  e.preventDefault();
  const target_gpa = Number(document.getElementById('inputTargetGpa').value);
  const target_date = document.getElementById('inputTargetDate').value;
  const remaining_credits = Number(document.getElementById('inputRemainingCredits').value);

  if (isNaN(target_gpa) || target_gpa < 0 || target_gpa > 4.0) {
    showToast('GPA mục tiêu phải trong khoảng từ 0.0 đến 4.0!', true);
    return;
  }
  if (!target_date || target_date < todayStr()) {
    showToast('Ngày mục tiêu không được ở quá khứ!', true);
    return;
  }
  if (!(remaining_credits > 0)) {
    showToast('Số tín chỉ còn lại dự kiến phải lớn hơn 0!', true);
    return;
  }

  const goal = { target_gpa, target_date, remaining_credits };
  // Nút đang ở chế độ Tạo hay Sửa tùy theo lúc render (chưa có / đã có mục tiêu)
  const isUpdate = !document.getElementById('btnDeleteGoal').hidden;
  try {
    if (isUpdate) StorageService.updateGoal(goal);
    else StorageService.createGoal(goal);
  } catch (err) {
    if (err.message === 'GOAL_EXISTS') {
      // Tương ứng 409: đã có mục tiêu (vd. tạo ở tab khác) → chuyển sang chế độ Sửa
      showToast('Bạn đã có mục tiêu GPA. Hãy dùng chức năng Cập nhật để chỉnh sửa.', true);
    } else {
      showToast('Mục tiêu không còn tồn tại. Hãy tạo mục tiêu mới.', true);
    }
    renderGoalSection();
    return;
  }

  renderGoalSection();
  if (typeof refreshSidebarGoalWidget === 'function') refreshSidebarGoalWidget();
  showToast(isUpdate ? 'Đã cập nhật mục tiêu GPA!' : 'Đã tạo mục tiêu GPA!');
}

function handleDeleteGoal() {
  if (!confirm('Bạn có chắc chắn muốn xóa mục tiêu GPA?')) return;
  StorageService.deleteGoal();
  renderGoalSection();
  if (typeof refreshSidebarGoalWidget === 'function') refreshSidebarGoalWidget();
  showToast('Đã xóa mục tiêu GPA!');
}

function initSimulation() {
  const courses = StorageService.getCourses();
  simulationCourses = courses.map(c => {
    const calc = GradeCalculator.calculateCourseFinalScore(c.components);
    return {
      id: c.id,
      course_code: c.course_code,
      course_name: c.course_name,
      credits: c.credits,
      is_retake: c.is_retake,
      originalScore: calc.finalScore10,
      simulatedScore: calc.finalScore10 !== null ? calc.finalScore10 : 7.0
    };
  });
  renderSimulationTable();
}

function renderSimulationTable() {
  const tbody = document.getElementById('simulationTableBody');
  if (!tbody) return;

  if (simulationCourses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state" style="padding: 32px 16px; margin: 8px 0;">
            <div class="empty-state__icon">
              <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round" style="margin: 0 auto;">
                <circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>
              </svg>
            </div>
            <h4 class="empty-state__title">Chưa có môn học để mô phỏng</h4>
            <p class="empty-state__desc">Hãy thêm môn học hoặc nạp dữ liệu mẫu để thử nghiệm công cụ dự phóng điểm What-If GPA.</p>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <a href="courses.html" class="btn btn-primary btn-sm" style="text-decoration: none;">+ Thêm môn học</a>
              <button type="button" onclick="handleResetData()" class="btn btn-secondary btn-sm">Nạp dữ liệu mẫu</button>
            </div>
          </div>
        </td>
      </tr>
    `;
    recalculateSimulatedGPA();
    return;
  }

  tbody.innerHTML = simulationCourses.map((c, idx) => {
    return `
      <tr>
        <td style="font-family: monospace; font-weight: 800; color: var(--primary);">${escapeHtml(c.course_code)}</td>
        <td style="font-weight: 700;">${escapeHtml(c.course_name)}</td>
        <td style="text-align: center; font-weight: 700;">${c.credits} TC</td>
        <td style="text-align: center; color: var(--text-gray);">${c.originalScore !== null ? c.originalScore : 'Chưa có'}</td>
        <td style="width: 140px; text-align: center;">
          <input type="number" step="0.1" min="0" max="10" value="${c.simulatedScore !== null ? c.simulatedScore : ''}"
                 oninput="updateSimScore(${idx}, this)" aria-label="Điểm giả định ${escapeHtml(c.course_code)}"
                 class="modal-input" style="height: 38px; text-align: center; font-weight: 800;">
        </td>
        <td style="text-align: center;">
          <span id="simBadge${idx}" class="badge"></span>
        </td>
      </tr>
    `;
  }).join('');

  simulationCourses.forEach((c, idx) => renderSimBadge(idx, c.simulatedScore !== null));
  recalculateSimulatedGPA();
}

// Cập nhật nhãn điểm chữ của một dòng mà không render lại bảng (giữ focus ô đang gõ)
function renderSimBadge(idx, isValid) {
  const badge = document.getElementById(`simBadge${idx}`);
  if (!badge) return;
  const grade = isValid ? GradeCalculator.convertScore10(simulationCourses[idx].simulatedScore) : null;
  badge.className = `badge ${grade ? grade.colorClass : 'badge-red'}`;
  badge.textContent = grade ? `${grade.letter} (${grade.scale4})` : 'Điểm 0-10';
}

function updateSimScore(idx, input) {
  const trimmed = String(input.value).trim();
  const num = Number(trimmed);
  const isValid = trimmed !== '' && !isNaN(num) && num >= 0 && num <= 10;
  simulationCourses[idx].simulatedScore = isValid ? GradeCalculator.round1(num) : null;
  input.style.borderColor = isValid ? '' : 'var(--error)';
  input.setAttribute('aria-invalid', String(!isValid));
  renderSimBadge(idx, isValid);
  recalculateSimulatedGPA();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function recalculateSimulatedGPA() {
  const simulatedCourses = simulationCourses.map(c => ({
    course_code: c.course_code,
    credits: c.credits,
    is_retake: c.is_retake,
    components: [{ name: 'Mô phỏng', weight_percent: 100, score: c.simulatedScore }]
  }));

  const simResult = GradeCalculator.calculateCumulativeGPA(simulatedCourses);
  const origResult = GradeCalculator.calculateCumulativeGPA(StorageService.getCourses());

  document.getElementById('simGpaVal').textContent = simResult.formattedGPA;
  document.getElementById('simRankVal').textContent = simResult.rank;

  const diff = simResult.cumulativeGPA - origResult.cumulativeGPA;
  const diffEl = document.getElementById('simDiffVal');
  if (diff > 0) {
    diffEl.textContent = `+${diff.toFixed(2)} (Tăng)`;
    diffEl.style.color = '#10B981';
  } else if (diff < 0) {
    diffEl.textContent = `${diff.toFixed(2)} (Giảm)`;
    diffEl.style.color = 'var(--error)';
  } else {
    diffEl.textContent = '0.00 (Không đổi)';
    diffEl.style.color = 'var(--text-gray)';
  }
}

function resetSimulation() {
  initSimulation();
  showToast('Đã đặt lại dữ liệu mô phỏng!');
}
