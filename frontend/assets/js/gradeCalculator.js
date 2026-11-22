/**
 * MODULE GIẢI THUẬT TÍNH ĐIỂM, MỐC BIÊN VÀ QUY ĐỔI THANG ĐIỂM
 * Phụ trách: Tính điểm môn, GPA học kỳ, GPA tích lũy, Học lại (PB-16, PB-17, PB-50, PB-46)
 * Quy chuẩn: Thông tư số 08/2021/TT-BGDĐT của Bộ GD&ĐT
 */

const GradeCalculator = {
  GRADE_SCALE: [
    { min: 8.5, max: 10.0, letter: 'A', scale4: 4.0, status: 'Đạt', label: 'Giỏi / Xuất sắc', colorClass: 'badge-green' },
    { min: 8.0, max: 8.4, letter: 'B+', scale4: 3.5, status: 'Đạt', label: 'Khá giỏi', colorClass: 'badge-green' },
    { min: 7.0, max: 7.9, letter: 'B', scale4: 3.0, status: 'Đạt', label: 'Khá', colorClass: 'badge-blue' },
    { min: 6.5, max: 6.9, letter: 'C+', scale4: 2.5, status: 'Đạt', label: 'Trung bình khá', colorClass: 'badge-blue' },
    { min: 5.5, max: 6.4, letter: 'C', scale4: 2.0, status: 'Đạt', label: 'Trung bình', colorClass: 'badge-orange' },
    { min: 5.0, max: 5.4, letter: 'D+', scale4: 1.5, status: 'Đạt', label: 'Trung bình yếu', colorClass: 'badge-orange' },
    { min: 4.0, max: 4.9, letter: 'D', scale4: 1.0, status: 'Đạt', label: 'Yếu (Qua môn)', colorClass: 'badge-orange' },
    { min: 0.0, max: 3.9, letter: 'F', scale4: 0.0, status: 'Rớt', label: 'Kém (Học lại)', colorClass: 'badge-red' }
  ],

  // toPrecision(12) khử sai số số thực (8.45*10 = 84.4999…) để khớp Decimal ROUND_HALF_UP của BE
  roundHalfUp(val, factor) {
    return Math.round(Number((Number(val) * factor).toPrecision(12))) / factor;
  },

  round1(val) {
    if (val === null || val === undefined || isNaN(val)) return null;
    return this.roundHalfUp(val, 10);
  },

  round2(val) {
    if (val === null || val === undefined || isNaN(val)) return 0;
    return this.roundHalfUp(val, 100);
  },

  convertScore10(score10) {
    if (score10 === null || score10 === undefined || score10 === '' || isNaN(Number(score10))) {
      return { letter: '--', scale4: 0.0, status: 'Chưa đủ điểm', colorClass: 'badge-gray', label: '--' };
    }
    const num = Number(score10);
    if (num < 0 || num > 10) {
      return { letter: '--', scale4: 0.0, status: 'Điểm lỗi', colorClass: 'badge-red', label: 'Không hợp lệ' };
    }
    const rounded = this.round1(num);
    for (const item of this.GRADE_SCALE) {
      if (rounded >= item.min && rounded <= item.max) {
        return item;
      }
    }
    if (rounded < 0.0) return this.GRADE_SCALE[this.GRADE_SCALE.length - 1];
    return this.GRADE_SCALE[0];
  },

  getGradeScale(score10) {
    return this.convertScore10(score10);
  },

  getAcademicRank(gpa4) {
    if (gpa4 === null || gpa4 === undefined || isNaN(Number(gpa4))) return '--';
    const g = Number(gpa4);
    if (g >= 3.6) return 'Xuất sắc';
    if (g >= 3.2) return 'Giỏi';
    if (g >= 2.5) return 'Khá';
    if (g >= 2.0) return 'Trung bình';
    return 'Yếu';
  },

  calculateCourseFinalScore(components) {
    if (!Array.isArray(components) || components.length === 0) {
      return { finalScore10: null, isComplete: false, totalWeight: 0, isValidWeight: false, hasInvalidScore: false };
    }
    let totalWeight = 0;
    let weightedSum = 0;
    let allEntered = true;
    let hasInvalidScore = false;

    components.forEach(c => {
      const w = Number(c.weight_percent) || 0;
      totalWeight += w;
      if (c.score === null || c.score === undefined || c.score === '' || isNaN(Number(c.score))) {
        allEntered = false;
      } else {
        const s = Number(c.score);
        if (s < 0 || s > 10 || w <= 0 || w > 100) {
          hasInvalidScore = true;
          allEntered = false;
        } else {
          weightedSum += s * (w / 100);
        }
      }
    });

    const roundedWeight = Math.round(totalWeight);
    const isValidWeight = roundedWeight === 100;

    if (!isValidWeight || !allEntered || hasInvalidScore) {
      return { finalScore10: null, isComplete: false, totalWeight: roundedWeight, isValidWeight, hasInvalidScore };
    }
    return { finalScore10: this.round1(weightedSum), isComplete: true, totalWeight: 100, isValidWeight: true, hasInvalidScore: false };
  },

  calculateSemesterGPA(coursesInSemester) {
    let totalWeightedPoints4 = 0;
    let totalWeightedPoints10 = 0;
    let totalCredits = 0;
    let passedCredits = 0;
    let registeredCredits = 0;
    let completedCourseCount = 0;

    (coursesInSemester || []).forEach(course => {
      const cr = Number(course.credits) || 0;
      if (cr > 0) registeredCredits += cr;
      const calc = this.calculateCourseFinalScore(course.components);
      if (calc.isComplete && calc.finalScore10 !== null && cr > 0) {
        completedCourseCount++;
        const grade = this.convertScore10(calc.finalScore10);
        totalCredits += cr;
        totalWeightedPoints4 += grade.scale4 * cr;
        totalWeightedPoints10 += calc.finalScore10 * cr;
        if (grade.scale4 > 0) {
          passedCredits += cr;
        }
      }
    });

    const gpa = totalCredits > 0 ? this.round2(totalWeightedPoints4 / totalCredits) : 0;
    const avg10 = totalCredits > 0 ? this.round2(totalWeightedPoints10 / totalCredits) : 0;
    return {
      gpa,
      avg10,
      totalCredits,
      registeredCredits,
      passedCredits,
      completedCourseCount,
      formattedGPA: gpa.toFixed(2),
      formattedAvg10: avg10.toFixed(2)
    };
  },

  // GPA Tích lũy toàn khóa có xử lý học lại (PB-50, PB-46 / BR-08, BR-09)
  calculateCumulativeGPA(allCourses) {
    const courseMap = new Map();

    (allCourses || []).forEach(course => {
      const calc = this.calculateCourseFinalScore(course.components);
      if (!calc.isComplete || calc.finalScore10 === null) return;

      const code = (course.course_code || '').trim().toUpperCase();
      if (!code) return;
      const grade = this.convertScore10(calc.finalScore10);
      const entry = {
        id: course.id,
        code,
        name: course.course_name,
        credits: Number(course.credits) || 0,
        finalScore10: calc.finalScore10,
        scale4: grade.scale4,
        letter: grade.letter,
        isRetake: course.is_retake
      };

      if (!courseMap.has(code)) {
        courseMap.set(code, entry);
      } else {
        const existing = courseMap.get(code);
        if (entry.scale4 > existing.scale4 || (entry.scale4 === existing.scale4 && entry.finalScore10 >= existing.finalScore10)) {
          courseMap.set(code, entry);
        }
      }
    });

    let totalPoints4 = 0;
    let totalPoints10 = 0;
    let totalCredits = 0;
    let passedCredits = 0;
    const countedCourseIds = new Set();

    courseMap.forEach(item => {
      countedCourseIds.add(item.id);
      totalCredits += item.credits;
      totalPoints4 += item.scale4 * item.credits;
      totalPoints10 += item.finalScore10 * item.credits;
      if (item.scale4 > 0) {
        passedCredits += item.credits;
      }
    });

    const cumulativeGPA = totalCredits > 0 ? this.round2(totalPoints4 / totalCredits) : 0;
    const cumulativeAvg10 = totalCredits > 0 ? this.round2(totalPoints10 / totalCredits) : 0;
    let rank = '--';
    if (totalCredits > 0) {
      if (cumulativeGPA >= 3.6) rank = 'Xuất sắc';
      else if (cumulativeGPA >= 3.2) rank = 'Giỏi';
      else if (cumulativeGPA >= 2.5) rank = 'Khá';
      else if (cumulativeGPA >= 2.0) rank = 'Trung bình';
      else rank = 'Yếu / Kém';
    }

    return {
      cumulativeGPA,
      cumulativeAvg10,
      avg10: cumulativeAvg10,
      totalCredits,
      totalPoints4, // Σ(điểm hệ 4 × tín chỉ) chưa làm tròn, dùng cho PB-23
      passedCredits,
      rank,
      formattedGPA: cumulativeGPA.toFixed(2),
      formattedAvg10: cumulativeAvg10.toFixed(2),
      courseCount: courseMap.size,
      countedCourseIds
    };
  },

  // PB-31: cảnh báo học kỳ có GPA < 2.0 và môn bị F (môn F đã học lại đạt thì không cảnh báo nữa)
  getAcademicWarnings(semesters, courses) {
    const warnings = [];
    const semName = (s) => `${s.name}${s.academic_year ? ' (' + s.academic_year + ')' : ''}`;
    const finalScore = (c) => this.calculateCourseFinalScore(c.components).finalScore10;
    const passedCodes = new Set(courses
      .filter(c => finalScore(c) !== null && this.convertScore10(finalScore(c)).scale4 > 0)
      .map(c => c.course_code));

    (semesters || []).forEach(s => {
      const semCourses = (courses || []).filter(c => c.semester_id === s.id);
      const calc = this.calculateSemesterGPA(semCourses);
      if (calc.totalCredits > 0 && calc.gpa < 2.0) {
        warnings.push({ type: 'LOW_GPA', semesterId: s.id, message: `GPA ${semName(s)} là ${calc.formattedGPA}, dưới 2.0.` });
      }
      semCourses.forEach(c => {
        const score = finalScore(c);
        if (score !== null && this.convertScore10(score).scale4 === 0 && !passedCodes.has(c.course_code)) {
          warnings.push({ type: 'FAILED', courseId: c.id, message: `Môn ${c.course_code} - ${c.course_name} (${semName(s)}) bị điểm F (${score}).` });
        }
      });
    });
    return warnings;
  }
};
