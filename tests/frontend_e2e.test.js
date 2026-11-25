/**
 * Bộ kiểm thử tổng thể Frontend & Cấu trúc Dự án StudyTrack-E (Nhóm 11)
 * Chạy nội bộ trên máy: node --test tests/*.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const FE_DIR = path.join(ROOT, 'frontend');
const JS_DIR = path.join(FE_DIR, 'assets', 'js');

function createStorageMock() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    _raw: map
  };
}

test('1. Kiểm tra cú pháp toàn bộ file JavaScript trong frontend/assets/js', () => {
  const files = fs.readdirSync(JS_DIR).filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 15, `Phải có ít nhất 15 file JS, hiện có ${files.length}`);
  for (const file of files) {
    const src = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
    assert.doesNotThrow(() => new vm.Script(src, { filename: file }), `Lỗi cú pháp trong ${file}`);
  }
});

test('2. Kiểm tra toàn bộ trang HTML tồn tại và liên kết CSS/JS nội bộ hợp lệ', () => {
  const htmlFiles = [
    path.join(FE_DIR, 'index.html'),
    ...fs.readdirSync(path.join(FE_DIR, 'pages'))
      .filter((f) => f.endsWith('.html'))
      .map((f) => path.join(FE_DIR, 'pages', f))
  ];
  assert.ok(htmlFiles.length >= 10, `Phải có ít nhất 10 trang HTML, hiện có ${htmlFiles.length}`);

  for (const htmlPath of htmlFiles) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dir = path.dirname(htmlPath);
    const matches = [...html.matchAll(/(?:href|src)="(?!https?:|#|mailto:|javascript:)([^"?#]+)(?:\?[^"]*)?"/g)];
    for (const m of matches) {
      const rel = m[1];
      if (!rel || rel.startsWith('data:')) continue;
      const target = path.resolve(dir, rel);
      assert.ok(fs.existsSync(target), `File ${path.relative(ROOT, htmlPath)} tham chiếu tới đường dẫn không tồn tại: ${rel}`);
    }
  }
});

test('3. StorageService: tách biệt hồ sơ/mục tiêu theo tài khoản, cache học kỳ/môn học & phân tích import', () => {
  const localStorage = createStorageMock();
  const sessionStorage = createStorageMock();
  let currentUser = { id: 'u1', email: 'sv1@ptit.edu.vn', fullName: 'SV 1', role: 'STUDENT' };

  const sandbox = {
    localStorage,
    sessionStorage,
    getSession: () => ({ user: currentUser }),
    console
  };
  const src = fs.readFileSync(path.join(JS_DIR, 'storageService.js'), 'utf8');
  const StorageService = vm.runInNewContext(`${src}\nStorageService`, sandbox);

  // Nạp dữ liệu mẫu vào cache nội bộ để kiểm tra
  StorageService._semesters = [...StorageService.DEFAULT_SEMESTERS];
  StorageService._courses = [...StorageService.DEFAULT_COURSES];
  assert.equal(StorageService.getSemesters().length, 4);
  assert.equal(StorageService.getCourses().length, 26);

  // Tách biệt hồ sơ & mục tiêu giữa 2 tài khoản
  StorageService.saveStudent({ name: 'Sinh Vien 1', student_id: 'N25_01' });
  StorageService.createGoal({ target_gpa: 3.6, target_date: '2027-06-30', remaining_credits: 30 });
  assert.equal(StorageService.getStudent().student_id, 'N25_01');
  assert.equal(StorageService.getGoal().target_gpa, 3.6);

  currentUser = { id: 'u2', email: 'sv2@ptit.edu.vn', fullName: 'SV 2', role: 'STUDENT' };
  assert.equal(StorageService.getStudent().student_id, '');
  assert.equal(StorageService.getGoal(), null);

  // Kiểm tra analyzeImportRows (PB-25, PB-26)
  const analysis = StorageService.analyzeImportRows([
    { semester_name: 'Học kỳ mới test', course_code: 'TEST101', course_name: 'Kiểm thử phần mềm', credits: '3', category: 'Chuyên ngành', component_name: 'Cuối kỳ', weight_percent: '100', score: '9.0' }
  ]);
  assert.equal(analysis.newSemesterCount, 1);
  assert.equal(analysis.newCourseCount, 1);
});

test('4. CSVHelper: kiểm tra đọc CSV, giới hạn 1.000 dòng, xuất bảng điểm và chống Formula Injection', () => {
  const localStorage = createStorageMock();
  const sessionStorage = createStorageMock();
  const calcSrc = fs.readFileSync(path.join(JS_DIR, 'gradeCalculator.js'), 'utf8');
  const storeSrc = fs.readFileSync(path.join(JS_DIR, 'storageService.js'), 'utf8');
  const csvSrc = fs.readFileSync(path.join(JS_DIR, 'csvHelper.js'), 'utf8');

  const sandbox = {
    localStorage,
    sessionStorage,
    window: {},
    getSession: () => ({ user: { id: 'u2', email: 'sv2@ptit.edu.vn', fullName: '=EVIL()' } }),
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(`${calcSrc}\n${storeSrc}\n${csvSrc}`, sandbox);
  const StorageService = vm.runInContext('StorageService', sandbox);
  StorageService._semesters = [...StorageService.DEFAULT_SEMESTERS];
  StorageService._courses = [...StorageService.DEFAULT_COURSES];
  StorageService.saveStudent({ name: '=EVIL()', student_id: 'N25TEST' });
  const CSVHelper = vm.runInContext('CSVHelper', sandbox);

  // Chống CSV Formula Injection (=, +, -, @)
  assert.equal(CSVHelper.sanitizeFormula('=CMD()'), "'=CMD()");
  assert.equal(CSVHelper.sanitizeFormula('+1+1'), "'+1+1");
  assert.equal(CSVHelper.sanitizeFormula('-10'), "'-10");
  assert.equal(CSVHelper.sanitizeFormula('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(CSVHelper.sanitizeFormula('Binh thuong'), 'Binh thuong');

  // Đọc CSV hợp lệ và phát hiện dòng lỗi
  const csvText = [
    'semester_name,course_code,course_name,credits,category,component_name,weight_percent,score',
    'Học kỳ 1,INT999,Môn test,3,Đại cương,Cuối kỳ,100,8.5',
    'Học kỳ 1,BAD01,Môn lỗi điểm,3,Đại cương,Cuối kỳ,100,12.5'
  ].join('\n');
  const parsed = CSVHelper.parseCSV(csvText);
  assert.equal(parsed.success, true);
  assert.equal(parsed.validRows.length, 1);
  assert.equal(parsed.errorRows.length, 1);

  // Từ chối tệp vượt quá 1.000 dòng
  const tooManyRows = Array.from({ length: 1001 }, (_, i) => ['HK1', `M${i}`, 'Mon', '3', 'Đại cương', 'CK', '100', '8']);
  const overLimit = CSVHelper.validateTabularData(CSVHelper.EXPECTED_HEADERS, tooManyRows);
  assert.equal(overLimit.success, false);

  // Xuất bảng điểm có chống injection ở tên sinh viên
  const exportData = CSVHelper.buildTranscriptExportData();
  assert.ok(exportData.coursesCount >= 26);
  assert.equal(exportData.rows[1][1], "'=EVIL()");
});

test('5. Session & Auth (PB-01..PB-05): đăng ký, đăng nhập, đổi mật khẩu băm & thu hồi refresh token', async () => {
  const localStorage = createStorageMock();
  const sessionStorage = createStorageMock();
  const sandbox = {
    localStorage,
    sessionStorage,
    window: { location: { pathname: '/pages/profile.html', replace: () => {} } },
    crypto: {
      getRandomValues: (arr) => crypto.randomFillSync(arr),
      subtle: crypto.webcrypto.subtle
    },
    TextEncoder,
    URLSearchParams,
    setTimeout,
    console
  };
  const src = fs.readFileSync(path.join(JS_DIR, 'session.js'), 'utf8')
    .replace('const USE_MOCK = false;', 'const USE_MOCK = true;');
  const api = vm.runInNewContext(`${src}\n;({ authApi, getSession })`, sandbox);

  await api.authApi.register({ email: 'e2e@ptit.edu.vn', fullName: 'Sinh Vien Test', password: 'password123' });
  await api.authApi.login({ email: 'e2e@ptit.edu.vn', password: 'password123', remember: false });

  const oldRefresh = api.getSession().refreshToken;
  await assert.rejects(
    () => api.authApi.changePassword({ currentPassword: 'wrongpassword', newPassword: 'newpassword123' }),
    (err) => err.code === 'INVALID_PASSWORD'
  );

  const res = await api.authApi.changePassword({ currentPassword: 'password123', newPassword: 'newpassword123' });
  const db = JSON.parse(localStorage.getItem('mockDb'));
  assert.equal(db.refreshTokens[oldRefresh].revoked, true);
  assert.equal(db.refreshTokens[res.refreshToken].revoked, false);

  await api.authApi.updateProfile({ fullName: 'Sinh Vien Da Sua' });
  assert.equal(api.getSession().user.fullName, 'Sinh Vien Da Sua');
});

test('6. Dark Mode (PB-35 / T0694F3): bật/tắt và lưu trạng thái vào localStorage', () => {
  const localStorage = createStorageMock();
  const classes = new Set();
  const attrs = {};
  const sandbox = {
    localStorage,
    document: {
      documentElement: {
        classList: {
          toggle: (c, f) => (f ? classes.add(c) : classes.delete(c)),
          add: (c) => classes.add(c),
          remove: (c) => classes.delete(c),
          contains: (c) => classes.has(c)
        },
        setAttribute: (k, v) => { attrs[k] = v; }
      },
      body: {
        classList: { toggle: (c, f) => (f ? classes.add(`body:${c}`) : classes.delete(`body:${c}`)) },
        appendChild: () => {}
      },
      createElement: () => ({ style: { setProperty: () => {} }, setAttribute: () => {}, appendChild: () => {}, remove: () => {} }),
      getElementById: () => null,
      addEventListener: () => {}
    },
    window: { location: { pathname: '/pages/dashboard.html' }, addEventListener: () => {} },
    setTimeout: (fn) => { fn(); return 0; },
    console
  };
  const src = fs.readFileSync(path.join(JS_DIR, 'app_shell.js'), 'utf8');
  const api = vm.runInNewContext(`${src}\n;({ toggleTheme, getSavedTheme })`, sandbox);

  assert.equal(api.getSavedTheme(), 'light');
  api.toggleTheme();
  assert.equal(api.getSavedTheme(), 'dark');
  assert.equal(localStorage.getItem('studytrack_theme'), 'dark');
  assert.equal(attrs['data-theme'], 'dark');
  api.toggleTheme();
  assert.equal(api.getSavedTheme(), 'light');
  assert.equal(localStorage.getItem('studytrack_theme'), 'light');
});

test('7. Session API_BASE (PB-45 / P0-02): tự nhận diện localhost, LAN máy thứ hai và domain production', () => {
  const src = fs.readFileSync(path.join(JS_DIR, 'session.js'), 'utf8');
  const resolveWith = (win) => {
    const sandbox = {
      localStorage: createStorageMock(),
      sessionStorage: createStorageMock(),
      window: win,
      crypto: {
        getRandomValues: (arr) => crypto.randomFillSync(arr),
        subtle: crypto.webcrypto.subtle
      },
      TextEncoder,
      URLSearchParams,
      setTimeout,
      console
    };
    return vm.runInNewContext(`${src}\nAPI_BASE`, sandbox);
  };

  assert.equal(
    resolveWith({ location: { protocol: 'http:', hostname: 'localhost', port: '8080', origin: 'http://localhost:8080' } }),
    'http://localhost:8000/api/v1'
  );
  assert.equal(
    resolveWith({ location: { protocol: 'http:', hostname: '192.168.1.25', port: '8080', origin: 'http://192.168.1.25:8080' } }),
    'http://192.168.1.25:8000/api/v1'
  );
  assert.equal(
    resolveWith({ location: { protocol: 'https:', hostname: 'studylims.example.com', port: '', origin: 'https://studylims.example.com' } }),
    'https://studylims.example.com/api/v1'
  );
  assert.equal(
    resolveWith({ __API_BASE__: 'https://api.studylims.example.com/api/v1/', location: { protocol: 'https:', hostname: 'studylims.example.com', origin: 'https://studylims.example.com' } }),
    'https://api.studylims.example.com/api/v1'
  );
});
