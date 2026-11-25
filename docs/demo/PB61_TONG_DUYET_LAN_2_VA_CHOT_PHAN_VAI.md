# PB-61 · Biên Bản Tổng Duyệt Lần 2 và Chốt Phân Vai Bảo Vệ

- **Dự án:** Hệ thống Quản lý Chỉ số Học tập Sinh viên — **StudyLIMS (Nhóm 11)**
- **Mã Backlog:** `PB-61` | **Mức độ:** Must (Enabler) · NFR-Demo
- **Sprint:** Sprint 4 (23/11/2026 – 27/11/2026)
- **Chủ trì tổng duyệt:** **Huỳnh Nhơn Nguyên Nghiệp (`N25DTCN038`) — Nhóm trưởng**
- **Thành viên tham gia (4/4):**
  1. **Huỳnh Nhơn Nguyên Nghiệp** (`N25DTCN038`) — **Nhóm trưởng** · Frontend (Học kỳ, Môn học, Nhập điểm, Import/Export, Bảng điểm, UX/Responsive/Dark Mode)
  2. **Vũ Cao Nguyên** — Frontend (Auth/Session, Dashboard, Mục tiêu GPA, What-If, Thống kê, Hồ sơ, Admin UI)
  3. **Nguyễn Hoàng Đức Huy** — Backend (Auth/JWT, Học kỳ, GPA, Swagger, Healthcheck, Deploy Production)
  4. **Nguyễn Minh Trung** — Backend (Môn học, Điểm thành phần, Thang điểm, Batch Import, Docker, Bảo mật & Kiểm thử)
- **Quy tắc tổng duyệt:** Mô phỏng 100% điều kiện buổi bảo vệ thật; **chỉ sửa lỗi P0, tuyệt đối không thêm tính năng mới**.

---

## 1. Chốt Phân Vai Vận Hành & Thuyết Trình (Khung 11 Phút / 10–12 Phút)

### 1.1. Phân vai điều phối trong buổi bảo vệ

| Vai trò trong buổi bảo vệ | Phụ trách chính | Dự phòng | Nhiệm vụ cụ thể |
| :--- | :--- | :--- | :--- |
| **Chủ trì buổi bảo vệ, Mở đầu – Kết luận & Điều phối Q&A** | **Huỳnh Nhơn Nguyên Nghiệp** *(Nhóm trưởng)* | Nguyễn Hoàng Đức Huy | Đại diện nhóm chào hội đồng, mở đầu giới thiệu đề tài & kiến trúc, trình bày chặng FE cốt lõi, chốt tổng kết, trực tiếp tiếp nhận & phân luồng câu hỏi hội đồng và ra quyết định chuyển phương án dự phòng khi có sự cố |
| **Người cầm máy demo chính (Main Operator)** | **Vũ Cao Nguyên** | Huỳnh Nhơn Nguyên Nghiệp | Ngồi cố định tại laptop chính để điều khiển chuột/chuyển tab mượt theo lời người nói (tránh mất thời gian đổi chỗ ngồi giữa các chặng), thao tác Dashboard, Mục tiêu, What-If & hỗ trợ chặng Import/Bảng điểm |
| **Trực máy dự phòng, Reset DB & Backup SQL** | **Nguyễn Minh Trung** | Nguyễn Hoàng Đức Huy | Giữ laptop dự phòng đã chạy sẵn Docker Compose offline + tài khoản demo đăng nhập sẵn; thực thi `reset_demo_data` hoặc restore `demo_db_backup_v1.0.0.sql` trong < 10 giây ngay khi Nhóm trưởng ra hiệu |
| **Điều khiển Slide, Timekeeper & Trực mạng/Production** | **Nguyễn Hoàng Đức Huy** | Vũ Cao Nguyên | Chuyển slide đúng nhịp, bấm giờ đếm ngược 11 phút (báo tín hiệu tay tại mốc phút 8 và phút 10), theo dõi healthcheck Production và sẵn sàng bật Hotspot 4G dự phòng |

### 1.2. Kịch bản phân bổ thời lượng thuyết trình (Tổng: 11 phút 00 giây)

| Mốc thời gian | Thời lượng | Chặng trình bày | Người nói chính | Thao tác trên màn hình (Operator) |
| :---: | :---: | :--- | :---: | :--- |
| `00:00 – 01:30` | **1 phút 30s** | **1. Mở đầu, Bài toán, Đội ngũ & Kiến trúc tổng thể** | **Nghiệp** *(Nhóm trưởng)* | Chiếu Slide PDF: giới thiệu nhóm & phân công, bài toán quản lý chỉ số học tập, kiến trúc 3 tầng (Nginx FE – FastAPI BE – MySQL 8), nhấn mạnh 4 điểm ăn điểm: chuẩn Thông tư 08, hiệu năng p95 `27.9ms` (1 request `/learning-data`), bảo mật `14/14` tiêu chí (`PB-36`), `111/111` test tự động PASS |
| `01:30 – 03:30` | **2 phút 00s** | **2. Đăng nhập, Dark Mode, Tìm kiếm nhanh (`Ctrl+K`) & Dashboard** | **Nguyên** | Mở Tab 1 đã đăng nhập `demo.student01@example.com`, chuyển Dark/Light Mode (hiệu ứng mặt trời/màn sao), bấm `Ctrl+K` tìm nhanh không dấu `lap trinh`, chỉ 4 thẻ KPI, biểu đồ GPA theo kỳ & cảnh báo học tập PB-31 |
| `03:30 – 06:30` | **3 phút 00s** | **3. Học kỳ, Môn học, Trọng số 100%, Học lại, Import CSV & Bảng điểm** | **Nghiệp** *(Nhóm trưởng)* | Mở Học kỳ (mở hộp cảnh báo Cascade Delete đếm số môn/đầu điểm sẽ mất rồi bấm Hủy) → Môn học: bấm `100%` chứng minh khóa nút Lưu khi tổng ≠ 100% → sửa điểm môn rớt `INT1001` từ `3.9` (F) lên `8.5` (A) thấy GPA cập nhật & cảnh báo tự mất → Import `demo_import_invalid.csv` (tô đỏ lỗi dòng 3) → Import `demo_import_valid.csv` (lưu thành công) → Bảng điểm: Xuất Excel `.xlsx` & mở xem trước In A4 |
| `06:30 – 08:15` | **1 phút 45s** | **4. Mục tiêu GPA, Mô phỏng What-If, Thống kê & Quản trị Admin** | **Nguyên** | Trang Mục tiêu: nhập GPA `4.0` xem cảnh báo *"Không khả thi"*, hạ xuống `3.5` xem điểm cần đạt → gõ điểm giả định What-If thấy GPA nhảy tức thời mà không đổi DB thật → mở nhanh Thống kê & giao diện Admin (tìm kiếm/khóa tài khoản, thang điểm) |
| `08:15 – 10:15` | **2 phút 00s** | **5. Backend API/Swagger, Bảo mật, Hiệu năng & Kiểm thử** | **Huy** *(45s)* → **Trung** *(1p15s)* | Mở Tab 2: `/api/v1/health` (`200 OK`) & Swagger `/docs` (`27 routes`). **Huy** trình bày Auth/JWT + Stateful Session thu hồi ngay, Deploy/Healthcheck; **Trung** trình bày Owner Isolation chống IDOR (`404`), tối ưu `GET /learning-data` (51 → 1 request, p95 `27.94ms`), Docker Compose và kết quả `111/111` test tự động PASS |
| `10:15 – 11:00` | **0 phút 45s** | **6. Đánh giá hạn chế, Hướng phát triển Phase 2 & Kết luận** | **Nghiệp** *(Nhóm trưởng)* | Tóm tắt khách quan các giới hạn hiện tại & lộ trình nâng cấp Phase 2 (nối API Mục tiêu GPA/hồ sơ phụ, Redis Rate Limit khi chạy đa node, SMTP Quên mật khẩu), cảm ơn và thay mặt nhóm mời hội đồng đặt câu hỏi |

---

## 2. Chốt Người Trả Lời Từng Nhóm Câu Hỏi Hội Đồng (Q&A Matrix)

> **Quy trình điều phối Q&A của Nhóm trưởng:** Khi hội đồng đặt câu hỏi, **Nghiệp (Nhóm trưởng)** lắng nghe trọn câu, ghi nhanh từ khóa; nếu thuộc Nhóm B/E hoặc câu hỏi tổng thể thì **Nghiệp trực tiếp trả lời**; nếu thuộc chuyên sâu kỹ thuật BE/FE khác thì **Nghiệp gật/gọi đích danh người trả lời chính** (vd: *"Về cơ chế JWT thu hồi phiên, em xin mời bạn Huy trình bày chi tiết ạ"*). Mỗi câu trả lời dài **30–45 giây**, tránh nói chồng lên nhau.

| Nhóm câu hỏi | Phạm vi nội dung hội đồng thường xoáy | Trả lời chính | Hỗ trợ bổ sung |
| :--- | :--- | :---: | :---: |
| **Nhóm A — Nghiệp vụ điểm, GPA & Quy đổi** | Công thức trọng số 100%, làm tròn `ROUND_HALF_UP` (`8.45 → 8.5`), mốc biên `3.9/4.0`, `8.4/8.5`, xử lý môn `F` không cộng tín chỉ đạt, học lại lấy điểm cao nhất, đồng nhất công thức FE & BE | **Trung** *(BE)* & **Nghiệp** *(FE)* | Nguyên |
| **Nhóm B — Frontend, UX & Xử lý tệp** | Tại sao dùng Vanilla JS, Import CSV/Excel, Xuất `.xlsx` không cần thư viện ngoài, chống CSV Formula Injection (`= + - @`), Responsive `360px`, Loading/Empty/Error (PB-40), Dark Mode, What-If | **Nghiệp** *(Import/Export/Courses/UX/Dark Mode)* & **Nguyên** *(Dashboard/Goals/What-If/Admin)* | Trung |
| **Nhóm C — Bảo mật & Phân quyền** | Bcrypt + Dummy Hash chống Timing Attack, JWT + Stateful `auth_sessions` thu hồi ngay khi logout/khóa tài khoản, Refresh Rotation + Promise Deduplication, Rate Limit `429`, Owner Isolation chống IDOR | **Huy** *(Auth/JWT)* & **Trung** *(Owner Isolation/Security)* | Nguyên *(session.js)* |
| **Nhóm D — Kiến trúc, CSDL & Triển khai** | ERD 8 bảng MySQL 8 (gồm `audit_logs`), `Numeric` tránh sai số, Cascade Delete 2 tầng, tối ưu N+1 `GET /learning-data` (7 SELECT cố định, p95 `27.94ms`), Alembic 0001→0007, Docker Compose, Healthcheck `/api/v1/health`, Reset DB PB-59 & Backup/Restore | **Huy** *(Deploy/Healthcheck/DB)* & **Trung** *(Docker/Perf/Migration/Reset)* | Nghiệp *(điều phối)* |
| **Nhóm E — Quản lý dự án, Kiểm thử & Hạn chế** | Phân công nhóm 4 người, Scrum 4 Sprint, chiến lược kiểm thử `111/111` test cases + Playwright E2E, rà soát bảo mật `PB-36`, đánh giá trung thực mục lưu `localStorage`, phương án dự phòng ngày bảo vệ & lộ trình Phase 2 | **Nghiệp** *(Nhóm trưởng)* | Huy & Trung *(số liệu BE)* |

---

## 3. Kịch Bản Đóng Vai Hội Đồng Hỏi Dồn (Mock Defense Q&A Drill)

12 câu hỏi dồn trọng tâm dùng để tập dượt trong buổi tổng duyệt lần 2 dưới sự điều phối của Nhóm trưởng:

| # | Câu hỏi dồn từ Hội đồng (đóng vai) | Người trả lời | Ý chốt bắt buộc phải nói trúng (< 45 giây) |
| :-: | :--- | :---: | :--- |
| 1 | *"Điểm thành phần ra `8.45` thì hệ thống ra `B+` hay `A`? Nếu What-If ở FE tính ra `8.4` còn BE ra `8.5` thì sao?"* | **Nghiệp → Trung** | BE dùng `Decimal` + `ROUND_HALF_UP` làm tròn 1 chữ số trước khi tra bảng (`8.45 → 8.5 → A / 4.0`). FE xử lý sai số IEEE 754 bằng `toPrecision(12)` trong `gradeCalculator.js` và đọc bảng thang điểm động từ `GET /api/v1/grade-scale` (không hard-code). Đã phủ 8 unit test FE + 46 unit test BE kiểm chứng khớp mọi mốc biên. |
| 2 | *"Môn `INT1001` kỳ 1 rớt `3.9` (F), kỳ 2 học lại được `8.5` (A). Khi tính GPA tích lũy thì môn F kia còn làm tụt GPA không? Nếu chưa học lại thì tính thế nào?"* | **Trung** | Chuẩn hóa mã môn (`strip().upper()`), gộp theo mã môn và lấy lần có `(grade4, grade10)` cao nhất (`HIGHEST_GRADE_BY_COURSE_CODE`). Khi đã học lại `8.5`, bản ghi `3.9` không kéo GPA tích lũy xuống nữa (nhưng vẫn giữ trong GPA học kỳ 1). Nếu **chưa** học lại, môn `F` vẫn vào mẫu số tổng tín chỉ GPA nhưng **không** cộng vào `passedCredits` (chỉ cộng môn `≥ 4.0`). |
| 3 | *"File CSV 500 dòng, đúng 499 dòng đầu, sai điểm ở dòng 500. Hệ thống có lưu 499 dòng trước không? Nếu gửi request thẳng vào API bỏ qua FE thì sao?"* | **Trung** | Tuyệt đối không lưu dở dang. BE trong `services/grade_import.py` áp dụng **Validate-All-First** (kiểm tra lại toàn bộ 100% ở server, không tin FE) — có dù chỉ 1 lỗi lập tức trả `400 IMPORT_INVALID_ROWS` kèm chính xác số dòng lỗi. Quá trình ghi nằm gọn trong **1 Transaction**, gặp lỗi SQL thì `db.rollback()`. |
| 4 | *"Sinh viên A sửa trọng số từ `(10%, 30%, 60%)` sang `(20%, 30%, 50%)`. BE chặn tổng > 100% ở từng request `PUT`, vậy lúc sửa 10% lên 20% tổng thành 110% có bị lỗi không?"* | **Nghiệp** | Không bị lỗi nhờ thuật toán sắp xếp thứ tự gọi API trong `StorageService.saveCourseComponents()`: xóa thành phần bỏ đi trước → sắp xếp các thành phần cần sửa theo độ lệch `new - old` tăng dần (**giảm** 60% → 50% trước để tổng còn 90%, rồi mới **tăng** 10% → 20%) → cuối cùng mới `POST` thành phần mới. |
| 5 | *"Admin vừa khóa tài khoản sinh viên A (`is_active = false`), nhưng sinh viên A đang giữ Access Token JWT còn hạn 12 phút. Sinh viên A có tiếp tục gọi API sửa điểm được không?"* | **Huy** | Không. Nhóm kết hợp JWT với **Stateful Session** (`auth_sessions` + claim `sid`). Mỗi request đi qua `get_current_user()` đều kiểm tra lại bản ghi phiên `sid` và cờ `user.is_active == True` trong DB → khóa tài khoản hoặc logout làm mất hiệu lực cả Access lẫn Refresh Token ngay lập tức. |
| 6 | *"Nếu trang Dashboard gửi 4 API song song đúng lúc Access Token vừa hết hạn, chuyện gì xảy ra với Refresh Token Rotation?"* | **Nguyên** | Nếu không xử lý sẽ gửi 4 request `/auth/refresh` cùng lúc khiến 3 request sau bị `401` do refresh token cũ đã bị thu hồi. Trong `session.js`, nhóm áp dụng **Promise Deduplication** (`refreshing ??= ...`): cả 4 request dùng chung 1 Promise refresh duy nhất rồi tự động gửi lại với Access Token mới. |
| 7 | *"Sinh viên A đăng nhập xong, mở Postman đổi ID trong `PUT /api/v1/courses/15` (môn của sinh viên B). Chuyện gì xảy ra?"* | **Trung** | Mọi truy vấn ở tầng Service dùng `get_owned_course()` luôn `JOIN semesters` và lọc bắt buộc `Semester.user_id == current_user.id` lấy từ JWT. Không khớp chủ sở hữu thì BE trả **`404 NOT_FOUND`** — vừa chặn hoàn toàn IDOR vừa không tiết lộ ID đó có tồn tại hay không. |
| 8 | *"CSV Formula Injection là gì? Nếu tên sinh viên là `=HYPERLINK("http://evil")` rồi xuất Excel thì sao?"* | **Nghiệp** | Excel/Calc tự thực thi ô bắt đầu bằng `=`, `+`, `-`, `@` như công thức độc hại. Hàm `CSVHelper.sanitizeFormula()` kiểm tra mọi ô văn bản và tự thêm dấu nháy đơn `'` phía trước (`'=HYPERLINK(...)`) khi xuất cả `.csv` và `.xlsx`, đã có test tự động xác minh. |
| 9 | *"Nhóm không dùng React/Vue mà code Vanilla JS, liệu có quá đơn giản và khó bảo trì không?"* | **Nghiệp → Nguyên** | Hệ thống là MPA 12 trang quản trị rõ ràng triển khai trong 20 ngày / 4 Sprint. Chọn HTML5/CSS3/Vanilla JS giúp không tốn thời gian cấu hình bundler, tách rõ 4 module cốt lõi (`session.js`, `storageService.js`, `gradeCalculator.js`, `csvHelper.js`), đóng gói Nginx Alpine nhẹ, tải trang tức thì `< 2s` và 2 thành viên FE làm song song không xung đột. |
| 10 | *"Hỏi thật Nhóm trưởng: có chức năng nào trên web hiện tại vẫn đang chạy `localStorage` thay vì lưu MySQL không?"* | **Nghiệp** *(Nhóm trưởng)* | Trả lời thẳng thắn: Toàn bộ luồng nghiệp vụ cốt lõi và quản trị (Auth, Đổi mật khẩu, Sửa họ tên hồ sơ, Học kỳ, Môn học, Thành phần điểm, GPA, Batch Import, Quản lý user + Khóa/mở khóa có `audit_logs`, Cấu hình thang điểm `PUT /grade-scale`, API gộp `/learning-data`) đã nối **100% FastAPI + MySQL 8** (`USE_MOCK = false`). Riêng **Mục tiêu GPA** và thông tin hồ sơ phụ (MSSV/lớp/avatar) hiện lưu tách biệt theo `userId` tại `localStorage` — CSDL đã migration sẵn bảng `goals` để nối tiếp ở Phase 2. |
| 11 | *"Đang trình bày mà phòng mất Wi-Fi hoặc server Production sập, Nhóm trưởng điều hành xử lý ra sao?"* | **Nghiệp** *(Nhóm trưởng)* | Nhóm đã chốt sẵn 3 tầng dự phòng trong PB-45: (1) kích hoạt Hotspot 4G/5G dự phòng; (2) bấm `Ctrl+3` chuyển sang tab Local Docker Compose chạy offline trên máy đã đăng nhập sẵn; (3) nếu dữ liệu bị hỏng thì Trung chạy 1 lệnh `reset_demo_data` hoặc khôi phục `backups/demo_db_backup_v1.0.0.sql` (~3–10 giây), trường hợp xấu nhất phát Video Demo dự phòng Full HD và thuyết minh trực tiếp. |
| 12 | *"Làm sao nhóm chứng minh toàn bộ hệ thống chạy đúng và đạt tốc độ thực tế chứ không chỉ nói miệng?"* | **Nghiệp → Trung** | Nhóm có bộ kiểm thử tự động **111/111 PASS (100%)** (`15` test FE + `96` test BE gồm cả `test_security_review.py` & `test_learning_data_api.py` kiểm chứng đúng 7 SELECT với 40 môn), bộ Playwright E2E `e2e/test_main_flow.py`, benchmark hiệu năng `PB-39` (`p95 = 27.94ms`, nhanh hơn **9,7 lần**), cộng thêm `check_demo_health.py` đạt **10/10** trên bản backup SQL `v1.0.0`. |

---

## 4. Biên Bản Rà Soát Lỗi P0 Sau Tổng Duyệt (Chỉ Sửa P0 — Không Thêm Tính Năng)

Nhóm trưởng chủ trì rà soát mã nguồn & tổng duyệt lần 2 trên nhánh `main` mới nhất (`7352b27`), **chỉ cho phép sửa lỗi P0 chặn buổi bảo vệ**, tuyệt đối **không bổ sung tính năng mới**:

| Mã lỗi | Mức độ | Mô tả lỗi P0 phát hiện | Ảnh hưởng tới buổi bảo vệ | Biện pháp sửa P0 đã áp dụng | Trạng thái |
| :---: | :---: | :--- | :--- | :--- | :---: |
| `P0-01` | **P0** | Nhánh `main` thiếu endpoint `GET /api/v1/health` kiểm tra kết nối DB (`SELECT 1`); `docker-compose.yaml` chỉ kiểm tra `/openapi.json` nên không phát hiện được khi MySQL mất kết nối | Chặn tiêu chí `PB-62` (*"gọi healthcheck production"*) và không cảnh báo sớm lỗi DB trước giờ bảo vệ | Bổ sung `GET /api/v1/health` trong `backend/app/main.py` (trả `200` khi `SELECT 1` thành công, `503` khi DB lỗi) và cập nhật healthcheck trong `docker-compose.yaml`; bổ sung test tự động | ✅ Đã sửa & kiểm thử PASS |
| `P0-02` | **P0** | `API_BASE` trong `frontend/assets/js/session.js` bị cố định `http://localhost:8000/api/v1` | Khi chạy trên domain Production HTTPS hoặc truy cập từ máy thứ hai qua LAN IP, toàn bộ API login/dữ liệu bị gọi sai về `localhost` của máy khách | Cập nhật hàm `resolveApiBase()` tự nhận diện `window.__API_BASE__`, `localhost`/`127.0.0.1` (`:8000/api/v1`), LAN IP cổng `:8080` (`:8000/api/v1`) và domain Production (`${origin}/api/v1`); bổ sung test tự động | ✅ Đã sửa & kiểm thử PASS |

---

## 5. Quyết Định Đóng Băng Mã Nguồn (Code Freeze) — Nhóm Trưởng Ký Duyệt

- [x] Không thêm bất kỳ tính năng mới nào sau tổng duyệt lần 2.
- [x] Đã xử lý triệt để `2/2` lỗi P0; còn lại `0` lỗi P0 tồn đọng.
- [x] Bộ kiểm thử tự động FE + BE đạt **111/111 PASS (100%)** (xem `tests/TEST_REPORT.md`).
- [x] Cả 4 thành viên thống nhất phân vai, khung thời lượng 11 phút và ma trận điều phối Q&A.
- **Nhóm trưởng duyệt đóng băng mã nguồn:** Huỳnh Nhơn Nguyên Nghiệp (`N25DTCN038`) — Ngày 25/11/2026.
