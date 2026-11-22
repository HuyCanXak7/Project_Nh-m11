/**
 * DỊCH VỤ DỮ LIỆU: học kỳ / môn học / điểm lấy từ API backend; hồ sơ và mục tiêu vẫn lưu localStorage
 * Phụ trách: Phân hệ Quản lý Học kỳ, Môn học, Điểm (FE Nghiệp)
 * Đáp ứng tiêu chuẩn: PB-06..09 (Học kỳ), PB-10..17 (Môn học), PB-50 (Học lại), PB-46 (Cascade Delete)
 */

const STORAGE_KEYS = {
  STUDENT: 'app_student_profile',
  GOAL: 'app_gpa_goal'
};

// shortcut: BE chỉ có 3 khối, 'Tự chọn & Thực tập' được lưu thành SPECIALIZED; thêm giá trị enum ở BE nếu cần tách riêng
const CATEGORY_TO_API = { 'Đại cương': 'GENERAL', 'Cơ sở ngành': 'FOUNDATION', 'Chuyên ngành': 'SPECIALIZED', 'Tự chọn & Thực tập': 'SPECIALIZED' };
const CATEGORY_FROM_API = { GENERAL: 'Đại cương', FOUNDATION: 'Cơ sở ngành', SPECIALIZED: 'Chuyên ngành' };

const DEFAULT_COMPONENTS = [
  { name: 'Chuyên cần', weight_percent: 10 },
  { name: 'Giữa kỳ', weight_percent: 30 },
  { name: 'Cuối kỳ', weight_percent: 60 }
];

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


  // ADMIN đang xem tài khoản khác (chọn ở trang Tài khoản) → chỉ áp dụng cho dữ liệu còn lưu local (hồ sơ, mục tiêu)
  adminViewAs() {
    try {
      const target = JSON.parse(sessionStorage.getItem('adminViewAs'));
      return target?.id && getSession()?.user?.role === 'ADMIN' ? target : null;
    } catch { return null; }
  },

  currentUserId() {
    const viewAs = this.adminViewAs();
    if (viewAs) return String(viewAs.id);
    const u = typeof getSession === 'function' ? getSession()?.user : null;
    if (u?.id) return String(u.id);
    if (u?.email) return String(u.email).toLowerCase();
    return 'guest';
  },

  goalKey()    { return STORAGE_KEYS.GOAL + '_' + this.currentUserId(); },
  studentKey() { return STORAGE_KEYS.STUDENT + '_' + this.currentUserId(); },

  // === CACHE DỮ LIỆU TỪ BACKEND (học kỳ, môn học, thành phần điểm) ===
  // Các trang đọc đồng bộ từ cache; trước lần render đầu phải `await StorageService.ready`.
  _semesters: [],
  _courses: [],
  _ready: null,

  get ready() {
    this._ready ??= this.load().catch((err) => {
      console.error('Lỗi tải dữ liệu từ máy chủ:', err);
      if (typeof showToast === 'function') showToast(err.message || 'Không tải được dữ liệu từ máy chủ.', true);
    });
    return this._ready;
  },

  async reload() {
    this._ready = null;
    await this.ready;
    // PB-31: dữ liệu đổi thì cảnh báo xuất hiện/mất ngay, không cần tải lại trang
    if (typeof renderAcademicWarnings === 'function') renderAcademicWarnings();
  },

  async load() {
    const sems = await apiFetch('/semesters');
    const courses = (await Promise.all(sems.map(s => apiFetch(`/semesters/${s.id}/courses`)))).flat();
    // shortcut: 1 request/môn để lấy thành phần điểm; khi số môn lớn thì thêm API trả kèm components ở BE
    const configs = await Promise.all(courses.map(c => apiFetch(`/courses/${c.id}/grade-components`)));

    // BE trả học kỳ mới nhất trước; FE coi phần tử cuối là học kỳ gần nhất. Id ép về chuỗi để so với data-* trong DOM.
    this._semesters = sems
      .map(s => ({ ...s, id: String(s.id) }))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    this._courses = courses.map((c, i) => ({
      id: String(c.id),
      semester_id: String(c.semester_id),
      course_code: c.code,
      course_name: c.name,
      credits: c.credits,
      category: CATEGORY_FROM_API[c.category] || c.category,
      is_retake: c.is_retake,
      components: configs[i].components.map(cp => ({
        id: String(cp.id), name: cp.name, weight_percent: cp.weightPercent, score: cp.score
      }))
    }));
  },

  courseBody(c) {
    return {
      code: c.course_code,
      name: c.course_name,
      credits: Number(c.credits),
      category: CATEGORY_TO_API[c.category] || c.category,
      is_retake: !!c.is_retake
    };
  },

  // Nạp lại bộ dữ liệu mẫu vào tài khoản hiện tại trên BE (xóa dữ liệu cũ của tài khoản)
  async resetToDefault() {
    await this.ready;
    for (const s of this._semesters) await apiFetch(`/semesters/${s.id}`, { method: 'DELETE' });

    for (const { id: semKey, ...semBody } of this.DEFAULT_SEMESTERS) {
      const sem = await apiFetch('/semesters', { method: 'POST', body: semBody });
      for (const c of this.DEFAULT_COURSES.filter(c => c.semester_id === semKey)) {
        const course = await apiFetch(`/semesters/${sem.id}/courses`, { method: 'POST', body: this.courseBody(c) });
        const scores = [];
        for (const cp of c.components) {
          const cfg = await apiFetch(`/courses/${course.id}/grade-components`, {
            method: 'POST', body: { name: cp.name, weight_percent: cp.weight_percent }
          });
          const created = cfg.components[cfg.components.length - 1];
          if (cp.score !== null) scores.push({ component_id: created.id, score: cp.score });
        }
        if (scores.length) await apiFetch(`/courses/${course.id}/scores`, { method: 'PUT', body: { scores } });
      }
    }

    localStorage.setItem(this.goalKey(), JSON.stringify({
      target_gpa: 3.60,
      target_date: '2027-06-30',
      remaining_credits: 30
    }));
    await this.reload();
  },

  // === QUẢN LÝ HỌC KỲ (PB-06..09) ===
  getSemesters() {
    return this._semesters;
  },

  getSemesterById(id) {
    return this._semesters.find(s => s.id === String(id)) || null;
  },

  async saveSemester({ id, name, academic_year, start_date, end_date }) {
    const body = { name, academic_year, start_date, end_date };
    await apiFetch(id ? `/semesters/${id}` : '/semesters', { method: id ? 'PUT' : 'POST', body });
    await this.reload();
    return true;
  },

  // Cảnh báo xóa dây chuyền (Cascade Details - PB-09, PB-46)
  getSemesterCascadeDetails(semesterId) {
    const courses = this.getCourses().filter(c => c.semester_id === String(semesterId));
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

  // BE tự xóa dây chuyền môn học và thành phần điểm
  async deleteSemesterCascade(semesterId) {
    await apiFetch(`/semesters/${semesterId}`, { method: 'DELETE' });
    await this.reload();
    return true;
  },

  // === QUẢN LÝ MÔN HỌC & ĐIỂM (PB-10..17, PB-50) ===
  getCourses() {
    return this._courses;
  },

  getCourseById(id) {
    return this._courses.find(c => c.id === String(id)) || null;
  },

  async saveCourse(courseData) {
    const body = this.courseBody(courseData);
    if (courseData.id) {
      await apiFetch(`/courses/${courseData.id}`, { method: 'PUT', body });
    } else {
      const course = await apiFetch(`/semesters/${courseData.semester_id}/courses`, { method: 'POST', body });
      for (const comp of DEFAULT_COMPONENTS) {
        await apiFetch(`/courses/${course.id}/grade-components`, { method: 'POST', body: comp });
      }
    }
    await this.reload();
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

  async deleteCourseCascade(courseId) {
    await apiFetch(`/courses/${courseId}`, { method: 'DELETE' });
    await this.reload();
    return true;
  },

  // Đồng bộ danh sách thành phần lên BE: xóa cột bị bỏ, sửa cột cũ, thêm cột mới
  async saveCourseComponents(courseId, components) {
    const old = this.getCourseById(courseId)?.components || [];
    const oldById = Object.fromEntries(old.map(o => [o.id, o]));
    const keepIds = new Set(components.map(c => c.id));

    for (const o of old) {
      if (!keepIds.has(o.id)) await apiFetch(`/grade-components/${o.id}`, { method: 'DELETE' });
    }
    // BE chặn tổng trọng số > 100% ở từng bước, nên giảm trọng số trước rồi mới tăng
    const updates = components
      .filter(c => oldById[c.id] && (oldById[c.id].name !== c.name || oldById[c.id].weight_percent !== c.weight_percent))
      .sort((a, b) => (a.weight_percent - oldById[a.id].weight_percent) - (b.weight_percent - oldById[b.id].weight_percent));
    for (const c of updates) {
      await apiFetch(`/grade-components/${c.id}`, { method: 'PUT', body: { name: c.name, weight_percent: c.weight_percent } });
    }
    for (const c of components.filter(c => !oldById[c.id])) {
      await apiFetch(`/courses/${courseId}/grade-components`, { method: 'POST', body: { name: c.name, weight_percent: c.weight_percent } });
    }
    await this.reload();
    return true;
  },

  async saveCourseScores(courseId, scoreMap) {
    // shortcut: BE chưa có API xóa điểm, ô để trống giữ nguyên điểm cũ; thêm API xóa điểm ở BE nếu cần
    const scores = Object.entries(scoreMap)
      .filter(([, score]) => score !== null)
      .map(([id, score]) => ({ component_id: Number(id), score }));
    if (scores.length) await apiFetch(`/courses/${courseId}/scores`, { method: 'PUT', body: { scores } });
    await this.reload();
    return true;
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

  // Batch import Upsert (PB-26, PB-46) — BE lưu cả lô trong 1 transaction
  async batchImportRows(validRows) {
    const rows = validRows.map(r => ({
      row: r.row,
      semester_name: r.semester_name,
      course_code: r.course_code,
      course_name: r.course_name,
      credits: Number(r.credits),
      category: CATEGORY_TO_API[(r.category || '').trim()] || r.category,
      component_name: r.component_name,
      weight_percent: Number(r.weight_percent),
      score: Number(r.score)
    }));
    const res = await apiFetch('/import/grades', { method: 'POST', body: { rows } });
    await this.reload();
    return {
      success: true,
      createdSemCount: res.createdSemesters,
      createdCourseCount: res.createdCourses,
      updatedCompCount: res.importedRows
    };
  },

  // Profile & Goals — BE chưa có API nên vẫn lưu localStorage
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
