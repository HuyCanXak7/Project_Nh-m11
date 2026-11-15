/**
 * LOGIC MỤC TIÊU GPA & MÔ PHỎNG WHAT-IF (PB-22, PB-23, PB-24)
 * Phụ trách: Huỳnh Nhơn Nguyên Nghiệp
 */

let simulationCourses = [];

document.addEventListener('DOMContentLoaded', () => {
  renderGoalSection();
  initSimulation();
});

function renderGoalSection() {
  const goal = StorageService.getGoal();
  const courses = StorageService.getCourses();
  const cum = GradeCalculator.calculateCumulativeGPA(courses);

  document.getElementById('inputTargetGpa').value = goal.target_gpa;
  document.getElementById('inputTargetDate').value = goal.target_date;
  document.getElementById('inputRemainingCredits').value = goal.remaining_credits;

  document.getElementById('displayCurrentGpa').textContent = cum.formattedGPA;
  document.getElementById('displayEarnedCredits').textContent = `${cum.passedCredits} TC`;

  calculateRequiredScore(cum, goal);
}

function calculateRequiredScore(cum, goal) {
  const targetGpa = Number(goal.target_gpa) || 0;
  const remainingCredits = Number(goal.remaining_credits) || 0;
  const earnedCredits = cum.passedCredits;
  const currentGpa = cum.cumulativeGPA;

  const scoreEl = document.getElementById('requiredScoreValue');
  const msgEl = document.getElementById('requiredScoreMsg');

  if (remainingCredits <= 0) {
    scoreEl.textContent = '--';
    msgEl.textContent = 'Vui lòng nhập số tín chỉ còn lại dự kiến > 0.';
    return;
  }

  // Công thức: Required = (Target * (Earned + Remaining) - Current * Earned) / Remaining (BR-13)
  const totalWeightedGoal = targetGpa * (earnedCredits + remainingCredits);
  const earnedWeighted = currentGpa * earnedCredits;
  const requiredScore = (totalWeightedGoal - earnedWeighted) / remainingCredits;
  const roundedRequired = Math.round(requiredScore * 100) / 100;

  if (roundedRequired > 4.0) {
    scoreEl.textContent = roundedRequired.toFixed(2);
    scoreEl.style.color = 'var(--error)';
    msgEl.innerHTML = '<strong>MỤC TIÊU KHÔNG KHẢ THI!</strong> Điểm trung bình cần đạt vượt quá thang 4.0 tối đa.';
  } else if (roundedRequired <= 0) {
    scoreEl.textContent = '0.00';
    scoreEl.style.color = '#10B981';
    msgEl.innerHTML = '<strong>XIN CHÚC MỪNG!</strong> Bạn đã hoàn thành vượt mục tiêu GPA từ các môn đã tích lũy!';
  } else {
    scoreEl.textContent = roundedRequired.toFixed(2);
    scoreEl.style.color = 'var(--primary)';
    msgEl.innerHTML = `Cần đạt trung bình <strong>${roundedRequired.toFixed(2)} / 4.0</strong> ở các môn còn lại.`;
  }
}

function handleSaveGoal(e) {
  e.preventDefault();
  const target_gpa = Number(document.getElementById('inputTargetGpa').value);
  const target_date = document.getElementById('inputTargetDate').value;
  const remaining_credits = Number(document.getElementById('inputRemainingCredits').value);

  if (target_gpa < 0 || target_gpa > 4.0) {
    showToast('GPA mục tiêu phải trong khoảng từ 0.0 đến 4.0!', true);
    return;
  }
  if (remaining_credits <= 0) {
    showToast('Số tín chỉ còn lại dự kiến phải lớn hơn 0!', true);
    return;
  }

  StorageService.saveGoal({ target_gpa, target_date, remaining_credits });
  renderGoalSection();
  showToast('Đã lưu cấu hình mục tiêu GPA thành công!');
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
    const isValid = c.simulatedScore !== null && !isNaN(c.simulatedScore) && c.simulatedScore >= 0 && c.simulatedScore <= 10;
    const grade = isValid ? GradeCalculator.convertScore10(c.simulatedScore) : { letter: 'Lỗi', scale4: '--', colorClass: 'badge-red' };
    return `
      <tr>
        <td style="font-family: monospace; font-weight: 800; color: var(--primary);">${escapeHtml(c.course_code)}</td>
        <td style="font-weight: 700;">${escapeHtml(c.course_name)}</td>
        <td style="text-align: center; font-weight: 700;">${c.credits} TC</td>
        <td style="text-align: center; color: var(--text-gray);">${c.originalScore !== null ? c.originalScore : 'Chưa có'}</td>
        <td style="width: 140px; text-align: center;">
          <input type="number" step="0.1" min="0" max="10" value="${c.simulatedScore !== null ? c.simulatedScore : ''}"
                 oninput="updateSimScore(${idx}, this.value)"
                 class="modal-input" style="height: 38px; text-align: center; font-weight: 800;">
        </td>
        <td style="text-align: center;">
          <span class="badge ${grade.colorClass}">${isValid ? `${grade.letter} (${grade.scale4})` : 'Điểm 0-10'}</span>
        </td>
      </tr>
    `;
  }).join('');

  recalculateSimulatedGPA();
}

function updateSimScore(idx, val) {
  const trimmed = String(val).trim();
  const num = Number(trimmed);
  if (trimmed === '' || isNaN(num) || num < 0 || num > 10) {
    simulationCourses[idx].simulatedScore = null;
  } else {
    simulationCourses[idx].simulatedScore = Math.round(num * 10) / 10;
  }
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
