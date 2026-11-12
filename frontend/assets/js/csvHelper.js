/**
 * MODULE XỬ LÝ NHẬP / XUẤT CSV THUẦN (CLIENT-SIDE CSV HELPER)
 * Phụ trách: PB-25 (Tải mẫu, chọn tệp), PB-26 (Bắt lỗi từng dòng), PB-27 (Xuất CSV an toàn chống Formula Injection)
 * Thành viên: FE Huỳnh Nhơn Nguyên Nghiệp
 */

const CSVHelper = {
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024, // 2 MB (BR-20)
  MAX_ROWS: 1000,                       // 1.000 dòng (BR-20)

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

  SAMPLE_CSV_CONTENT: `semester_name,course_code,course_name,credits,category,component_name,weight_percent,score
Học kỳ 1,INT1001,Nhập môn lập trình,3,Đại cương,Chuyên cần,10,9.0
Học kỳ 1,INT1001,Nhập môn lập trình,3,Đại cương,Giữa kỳ,30,8.0
Học kỳ 1,INT1001,Nhập môn lập trình,3,Đại cương,Cuối kỳ,60,8.5
Học kỳ 1,MAT1010,Giải tích 1,4,Đại cương,Chuyên cần,10,8.0
Học kỳ 1,MAT1010,Giải tích 1,4,Đại cương,Giữa kỳ,30,5.0
Học kỳ 1,MAT1010,Giải tích 1,4,Đại cương,Cuối kỳ,60,6.5
Học kỳ 2,INT1002,Cấu trúc dữ liệu và giải thuật,3,Cơ sở ngành,Chuyên cần,10,9.5
Học kỳ 2,INT1002,Cấu trúc dữ liệu và giải thuật,3,Cơ sở ngành,Bài tập lớn,40,8.5
Học kỳ 2,INT1002,Cấu trúc dữ liệu và giải thuật,3,Cơ sở ngành,Cuối kỳ,50,9.0`,

  downloadTemplate() {
    const blob = new Blob(["\uFEFF" + this.SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mau_import_diem_nhom11.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  sanitizeFormula(value) {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (/^[=+\-@]/.test(str)) {
      return "'" + str;
    }
    return str;
  },

  parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return { success: false, error: 'Tệp CSV rỗng!' };
    }

    if (lines.length - 1 > this.MAX_ROWS) {
      return { success: false, error: `Tệp vượt quá giới hạn ${this.MAX_ROWS} dòng (hiện tại: ${lines.length - 1} dòng)!` };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const missingHeaders = this.EXPECTED_HEADERS.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return {
        success: false,
        error: `Tệp thiếu các cột bắt buộc: ${missingHeaders.join(', ')}`
      };
    }

    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const lineNum = i + 1;
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) {
        errors.push({ row: lineNum, message: 'Dòng không đủ số cột dữ liệu' });
        continue;
      }

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx];
      });

      const rowErrors = [];
      if (!rowObj.semester_name) rowErrors.push('Thiếu tên học kỳ');
      if (!rowObj.course_code) rowErrors.push('Thiếu mã môn');
      if (!rowObj.course_name) rowErrors.push('Thiếu tên môn');
      
      const credits = Number(rowObj.credits);
      if (isNaN(credits) || credits <= 0) rowErrors.push('Tín chỉ phải lớn hơn 0');

      const weight = Number(rowObj.weight_percent);
      if (isNaN(weight) || weight <= 0 || weight > 100) rowErrors.push('Trọng số phải từ 1 đến 100%');

      const score = Number(rowObj.score);
      if (isNaN(score) || score < 0 || score > 10) rowErrors.push('Điểm phải từ 0.0 đến 10.0');

      if (rowErrors.length > 0) {
        errors.push({ row: lineNum, data: rowObj, message: rowErrors.join('; ') });
      } else {
        rows.push({ row: lineNum, ...rowObj });
      }
    }

    return {
      success: true,
      totalRows: lines.length - 1,
      validRows: rows,
      errorRows: errors
    };
  },

  exportTranscriptCSV() {
    const courses = StorageService.getCourses();
    const semesters = StorageService.getSemesters();
    const student = StorageService.getStudent();

    let csv = `sep=,\n`;
    csv += `"BANG DIEM TONG HOP - HE THONG QUAN LY CHI SO HOC TAP N11"\n`;
    csv += `"Sinh vien:","${this.sanitizeFormula(student.name)}","MSSV:","${this.sanitizeFormula(student.student_id)}","Lop:","${this.sanitizeFormula(student.class_name)}"\n\n`;
    csv += `Hoc ky,Ma mon,Ten mon hoc,So tin chi,Loai mon,Diem He 10,Diem Chu,Diem He 4,Ket qua\n`;

    courses.forEach(c => {
      const sem = semesters.find(s => s.id === c.semester_id);
      const semName = sem ? sem.name : '--';
      const calc = GradeCalculator.calculateCourseFinalScore(c.components);
      const grade = GradeCalculator.convertScore10(calc.finalScore10);

      csv += `"${this.sanitizeFormula(semName)}",`;
      csv += `"${this.sanitizeFormula(c.course_code)}",`;
      csv += `"${this.sanitizeFormula(c.course_name)}",`;
      csv += `${c.credits},`;
      csv += `"${this.sanitizeFormula(c.category)}",`;
      csv += `${calc.isComplete ? calc.finalScore10 : 'Chua du'},`;
      csv += `"${grade.letter}",`;
      csv += `${calc.isComplete ? grade.scale4 : '--'},`;
      csv += `"${grade.status}"\n`;
    });

    const cum = GradeCalculator.calculateCumulativeGPA(courses);
    csv += `\n"TONG KET TOAN KHOA"\n`;
    csv += `"GPA Tich luy:","${cum.formattedGPA}","Tin chi dat:","${cum.passedCredits}/${cum.totalCredits}","Xep loai:","${cum.rank}"\n`;

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bang_diem_${student.student_id || '2026'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
