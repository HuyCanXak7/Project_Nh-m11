/**
 * LOGIC KẾT XUẤT BẢNG ĐIỂM TỔNG HỢP & IN ẤN A4 (PB-27, PB-28, PB-52)
 * Phụ trách: Huỳnh Nhơn Nguyên Nghiệp
 */

document.addEventListener('DOMContentLoaded', () => {
  renderTranscript();
});

function renderTranscript() {
  const courses = StorageService.getCourses();
  const semesters = StorageService.getSemesters();
  const student = StorageService.getStudent();

  // Cập nhật thông tin in A4
  const metaLine = document.getElementById('printMetaLine');
  if (metaLine) {
    metaLine.textContent = `Lớp: ${student.class_name || 'K25-CNTT5'} | Ngày in: ${new Date().toLocaleDateString('vi-VN')}`;
  }

  // Tóm tắt tích lũy toàn khóa (PB-52)
  const cum = GradeCalculator.calculateCumulativeGPA(courses);
  const cumGpaEl = document.getElementById('cumGpaDisplay');
  const cumCreditsEl = document.getElementById('cumCreditsDisplay');
  const cumRankEl = document.getElementById('cumRankDisplay');

  if (cumGpaEl) cumGpaEl.textContent = cum.formattedGPA;
  if (cumCreditsEl) cumCreditsEl.textContent = `${cum.passedCredits} / ${cum.totalCredits} TC`;
  if (cumRankEl) cumRankEl.textContent = cum.rank;

  // Render bảng điểm từng học kỳ
  const container = document.getElementById('transcriptSemestersContainer');
  if (!container) return;

  if (semesters.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📄</div>
        <h3 class="empty-state__title">Chưa có bảng điểm</h3>
        <p class="empty-state__desc">Hệ thống chưa ghi nhận môn học nào có điểm. Hãy thêm môn học hoặc nhập điểm từ CSV để xem bảng điểm nhé!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = semesters.map(sem => {
    const semCourses = courses.filter(c => c.semester_id === sem.id);
    const semCalc = GradeCalculator.calculateSemesterGPA(semCourses);

    return `
      <div style="background: #fff; border: 1.5px solid rgba(107, 114, 128, 0.2); border-radius: 20px; padding: 20px; margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-black);">${escapeHtml(sem.name)} (${escapeHtml(sem.academic_year)})</h3>
            <span style="font-size: 12px; color: var(--text-gray);">Thời gian: ${sem.start_date} đến ${sem.end_date}</span>
          </div>
          <div style="display: flex; gap: 12px; align-items: center; background: var(--bg-main); padding: 6px 14px; border-radius: var(--radius-full); font-size: 13px;">
            <span>GPA Học kỳ: <strong style="color: var(--primary); font-size: 15px;">${semCalc.formattedGPA}</strong></span>
            <span>${semCalc.ranking ? `Xếp loại: ${escapeHtml(semCalc.ranking)}` : 'Chưa có môn đủ điểm'}</span>
            <span>•</span>
            <span>Tín chỉ đạt: <strong>${semCalc.passedCredits}/${semCalc.totalCredits} TC</strong></span>
          </div>
        </div>

        <div class="table-wrap">
          <table class="app-table">
            <thead>
              <tr>
                <th style="width: 100px;">Mã môn</th>
                <th>Tên môn học</th>
                <th style="width: 80px; text-align: center;">Tín chỉ</th>
                <th>Điểm thành phần chi tiết</th>
                <th style="width: 90px; text-align: center;">Điểm TK</th>
                <th style="width: 80px; text-align: center;">Điểm Chữ</th>
                <th style="width: 80px; text-align: center;">Hệ 4</th>
                <th style="width: 90px; text-align: center;">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              ${semCourses.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; color: var(--text-gray); padding: 20px;">Học kỳ này chưa đăng ký môn học nào</td></tr>
              ` : semCourses.map(c => {
                const calc = GradeCalculator.calculateCourseFinalScore(c.components);
                const grade = GradeCalculator.convertScore10(calc.finalScore10);
                const compsStr = (c.components || []).map(cp => `${cp.name} (${cp.weight_percent}%): ${cp.score !== null ? cp.score : '?'}`).join(' | ');

                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: var(--primary);">${escapeHtml(c.course_code)}</td>
                    <td style="font-weight: 600;">
                      ${escapeHtml(c.course_name)}
                      ${c.is_retake ? '<span class="badge badge-orange" style="margin-left: 6px;">Học lại</span>' : ''}
                    </td>
                    <td style="text-align: center; font-weight: 700;">${c.credits}</td>
                    <td style="font-size: 12px; color: var(--text-gray);">${escapeHtml(compsStr)}</td>
                    <td style="text-align: center; font-weight: 800; font-size: 14px;">${calc.isComplete ? calc.finalScore10 : '--'}</td>
                    <td style="text-align: center; font-weight: 800;">${calc.isComplete ? grade.letter : '--'}</td>
                    <td style="text-align: center; font-weight: 800;">${calc.isComplete ? grade.scale4.toFixed(1) : '--'}</td>
                    <td style="text-align: center;"><span class="badge ${grade.colorClass}">${grade.status}</span></td>
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
