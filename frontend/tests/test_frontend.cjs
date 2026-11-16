// PB-43: exercise the current FE modules with Node's built-in test runner.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
for (const file of ['gradeCalculator.js', 'csvHelper.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js', file), 'utf8'), context);
}
const calculator = vm.runInContext('GradeCalculator', context);
const csv = vm.runInContext('CSVHelper', context);
const course = (code, credits, score) => ({ course_code: code, credits, components: [{ weight_percent: 100, score }] });

test('semester GPA includes failed credits and excludes incomplete grades', () => {
  const result = calculator.calculateSemesterGPA([course('A', 3, 9), course('B', 2, 3.9), course('C', 20, null)]);
  assert.equal(result.gpa, 2.4);
  assert.equal(result.totalCredits, 5);
  assert.equal(result.passedCredits, 3);
});

test('cumulative GPA normalizes course codes and chooses the best retake', () => {
  const result = calculator.calculateCumulativeGPA([course(' cs1 ', 3, 3), course('CS1', 3, 9), course('CS2', 2, 3.9)]);
  assert.equal(result.cumulativeGPA, 2.4);
  assert.equal(result.courseCount, 2);
  assert.equal(result.passedCredits, 3);
  assert.equal(result.rank, 'Trung bình');
});

test('grade conversion covers boundary scores', () => {
  for (const [score, letter] of [[3.9,'F'],[4,'D'],[4.9,'D'],[5,'D+'],[8.4,'B+'],[8.5,'A'],[10,'A']]) {
    assert.equal(calculator.convertScore10(score).letter, letter);
  }
});

test('incomplete scores and weights cannot produce a final grade', () => {
  assert.equal(calculator.calculateCourseFinalScore([{ weight_percent: 90, score: 9 }]).isComplete, false);
  assert.equal(calculator.calculateCourseFinalScore([{ weight_percent: 100, score: null }]).finalScore10, null);
});

test('CSV export neutralizes spreadsheet formulas', () => {
  for (const text of ['=SUM(A1)', '+1', '-1', '@name']) assert.equal(csv.sanitizeFormula(text), "'" + text);
  assert.equal(csv.sanitizeFormula('CS101'), 'CS101');
});

test('CSV import validates row scores and reports original row numbers', () => {
  const header = csv.EXPECTED_HEADERS.join(',');
  const result = csv.parseCSV(header + '\nHK1,CS1,Course,3,GENERAL,Final,100,11');
  assert.equal(result.errorRows.length, 1);
  assert.equal(result.errorRows[0].row, 2);
  assert.equal(result.validRows.length, 0);
  assert.equal(csv.parseCSV('').success, false);
});
