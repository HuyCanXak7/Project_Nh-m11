/**
 * LOGIC NHẬP ĐIỂM TỪ FILE CSV / EXCEL (.XLSX) (PB-25, PB-26 / [T0694DD], PB-40 / [T0694ED])
 * Phụ trách: Huỳnh Nhơn Nguyên Nghiệp
 */

let currentParsedValidRows = [];
let lastPreview = null; // { res, fileName } để vẽ lại khi BE báo lỗi theo dòng

document.addEventListener('DOMContentLoaded', () => {
  StorageService.ready; // nạp sẵn dữ liệu để phân tích file import
  setupFileDropzone();
});

function setupFileDropzone() {
  const dropzone = document.getElementById('dropZone');
  const fileInput = document.getElementById('csvFileInput');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
      fileInput.click();
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary)';
    dropzone.style.background = '#cbdcfb';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    dropzone.style.background = 'var(--bg-main)';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    dropzone.style.background = 'var(--bg-main)';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleSelectedFile(fileInput.files[0]);
    }
  });
}

function showImportStatus(type, message) {
  const banner = document.getElementById('importStatusBanner');
  if (!banner) return;

  if (!type) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }

  banner.style.display = 'block';
  if (type === 'loading') {
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 14px; background: #EFF6FF; border: 1.5px solid #93C5FD; color: #1E40AF; font-size: 13.5px; font-weight: 600;">
        <span class="loading-spinner" style="width: 18px; height: 18px; border: 2.5px solid #93C5FD; border-top-color: #1D4ED8; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span>
        <span>${escapeHtml(message || 'Đang đọc và kiểm tra dữ liệu tệp...')}</span>
      </div>
    `;
  } else if (type === 'error') {
    banner.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 14px 18px; border-radius: 14px; background: #FEF2F2; border: 1.5px solid #FCA5A5; color: #991B1B; font-size: 13.5px;">
        <div style="font-weight: 600; line-height: 1.5;">
          <strong style="display: block; font-size: 14px; margin-bottom: 2px;">Không thể nhập tệp đã chọn</strong>
          <span>${escapeHtml(message)}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" onclick="CSVHelper.downloadTemplate()" class="btn btn-secondary btn-sm">Tải mẫu chuẩn</button>
          <button type="button" onclick="resetImportPreview(); document.getElementById('csvFileInput').click();" class="btn btn-primary btn-sm">Chọn lại tệp khác</button>
        </div>
      </div>
    `;
  }
}

async function handleSelectedFile(file) {
  if (!file) return;
  await StorageService.ready;

  const lowerName = file.name.toLowerCase();
  const isCSV = lowerName.endsWith('.csv');
  const isXLSX = lowerName.endsWith('.xlsx');

  // Tiêu chuẩn PB-25 / BR-20: Chấp nhận .csv và .xlsx, từ chối định dạng khác với thông báo rõ
  if (!isCSV && !isXLSX) {
    const msg = `Định dạng tệp "${file.name}" không được hỗ trợ! Vui lòng chỉ chọn tệp .csv hoặc .xlsx.`;
    showImportStatus('error', msg);
    showToast(msg, true);
    resetImportPreview(true);
    return;
  }

  // Giới hạn tối đa 2 MB (PB-25 / BR-20)
  if (file.size > CSVHelper.MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const msg = `Dung lượng tệp "${file.name}" (${sizeMB} MB) vượt quá giới hạn cho phép 2.00 MB!`;
    showImportStatus('error', msg);
    showToast(msg, true);
    resetImportPreview(true);
    return;
  }

  if (file.size === 0) {
    const msg = `Tệp "${file.name}" rỗng (0 byte)! Vui lòng chọn tệp có dữ liệu.`;
    showImportStatus('error', msg);
    showToast(msg, true);
    resetImportPreview(true);
    return;
  }

  showImportStatus('loading', `Đang đọc và kiểm tra tệp "${file.name}"...`);

  try {
    if (isCSV) {
      const text = await readFileAsText(file);
      const parseResult = CSVHelper.parseCSV(text);
      handleParseResult(parseResult, file.name);
    } else {
      const buffer = await readFileAsArrayBuffer(file);
      const parseResult = await CSVHelper.parseXLSX(buffer);
      handleParseResult(parseResult, file.name);
    }
  } catch (err) {
    const msg = 'Đã xảy ra lỗi khi đọc tệp từ máy tính. Vui lòng thử lại!';
    showImportStatus('error', msg);
    showToast(msg, true);
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsText(file, 'UTF-8');
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsArrayBuffer(file);
  });
}

function handleParseResult(parseResult, fileName) {
  if (!parseResult || !parseResult.success) {
    const errMsg = parseResult?.error || 'Tệp không hợp lệ!';
    showImportStatus('error', errMsg);
    showToast(errMsg, true);
    document.getElementById('previewContainer').style.display = 'none';
    return;
  }

  showImportStatus(null);
  currentParsedValidRows = parseResult.validRows;
  lastPreview = { res: parseResult, fileName };
  renderPreview(parseResult, fileName);
}

function renderPreview(res, fileName) {
  const container = document.getElementById('previewContainer');
  const tbody = document.getElementById('previewTableBody');
  const summaryEl = document.getElementById('previewSummaryText');
  const btnSave = document.getElementById('btnExecuteBatchSave');

  // Phân tích xem dòng hợp lệ nào sẽ tạo mới Học kỳ hoặc tạo mới Môn học (PB-25 / PB-26)
  const analysis = StorageService.analyzeImportRows(res.validRows);

  container.style.display = 'block';
  summaryEl.innerHTML = `
    Tệp <strong>"${escapeHtml(fileName)}"</strong>: Tổng cộng <strong>${res.totalRows}</strong> dòng
    &nbsp;|&nbsp; <span style="color: #10B981; font-weight: 700;">${res.validRows.length} dòng hợp lệ</span>
    &nbsp;|&nbsp; <span style="color: ${res.errorRows.length > 0 ? 'var(--error)' : 'var(--text-gray)'}; font-weight: 700;">${res.errorRows.length} dòng lỗi</span>
    ${res.validRows.length > 0 ? `<br><span style="display: inline-block; margin-top: 4px; color: var(--primary); font-weight: 600;">Khi xác nhận lưu: Tự động tạo mới <strong>${analysis.newSemesterCount}</strong> học kỳ và <strong>${analysis.newCourseCount}</strong> môn học chưa tồn tại, đồng thời cập nhật điểm thành phần.</span>` : ''}
  `;

  const allRows = [
    ...analysis.annotatedRows.map(r => ({ ...r, isError: false })),
    ...res.errorRows.map(r => ({ ...r.data, row: r.row, isError: true, errorMsg: r.message }))
  ].sort((a, b) => a.row - b.row);

  tbody.innerHTML = allRows.map(r => {
    const rowStyle = r.isError ? 'background: rgba(239, 68, 68, 0.12);' : '';
    let statusHtml = '';

    if (r.isError) {
      statusHtml = `<span style="color: var(--error); font-weight: 700;">Lỗi: ${escapeHtml(r.errorMsg)}</span>`;
    } else {
      const badges = ['<span class="badge badge-green">Hợp lệ</span>'];
      if (r.isNewSemester) {
        badges.push('<span class="badge badge-blue" title="Học kỳ chưa có, sẽ được tạo mới khi lưu">+ Học kỳ mới</span>');
      }
      if (r.isNewCourse) {
        badges.push('<span class="badge badge-orange" title="Môn học chưa có trong học kỳ này, sẽ được tạo mới khi lưu">+ Môn mới</span>');
      } else {
        badges.push('<span class="badge badge-gray" title="Cập nhật điểm thành phần cho môn đã có">Cập nhật môn</span>');
      }
      statusHtml = `<div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">${badges.join('')}</div>`;
    }

    return `
      <tr style="${rowStyle}">
        <td style="text-align: center; font-weight: 700;">${r.row}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(r.semester_name || '--')}</div>
        </td>
        <td style="font-family: monospace; font-weight: 700; color: var(--primary);">${escapeHtml(r.course_code || '--')}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(r.course_name || '--')}</div>
          <div style="font-size: 11px; color: var(--text-gray);">${escapeHtml(r.category || 'Đại cương')}</div>
        </td>
        <td style="text-align: center; font-weight: 700;">${escapeHtml(String(r.credits || '--'))}</td>
        <td>${escapeHtml(r.component_name || '--')}</td>
        <td style="text-align: center;">${r.weight_percent ? escapeHtml(String(r.weight_percent)) + '%' : '--'}</td>
        <td style="text-align: center; font-weight: 800;">${r.score !== undefined && r.score !== '' ? escapeHtml(String(r.score)) : '--'}</td>
        <td style="font-size: 12.5px;">${statusHtml}</td>
      </tr>
    `;
  }).join('');

  if (res.validRows.length === 0) {
    btnSave.disabled = true;
    btnSave.style.opacity = '0.5';
    btnSave.textContent = 'Không có dòng hợp lệ để lưu';
  } else {
    btnSave.disabled = false;
    btnSave.style.opacity = '1';
    if (res.errorRows.length > 0) {
      btnSave.textContent = `Chỉ lưu ${res.validRows.length} dòng hợp lệ`;
    } else {
      btnSave.textContent = `Xác nhận lưu toàn bộ ${res.validRows.length} dòng`;
    }
  }

  container.scrollIntoView({ behavior: 'smooth' });
}

function resetImportPreview(keepBanner = false) {
  currentParsedValidRows = [];
  const previewContainer = document.getElementById('previewContainer');
  if (previewContainer) previewContainer.style.display = 'none';
  const fileInput = document.getElementById('csvFileInput');
  if (fileInput) fileInput.value = '';
  if (!keepBanner) {
    showImportStatus(null);
  }
}

async function executeBatchSave() {
  if (currentParsedValidRows.length === 0) {
    showToast('Không có dòng dữ liệu hợp lệ nào để lưu!', true);
    return;
  }

  let result;
  try {
    result = await StorageService.batchImportRows(currentParsedValidRows);
  } catch (err) {
    // session.js trải mảng details của BE thành object {0: {...}, 1: {...}}
    const details = Object.values(err.details || {}).filter(d => d?.reason);
    showToast(err.message || 'Không lưu được dữ liệu import.', true);
    if (lastPreview && details.some(d => d.row)) markServerErrors(details);
    return;
  }
  const detailParts = [`${currentParsedValidRows.length} dòng điểm`];
  if (result.createdSemCount > 0) detailParts.push(`+${result.createdSemCount} học kỳ mới`);
  if (result.createdCourseCount > 0) detailParts.push(`+${result.createdCourseCount} môn học mới`);

  showToast(`Đã lưu thành công (${detailParts.join(', ')})!`);

  setTimeout(() => {
    window.location.href = 'courses.html';
  }, 900);
}

// Chuyển các dòng BE từ chối sang trạng thái lỗi trong bảng xem trước (FE chỉ kiểm tra từng dòng, BE kiểm tra cả lô)
function markServerErrors(details) {
  const byRow = {};
  details.forEach(d => (byRow[d.row] ??= []).push(d.reason));
  const { res, fileName } = lastPreview;
  const failed = res.validRows.filter(r => byRow[r.row]);
  const next = {
    ...res,
    validRows: res.validRows.filter(r => !byRow[r.row]),
    errorRows: [...res.errorRows, ...failed.map(r => ({ row: r.row, data: r, message: byRow[r.row].join('; ') }))]
  };
  lastPreview = { res: next, fileName };
  currentParsedValidRows = next.validRows;
  renderPreview(next, fileName);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
