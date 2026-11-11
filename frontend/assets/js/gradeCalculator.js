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

  round1(val) {
    if (val === null || val === undefined || isNaN(val)) return null;
    return Math.round(Number(val) * 10) / 10;
  },

  round2(val) {
    if (val === null || val === undefined || isNaN(val)) return 0;
    return Math.round(Number(val) * 100) / 100;
  },

  convertScore10(score10) {
    if (score10 === null || score10 === undefined || isNaN(score10)) {
      return { letter: '--', scale4: 0.0, status: 'Chưa đủ điểm', colorClass: 'badge-gray', label: '--' };
    }
    const rounded = this.round1(score10);
    for (const item of this.GRADE_SCALE) {
      if (rounded >= item.min && rounded <= item.max) {
        return item;
      }
    }
    if (rounded < 0.0) return this.GRADE_SCALE[this.GRADE_SCALE.length - 1];
    return this.GRADE_SCALE[0];
  },

  calculateCourseFinalScore(components) {
    if (!components || components.length === 0) {
      return { finalScore10: null, isComplete: false, totalWeight: 0 };
    }
    let totalWeight = 0;
    let weightedSum = 0;
    let allEntered = true;

    components.forEach(c => {
      const w = Number(c.weight_percent) || 0;
      totalWeight += w;
      if (c.score === null || c.score === undefined || isNaN(c.score)) {
        allEntered = false;
      } else {
        weightedSum += Number(c.score) * (w / 100);
      }
    });

    if (totalWeight !== 100 || !allEntered) {
      return { finalScore10: null, isComplete: false, totalWeight };
    }
    return { finalScore10: this.round1(weightedSum), isComplete: true, totalWeight };
  },

  calculateSemesterGPA(coursesInSemester) {
    let totalWeightedPoints = 0;
    let totalCredits = 0;
    let passedCredits = 0;
    let completedCourseCount = 0;

    coursesInSemester.forEach(course => {
      const calc = this.calculateCourseFinalScore(course.components);
      if (calc.isComplete && calc.finalScore10 !== null) {
        completedCourseCount++;
        const grade = this.convertScore10(calc.finalScore10);
        const cr = Number(course.credits) || 0;
        totalCredits += cr;
        totalWeightedPoints += grade.scale4 * cr;
        if (grade.scale4 > 0) {
          passedCredits += cr;
        }
      }
    });

    const gpa = totalCredits > 0 ? this.round2(totalWeightedPoints / totalCredits) : 0;
    return {
      gpa,
      totalCredits,
      passedCredits,
      completedCourseCount,
      formattedGPA: gpa.toFixed(2)
    };
  },

  // GPA Tích lũy toàn khóa có xử lý học lại (PB-50, PB-46 / BR-08, BR-09)
  calculateCumulativeGPA(allCourses) {
    const courseMap = new Map();

    allCourses.forEach(course => {
      const calc = this.calculateCourseFinalScore(course.components);
      if (!calc.isComplete || calc.finalScore10 === null) return;

      const code = (course.course_code || '').trim().toUpperCase();
      const grade = this.convertScore10(calc.finalScore10);
      const entry = {
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
        if (entry.scale4 > existing.scale4 || (entry.scale4 === existing.scale4 && entry.finalScore10 > existing.finalScore10)) {
          courseMap.set(code, entry);
        }
      }
    });

    let totalPoints = 0;
    let totalCredits = 0;
    let passedCredits = 0;

    courseMap.forEach(item => {
      totalCredits += item.credits;
      totalPoints += item.scale4 * item.credits;
      if (item.scale4 > 0) {
        passedCredits += item.credits;
      }
    });

    const cumulativeGPA = totalCredits > 0 ? this.round2(totalPoints / totalCredits) : 0;
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
      totalCredits,
      passedCredits,
      rank,
      formattedGPA: cumulativeGPA.toFixed(2),
      courseCount: courseMap.size
    };
  }
};
