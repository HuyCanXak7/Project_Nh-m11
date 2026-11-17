/**
 * MODULE XỬ LÝ NHẬP / XUẤT CSV & EXCEL (.XLSX) TẠI CLIENT (FE)
 * Phụ trách:
 *  - PB-25 [T0694DD]: Tải mẫu CSV/Excel, chọn tệp (.csv, .xlsx), giới hạn 2 MB & 1.000 dòng
 *  - PB-26 [T0694DD]: Kiểm tra hợp lệ từng dòng, đánh dấu học kỳ/môn học mới ở bước xem trước
 *  - PB-27 [T0694E6]: Xuất bảng điểm CSV/Excel tại FE, đầy đủ điểm thành phần, điểm môn, điểm chữ, GPA kỳ & tích lũy, chống CSV Formula Injection (=, +, -, @)
 */

const CSVHelper = {
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024, // 2 MB (PB-25 / BR-20)
  MAX_ROWS: 1000,                       // 1.000 dòng (PB-25 / BR-20)

  EXPECTED_HEADERS: [
    'semester_name',
    'course_code',
    'course_name',
    'credits',
    'category',
    'component_name',
    'weight_percent',
    'score'
  ],

  SAMPLE_ROWS: [
    ['Học kỳ 1', 'INT1001', 'Nhập môn lập trình', 3, 'Đại cương', 'Chuyên cần', 10, 9.0],
    ['Học kỳ 1', 'INT1001', 'Nhập môn lập trình', 3, 'Đại cương', 'Giữa kỳ', 30, 8.0],
    ['Học kỳ 1', 'INT1001', 'Nhập môn lập trình', 3, 'Đại cương', 'Cuối kỳ', 60, 8.5],
    ['Học kỳ 1', 'MAT1010', 'Giải tích 1', 4, 'Đại cương', 'Chuyên cần', 10, 8.0],
    ['Học kỳ 1', 'MAT1010', 'Giải tích 1', 4, 'Đại cương', 'Giữa kỳ', 30, 5.0],
    ['Học kỳ 1', 'MAT1010', 'Giải tích 1', 4, 'Đại cương', 'Cuối kỳ', 60, 6.5],
    ['Học kỳ 2', 'INT1002', 'Cấu trúc dữ liệu và giải thuật', 3, 'Cơ sở ngành', 'Chuyên cần', 10, 9.5],
    ['Học kỳ 2', 'INT1002', 'Cấu trúc dữ liệu và giải thuật', 3, 'Cơ sở ngành', 'Bài tập lớn', 40, 8.5],
    ['Học kỳ 2', 'INT1002', 'Cấu trúc dữ liệu và giải thuật', 3, 'Cơ sở ngành', 'Cuối kỳ', 50, 9.0]
  ],

  get SAMPLE_CSV_CONTENT() {
    const headerLine = this.EXPECTED_HEADERS.join(',');
    const bodyLines = this.SAMPLE_ROWS.map(row =>
      row.map(cell => this.csvCell(cell, false)).join(',')
    );
    return [headerLine, ...bodyLines].join('\n');
  },

  /**
   * Chống CSV / Excel Formula Injection (PB-27 / BR-23):
   * Mọi chuỗi văn bản bắt đầu bằng =, +, -, @ (hoặc ký tự điều khiển tab/CR đầu chuỗi)
   * đều được thêm dấu nháy đơn (') ở phía trước.
   */
  sanitizeFormula(value) {
    if (value === null || value === undefined) return '';
    const raw = String(value);
    const trimmed = raw.trim();
    if (/^[=+\-@]/.test(trimmed) || /^[\t\r]/.test(raw)) {
      return "'" + trimmed;
    }
    return trimmed;
  },

  /**
   * Định dạng 1 ô CSV chuẩn RFC-4180 kết hợp chống Formula Injection
   */
  csvCell(value, sanitize = true) {
    if (value === null || value === undefined) return '""';
    const safeVal = sanitize ? this.sanitizeFormula(value) : String(value);
    const escaped = safeVal.replace(/"/g, '""');
    return `"${escaped}"`;
  },

  /**
   * Tải tệp mẫu CSV (PB-25)
   */
  downloadTemplate() {
    const blob = new Blob(['\uFEFF' + this.SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    this._triggerDownload(blob, 'mau_import_diem_nhom11.csv');
  },

  /**
   * Tải tệp mẫu Excel .xlsx (PB-25)
   */
  downloadTemplateExcel() {
    const rows = [
      this.EXPECTED_HEADERS,
      ...this.SAMPLE_ROWS
    ];
    const blob = this.buildXLSXBlob('Mau_Nhap_Diem', rows);
    this._triggerDownload(blob, 'mau_import_diem_nhom11.xlsx');
  },

  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  /**
   * Tách 1 dòng CSV theo chuẩn RFC-4180 (hỗ trợ dấu phẩy nằm trong ngoặc kép và "")
   */
  splitCSVLine(line, delimiter = ',') {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  },

  /**
   * Đọc và kiểm tra nội dung CSV bằng PapaParse (hoặc bộ tách RFC-4180 nội bộ khi offline) (PB-25, PB-26 / T0694DD)
   */
  parseCSV(text) {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'Tệp CSV rỗng hoặc không thể đọc nội dung!' };
    }

    // Loại bỏ BOM UTF-8 và dòng sep= của Excel nếu có
    const cleanText = text
      .replace(/^\uFEFF/, '')
      .replace(/^sep=.*\r?\n/i, '');

    if (cleanText.trim().length === 0) {
      return { success: false, error: 'Tệp CSV rỗng, không có dữ liệu để đọc!' };
    }

    // Ưu tiên sử dụng thư viện PapaParse tại FE theo đúng đặc tả PB-25 (T0694DD)
    if (typeof window !== 'undefined' && window.Papa && typeof window.Papa.parse === 'function') {
      const parsed = window.Papa.parse(cleanText, {
        header: false,
        skipEmptyLines: 'greedy'
      });
      const rows = Array.isArray(parsed.data) ? parsed.data : [];
      if (rows.length === 0) {
        return { success: false, error: 'Tệp CSV rỗng, không có dữ liệu để đọc!' };
      }
      return this.validateTabularData(rows[0], rows.slice(1));
    }

    const rawLines = cleanText
      .split(/\r?\n/)
      .filter(line => line.trim().length > 0);

    if (rawLines.length === 0) {
      return { success: false, error: 'Tệp CSV rỗng, không có dữ liệu để đọc!' };
    }

    // Tự động nhận diện dấu phân cách ',' hoặc ';'
    const firstLine = rawLines[0];
    const delimiter = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

    const matrix = rawLines.map(line => this.splitCSVLine(line, delimiter));
    return this.validateTabularData(matrix[0], matrix.slice(1));
  },

  /**
   * Kiểm tra ma trận dữ liệu bảng (dùng chung cho cả CSV và Excel .xlsx)
   */
  validateTabularData(headerRow, dataRows) {
    if (!headerRow || headerRow.length === 0) {
      return { success: false, error: 'Tệp không có dòng tiêu đề cột (Header)!' };
    }

    // Lọc bỏ các dòng hoàn toàn trống ở cuối bảng Excel/CSV
    const nonEmptyRows = (dataRows || []).filter(row =>
      Array.isArray(row) && row.some(cell => String(cell ?? '').trim() !== '')
    );

    if (nonEmptyRows.length === 0) {
      return { success: false, error: 'Tệp chỉ có tiêu đề cột, chưa có dòng dữ liệu điểm nào!' };
    }

    if (nonEmptyRows.length > this.MAX_ROWS) {
      return {
        success: false,
        error: `Tệp vượt quá giới hạn tối đa ${this.MAX_ROWS.toLocaleString('vi-VN')} dòng dữ liệu (hiện tại: ${nonEmptyRows.length.toLocaleString('vi-VN')} dòng)!`
      };
    }

    const headers = headerRow.map(h => String(h ?? '').replace(/^\uFEFF/, '').trim().toLowerCase());
    const missingHeaders = this.EXPECTED_HEADERS.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return {
        success: false,
        error: `Tệp sai định dạng mẫu! Thiếu các cột bắt buộc: ${missingHeaders.join(', ')}. Vui lòng tải file mẫu để xem cấu trúc chuẩn.`
      };
    }

    const validRows = [];
    const errorRows = [];

    for (let i = 0; i < nonEmptyRows.length; i++) {
      const lineNum = i + 2; // Dòng 1 là header
      const values = nonEmptyRows[i];

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] !== undefined && values[idx] !== null ? String(values[idx]).trim() : '';
      });

      const rowErrors = [];
      if (!rowObj.semester_name) rowErrors.push('Thiếu tên học kỳ (semester_name)');
      if (!rowObj.course_code) rowErrors.push('Thiếu mã môn (course_code)');
      if (!rowObj.course_name) rowErrors.push('Thiếu tên môn (course_name)');
      if (!rowObj.component_name) rowErrors.push('Thiếu tên thành phần điểm (component_name)');

      const creditsStr = String(rowObj.credits).replace(',', '.');
      const credits = Number(creditsStr);
      if (!rowObj.credits || isNaN(credits) || !Number.isFinite(credits) || credits <= 0 || credits > 20) {
        rowErrors.push('Tín chỉ (credits) phải là số từ 1 đến 20');
      } else {
        rowObj.credits = String(credits);
      }

      const weightStr = String(rowObj.weight_percent).replace('%', '').replace(',', '.').trim();
      const weight = Number(weightStr);
      if (weightStr === '' || isNaN(weight) || !Number.isFinite(weight) || weight <= 0 || weight > 100) {
        rowErrors.push('Trọng số (weight_percent) phải từ 1 đến 100%');
      } else {
        rowObj.weight_percent = String(weight);
      }

      const scoreStr = String(rowObj.score).replace(',', '.').trim();
      const score = Number(scoreStr);
      if (scoreStr === '' || isNaN(score) || !Number.isFinite(score) || score < 0 || score > 10) {
        rowErrors.push('Điểm số (score) phải từ 0.0 đến 10.0');
      } else {
        rowObj.score = String(Math.round(score * 100) / 100);
      }

      if (!rowObj.category) {
        rowObj.category = 'Đại cương';
      }

      if (rowErrors.length > 0) {
        errorRows.push({ row: lineNum, data: rowObj, message: rowErrors.join('; ') });
      } else {
        validRows.push({ row: lineNum, ...rowObj });
      }
    }

    return {
      success: true,
      totalRows: nonEmptyRows.length,
      validRows,
      errorRows
    };
  },

  /**
   * ============================================================================
   * ĐỌC TỆP EXCEL (.XLSX) TẠI TRÌNH DUYỆT (KHÔNG CẦN BACKEND HAY CDN NGOÀI)
   * Giải nén ZIP container + đọc xl/sharedStrings.xml & xl/worksheets/sheet1.xml
   * ============================================================================
   */
  async parseXLSX(arrayBuffer) {
    try {
      const files = await this._unzipXLSX(arrayBuffer);
      const sheetKey = Object.keys(files).find(k => /^xl\/worksheets\/sheet\d*\.xml$/i.test(k))
        || Object.keys(files).find(k => k.endsWith('.xml') && k.includes('worksheets'));

      if (!sheetKey) {
        return { success: false, error: 'Tệp Excel (.xlsx) không hợp lệ hoặc không tìm thấy trang tính (Worksheet)!' };
      }

      const decoder = new TextDecoder('utf-8');
      const sharedStrings = [];

      if (files['xl/sharedStrings.xml']) {
        const sstXml = decoder.decode(files['xl/sharedStrings.xml']);
        const sstDoc = new DOMParser().parseFromString(sstXml, 'application/xml');
        const siNodes = sstDoc.getElementsByTagName('si');
        for (let i = 0; i < siNodes.length; i++) {
          const tNodes = siNodes[i].getElementsByTagName('t');
          let text = '';
          for (let j = 0; j < tNodes.length; j++) {
            text += tNodes[j].textContent || '';
          }
          sharedStrings.push(text);
        }
      }

      const sheetXml = decoder.decode(files[sheetKey]);
      const sheetDoc = new DOMParser().parseFromString(sheetXml, 'application/xml');
      const rowNodes = sheetDoc.getElementsByTagName('row');
      const matrix = [];

      for (let r = 0; r < rowNodes.length; r++) {
        const rowEl = rowNodes[r];
        const cellNodes = rowEl.getElementsByTagName('c');
        const rowValues = [];

        for (let c = 0; c < cellNodes.length; c++) {
          const cellEl = cellNodes[c];
          const ref = cellEl.getAttribute('r') || '';
          const colLetters = ref.replace(/[0-9]/g, '');
          const colIdx = colLetters ? this._colLettersToIndex(colLetters) : c;
          const type = cellEl.getAttribute('t') || '';

          let val = '';
          if (type === 'inlineStr') {
            const tNodes = cellEl.getElementsByTagName('t');
            for (let t = 0; t < tNodes.length; t++) {
              val += tNodes[t].textContent || '';
            }
          } else {
            const vNode = cellEl.getElementsByTagName('v')[0];
            const rawVal = vNode ? (vNode.textContent || '') : '';
            if (type === 's') {
              const sIdx = parseInt(rawVal, 10);
              val = !isNaN(sIdx) && sharedStrings[sIdx] !== undefined ? sharedStrings[sIdx] : rawVal;
            } else {
              val = rawVal;
            }
          }

          while (rowValues.length < colIdx) {
            rowValues.push('');
          }
          rowValues[colIdx] = val;
        }

        if (rowValues.some(v => String(v ?? '').trim() !== '')) {
          matrix.push(rowValues);
        }
      }

      if (matrix.length === 0) {
        return { success: false, error: 'Tệp Excel (.xlsx) rỗng, không có dữ liệu!' };
      }

      return this.validateTabularData(matrix[0], matrix.slice(1));
    } catch (err) {
      console.error('Lỗi đọc file XLSX:', err);
      return {
        success: false,
        error: 'Không thể đọc tệp Excel (.xlsx). Vui lòng kiểm tra định dạng tệp hoặc sử dụng tệp mẫu!'
      };
    }
  },

  _colLettersToIndex(letters) {
    let idx = 0;
    const up = letters.toUpperCase();
    for (let i = 0; i < up.length; i++) {
      idx = idx * 26 + (up.charCodeAt(i) - 64);
    }
    return Math.max(0, idx - 1);
  },

  _indexToColLetters(index) {
    let n = index + 1;
    let str = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      str = String.fromCharCode(65 + rem) + str;
      n = Math.floor((n - 1) / 26);
    }
    return str;
  },

  async _unzipXLSX(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);

    // Kiểm tra chữ ký ZIP 'PK\x03\x04'
    if (bytes.length < 22 || view.getUint32(0, true) !== 0x04034b50) {
      throw new Error('Không phải tệp ZIP/XLSX hợp lệ');
    }

    // Tìm End of Central Directory (EOCD: 0x06054b50)
    let eocdOffset = -1;
    const minSearch = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= minSearch; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) {
      throw new Error('Không tìm thấy cấu trúc Central Directory của tệp XLSX');
    }

    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const decoder = new TextDecoder('utf-8');
    const files = {};

    let ptr = cdOffset;
    for (let e = 0; e < totalEntries; e++) {
      if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) break;

      const compressionMethod = view.getUint16(ptr + 10, true);
      const compressedSize = view.getUint32(ptr + 20, true);
      const fileNameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localHeaderOffset = view.getUint32(ptr + 42, true);

      const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + fileNameLen));
      ptr += 46 + fileNameLen + extraLen + commentLen;

      // Chỉ giải nén các tệp XML cần thiết của bảng tính
      if (!fileName.endsWith('.xml')) continue;

      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        files[fileName] = compressedData;
      } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressedData);
        writer.close();
        const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
        files[fileName] = new Uint8Array(decompressedBuffer);
      }
    }

    return files;
  },

  /**
   * ============================================================================
   * TẠO TỆP EXCEL (.XLSX) CHUẨN OPENXML TẠI FE (PB-27 / [T0694E6])
   * Đóng gói ZIP không nén (Store method 0 + CRC32) giúp tương thích 100% với
   * Microsoft Excel, Google Sheets, LibreOffice mà không cần thư viện ngoài.
   * ============================================================================
   */
  buildXLSXBlob(sheetName, rows) {
    const safeSheetName = String(sheetName || 'BangDiem').replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'BangDiem';
    const xmlEscape = (str) => String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const sheetRowsXml = rows.map((row, rIdx) => {
      const rowNum = rIdx + 1;
      const cellsXml = (row || []).map((cellVal, cIdx) => {
        const cellRef = `${this._indexToColLetters(cIdx)}${rowNum}`;
        if (typeof cellVal === 'number' && Number.isFinite(cellVal)) {
          return `<c r="${cellRef}" t="n"><v>${cellVal}</v></c>`;
        }
        const textVal = xmlEscape(cellVal ?? '');
        return `<c r="${cellRef}" t="inlineStr"><is><t xml:space="preserve">${textVal}</t></is></c>`;
      }).join('');
      return `<row r="${rowNum}">${cellsXml}</row>`;
    }).join('');

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${xmlEscape(safeSheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

    const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRowsXml}</sheetData>
</worksheet>`;

    const zipEntries = [
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: rootRelsXml },
      { name: 'xl/workbook.xml', content: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
      { name: 'xl/worksheets/sheet1.xml', content: worksheetXml }
    ];

    return this._createStoreZipBlob(zipEntries, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  },

  _crc32(bytes) {
    if (!this._crcTable) {
      this._crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        this._crcTable[n] = c >>> 0;
      }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = this._crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  },

  _createStoreZipBlob(entries, mimeType) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBytes = encoder.encode(entry.name);
      const dataBytes = typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
      const crc = this._crc32(dataBytes);
      const size = dataBytes.length;

      // Local file header (30 bytes + filename)
      const localHeader = new ArrayBuffer(30 + nameBytes.length);
      const lv = new DataView(localHeader);
      lv.setUint32(0, 0x04034b50, true); // Signature
      lv.setUint16(4, 20, true);         // Version needed
      lv.setUint16(6, 0, true);          // Flags
      lv.setUint16(8, 0, true);          // Compression: 0 (Store)
      lv.setUint16(10, 0, true);         // Mod time
      lv.setUint16(12, 0x21, true);      // Mod date
      lv.setUint32(14, crc, true);       // CRC-32
      lv.setUint32(18, size, true);      // Compressed size
      lv.setUint32(22, size, true);      // Uncompressed size
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      new Uint8Array(localHeader, 30).set(nameBytes);

      // Central directory header (46 bytes + filename)
      const centralHeader = new ArrayBuffer(46 + nameBytes.length);
      const cv = new DataView(centralHeader);
      cv.setUint32(0, 0x02014b50, true); // Signature
      cv.setUint16(4, 20, true);         // Version made by
      cv.setUint16(6, 20, true);         // Version needed
      cv.setUint16(8, 0, true);          // Flags
      cv.setUint16(10, 0, true);         // Compression: 0 (Store)
      cv.setUint16(12, 0, true);         // Mod time
      cv.setUint16(14, 0x21, true);      // Mod date
      cv.setUint32(16, crc, true);       // CRC-32
      cv.setUint32(20, size, true);      // Compressed size
      cv.setUint32(24, size, true);      // Uncompressed size
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);         // Extra len
      cv.setUint16(32, 0, true);         // Comment len
      cv.setUint16(34, 0, true);         // Disk number
      cv.setUint16(36, 0, true);         // Internal attrs
      cv.setUint32(38, 0, true);         // External attrs
      cv.setUint32(42, offset, true);    // Local header offset
      new Uint8Array(centralHeader, 46).set(nameBytes);

      localParts.push(new Uint8Array(localHeader), dataBytes);
      centralParts.push(new Uint8Array(centralHeader));
      offset += 30 + nameBytes.length + size;
    }

    const cdSize = centralParts.reduce((acc, part) => acc + part.length, 0);
    const eocd = new ArrayBuffer(22);
    const ev = new DataView(eocd);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, new Uint8Array(eocd)], { type: mimeType });
  },

  /**
   * ============================================================================
   * CHUẨN BỊ DỮ LIỆU XUẤT BẢNG ĐIỂM TỔNG HỢP (PB-27 / [T0694E6])
   * Bao gồm: Học kỳ, Môn học, Tín chỉ, Điểm thành phần, Điểm môn hệ 10,
   * Điểm chữ, Điểm hệ 4, GPA từng học kỳ và GPA tích lũy của người dùng hiện tại.
   * ============================================================================
   */
  buildTranscriptExportData() {
    const courses = StorageService.getCourses();
    const semesters = StorageService.getSemesters();
    const student = StorageService.getStudent();
    const cum = GradeCalculator.calculateCumulativeGPA(courses);

    // Tính GPA cho từng học kỳ
    const semGpaMap = {};
    semesters.forEach(sem => {
      const semCourses = courses.filter(c => c.semester_id === sem.id);
      semGpaMap[sem.id] = GradeCalculator.calculateSemesterGPA(semCourses);
    });

    const rows = [];
    rows.push(['BẢNG ĐIỂM TỔNG HỢP CÁ NHÂN - HỆ THỐNG QUẢN LÝ CHỈ SỐ HỌC TẬP N11']);
    rows.push([
      'Họ và tên:',
      this.sanitizeFormula(student.name || 'Sinh viên'),
      'MSSV:',
      this.sanitizeFormula(student.student_id || 'Chưa cập nhật'),
      'Lớp:',
      this.sanitizeFormula(student.class_name || 'Chưa cập nhật'),
      'Ngành:',
      this.sanitizeFormula(student.major || 'Chưa cập nhật')
    ]);
    rows.push([
      'Ngày xuất:',
      new Date().toLocaleString('vi-VN'),
      'GPA Tích lũy (Hệ 4):',
      cum.formattedGPA,
      'Điểm TB Tích lũy (Hệ 10):',
      cum.formattedAvg10 || '0.00',
      'Tín chỉ tích lũy:',
      `${cum.passedCredits}/${cum.totalCredits} TC`,
      'Xếp loại:',
      cum.rank
    ]);
    rows.push([]);

    // Tiêu đề cột chi tiết
    rows.push([
      'Học kỳ',
      'Năm học',
      'Mã môn',
      'Tên môn học',
      'Tín chỉ',
      'Khối môn',
      'Điểm thành phần',
      'Điểm môn (Hệ 10)',
      'Điểm chữ',
      'Điểm hệ 4',
      'GPA Học kỳ (Hệ 4)',
      'Kết quả'
    ]);

    // Duyệt theo từng học kỳ để giữ thứ tự rõ ràng
    semesters.forEach(sem => {
      const semCourses = courses.filter(c => c.semester_id === sem.id);
      const semCalc = semGpaMap[sem.id] || { formattedGPA: '0.00', formattedAvg10: '0.00', passedCredits: 0, totalCredits: 0 };

      semCourses.forEach(c => {
        const calc = GradeCalculator.calculateCourseFinalScore(c.components);
        const grade = GradeCalculator.convertScore10(calc.finalScore10);
        const compDetails = (c.components || [])
          .map(cp => `${cp.name} (${cp.weight_percent}%): ${cp.score !== null && cp.score !== '' && cp.score !== undefined ? cp.score : '--'}`)
          .join(' | ');

        rows.push([
          this.sanitizeFormula(sem.name),
          this.sanitizeFormula(sem.academic_year || ''),
          this.sanitizeFormula(c.course_code),
          this.sanitizeFormula(c.course_name + (c.is_retake ? ' (Học lại)' : '')),
          Number(c.credits) || 0,
          this.sanitizeFormula(c.category || 'Đại cương'),
          this.sanitizeFormula(compDetails),
          calc.isComplete ? Number(calc.finalScore10) : 'Chưa đủ điểm',
          calc.isComplete ? grade.letter : '--',
          calc.isComplete ? Number(grade.scale4) : '--',
          semCalc.formattedGPA,
          calc.isComplete ? grade.status : 'Chưa hoàn thành'
        ]);
      });

      if (semCourses.length > 0) {
        rows.push([
          `TỔNG KẾT ${this.sanitizeFormula(sem.name.toUpperCase())}`,
          this.sanitizeFormula(sem.academic_year || ''),
          '',
          `Số môn: ${semCourses.length}`,
          semCalc.totalCredits,
          `Tín chỉ đạt: ${semCalc.passedCredits}/${semCalc.totalCredits} TC`,
          `ĐTB Học kỳ (Hệ 10): ${semCalc.formattedAvg10}`,
          '',
          '',
          '',
          semCalc.formattedGPA,
          ''
        ]);
      }
    });

    // Các môn chưa gắn học kỳ hợp lệ (nếu có)
    const orphanCourses = courses.filter(c => !semesters.some(s => s.id === c.semester_id));
    orphanCourses.forEach(c => {
      const calc = GradeCalculator.calculateCourseFinalScore(c.components);
      const grade = GradeCalculator.convertScore10(calc.finalScore10);
      const compDetails = (c.components || [])
        .map(cp => `${cp.name} (${cp.weight_percent}%): ${cp.score !== null && cp.score !== '' && cp.score !== undefined ? cp.score : '--'}`)
        .join(' | ');

      rows.push([
        'Chưa phân kỳ',
        '',
        this.sanitizeFormula(c.course_code),
        this.sanitizeFormula(c.course_name),
        Number(c.credits) || 0,
        this.sanitizeFormula(c.category || 'Đại cương'),
        this.sanitizeFormula(compDetails),
        calc.isComplete ? Number(calc.finalScore10) : 'Chưa đủ điểm',
        calc.isComplete ? grade.letter : '--',
        calc.isComplete ? Number(grade.scale4) : '--',
        '--',
        calc.isComplete ? grade.status : 'Chưa hoàn thành'
      ]);
    });

    rows.push([]);
    rows.push([
      'TỔNG KẾT TOÀN KHÓA',
      '',
      'GPA Tích lũy (Hệ 4):',
      cum.formattedGPA,
      'ĐTB Tích lũy (Hệ 10):',
      cum.formattedAvg10 || '0.00',
      'Tín chỉ đạt:',
      `${cum.passedCredits}/${cum.totalCredits} TC`,
      'Xếp loại học lực:',
      cum.rank,
      '',
      ''
    ]);

    return { rows, student, coursesCount: courses.length };
  },

  /**
   * Xuất bảng điểm ra tệp CSV (PB-27 / [T0694E6])
   */
  exportTranscriptCSV() {
    const { rows, student, coursesCount } = this.buildTranscriptExportData();
    if (coursesCount === 0) {
      if (typeof showToast === 'function') {
        showToast('Chưa có dữ liệu môn học để xuất bảng điểm CSV!', true);
      }
      return false;
    }

    const csvLines = ['sep=,'];
    rows.forEach(row => {
      if (!row || row.length === 0) {
        csvLines.push('');
      } else {
        csvLines.push(row.map(cell => this.csvCell(cell, true)).join(','));
      }
    });

    const safeFileId = (student.student_id || student.name || 'SinhVien').replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    this._triggerDownload(blob, `Bang_diem_${safeFileId}.csv`);

    if (typeof showToast === 'function') {
      showToast('Đã xuất tệp Bảng điểm CSV thành công!');
    }
    return true;
  },

  /**
   * Xuất bảng điểm ra tệp Excel .xlsx (PB-27 / [T0694E6])
   */
  exportTranscriptExcel() {
    const { rows, student, coursesCount } = this.buildTranscriptExportData();
    if (coursesCount === 0) {
      if (typeof showToast === 'function') {
        showToast('Chưa có dữ liệu môn học để xuất bảng điểm Excel!', true);
      }
      return false;
    }

    const safeFileId = (student.student_id || student.name || 'SinhVien').replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = this.buildXLSXBlob('Bang_Diem_Tong_Hop', rows);
    this._triggerDownload(blob, `Bang_diem_${safeFileId}.xlsx`);

    if (typeof showToast === 'function') {
      showToast('Đã xuất tệp Bảng điểm Excel (.xlsx) thành công!');
    }
    return true;
  }
};
