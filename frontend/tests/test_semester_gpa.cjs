// FR-09 / PB-18 / T0694D8: run with node --test, no npm packages required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/gradeCalculator.js'), 'utf8'), context);
const calculator = vm.runInContext('GradeCalculator', context);
const course = (credits, score, weight = 100) => ({
  credits, components: [{ weight_percent: weight, score }],
});

test('weighted GPA includes F, excludes incomplete courses', () => {
  const result = calculator.calculateSemesterGPA([course(3, 9), course(2, 3.9), course(20, null)]);
  assert.equal(result.gpa, 2.4);
  assert.equal(result.totalCredits, 5);
  assert.equal(result.passedCredits, 3);
  assert.equal(result.ranking, 'Trung bình');
});

test('empty and incomplete are distinct from genuine zero GPA', () => {
  for (const input of [[], [course(3, null)], [course(3, '')], [course(3, 8, 90)]]) {
    const result = calculator.calculateSemesterGPA(input);
    assert.equal(result.gpa, null);
    assert.equal(result.ranking, null);
    assert.equal(result.formattedGPA, '--');
  }
  const failed = calculator.calculateSemesterGPA([course(3, 0)]);
  assert.equal(failed.formattedGPA, '0.00');
  assert.equal(failed.ranking, 'Yếu / Kém');
});

test('rank boundaries match backend and README', () => {
  for (const [gpa, ranking] of [[3.6, 'Xuất sắc'], [3.59, 'Giỏi'], [3.2, 'Giỏi'],
    [3.19, 'Khá'], [2.5, 'Khá'], [2.49, 'Trung bình'], [2, 'Trung bình'], [1.99, 'Yếu / Kém']]) {
    assert.equal(calculator.rankGPA(gpa), ranking);
  }
});

test('round before ranking, without dropping duplicate codes in a semester', () => {
  const result = calculator.calculateSemesterGPA([
    { ...course(3, 9), course_code: 'SAME' }, { ...course(5, 8.2), course_code: 'SAME' },
  ]);
  assert.equal(result.gpa, 3.69);
  const boundary = calculator.calculateSemesterGPA([course(1, 9), course(99, 8.2)]);
  assert.equal(boundary.gpa, 3.51); // 3.505 rounds up
  const rankBoundary = calculator.calculateSemesterGPA([course(19, 9), course(81, 8.2)]);
  assert.equal(rankBoundary.gpa, 3.6); // 3.595 rounds before classification
  assert.equal(rankBoundary.ranking, 'Xuất sắc');
});

test('invalid scores or credits cannot contribute to GPA', () => {
  for (const item of [course(0, 8), course(-1, 8), course('bad', 8), course(1.5, 8),
    course(3, 11), course(3, -1), course(3, ' '), course(3, Infinity)]) {
    assert.equal(calculator.calculateSemesterGPA([item]).gpa, null);
  }
});

test('semester cards display GPA, ranking, and empty state', () => {
  const container = { innerHTML: '' };
  const semesters = [{ id: 's1', name: 'HK1', academic_year: '2026-2027' }];
  let courses = [{ ...course(3, 9), semester_id: 's1' }, { ...course(2, 3.9), semester_id: 's1' },
    { ...course(100, 10), semester_id: 'another-semester' }];
  context.document = { addEventListener() {}, getElementById: () => container };
  context.StorageService = { getSemesters: () => semesters, getCourses: () => courses };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/semesters.js'), 'utf8'), context);
  vm.runInContext('renderSemesters()', context);
  assert.match(container.innerHTML, /2\.40/);
  assert.match(container.innerHTML, /Xếp loại: <strong>Trung bình/);
  courses = [];
  vm.runInContext('renderSemesters()', context);
  assert.match(container.innerHTML, /Chưa có môn đủ điểm/);
});
