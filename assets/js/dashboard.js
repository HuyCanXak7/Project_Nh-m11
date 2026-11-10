/**
 * LOGIC DASHBOARD TỔNG QUAN HỌC TẬP
 * Phụ trách: Huỳnh Nhơn Nguyên Nghiệp
 */

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
});

function renderDashboard() {
  const courses = StorageService.getCourses();
  const semesters = StorageService.getSemesters();

  // 1. KPI TÍCH LŨY (Đã tự động giữ điểm cao nhất các môn học lại)
  const cum = GradeCalculator.calculateCumulativeGPA(courses);
  const cumEl = document.getElementById('kpiCumulativeGpa');
  if (cumEl) cumEl.textContent = cum.formattedGPA;

  const passedCreditsEl = document.getElementById('kpiPassedCredits');
  if (passedCreditsEl) passedCreditsEl.textContent = `${cum.passedCredits} / ${cum.totalCredits} TC`;

  const rankEl = document.getElementById('kpiRank');
  if (rankEl) rankEl.textContent = cum.rank;

  // 2. GPA KỲ GẦN NHẤT
  const latestSem = semesters.length > 0 ? semesters[semesters.length - 1] : null;
  const latestGpaEl = document.getElementById('kpiLatestGpa');
  const latestSemNameEl = document.getElementById('kpiLatestSemName');

  if (latestSem) {
    const semCourses = courses.filter(c => c.semester_id === latestSem.id);
    const semCalc = GradeCalculator.calculateSemesterGPA(semCourses);
    if (latestGpaEl) latestGpaEl.textContent = semCalc.formattedGPA;
    if (latestSemNameEl) latestSemNameEl.textContent = `${latestSem.name} (${latestSem.academic_year})`;

    // 3. CẢNH BÁO HỌC VỤ
    checkAcademicWarning(semCalc.gpa, semCourses);
  } else {
    if (latestGpaEl) latestGpaEl.textContent = '0.00';
    if (latestSemNameEl) latestSemNameEl.textContent = 'Chưa có dữ liệu';
  }

  // 4. BIỂU ĐỒ XU HƯỚNG GPA
  renderGpaTrendChart(semesters, courses);

  // 5. PHÂN BỐ ĐIỂM CHỮ
  renderGradeDistribution(courses);
}

function checkAcademicWarning(latestGpa, semCourses) {
  const banner = document.getElementById('academicWarningBanner');
  const msgEl = document.getElementById('warningMsg');
  if (!banner || !msgEl) return;

  const failedCourses = semCourses.filter(c => {
    const calc = GradeCalculator.calculateCourseFinalScore(c.components);
    return calc.isComplete && calc.finalScore10 !== null && calc.finalScore10 < 4.0;
  });

  const warnings = [];
  if (latestGpa > 0 && latestGpa < 2.0) {
    warnings.push(`GPA học kỳ gần nhất đạt ${latestGpa.toFixed(2)} (< 2.0 - Dưới mức chuẩn học lực Trung bình).`);
  }
  if (failedCourses.length > 0) {
    warnings.push(`Bạn có ${failedCourses.length} môn học bị điểm F (rớt môn) cần phải đăng ký học lại.`);
  }

  if (warnings.length > 0) {
    banner.style.display = 'flex';
    msgEl.innerHTML = `<strong>CẢNH BÁO HỌC VỤ:</strong> ${warnings.join(' ')}`;
  } else {
    banner.style.display = 'none';
  }
}

function renderGpaTrendChart(semesters, courses) {
  const container = document.getElementById('gpaTrendChart');
  if (!container) return;

  if (semesters.length === 0) {
    container.innerHTML = '<div style="color: var(--text-gray); font-size: 13px;">Chưa có dữ liệu học kỳ để vẽ biểu đồ</div>';
    return;
  }

  const dataPoints = semesters.map(sem => {
    const semCourses = courses.filter(c => c.semester_id === sem.id);
    const semCalc = GradeCalculator.calculateSemesterGPA(semCourses);
    return {
      label: sem.name,
      gpa: semCalc.gpa
    };
  });

  const width = 640;
  const height = 180;
  const padding = 35;
  const maxGpa = 4.0;

  const points = dataPoints.map((dp, idx) => {
    const x = padding + (idx * ((width - 2 * padding) / Math.max(dataPoints.length - 1, 1)));
    const y = height - padding - ((dp.gpa / maxGpa) * (height - 2 * padding));
    return { x, y, ...dp };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; max-height: 220px;">
      <!-- Grid lines -->
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#E2E8F0" stroke-width="1.5" />
      <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4" />
      <text x="${padding - 10}" y="${padding + 4}" font-size="11" fill="#64748B" text-anchor="end">4.0</text>
      <text x="${padding - 10}" y="${height - padding + 4}" font-size="11" fill="#64748B" text-anchor="end">0.0</text>

      <!-- Trend line -->
      <path d="${pathD}" fill="none" stroke="#3B82F6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Data dots -->
      ${points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="6" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2.5" />
        <text x="${p.x}" y="${p.y - 12}" font-size="12" font-weight="700" fill="#1E293B" text-anchor="middle">${p.gpa.toFixed(2)}</text>
        <text x="${p.x}" y="${height - 12}" font-size="11" font-weight="600" fill="#64748B" text-anchor="middle">${p.label}</text>
      `).join('')}
    </svg>
  `;
}

function renderGradeDistribution(courses) {
  const container = document.getElementById('gradeDistributionBars');
  if (!container) return;

  const counts = { 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D+': 0, 'D': 0, 'F': 0 };
  let totalValid = 0;

  courses.forEach(c => {
    const calc = GradeCalculator.calculateCourseFinalScore(c.components);
    if (calc.isComplete && calc.finalScore10 !== null) {
      const grade = GradeCalculator.convertScore10(calc.finalScore10);
      if (counts[grade.letter] !== undefined) {
        counts[grade.letter]++;
        totalValid++;
      }
    }
  });

  const scaleColors = {
    'A': '#10B981', 'B+': '#10B981', 'B': '#3B82F6', 'C+': '#3B82F6',
    'C': '#F59E0B', 'D+': '#F59E0B', 'D': '#F59E0B', 'F': '#EF4444'
  };

  container.innerHTML = Object.keys(counts).map(letter => {
    const count = counts[letter];
    const pct = totalValid > 0 ? Math.round((count / totalValid) * 100) : 0;
    const color = scaleColors[letter] || '#3B82F6';

    return `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 4px;">
          <span>Điểm ${letter}</span>
          <span>${count} môn (${pct}%)</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width: ${pct}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}
