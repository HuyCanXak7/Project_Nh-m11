# Báo Cáo Kiểm Thử Tổng Thể Dự Án (Nội Bộ Trên Máy — Trước Chốt `v1.0.0`)

- **Ngày chạy:** 25/11/2026
- **Nhánh:** `main` (nền `7352b27` + sửa P0 PB-45/PB-61/PB-62)
- **Tổng số test cases:** **111 / 111 PASS (100%)** — **0 lỗi**

---

## 1. Kết Quả Kiểm Thử Frontend (`node --test`) — **15 / 15 PASS**

### a) `frontend/tests/gradeCalculator.test.js` (**8 / 8 PASS**)
- Mốc biên quy đổi hệ 10 → điểm chữ / hệ 4 khớp Backend (`0.0`, `3.9`, `4.0`, `4.9`, `5.0`, `8.4`, `8.5`, `10.0`).
- Từ chối điểm ngoài khoảng `0–10` (`-0.1`, `10.1`, `11`).
- Làm tròn điểm môn `ROUND_HALF_UP` khớp `Decimal` của Backend (`8.45 → 8.5 = A`).
- Tính GPA tích lũy có trọng số tín chỉ, làm tròn 2 chữ số thập phân.
- Xử lý học lại (`retake`): mỗi mã môn chỉ tính lần điểm cao nhất.
- Xếp loại học lực theo ngưỡng `RANKINGS` (`Xuất sắc`, `Giỏi`, `Khá`, `Trung bình`, `Yếu / Kém`).
- `PB-31`: Cảnh báo GPA học kỳ `< 2.0` và môn rớt (`F`), tự mất cảnh báo khi học lại đạt.
- `PB-32`: Áp dụng cấu hình bảng quy đổi thang điểm từ Backend.

### b) `tests/frontend_e2e.test.js` (**7 / 7 PASS**)
1. Kiểm tra cú pháp toàn bộ file JavaScript trong `frontend/assets/js/*.js` (0 lỗi cú pháp).
2. Kiểm tra toàn bộ trang HTML (`index.html` và `pages/*.html`) và xác minh mọi liên kết nội bộ CSS/JS tồn tại.
3. `StorageService`: Tách biệt hồ sơ & mục tiêu theo từng tài khoản (`currentUserId`), quản lý cache học kỳ/môn học và phân tích dòng import (`PB-25`, `PB-26`).
4. `CSVHelper`: Đọc CSV hợp lệ/phát hiện dòng lỗi, chặn tệp `> 1.000` dòng, xuất bảng điểm và chống CSV Formula Injection (`=`, `+`, `-`, `@`).
5. `Session & Auth` (`PB-01..PB-05`): Đăng ký, đăng nhập, kiểm tra sai mật khẩu hiện tại, đổi mật khẩu băm SHA-256, thu hồi refresh token cũ và cập nhật hồ sơ cá nhân.
6. `Dark Mode` (`PB-35` / `T0694F3`): Bật/tắt chế độ tối, cập nhật `data-theme` và lưu bền vững vào `localStorage`.
7. `Session API_BASE` (`PB-45` / `P0-02`): Tự động nhận diện đúng URL API cho `localhost:8080`, máy thứ hai qua LAN (`:8080 → :8000`), domain Production (`${origin}/api/v1`) và biến ghi đè `window.__API_BASE__`.

---

## 2. Kết Quả Kiểm Thử Backend (`pytest`) — **96 / 96 PASS**

### a) `backend/tests/` (**92 / 92 PASS**)
- `test_admin_user_api.py` (**8 / 8 PASS**): Danh sách/tìm kiếm/phân trang sinh viên, xem bảng điểm chi tiết, sửa điểm tự tính lại GPA, cập nhật thang điểm `PUT /grade-scale`, khóa/mở khóa tài khoản thu hồi phiên & ghi `audit_logs`, đổi mật khẩu thu hồi phiên cũ, cập nhật hồ sơ cá nhân và chặn quyền non-admin.
- `test_auth.py` (**2 / 2 PASS**): Cập nhật họ tên hồ sơ (`PATCH /api/v1/auth/profile`) và chặn dữ liệu không hợp lệ / chưa đăng nhập.
- `test_authorization_isolation.py` (**7 / 7 PASS**): Phân quyền sở hữu dữ liệu (owner isolation), chặn đọc/sửa dữ liệu tài khoản khác, kiểm tra import batch atomic (không ghi dở dang khi lỗi), chặn trùng thành phần điểm, chặn `> 1.000` dòng và kiểm tra cổng phân quyền `ADMIN`.
- `test_course_management_api.py` (**2 / 2 PASS**): Danh sách môn học, tìm kiếm/lọc, kiểm tra sở hữu, sửa/xóa cascade.
- `test_course_retake_api.py` (**2 / 2 PASS**): Đánh dấu/bỏ đánh dấu học lại, chọn điểm cao nhất theo từng tài khoản.
- `test_current_api.py` (**2 / 2 PASS**): Luồng Auth → Semester → GPA, kiểm tra quyền sở hữu và validate học kỳ.
- `test_gpa.py` (**3 / 3 PASS**): GPA tính cả môn rớt nhưng không cộng vào tín chỉ đạt, trạng thái rỗng và ngưỡng xếp loại.
- `test_grade_gpa_unit.py` (**46 / 46 PASS**): Đầy đủ mốc biên thang điểm, trọng số, làm tròn `ROUND_HALF_UP`, xử lý thiếu điểm/sai tổng trọng số, xếp loại và xử lý học lại.
- `test_grade_scale_api.py` (**5 / 5 PASS**): API thang điểm mặc định, mốc biên lưu DB, phân quyền `ADMIN` sửa thang điểm, từ chối thang điểm lỗi và áp dụng thang điểm mới.
- `test_grades.py` (**3 / 3 PASS**): Cấu hình thành phần điểm đúng `100%`, nhập/sửa điểm theo quyền sở hữu và chỉ tính điểm môn khi đủ 100%.
- `test_learning_data_api.py` (**3 / 3 PASS**): Tối ưu hiệu năng `PB-39` (`GET /api/v1/learning-data`), kiểm tra yêu cầu đăng nhập, trả đủ 40 môn trong số lượng SELECT cố định (chặn N+1) và cô lập dữ liệu giữa các user.
- `test_security_review.py` (**9 / 9 PASS**): Rà soát bảo mật `PB-36` (băm bcrypt, giới hạn 72 byte, JWT 15p/7d, CORS chỉ đúng origin, lỗi 500 không lộ stack trace, `UNAUTHORIZED`, rate limit `429` theo số lần sai & reset khi đúng, logout/đổi mật khẩu thu hồi phiên).

### b) `tests/test_backend_integration.py` (**4 / 4 PASS**)
- `test_auth_full_lifecycle_register_login_me_refresh_logout`: Toàn bộ vòng đời đăng ký (`201`), chặn trùng email (`409`), chặn sai mật khẩu (`401`), đăng nhập (`200`), `/auth/me`, xoay vòng `refreshToken` (chặn dùng lại token cũ `401`) và đăng xuất thu hồi phiên (`401`).
- `test_cors_and_openapi_docs_available`: Xác minh `/openapi.json` phản hồi `200` với đầy đủ các route chính (`/api/v1/health`, `/api/v1/auth/login`, `/api/v1/semesters`, `/api/v1/gpa/cumulative`, `/api/v1/grade-scale`).
- `test_healthcheck_endpoint_returns_ok` (`PB-45` / `PB-62` / `P0-01`): Xác minh `GET /api/v1/health` trả `200`, `data.status = "ok"`, `data.database = "ok"`, `data.version = "1.0.0"`.
- `test_demo_backup_sql_restores_cleanly` (`PB-45`): Xác minh bản sao lưu `backups/demo_db_backup_v1.0.0.sql` khôi phục sạch vào DB mới với đủ `8` mức thang điểm, `5` tài khoản, `8` học kỳ, `40` lượt môn, `120` thành phần điểm và `3` mục tiêu GPA.

---

## 3. Cách Chạy Lại Toàn Bộ Test Nội Bộ
Mở PowerShell tại thư mục `Project_Nh-m11` và chạy:
```powershell
.\tests\run_all_tests.ps1
```
