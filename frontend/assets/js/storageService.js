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
    { id: 'sem_1', name: 'Học kỳ 1', academic_year: '2025-2026', start_date: '2025-09-01', end_date: '2026-01-15' },
    { id: 'sem_2', name: 'Học kỳ 2', academic_year: '2025-2026', start_date: '2026-02-01', end_date: '2026-06-15' },
    { id: 'sem_3', name: 'Học kỳ hè', academic_year: '2025-2026', start_date: '2026-06-20', end_date: '2026-08-15' },
    { id: 'sem_4', name: 'Học kỳ 1', academic_year: '2026-2027', start_date: '2026-09-01', end_date: '2027-01-15' }
  ],

  DEFAULT_COURSES: [
    // ===== HK1 25–26 (6 môn, 20 TC, GPA = 3.05: 2 A, 1 B+, 1 B, 1 C+, 1 D+) =====
    {
      id: 'c_101', semester_id: 'sem_1', course_code: 'BAS1103', course_name: 'Vật lý 1 và thí nghiệm', credits: 3, category: 'Đại cương', is_retake: false,
      components: [
        { id: 'cp_101_1', name: 'Quá trình', weight_percent: 10, score: 8.5 },
        { id: 'cp_101_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.5 },
        { id: 'cp_101_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.6 }
      ]
    },
    {
      id: 'c_102', semester_id: 'sem_1', course_code: 'INT1101', course_name: 'Tin học cơ sở 1', credits: 3, category: 'Cơ sở ngành', is_retake: false,
      components: [
        { id: 'cp_102_1', name: 'Quá trình', weight_percent: 10, score: 8.5 },
        { id: 'cp_102_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.5 },
        { id: 'cp_102_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.5 }
      ]
    },
    {
      id: 'c_103', semester_id: 'sem_1', course_code: 'BAS1102', course_name: 'Đại số tuyến tính', credits: 3, category: 'Đại cương', is_retake: false,
      components: [
        { id: 'cp_103_1', name: 'Quá trình', weight_percent: 10, score: 8.5 },
        { id: 'cp_103_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.0 },
        { id: 'cp_103_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.2 }
      ]
    },
    {
      id: 'c_104', semester_id: 'sem_1', course_code: 'BAS1101', course_name: 'Giải tích 1', credits: 4, category: 'Đại cương', is_retake: false,
      components: [
        { id: 'cp_104_1', name: 'Quá trình', weight_percent: 10, score: 7.5 },
        { id: 'cp_104_2', name: 'Giữa kỳ', weight_percent: 30, score: 7.5 },
        { id: 'cp_104_3', name: 'Cuối kỳ', weight_percent: 60, score: 7.5 }
      ]
    },
    {
      id: 'c_105', semester_id: 'sem_1', course_code: 'BAS1105', course_name: 'Triết học Mác - Lênin', credits: 4, category: 'Đại cương', is_retake: false,
      components: [
        { id: 'cp_105_1', name: 'Quá trình', weight_percent: 10, score: 7.0 },
        { id: 'cp_105_2', name: 'Giữa kỳ', weight_percent: 30, score: 6.5 },
        { id: 'cp_105_3', name: 'Cuối kỳ', weight_percent: 60, score: 6.8 }
      ]
    },
    {
      id: 'c_106', semester_id: 'sem_1', course_code: 'BAS1106', course_name: 'Pháp luật đại cương', credits: 3, category: 'Đại cương', is_retake: false,
      components: [
        { id: 'cp_106_1', name: 'Quá trình', weight_percent: 10, score: 6.0 },
        { id: 'cp_106_2', name: 'Giữa kỳ', weight_percent: 30, score: 5.0 },
        { id: 'cp_106_3', name: 'Cuối kỳ', weight_percent: 60, score: 5.2 }
      ]
    },

    // ===== HK2 25–26 (6 môn, 21 TC, GPA = 3.38: 2 A, 2 B+, 1 B, 1 C+) =====
    {
      id: 'c_201', semester_id: 'sem_2', course_code: 'INT1201', course_name: 'Kỹ thuật lập trình', credits: 3, category: 'Cơ sở ngành', is_retake: false,
      components: [
        { id: 'cp_201_1', name: 'Quá trình', weight_percent: 10, score: 9.0 },
        { id: 'cp_201_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.5 },
        { id: 'cp_201_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.6 }
      ]
    },
    {
      id: 'c_202', semester_id: 'sem_2', course_code: 'BAS1201', course_name: 'Xác suất thống kê', credits: 3, category: 'Đại cương', is_retake: false,
      components: [
        { id: 'cp_202_1', name: 'Quá trình', weight_percent: 10, score: 8.5 },
        { id: 'cp_202_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.5 },
        { id: 'cp_202_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.5 }
      ]
    },
    {
      id: 'c_203', semester_id: 'sem_2', course_code: 'INT1202', course_name: 'Kiến trúc máy tính', credits: 4, category: 'Cơ sở ngành', is_retake: false,
      components: [
        { id: 'cp_203_1', name: 'Quá trình', weight_percent: 10, score: 8.5 },
        { id: 'cp_203_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.0 },
        { id: 'cp_203_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.2 }
      ]
    },
    {
      id: 'c_204', semester_id: 'sem_2', course_code: 'INT1203', course_name: 'Hệ điều hành', credits: 4, category: 'Cơ sở ngành', is_retake: false,
      components: [
        { id: 'cp_204_1', name: 'Quá trình', weight_percent: 10, score: 8.0 },
        { id: 'cp_204_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.0 },
        { id: 'cp_204_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.2 }
      ]
    },
    {
      id: 'c_205', semester_id: 'sem_2', course_code: 'BAS1202', course_name: 'Kinh tế chính trị Mác - Lênin', credits: 3, category: 'Đại cương', is_retake: false,
      components: [
        { id: 'cp_205_1', name: 'Quá trình', weight_percent: 10, score: 8.0 },
        { id: 'cp_205_2', name: 'Giữa kỳ', weight_percent: 30, score: 7.5 },
        { id: 'cp_205_3', name: 'Cuối kỳ', weight_percent: 60, score: 7.5 }
      ]
    },
    {
      id: 'c_206', semester_id: 'sem_2', course_code: 'INT1204', course_name: 'Mạng máy tính', credits: 4, category: 'Cơ sở ngành', is_retake: false,
      components: [
        { id: 'cp_206_1', name: 'Quá trình', weight_percent: 10, score: 7.0 },
        { id: 'cp_206_2', name: 'Giữa kỳ', weight_percent: 30, score: 6.5 },
        { id: 'cp_206_3', name: 'Cuối kỳ', weight_percent: 60, score: 6.8 }
      ]
    },

    // ===== HK hè 26 (6 môn, 20 TC, GPA = 3.20: 2 A, 2 B+, 1 B, 1 C) =====
    {
      id: 'c_301', semester_id: 'sem_3', course_code: 'INT1301', course_name: 'Lập trình hướng đối tượng', credits: 3, category: 'Chuyên ngành', is_retake: false,
      components: [
        { id: 'cp_301_1', name: 'Quá trình', weight_percent: 10, score: 9.0 },
        { id: 'cp_301_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.5 },
        { id: 'cp_301_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.6 }
      ]
    },
    {
      id: 'c_302', semester_id: 'sem_3', course_code: 'SKD1101', course_name: 'Kỹ năng làm việc nhóm', credits: 2, category: 'Tự chọn & Thực tập', is_retake: false,
      components: [
        { id: 'cp_302_1', name: 'Quá trình', weight_percent: 10, score: 8.5 },
        { id: 'cp_302_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.5 },
        { id: 'cp_302_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.5 }
      ]
    },
    {
      id: 'c_303', semester_id: 'sem_3', course_code: 'INT1302', course_name: 'Phát triển ứng dụng Web', credits: 3, category: 'Chuyên ngành', is_retake: false,
      components: [
        { id: 'cp_303_1', name: 'Quá trình', weight_percent: 10, score: 8.5 },
        { id: 'cp_303_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.0 },
        { id: 'cp_303_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.2 }
      ]
    },
    {
      id: 'c_304', semester_id: 'sem_3', course_code: 'ENG1101', course_name: 'Tiếng Anh chuyên ngành 1', credits: 3, category: 'Tự chọn & Thực tập', is_retake: false,
      components: [
        { id: 'cp_304_1', name: 'Quá trình', weight_percent: 10, score: 8.0 },
        { id: 'cp_304_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.0 },
        { id: 'cp_304_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.2 }
      ]
    },
    {
      id: 'c_305', semester_id: 'sem_3', course_code: 'INT1303', course_name: 'Công nghệ phần mềm', credits: 5, category: 'Chuyên ngành', is_retake: false,
      components: [
        { id: 'cp_305_1', name: 'Quá trình', weight_percent: 10, score: 8.0 },
        { id: 'cp_305_2', name: 'Giữa kỳ', weight_percent: 30, score: 7.5 },
        { id: 'cp_305_3', name: 'Cuối kỳ', weight_percent: 60, score: 7.5 }
      ]
    },
    {
      id: 'c_306', semester_id: 'sem_3', course_code: 'INT1304', course_name: 'Phân tích thiết kế hệ thống', credits: 4, category: 'Chuyên ngành', is_retake: false,
      components: [
        { id: 'cp_306_1', name: 'Quá trình', weight_percent: 10, score: 6.5 },
        { id: 'cp_306_2', name: 'Giữa kỳ', weight_percent: 30, score: 6.0 },
        { id: 'cp_306_3', name: 'Cuối kỳ', weight_percent: 60, score: 6.2 }
      ]
    },

    // ===== HK1 26–27 (8 môn chuẩn Figma StudyTrack-E-04-mon-hoc 1: 23 TC, 17 đã có điểm, 2 đang học, ĐTB 7.99, GPA 3.41) =====
    {
      id: 'c_401', semester_id: 'sem_4', course_code: 'INT1306', course_name: 'Cấu trúc dữ liệu và giải thuật', credits: 3, category: 'Cơ sở ngành', is_retake: false,
      components: [
        { id: 'cp_401_1', name: 'Quá trình', weight_percent: 10, score: 9.0 },
        { id: 'cp_401_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.5 },
        { id: 'cp_401_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.9 }
      ]
    },
    {
      id: 'c_402', semester_id: 'sem_4', course_code: 'INT1340', course_name: 'Lập trình iOS', credits: 3, category: 'Chuyên ngành', is_retake: false,
      components: [
        { id: 'cp_402_1', name: 'Quá trình', weight_percent: 10, score: 8.5 },
        { id: 'cp_402_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.0 },
        { id: 'cp_402_3', name: 'Cuối kỳ', weight_percent: 60, score: null }
      ]
    },
    {
      id: 'c_403', semester_id: 'sem_4', course_code: 'INT1313', course_name: 'Cơ sở dữ liệu', credits: 3, category: 'Cơ sở ngành', is_retake: false,
      components: [
        { id: 'cp_403_1', name: 'Quá trình', weight_percent: 10, score: 8.0 },
        { id: 'cp_403_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.0 },
        { id: 'cp_403_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.3 }
      ]
    },
    {
      id: 'c_404', semester_id: 'sem_4', course_code: 'INT1339', course_name: 'Ngôn ngữ lập trình C++', credits: 3, category: 'Cơ sở ngành', is_retake: false,
      components: [
        { id: 'cp_404_1', name: 'Quá trình', weight_percent: 10, score: 9.5 },
        { id: 'cp_404_2', name: 'Giữa kỳ', weight_percent: 30, score: 9.0 },
        { id: 'cp_404_3', name: 'Cuối kỳ', weight_percent: 60, score: 9.2 }
      ]
    },
    {
      id: 'c_405', semester_id: 'sem_4', course_code: 'BAS1204', course_name: 'Giải tích 2', credits: 3, category: 'Đại cương', is_retake: false,
      components: [
        { id: 'cp_405_1', name: 'Quá trình', weight_percent: 10, score: 7.0 },
        { id: 'cp_405_2', name: 'Giữa kỳ', weight_percent: 30, score: 6.0 },
        { id: 'cp_405_3', name: 'Cuối kỳ', weight_percent: 60, score: 6.8 }
      ]
    },
    {
      id: 'c_406', semester_id: 'sem_4', course_code: 'BAS1227', course_name: 'Vật lý 3 và thí nghiệm', credits: 4, category: 'Đại cương', is_retake: false,
      components: [
        { id: 'cp_406_1', name: 'Quá trình', weight_percent: 10, score: 7.5 },
        { id: 'cp_406_2', name: 'Giữa kỳ', weight_percent: 30, score: 7.0 },
        { id: 'cp_406_3', name: 'Cuối kỳ', weight_percent: 60, score: 7.2 }
      ]
    },
    {
      id: 'c_407', semester_id: 'sem_4', course_code: 'SKD1102', course_name: 'Kỹ năng tạo lập văn bản', credits: 1, category: 'Đại cương', is_retake: false,
      components: [
        { id: 'cp_407_1', name: 'Quá trình', weight_percent: 10, score: 8.0 },
        { id: 'cp_407_2', name: 'Giữa kỳ', weight_percent: 30, score: 8.5 },
        { id: 'cp_407_3', name: 'Cuối kỳ', weight_percent: 60, score: 8.9 }
      ]
    },
    {
      id: 'c_408', semester_id: 'sem_4', course_code: 'INT1358', course_name: 'Toán rời rạc 1', credits: 3, category: 'Cơ sở ngành', is_retake: false,
      components: [
        { id: 'cp_408_1', name: 'Quá trình', weight_percent: 10, score: 7.5 },
        { id: 'cp_408_2', name: 'Giữa kỳ', weight_percent: 30, score: 7.0 },
        { id: 'cp_408_3', name: 'Cuối kỳ', weight_percent: 60, score: null }
      ]
    }
  ],

  // ADMIN đang xem tài khoản khác (chọn ở trang Tài khoản) → đọc/ghi dữ liệu của tài khoản đó
  adminViewAs() {
    try {
      const target = JSON.parse(sessionStorage.getItem('adminViewAs'));
      return target?.id && getSession()?.user?.role === 'ADMIN' ? target : null;
    } catch { return null; }
  },

  currentUserId() {
    const viewAs = this.adminViewAs();
    if (viewAs) return String(viewAs.id);
    if (typeof getSession === 'function') {
      const u = getSession()?.user;
      if (u?.id) return String(u.id);
      if (u?.email) return String(u.email).toLowerCase();
    }
    for (const store of [sessionStorage, localStorage]) {
      try {
        const raw = store.getItem('session');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.user?.id) return String(parsed.user.id);
          if (parsed?.user?.email) return String(parsed.user.email).toLowerCase();
        }
      } catch { /* ignore */ }
    }
    return 'guest';
  },

  semestersKey() { return STORAGE_KEYS.SEMESTERS + '_' + this.currentUserId(); },
  coursesKey()   { return STORAGE_KEYS.COURSES + '_' + this.currentUserId(); },
  goalKey()      { return STORAGE_KEYS.GOAL + '_' + this.currentUserId(); },
  studentKey()   { return STORAGE_KEYS.STUDENT + '_' + this.currentUserId(); },

  init() {
    try {
      const rawCourses = localStorage.getItem(this.coursesKey());
      const rawSems = localStorage.getItem(this.semestersKey());
      if (rawCourses === null && rawSems === null) {
        this.resetToDefault();
        return;
      }
      if (rawCourses) {
        const parsed = JSON.parse(rawCourses);
        const isOld4 = Array.isArray(parsed) && parsed.length === 4 && parsed[0]?.id === 'c_1';
        const isOld17 = Array.isArray(parsed) && parsed.length === 17 && parsed[0]?.id === 'c_101' && parsed[0]?.course_code === 'INT1001';
        if (isOld4 || isOld17) {
          this.resetToDefault();
        }
      }
    } catch { /* ignore */ }
  },

  resetToDefault() {
    localStorage.setItem(this.semestersKey(), JSON.stringify(this.DEFAULT_SEMESTERS));
    localStorage.setItem(this.coursesKey(), JSON.stringify(this.DEFAULT_COURSES));
    localStorage.setItem(this.goalKey(), JSON.stringify({
      target_gpa: 3.60,
      target_date: '2027-06-30',
      remaining_credits: 30
    }));
  },

  clearAllData() {
    localStorage.setItem(this.semestersKey(), JSON.stringify([]));
    localStorage.setItem(this.coursesKey(), JSON.stringify([]));
    localStorage.removeItem(this.goalKey());
  },

  // === QUẢN LÝ HỌC KỲ (PB-06..09) ===
  getSemesters() {
    try {
      const raw = localStorage.getItem(this.semestersKey());
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (err) {
      console.error('Lỗi đọc dữ liệu học kỳ từ localStorage:', err);
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
    localStorage.setItem(this.semestersKey(), JSON.stringify(list));
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
    localStorage.setItem(this.semestersKey(), JSON.stringify(semesters));

    let courses = this.getCourses();
    courses = courses.filter(c => c.semester_id !== semesterId);
    localStorage.setItem(this.coursesKey(), JSON.stringify(courses));
    return true;
  },

  // === QUẢN LÝ MÔN HỌC & ĐIỂM (PB-10..17, PB-50) ===
  getCourses() {
    try {
      const raw = localStorage.getItem(this.coursesKey());
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (err) {
      console.error('Lỗi đọc dữ liệu môn học từ localStorage:', err);
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
    localStorage.setItem(this.coursesKey(), JSON.stringify(list));
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
    localStorage.setItem(this.coursesKey(), JSON.stringify(courses));
    return true;
  },

  saveCourseComponents(courseId, components) {
    const courses = this.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (course) {
      course.components = components;
      localStorage.setItem(this.coursesKey(), JSON.stringify(courses));
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
      localStorage.setItem(this.coursesKey(), JSON.stringify(courses));
      return true;
    }
    return false;
  },

  // Phân tích trước khi import để báo cho người dùng biết học kỳ/môn nào sẽ được tạo mới (PB-25, PB-26)
  analyzeImportRows(validRows) {
    const existingSemesters = this.getSemesters();
    const existingCourses = this.getCourses();
    const semSet = new Set(existingSemesters.map(s => s.name.trim().toLowerCase()));
    const courseKeySet = new Set(existingCourses.map(c => {
      const sem = existingSemesters.find(s => s.id === c.semester_id);
      const semName = sem ? sem.name.trim().toLowerCase() : '';
      return `${semName}::${c.course_code.trim().toUpperCase()}`;
    }));

    const newSemesters = new Set();
    const newCourses = new Set();

    const annotatedRows = (validRows || []).map(row => {
      const semLower = (row.semester_name || '').trim().toLowerCase();
      const codeUpper = (row.course_code || '').trim().toUpperCase();
      const cKey = `${semLower}::${codeUpper}`;

      const isNewSemester = !semSet.has(semLower);
      const isNewCourse = !courseKeySet.has(cKey);
      if (isNewSemester) newSemesters.add(row.semester_name.trim());
      if (isNewCourse) newCourses.add(`${codeUpper} (${row.semester_name.trim()})`);

      return {
        ...row,
        isNewSemester,
        isNewCourse
      };
    });
    return { annotatedRows, newSemesterCount: newSemesters.size, newCourseCount: newCourses.size };
  },

  // Batch import Upsert (PB-26, PB-46)
  batchImportRows(validRows) {
    const semesters = this.getSemesters();
    const courses = this.getCourses();
    let createdSemCount = 0;
    let createdCourseCount = 0;
    let updatedCompCount = 0;

    validRows.forEach((row, idx) => {
      let sem = semesters.find(s => s.name.trim().toLowerCase() === row.semester_name.trim().toLowerCase());
      if (!sem) {
        sem = {
          id: 'sem_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000),
          name: row.semester_name.trim(),
          academic_year: '2025-2026',
          start_date: '2025-09-01',
          end_date: '2026-01-15'
        };
        semesters.push(sem);
        createdSemCount++;
      }

      let course = courses.find(c => c.semester_id === sem.id && c.course_code.trim().toUpperCase() === row.course_code.trim().toUpperCase());
      if (!course) {
        course = {
          id: 'c_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000),
          semester_id: sem.id,
          course_code: row.course_code.trim().toUpperCase(),
          course_name: row.course_name.trim(),
          credits: Number(row.credits),
          category: (row.category || 'Đại cương').trim(),
          is_retake: false,
          components: []
        };
        courses.push(course);
        createdCourseCount++;
      }

      let comp = (course.components || []).find(cp => cp.name.trim().toLowerCase() === row.component_name.trim().toLowerCase());
      if (comp) {
        comp.weight_percent = Number(row.weight_percent);
        comp.score = Number(row.score);
      } else {
        if (!course.components) course.components = [];
        course.components.push({
          id: 'comp_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000),
          name: row.component_name.trim(),
          weight_percent: Number(row.weight_percent),
          score: Number(row.score)
        });
      }
      updatedCompCount++;
    });

    localStorage.setItem(this.semestersKey(), JSON.stringify(semesters));
    localStorage.setItem(this.coursesKey(), JSON.stringify(courses));
    return {
      success: true,
      createdSemCount,
      createdCourseCount,
      updatedCompCount
    };
  },

  // Profile & Goals
  getStudent() {
    try { return JSON.parse(localStorage.getItem(this.studentKey())) || { ...this.DEFAULT_STUDENT }; }
    catch { return { ...this.DEFAULT_STUDENT }; }
  },

  saveStudent(student) {
    localStorage.setItem(this.studentKey(), JSON.stringify(student));
  },

  // PB-22: mỗi tài khoản tối đa 1 mục tiêu; null = chưa có
  getGoal() {
    try {
      return JSON.parse(localStorage.getItem(this.goalKey()));
    } catch {
      return null;
    }
  },

  createGoal(goal) {
    // Mô phỏng 409 Conflict của BE khi đã có mục tiêu
    if (this.getGoal()) throw new Error('GOAL_EXISTS');
    localStorage.setItem(this.goalKey(), JSON.stringify(goal));
  },

  updateGoal(goal) {
    if (!this.getGoal()) throw new Error('GOAL_NOT_FOUND');
    localStorage.setItem(this.goalKey(), JSON.stringify(goal));
  },

  deleteGoal() {
    localStorage.removeItem(this.goalKey());
  }
};

StorageService.init();
