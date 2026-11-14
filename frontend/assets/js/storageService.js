/**
 * DỊCH VỤ LOCALSTORAGE LƯU TRỮ VÀ XỬ LÝ DỮ LIỆU CSDL (OFFLINE CLIENT-SIDE)
 * Phụ trách: Phân hệ Quản lý Học kỳ, Môn học, Điểm (FE Nghiệp)
 * Đáp ứng tiêu chuẩn: PB-06..09 (Học kỳ), PB-10..17 (Môn học), PB-50 (Học lại), PB-46 (Cascade Delete)
 */

const STORAGE_KEYS = {
  STUDENT: 'app_student_profile',
  SEMESTERS: 'app_semesters',
  COURSES: 'app_courses',
  GOAL: 'app_gpa_goal',
  ADMIN_USERS: 'app_admin_users'
};

const StorageService = {
  DEFAULT_STUDENT: {
    student_id: '',
    name: '',
    email: '',
    major: '',
    class_name: ''
  },

  DEFAULT_SEMESTERS: [
    { id: 'sem_1', name: 'Học kỳ 1', academic_year: '2025-2026', start_date: '2025-09-05', end_date: '2026-01-15' },
    { id: 'sem_2', name: 'Học kỳ 2', academic_year: '2025-2026', start_date: '2026-02-15', end_date: '2026-06-30' },
    { id: 'sem_3', name: 'Học kỳ Hè', academic_year: '2025-2026', start_date: '2026-07-05', end_date: '2026-08-25' }
  ],

  DEFAULT_COURSES: [
    {
      id: 'c_1',
      semester_id: 'sem_1',
      course_code: 'INT1001',
      course_name: 'Nhập môn lập trình',
      credits: 3,
      category: 'Đại cương',
      is_retake: false,
      components: [
        { id: 'comp_1_1', name: 'Chuyên cần', weight_percent: 10, score: 9.0 },
        { id: 'comp_1_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.0 },
        { id: 'comp_1_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.5 }
      ]
    },
    {
      id: 'c_2',
      semester_id: 'sem_1',
      course_code: 'MAT1010',
      course_name: 'Giải tích 1',
      credits: 4,
      category: 'Đại cương',
      is_retake: false,
      components: [
        { id: 'comp_2_1', name: 'Chuyên cần', weight_percent: 10, score: 8.0 },
        { id: 'comp_2_2', name: 'Giữa kỳ', weight_percent: 30, score: 3.5 },
        { id: 'comp_2_3', name: 'Cuối kỳ', weight_percent: 60, score: 3.8 }
      ]
    },
    {
      id: 'c_3',
      semester_id: 'sem_2',
      course_code: 'INT1002',
      course_name: 'Cấu trúc dữ liệu và giải thuật',
      credits: 3,
      category: 'Cơ sở ngành',
      is_retake: false,
      components: [
        { id: 'comp_3_1', name: 'Chuyên cần', weight_percent: 10, score: 10.0 },
        { id: 'comp_3_2', name: 'Bài tập lớn', weight_percent: 40, score: 8.5 },
        { id: 'comp_3_3', name: 'Cuối kỳ', weight_percent: 50, score: 8.0 }
      ]
    },
    {
      id: 'c_4',
      semester_id: 'sem_3',
      course_code: 'MAT1010',
      course_name: 'Giải tích 1 (Học cải thiện)',
      credits: 4,
      category: 'Đại cương',
      is_retake: true,
      components: [
        { id: 'comp_4_1', name: 'Chuyên cần', weight_percent: 10, score: 9.0 },
        { id: 'comp_4_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.5 },
        { id: 'comp_4_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.5 }
      ]
    }
  ],

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SEMESTERS)) {
      localStorage.setItem(STORAGE_KEYS.SEMESTERS, JSON.stringify(this.DEFAULT_SEMESTERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(this.DEFAULT_COURSES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.GOAL)) {
      localStorage.setItem(STORAGE_KEYS.GOAL, JSON.stringify({
        target_gpa: 3.2,
        target_date: '2026-12-31',
        remaining_credits: 30
      }));
    }
  },

  resetToDefault() {
    localStorage.setItem(STORAGE_KEYS.SEMESTERS, JSON.stringify(this.DEFAULT_SEMESTERS));
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(this.DEFAULT_COURSES));
    localStorage.setItem(STORAGE_KEYS.GOAL, JSON.stringify({
      target_gpa: 3.2,
      target_date: '2026-12-31',
      remaining_credits: 30
    }));
  },

  // === QUẢN LÝ HỌC KỲ (PB-06..09) ===
  getSemesters() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SEMESTERS)) || [];
    } catch {
      return [];
    }
  },

  getSemesterById(id) {
    const list = this.getSemesters();
    return list.find(s => s.id === id) || null;
  },

  saveSemester(semesterData) {
    const list = this.getSemesters();
    if (semesterData.id) {
      const idx = list.findIndex(s => s.id === semesterData.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...semesterData };
      }
    } else {
      const newSem = {
        ...semesterData,
        id: 'sem_' + Date.now()
      };
      list.push(newSem);
    }
    localStorage.setItem(STORAGE_KEYS.SEMESTERS, JSON.stringify(list));
    return true;
  },

  // Cảnh báo xóa dây chuyền (Cascade Details - PB-09, PB-46)
  getSemesterCascadeDetails(semesterId) {
    const courses = this.getCourses().filter(c => c.semester_id === semesterId);
    let totalComponents = 0;
    courses.forEach(c => {
      totalComponents += (c.components || []).length;
    });
    return {
      courseCount: courses.length,
      componentCount: totalComponents,
      courseList: courses.map(c => `${c.course_code} - ${c.course_name}`)
    };
  },

  // Xóa dây chuyền học kỳ, môn học và thành phần điểm
  deleteSemesterCascade(semesterId) {
    let semesters = this.getSemesters();
    semesters = semesters.filter(s => s.id !== semesterId);
    localStorage.setItem(STORAGE_KEYS.SEMESTERS, JSON.stringify(semesters));

    let courses = this.getCourses();
    courses = courses.filter(c => c.semester_id !== semesterId);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    return true;
  },

  // === QUẢN LÝ MÔN HỌC & ĐIỂM (PB-10..17, PB-50) ===
  getCourses() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES)) || [];
    } catch {
      return [];
    }
  },

  getCourseById(id) {
    const list = this.getCourses();
    return list.find(c => c.id === id) || null;
  },

  saveCourse(courseData) {
    const list = this.getCourses();
    if (courseData.id) {
      const idx = list.findIndex(c => c.id === courseData.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...courseData };
      }
    } else {
      const newCourse = {
        ...courseData,
        id: 'c_' + Date.now(),
        components: courseData.components || [
          { id: 'comp_' + Date.now() + '_1', name: 'Chuyên cần', weight_percent: 10, score: null },
          { id: 'comp_' + Date.now() + '_2', name: 'Giữa kỳ', weight_percent: 30, score: null },
          { id: 'comp_' + Date.now() + '_3', name: 'Cuối kỳ', weight_percent: 60, score: null }
        ]
      };
      list.push(newCourse);
    }
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(list));
    return true;
  },

  getCourseCascadeDetails(courseId) {
    const course = this.getCourseById(courseId);
    if (!course) return { componentCount: 0 };
    return {
      componentCount: (course.components || []).length,
      courseCode: course.course_code,
      courseName: course.course_name
    };
  },

  deleteCourseCascade(courseId) {
    let courses = this.getCourses();
    courses = courses.filter(c => c.id !== courseId);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    return true;
  },

  saveCourseComponents(courseId, components) {
    const courses = this.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (course) {
      course.components = components;
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
      return true;
    }
    return false;
  },

  saveCourseScores(courseId, scoreMap) {
    const courses = this.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (course && course.components) {
      course.components.forEach(comp => {
        if (scoreMap[comp.id] !== undefined) {
          comp.score = scoreMap[comp.id];
        }
      });
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
      return true;
    }
    return false;
  },

  // Batch import Upsert (PB-26, PB-46)
  batchImportRows(validRows) {
    const semesters = this.getSemesters();
    const courses = this.getCourses();

    validRows.forEach(row => {
      let sem = semesters.find(s => s.name.trim().toLowerCase() === row.semester_name.trim().toLowerCase());
      if (!sem) {
        sem = {
          id: 'sem_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          name: row.semester_name.trim(),
          academic_year: '2025-2026',
          start_date: '2025-09-01',
          end_date: '2026-01-15'
        };
        semesters.push(sem);
      }

      let course = courses.find(c => c.semester_id === sem.id && c.course_code.trim().toUpperCase() === row.course_code.trim().toUpperCase());
      if (!course) {
        course = {
          id: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          semester_id: sem.id,
          course_code: row.course_code.trim().toUpperCase(),
          course_name: row.course_name.trim(),
          credits: Number(row.credits),
          category: row.category.trim(),
          is_retake: false,
          components: []
        };
        courses.push(course);
      }

      let comp = (course.components || []).find(cp => cp.name.trim().toLowerCase() === row.component_name.trim().toLowerCase());
      if (comp) {
        comp.weight_percent = Number(row.weight_percent);
        comp.score = Number(row.score);
      } else {
        if (!course.components) course.components = [];
        course.components.push({
          id: 'comp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          name: row.component_name.trim(),
          weight_percent: Number(row.weight_percent),
          score: Number(row.score)
        });
      }
    });

    localStorage.setItem(STORAGE_KEYS.SEMESTERS, JSON.stringify(semesters));
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    return true;
  },

  // Profile & Goals
  studentKey() { return STORAGE_KEYS.STUDENT + '_' + (getSession()?.user?.id ?? 'guest'); },

  getStudent() {
    try { return JSON.parse(localStorage.getItem(this.studentKey())) || { ...this.DEFAULT_STUDENT }; }
    catch { return { ...this.DEFAULT_STUDENT }; }
  },

  saveStudent(student) {
    localStorage.setItem(this.studentKey(), JSON.stringify(student));
  },

  getGoal() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.GOAL)) || { target_gpa: 3.2, target_date: '2026-12-31', remaining_credits: 30 };
    } catch {
      return { target_gpa: 3.2, target_date: '2026-12-31', remaining_credits: 30 };
    }
  },

  saveGoal(goal) {
    localStorage.setItem(STORAGE_KEYS.GOAL, JSON.stringify(goal));
  }
};

StorageService.init();
