/**
 * LOGIC KẾT XUẤT BẢNG ĐIỂM TỔNG HỢP THEO HỌC KỲ, XUẤT CSV/EXCEL & IN ẤN A4
 * Phụ trách:
 *  - PB-52 [T0694E5]: Xem bảng điểm tổng hợp theo học kỳ (chỉ dữ liệu người dùng hiện tại, đủ môn, tín chỉ, điểm thành phần, hệ 10, điểm chữ, hệ 4, GPA từng kỳ, GPA tích lũy, có trạng thái rỗng)
 *  - PB-27 [T0694E6]: Xuất bảng điểm CSV / Excel (.xlsx)
 *  - PB-40 [T0694ED]: Trạng thái loading, rỗng, lỗi rõ ràng và không hiển thị dữ liệu lỗi như kết quả hợp lệ
 */

document.addEventListener('DOMContentLoaded', () => {
  initTranscriptPage();
});

function initTranscriptPage() {
  const container = document.getElementById('transcriptSemestersContainer');
  if (container) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 36px 20px;">
        <p class="empty-state__desc">Đang tải dữ liệu bảng điểm cá nhân...</p>
      </div>
    `;
  }

  try {
    populateTranscriptSemesterFilter();
    renderTranscript();
  } catch (err) {
    console.error('Lỗi tải bảng điểm:', err);
    if (container) {
      container.innerHTML = `
        <div class="empty-state" style="border-color: rgba(239, 68, 68, 0.45); background: #FEF2F2;">
          <div class="empty-state__icon">
            <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="var(--error)" stroke-width="1.8" stroke-linecap="round" style="margin: 0 auto;">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3 class="empty-state__title" style="color: #991B1B;">Không thể tải bảng điểm</h3>
          <p class="empty-state__desc">Dữ liệu lưu trữ cục bộ gặp sự cố ngoài ý muốn. Bạn có thể thử tải lại hoặc khôi phục dữ liệu.</p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button type="button" onclick="initTranscriptPage()" class="btn btn-primary btn-sm">Thử tải lại</button>
            <button type="button" onclick="handleResetData()" class="btn btn-secondary btn-sm">Nạp lại dữ liệu mẫu</button>
          </div>
        </div>
      `;
    }
  }
}

function populateTranscriptSemesterFilter() {
  const selectEl = document.getElementById('transcriptSemesterFilter');
  if (!selectEl) return;

  const semesters = StorageService.getSemesters();
  const prevVal = selectEl.value || 'ALL';

  selectEl.innerHTML = `<option value="ALL">Tất cả học kỳ (${semesters.length})</option>` +
    semesters.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} (${escapeHtml(s.academic_year || '')})</option>`).join('');

  if ([...selectEl.options].some(o => o.value === prevVal)) {
    selectEl.value = prevVal;
  }
}

function renderTranscript() {
  const courses = StorageService.getCourses();
  const semesters = StorageService.getSemesters();
  const student = StorageService.getStudent();
  const sessionUser = (typeof getSession === 'function' ? getSession()?.user : null);

  // Cập nhật thông tin sinh viên khi in A4 từ dữ liệu người dùng hiện tại
  const printNameEl = document.getElementById('printStudentName');
  const printIdEl = document.getElementById('printStudentId');
  const printMajorEl = document.getElementById('printStudentMajor');
  const metaLine = document.getElementById('printMetaLine');

  if (printNameEl) printNameEl.textContent = student.name || sessionUser?.fullName || 'Sinh viên';
  if (printIdEl) printIdEl.textContent = student.student_id || 'Chưa cập nhật';
  if (printMajorEl) printMajorEl.textContent = student.major || 'Chưa cập nhật';
  if (metaLine) {
    metaLine.textContent = `Lớp: ${student.class_name || 'Chưa cập nhật'} | Email: ${student.email || sessionUser?.email || 'Chưa cập nhật'} | Ngày in: ${new Date().toLocaleDateString('vi-VN')}`;
  }

  // Tóm tắt tích lũy toàn khóa của người dùng hiện tại (PB-52)
  const cum = GradeCalculator.calculateCumulativeGPA(courses);
  const cumGpaEl = document.getElementById('cumGpaDisplay');
  const cumAvg10El = document.getElementById('cumAvg10Display');
  const cumCreditsEl = document.getElementById('cumCreditsDisplay');
  const cumRankEl = document.getElementById('cumRankDisplay');

  if (cumGpaEl) cumGpaEl.textContent = cum.formattedGPA;
  if (cumAvg10El) cumAvg10El.textContent = cum.formattedAvg10 || '0.00';
  if (cumCreditsEl) cumCreditsEl.textContent = `${cum.passedCredits} / ${cum.totalCredits} TC`;
  if (cumRankEl) cumRankEl.textContent = cum.rank;

  const container = document.getElementById('transcriptSemestersContainer');
  const filterBar = document.getElementById('transcriptFilterBar');
  if (!container) return;

  // Trạng thái rỗng khi người dùng chưa có bất kỳ học kỳ và môn học nào (PB-52, PB-40)
  if (semesters.length === 0 && courses.length === 0) {
    if (filterBar) filterBar.style.display = 'none';
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <h3 class="empty-state__title">Chưa có dữ liệu bảng điểm</h3>
        <p class="empty-state__desc">Tài khoản của bạn hiện chưa có học kỳ hoặc môn học nào. Hãy thêm môn học mới, nhập bảng điểm từ tệp CSV/Excel hoặc nạp dữ liệu mẫu để bắt đầu!</p>
        <div class="no-print" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <a href="courses.html" class="btn btn-primary btn-sm" style="text-decoration: none;">+ Thêm môn học</a>
          <a href="import.html" class="btn btn-secondary btn-sm" style="text-decoration: none;">Nhập từ CSV / Excel</a>
          <button type="button" onclick="handleResetData()" class="btn btn-secondary btn-sm">Nạp dữ liệu mẫu</button>
        </div>
      </div>
    `;
    return;
  }

  if (filterBar) filterBar.style.display = 'flex';

  const keyword = (document.getElementById('transcriptSearchInput')?.value || '').trim().toLowerCase();
  const selectedSemId = document.getElementById('transcriptSemesterFilter')?.value || 'ALL';

  // Tính GPA tích lũy lũy tiến qua từng học kỳ (PB-52 · T0694E5)
  const cumulativeBySemId = {};
  const runningCourses = [];
  semesters.forEach(s => {
    const sc = courses.filter(c => c.semester_id === s.id);
    runningCourses.push(...sc);
    cumulativeBySemId[s.id] = GradeCalculator.calculateCumulativeGPA(runningCourses);
  });

  const filteredSemesters = semesters.filter(sem => selectedSemId === 'ALL' || sem.id === selectedSemId);
  const countedSet = new Set(cum.countedCourseIds || []);

  const cardsHtml = filteredSemesters.map(sem => {
    const allSemCourses = courses.filter(c => c.semester_id === sem.id);
    const semCalc = GradeCalculator.calculateSemesterGPA(allSemCourses);
    const cumUpToSem = cumulativeBySemId[sem.id] || cum;

    const visibleCourses = allSemCourses.filter(c => {
      if (!keyword) return true;
      return (c.course_code || '').toLowerCase().includes(keyword) ||
             (c.course_name || '').toLowerCase().includes(keyword);
    });

    if (keyword && visibleCourses.length === 0) {
      return '';
    }

    return `
      <div class="transcript-sem-card" style="background: var(--e-card); border: 1px solid var(--e-soft); padding: 0; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: var(--e-card-alt); border-bottom: 1px solid var(--e-soft); flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; color: var(--e-ink);">${escapeHtml(sem.name)} ${sem.academic_year ? `(${escapeHtml(sem.academic_year)})` : ''}</h3>
            <span style="font-size: 11.5px; color: #64748B;">Thời gian: ${escapeHtml(sem.start_date || '--')} đến ${escapeHtml(sem.end_date || '--')}</span>
          </div>
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; background: var(--e-card); padding: 7px 14px; border: 1px solid var(--e-soft); font-size: 12px;">
            <span>GPA Học kỳ (Hệ 4): <strong style="color: var(--e-ink); font-size: 13.5px;">${semCalc.formattedGPA}</strong></span>
            <span style="color: var(--e-soft);">|</span>
            <span>ĐTB Kỳ (Hệ 10): <strong style="color: var(--e-ink);">${semCalc.formattedAvg10 || '0.00'}</strong></span>
            <span style="color: var(--e-soft);">|</span>
            <span>GPA Tích lũy: <strong style="color: #059669; font-size: 13.5px;">${cumUpToSem.formattedGPA}</strong></span>
            <span style="color: var(--e-soft);">|</span>
            <span>Tín chỉ đạt: <strong>${semCalc.passedCredits}/${semCalc.registeredCredits || semCalc.totalCredits} TC</strong></span>
          </div>
        </div>

        <div class="table-wrap" style="border: none;">
          <table class="app-table course-figma-table">
            <thead>
              <tr>
                <th style="width: 95px;">MÃ MÔN</th>
                <th>TÊN MÔN HỌC</th>
                <th style="width: 75px; text-align: center;">TÍN CHỈ</th>
                <th>ĐIỂM THÀNH PHẦN CHI TIẾT</th>
                <th style="width: 95px; text-align: center;">ĐIỂM HỆ 10</th>
                <th style="width: 80px; text-align: center;">ĐIỂM CHỮ</th>
                <th style="width: 75px; text-align: center;">HỆ 4</th>
                <th style="width: 110px; text-align: center;">KẾT QUẢ</th>
              </tr>
            </thead>
            <tbody>
              ${visibleCourses.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; color: var(--text-gray); padding: 20px;">Học kỳ này chưa đăng ký môn học nào</td></tr>
              ` : visibleCourses.map(c => {
                const calc = GradeCalculator.calculateCourseFinalScore(c.components);
                const grade = GradeCalculator.convertScore10(calc.finalScore10);
                const comps = Array.isArray(c.components) ? c.components : [];
                const compsHtml = comps.length === 0
                  ? '<span style="color: var(--error); font-weight: 600;">Chưa cấu hình cột điểm</span>'
                  : comps.map(cp => {
                      const hasScore = cp.score !== null && cp.score !== '' && cp.score !== undefined && !isNaN(Number(cp.score));
                      return `<span style="display: inline-block; background: var(--e-tint); border: 1px solid var(--e-soft); padding: 2px 8px; margin: 2px 4px 2px 0; font-size: 11.5px; color: var(--e-ink);">
                        <strong>${escapeHtml(cp.name)}</strong> (${cp.weight_percent}%): <strong style="color: ${hasScore ? 'var(--e-ink)' : '#64748B'};">${hasScore ? Number(cp.score).toFixed(1) : '—'}</strong>
                      </span>`;
                    }).join('');

                const weightErrorHtml = !calc.isValidWeight
                  ? `<div style="color: var(--error); font-size: 11px; font-weight: 700; margin-top: 4px;">Trọng số hiện tại ${calc.totalWeight}% (cần đúng 100%)</div>`
                  : '';

                const isReplacedByRetake = calc.isComplete && !countedSet.has(c.id);

                return `
                  <tr>
                    <td class="course-code-cell">${escapeHtml(c.course_code)}</td>
                    <td style="font-weight: 600;">
                      <div class="course-name-text">${escapeHtml(c.course_name)}</div>
                      <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px;">
                        <span class="badge badge-blue" style="font-size: 10px; padding: 2px 6px;">${escapeHtml(c.category || 'Đại cương')}</span>
                        ${c.is_retake ? '<span class="badge badge-orange" style="font-size: 10px; padding: 2px 6px;">Học lại / Cải thiện</span>' : ''}
                        ${isReplacedByRetake ? '<span class="badge badge-gray" style="font-size: 10px; padding: 2px 6px;" title="Đã có lần học khác điểm cao hơn được tính vào GPA tích lũy">Đã thay thế bởi lần học cao hơn</span>' : ''}
                      </div>
                    </td>
                    <td style="text-align: center; font-weight: 700; color: var(--e-ink);">${c.credits} TC</td>
                    <td style="font-size: 12px;">${compsHtml}${weightErrorHtml}</td>
                    <td style="text-align: center; font-weight: 800; font-size: 13.5px; color: ${calc.isComplete ? 'var(--e-ink)' : '#94A3B8'};">
                      ${calc.isComplete ? calc.finalScore10.toFixed(1) : '—'}
                    </td>
                    <td style="text-align: center; font-weight: 800;">
                      ${calc.isComplete ? `<span class="badge ${grade.colorClass}">${grade.letter}</span>` : '—'}
                    </td>
                    <td style="text-align: center; font-weight: 800; color: var(--e-ink);">
                      ${calc.isComplete ? grade.scale4.toFixed(1) : '—'}
                    </td>
                    <td style="text-align: center;">
                      <span class="badge ${calc.isComplete ? grade.colorClass : (!calc.isValidWeight || calc.hasInvalidScore ? 'badge-red' : 'badge-gray')}">
                        ${calc.isComplete ? grade.status : (!calc.isValidWeight ? 'Sai trọng số' : 'Đang học')}
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
  }).filter(Boolean).join('');

  if (!cardsHtml) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="var(--text-gray)" stroke-width="1.8" stroke-linecap="round" style="margin: 0 auto;">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </div>
        <h3 class="empty-state__title">Không tìm thấy môn học phù hợp</h3>
        <p class="empty-state__desc">Không có môn học nào khớp với bộ lọc học kỳ hoặc từ khóa tìm kiếm của bạn.</p>
        <button type="button" onclick="document.getElementById('transcriptSearchInput').value=''; document.getElementById('transcriptSemesterFilter').value='ALL'; renderTranscript();" class="btn btn-secondary btn-sm">Xóa bộ lọc</button>
      </div>
    `;
    return;
  }

  container.innerHTML = cardsHtml;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
