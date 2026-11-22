// Chạy: node --test frontend/tests/*.test.js
// Giá trị kỳ vọng lấy theo BE: DEFAULT_GRADE_SCALE (grade_scale.py) + quantize ROUND_HALF_UP (gpa.py, grade_service.py)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// gradeCalculator.js là script trình duyệt (const toàn cục), nạp qua vm rồi lấy ra
const src = fs.readFileSync(path.join(__dirname, '../assets/js/gradeCalculator.js'), 'utf8');
const GradeCalculator = vm.runInNewContext(`${src}\nGradeCalculator`);

const course = (code, credits, score) => ({
  id: code + score, course_code: code, credits,
  components: [{ weight_percent: 100, score }]
});

test('mốc biên quy đổi khớp bảng BE', () => {
  const cases = [
    [3.9, 'F', 0.0], [4.0, 'D', 1.0],
    [4.9, 'D', 1.0], [5.0, 'D+', 1.5],
    [8.4, 'B+', 3.5], [8.5, 'A', 4.0],
    [0, 'F', 0.0], [10, 'A', 4.0]
  ];
  for (const [score, letter, scale4] of cases) {
    const g = GradeCalculator.convertScore10(score);
    assert.equal(g.letter, letter, `điểm ${score}`);
    assert.equal(g.scale4, scale4, `điểm ${score}`);
  }
});

test('điểm ngoài 0–10 bị từ chối', () => {
  assert.equal(GradeCalculator.convertScore10(-0.1).status, 'Điểm lỗi');
  assert.equal(GradeCalculator.convertScore10(10.1).status, 'Điểm lỗi');
  assert.equal(GradeCalculator.calculateCourseFinalScore([{ weight_percent: 100, score: 11 }]).isComplete, false);
});

test('làm tròn điểm môn ROUND_HALF_UP như Decimal của BE (8.45 → 8.5 = A)', () => {
  const r = GradeCalculator.calculateCourseFinalScore([
    { weight_percent: 50, score: 8.4 }, { weight_percent: 50, score: 8.5 }
  ]);
  assert.equal(r.finalScore10, 8.5);
  assert.equal(GradeCalculator.convertScore10(r.finalScore10).letter, 'A');
});

test('GPA tích lũy: trung bình trọng số tín chỉ, làm tròn 2 chữ số half-up', () => {
  // (4.0*1 + 3.0*1 + 1.0*6) / 8 = 1.625 → 1.63
  const r = GradeCalculator.calculateCumulativeGPA([
    course('A1', 1, 9), course('B1', 1, 7.5), course('D1', 6, 4.5)
  ]);
  assert.equal(r.cumulativeGPA, 1.63);
  assert.equal(r.totalCredits, 8);
});

test('học lại: mỗi mã môn chỉ tính lần cao nhất (như BE)', () => {
  const r = GradeCalculator.calculateCumulativeGPA([
    course('MATH', 3, 3.9), course('math ', 3, 8.5)
  ]);
  assert.equal(r.cumulativeGPA, 4.0);
  assert.equal(r.totalCredits, 3);
});

test('xếp loại theo ngưỡng RANKINGS của BE', () => {
  const rank = score => GradeCalculator.calculateCumulativeGPA([course('X', 1, score)]).rank;
  assert.equal(rank(8.5), 'Xuất sắc');   // 4.0
  assert.equal(rank(8.0), 'Giỏi');       // 3.5
  assert.equal(rank(7.0), 'Khá');        // 3.0
  assert.equal(rank(5.5), 'Trung bình'); // 2.0
  assert.equal(rank(4.0), 'Yếu / Kém');  // 1.0
});

test('PB-31: cảnh báo GPA kỳ < 2.0 và môn rớt, tự mất khi hết điều kiện', () => {
  const sems = [{ id: 's1', name: 'HK1', academic_year: '2025-2026' }, { id: 's2', name: 'HK2', academic_year: '2025-2026' }];
  const inSem = (semester_id, c) => ({ ...c, semester_id });
  const types = (courses) => [...GradeCalculator.getAcademicWarnings(sems, courses)].map(w => w.type).sort(); // spread: mảng từ vm khác realm

  // Kỳ 1: điểm D (1.0) → GPA 1.00 < 2.0, không rớt
  assert.deepEqual(types([inSem('s1', course('A1', 3, 4.5))]), ['LOW_GPA']);
  // Kỳ 1: một môn F + một môn A (GPA 2.00) → chỉ cảnh báo rớt
  assert.deepEqual(types([inSem('s1', course('A1', 3, 3.0)), inSem('s1', course('B1', 3, 9.0))]), ['FAILED']);
  // Học lại đạt ở kỳ 2 → hết cảnh báo môn rớt; GPA kỳ 1 vẫn 2.00 nên không cảnh báo GPA
  assert.deepEqual(types([inSem('s1', course('A1', 3, 3.0)), inSem('s1', course('B1', 3, 9.0)), inSem('s2', { ...course('A1', 3, 9.0), is_retake: true })]), []);
  // Đủ điều kiện tốt / chưa có điểm → không có cảnh báo
  assert.deepEqual(types([inSem('s1', course('A1', 3, 8.0))]), []);
  assert.deepEqual(types([inSem('s1', course('A1', 3, null))]), []);
});
