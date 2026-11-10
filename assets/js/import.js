/**
 * LOGIC NHẬP ĐIỂM TỪ FILE CSV (PB-25, PB-26 / BR-20, BR-21, BR-22)
 * Phụ trách: Huỳnh Nhơn Nguyên Nghiệp
 */

let currentParsedValidRows = [];

document.addEventListener('DOMContentLoaded', () => {
  setupFileDropzone();
});

function setupFileDropzone() {
  const dropzone = document.getElementById('dropZone');
  const fileInput = document.getElementById('csvFileInput');
  if (!dropzone || !fileInput) return;

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

function handleSelectedFile(file) {
  if (!file) return;

  // Tiêu chuẩn PB-25 / BR-20: Đuôi file .csv và dung lượng <= 2 MB
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('Vui lòng chỉ chọn tệp có định dạng .csv!', true);
    return;
  }
  if (file.size > CSVHelper.MAX_FILE_SIZE_BYTES) {
    showToast(`Dung lượng tệp vượt quá 2 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB)!`, true);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    processCSVContent(text, file.name);
  };
  reader.readAsText(file, 'UTF-8');
}

function processCSVContent(text, fileName) {
  const parseResult = CSVHelper.parseCSV(text);
  if (!parseResult.success) {
    showToast(parseResult.error, true);
    return;
  }

  currentParsedValidRows = parseResult.validRows;
  renderPreview(parseResult, fileName);
}

function renderPreview(res, fileName) {
  const container = document.getElementById('previewContainer');
  const tbody = document.getElementById('previewTableBody');
  const summaryEl = document.getElementById('previewSummaryText');
  const btnSave = document.getElementById('btnExecuteBatchSave');

  container.style.display = 'block';
  summaryEl.textContent = `Tệp "${fileName}": Tổng số ${res.totalRows} dòng | ${res.validRows.length} dòng hợp lệ | ${res.errorRows.length} dòng có lỗi.`;

  const allRows = [
    ...res.validRows.map(r => ({ ...r, isError: false })),
    ...res.errorRows.map(r => ({ ...r.data, row: r.row, isError: true, errorMsg: r.message }))
  ].sort((a, b) => a.row - b.row);

  tbody.innerHTML = allRows.map(r => {
    const rowClass = r.isError ? 'background: rgba(239, 68, 68, 0.12);' : '';
    return `
      <tr style="${rowClass}">
        <td style="text-align: center; font-weight: 700;">${r.row}</td>
        <td>${escapeHtml(r.semester_name || '')}</td>
        <td style="font-family: monospace; font-weight: 700; color: var(--primary);">${escapeHtml(r.course_code || '')}</td>
        <td style="font-weight: 600;">${escapeHtml(r.course_name || '')}</td>
        <td style="text-align: center;">${r.credits || '--'}</td>
        <td>${escapeHtml(r.component_name || '')}</td>
        <td style="text-align: center;">${r.weight_percent ? r.weight_percent + '%' : '--'}</td>
        <td style="text-align: center; font-weight: 800;">${r.score !== undefined ? r.score : '--'}</td>
        <td style="color: ${r.isError ? 'var(--error)' : '#10B981'}; font-weight: 600; font-size: 12.5px;">
          ${r.isError ? `❌ ${escapeHtml(r.errorMsg)}` : '✅ Hợp lệ'}
        </td>
      </tr>
    `;
  }).join('');

  if (res.errorRows.length > 0) {
    btnSave.textContent = `Chỉ lưu ${res.validRows.length} dòng hợp lệ`;
  } else {
    btnSave.textContent = `Xác nhận lưu toàn bộ ${res.validRows.length} dòng`;
  }

  container.scrollIntoView({ behavior: 'smooth' });
}

function resetImportPreview() {
  currentParsedValidRows = [];
  document.getElementById('previewContainer').style.display = 'none';
  const fileInput = document.getElementById('csvFileInput');
  if (fileInput) fileInput.value = '';
}

function executeBatchSave() {
  if (currentParsedValidRows.length === 0) {
    showToast('Không có dòng dữ liệu hợp lệ nào để lưu!', true);
    return;
  }

  StorageService.batchImportRows(currentParsedValidRows);
  showToast(`Đã lưu thành công ${currentParsedValidRows.length} dòng điểm vào hệ thống!`);

  setTimeout(() => {
    window.location.href = 'courses.html';
  }, 900);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
