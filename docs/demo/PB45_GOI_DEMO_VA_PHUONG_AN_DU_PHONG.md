# PB-45 · Chốt Gói Demo và Phương Án Dự Phòng (`v1.0.0`)

- **Dự án:** Hệ thống Quản lý Chỉ số Học tập Sinh viên — **StudyLIMS (Nhóm 11)**
- **Mã Backlog:** `PB-45` | **Mức độ:** Must (Enabler) · NFR-Demo
- **Sprint:** Sprint 4 (23/11/2026 – 27/11/2026)
- **Nhóm trưởng điều phối & chốt nghiệm thu:** **Huỳnh Nhơn Nguyên Nghiệp (`N25DTCN038`)**
- **Phối hợp kỹ thuật theo phân công:**
  - **Huỳnh Nhơn Nguyên Nghiệp** *(Nhóm trưởng · FE)*: Chủ trì rà soát tổng thể gói demo, nghiệm thu kiểm thử & checklist ngày bảo vệ, quyết định chốt tag `v1.0.0` và điều hành phương án dự phòng khi có sự cố.
  - **Nguyễn Hoàng Đức Huy** *(BE · Deploy)*: Chủ trì kỹ thuật hạ tầng Production, Healthcheck `/api/v1/health`, Auth/JWT và mạng Hotspot dự phòng.
  - **Nguyễn Minh Trung** *(BE · Docker)*: Chủ trì Docker Compose máy thứ hai, script Reset DB (`PB-59`), Backup/Restore SQL và máy dự phòng.
  - **Vũ Cao Nguyên** *(FE · Demo Operator)*: Phối hợp chạy thử luồng chính trên giao diện, chuẩn bị Slide PDF và video demo dự phòng.
- **Phiên bản phát hành dự kiến:** Tag `v1.0.0` (nhánh `main`, đã khóa tính năng theo PB-46 & PB-61)
- **Ngày lập hồ sơ:** 25/11/2026

---

## 1. Liên kết môi trường & Tài khoản Demo

### 1.1. Danh sách đường dẫn (Production & Local)

| Môi trường | Thành phần | Đường dẫn (URL) | Ghi chú kiểm tra |
|---|---|---|---|
| **Production (HTTPS)** | Frontend Web | `https://<PRODUCTION-DOMAIN>` *(Huy bàn giao URL cho Nhóm trưởng điền sau khi deploy host thật)* | Mở màn hình Đăng nhập (`200 OK`), FE tự động nối `${origin}/api/v1` |
| **Production (HTTPS)** | Healthcheck API | `https://<PRODUCTION-DOMAIN>/api/v1/health` | Trả `200 OK`, `data.status = "ok"`, `data.database = "ok"` |
| **Production (HTTPS)** | Swagger UI | `https://<PRODUCTION-DOMAIN>/docs` | Kiểm tra hợp đồng API OpenAPI `1.0.0` |
| **Local (Docker Compose)** | Frontend Web (Nginx) | <http://localhost:8080> | Phục vụ tĩnh toàn bộ 12 trang StudyTrack-E |
| **Local (Docker Compose)** | Backend API (FastAPI) | <http://localhost:8000/api/v1> | Tự chạy `alembic upgrade head` khi khởi động |
| **Local (Docker Compose)** | Healthcheck API | <http://localhost:8000/api/v1/health> | Xác nhận FastAPI + MySQL 8 đang kết nối (`SELECT 1`) |
| **Local (Docker Compose)** | Swagger UI | <http://localhost:8000/docs> | Tài liệu API tương tác cho hội đồng kiểm chứng |
| **Repository & Tag** | GitHub Repo | <https://github.com/HuyCanXaK7/Project_Nh-m11> | Release tag mục tiêu: `v1.0.0` |

### 1.2. Tài khoản Demo chuẩn (PB-48 & PB-59)

> **Lưu ý bảo mật:** Mật khẩu trong bảng dưới là giá trị mặc định cho **môi trường local / bản backup demo offline**. Trên môi trường Production thật, mật khẩu được đặt riêng trong `.env` trên server (không commit lên GitHub).

| STT | Email đăng nhập | Vai trò | Nguồn tạo | Biến môi trường `.env` | Dữ liệu đi kèm khi demo |
| :-: | :--- | :---: | :---: | :--- | :--- |
| 1 | `demo.student01@example.com` | `STUDENT` | PB-59 (`reset_demo_data`) | `SEED_DEMO_PASSWORD` *(mặc định local: `DemoNhom11@2026`)* | **Tài khoản demo chính**: 3 học kỳ (`2023-2024`), 15 lượt môn, có môn rớt `INT1001` (`3.9` F) ở HK1 & lần học lại `INT1001` (`8.5` A) ở HK2, mục tiêu GPA `3.60` |
| 2 | `demo.student02@example.com` | `STUDENT` | PB-59 (`reset_demo_data`) | `SEED_DEMO_PASSWORD` | 3 học kỳ (`2024-2025`), 15 lượt môn, mục tiêu GPA `3.60` — dùng demo cô lập phân quyền User A vs User B |
| 3 | `demo.student03@example.com` | `STUDENT` | PB-59 (`reset_demo_data`) | `SEED_DEMO_PASSWORD` | 2 học kỳ (`2025-2026`), 10 lượt môn, mục tiêu GPA `3.60` |
| 4 | `student@example.com` | `STUDENT` | PB-48 (`seed_accounts`) | `SEED_STUDENT_PASSWORD` *(mặc định local: `StudentNhom11@2026`)* | Tài khoản trống (0 học kỳ) — dùng demo Empty State (PB-40) và nút *"Nạp dữ liệu mẫu"* |
| 5 | `admin@example.com` | `ADMIN` | PB-48 (`seed_accounts`) | `SEED_ADMIN_PASSWORD` *(mặc định local: `AdminNhom11@2026`)* | Tài khoản Quản trị — dùng kiểm chứng phân quyền `ADMIN` vs `STUDENT` |

**Tệp CSV mẫu chuẩn bị sẵn cho phần demo Import (PB-25, PB-26):**
- Tệp hợp lệ (3 dòng, tổng trọng số 100%, môn `DEMO101` vào `Học kỳ 1`): `backend/scripts/demo_import_valid.csv`
- Tệp có lỗi (dòng 3 chứa điểm `11` ngoài khoảng `0–10` để minh họa báo lỗi theo dòng & chặn lưu dở dang): `backend/scripts/demo_import_invalid.csv`

---

## 2. Xác minh Script Reset DB (`PB-59`) & Bản Backup DB Demo

### 2.1. Kết quả kiểm chứng Script Reset DB (`PB-59`)

Lệnh thực thi chuẩn:

```powershell
# Trên Docker Compose (chạy tại thư mục gốc Project_Nh-m11):
docker compose exec backend python -m scripts.seed_accounts
docker compose exec backend python -m scripts.reset_demo_data

# Hoặc chạy trực tiếp trên máy local (tại thư mục backend):
alembic upgrade head
python -m scripts.seed_accounts
python -m scripts.reset_demo_data
```

**Bằng chứng nghiệm thu ngày 25/11/2026 trên nền `main` (`7352b27`, kiểm chứng chạy 2 lần liên tiếp — đảm bảo tính lũy đẳng):**
- `alembic upgrade head` (7 migration `0001_auth_accounts` → `0007_audit_logs`): **PASS**
- `python -m scripts.seed_accounts`: `Đã tạo: admin@example.com`, `Đã tạo: student@example.com` — **PASS**
- `python -m scripts.reset_demo_data` (lần 1 & lần 2): `Đã reset dữ liệu demo: 3 sinh viên, 8 học kỳ, 40 lượt môn. Dữ liệu và tài khoản khác được giữ nguyên.` — **PASS**

### 2.2. Bản Backup DB Demo (`backups/demo_db_backup_v1.0.0.sql`)

- **Đường dẫn bản backup:** `backups/demo_db_backup_v1.0.0.sql`
- **Script sao lưu & khôi phục tự động:** `backend/scripts/backup_demo_db.py` (hướng dẫn chi tiết tại `backups/README.md`)
- **Nội dung đã kiểm chứng bằng khôi phục vào DB mới sạch 100%:**
  - `grade_scale`: **8** bản ghi (đủ thang Thông tư 08: A, B+, B, C+, C, D+, D, F)
  - `users`: **5** bản ghi (chỉ lưu hash bcrypt, không có mật khẩu thô)
  - `semesters`: **8** bản ghi
  - `courses`: **40** bản ghi (gồm môn rớt `3.9` F và môn học lại `8.5` A)
  - `grade_components`: **120** bản ghi (3 thành phần/môn, tổng trọng số = 100%)
  - `goals`: **3** bản ghi (mục tiêu GPA `3.60` cho 3 tài khoản demo)
  - `auth_sessions`: **0** bản ghi (không mang theo token cũ)

**Lệnh khôi phục nhanh vào MySQL Docker Compose (< 10 giây):**

```powershell
Get-Content backups\demo_db_backup_v1.0.0.sql -Raw | docker compose exec -T db sh -c 'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

---

## 3. Biên bản Chạy Thử Luồng Chính (Production & Docker Compose Máy Thứ Hai)

### 3.1. Lệnh dựng nhanh trên máy thứ hai (chỉ cần Docker Desktop/Engine)

```powershell
# 1. Clone repo hoặc checkout đúng tag v1.0.0
git clone https://github.com/HuyCanXaK7/Project_Nh-m11.git
cd Project_Nh-m11
git checkout v1.0.0

# 2. Tạo cấu hình local từ mẫu và điền mật khẩu seed demo (8-72 ký tự)
Copy-Item .env.example .env
# Mở .env điền SEED_ADMIN_PASSWORD, SEED_STUDENT_PASSWORD, SEED_DEMO_PASSWORD

# 3. Dựng toàn bộ 3 container (db MySQL 8 + backend FastAPI + frontend Nginx)
docker compose up --build -d
docker compose ps   # Xác nhận db = healthy, backend = healthy, frontend = running

# 4. Nạp tài khoản & dữ liệu demo PB-48 / PB-59
docker compose exec backend python -m scripts.seed_accounts
docker compose exec backend python -m scripts.reset_demo_data

# 5. Chạy kiểm tra sức khỏe & smoke test tự động
python backend/scripts/check_demo_health.py --base-url http://localhost:8000 --frontend-url http://localhost:8080 --demo-email demo.student01@example.com --demo-password <SEED_DEMO_PASSWORD>
```

### 3.2. Bảng kết quả chạy thử 8 luồng chính

| Bước | Luồng nghiệp vụ chính | Local (Máy Nhóm trưởng — Live HTTP + Auto Test) | Docker Compose Máy thứ hai (Trung xác nhận) | Production HTTPS (Huy xác nhận) |
| :-: | :--- | :---: | :---: | :---: |
| 1 | Healthcheck `GET /api/v1/health` (`200`, `database: ok`, `< 500ms`) | ✅ PASS (`91.5ms`, `v1.0.0`) | ⬜ Chờ chạy trên máy có Docker | ⬜ Chờ Huy bàn giao URL Production |
| 2 | Đăng nhập `demo.student01@example.com` + `/auth/me` + Refresh Rotation + Logout | ✅ PASS (`436ms` login, `30ms` `/me`) | ⬜ Xác nhận trước bảo vệ | ⬜ Xác nhận trước bảo vệ |
| 3 | Dashboard tổng quan KPI, biểu đồ học kỳ, cảnh báo học tập (PB-31) | ✅ PASS (`GPA=3.03`, `39 TC`, `Khá`) | ⬜ Xác nhận trước bảo vệ | ⬜ Xác nhận trước bảo vệ |
| 4 | Tạo/Sửa/Xóa Học kỳ (có xác nhận Cascade Delete PB-09) | ✅ PASS *(đã kiểm chứng)* | ⬜ Xác nhận trước bảo vệ | ⬜ Xác nhận trước bảo vệ |
| 5 | Quản lý Môn học, cấu hình trọng số = 100%, nhập điểm, học lại `INT1001` | ✅ PASS *(đã kiểm chứng)* | ⬜ Xác nhận trước bảo vệ | ⬜ Xác nhận trước bảo vệ |
| 6 | Mục tiêu GPA (không khả thi > 4.0 vs khả thi) & Mô phỏng What-If | ✅ PASS *(đã kiểm chứng)* | ⬜ Xác nhận trước bảo vệ | ⬜ Xác nhận trước bảo vệ |
| 7 | Import `demo_import_invalid.csv` (tô đỏ lỗi dòng) → `demo_import_valid.csv` (lưu thành công) | ✅ PASS *(đã kiểm chứng)* | ⬜ Xác nhận trước bảo vệ | ⬜ Xác nhận trước bảo vệ |
| 8 | Bảng điểm tổng hợp, Xuất Excel `.xlsx` chống Formula Injection & In A4 + Dark Mode | ✅ PASS *(đã kiểm chứng)* | ⬜ Xác nhận trước bảo vệ | ⬜ Xác nhận trước bảo vệ |

**Bằng chứng chạy kiểm tra thực tế trên máy cục bộ từ bản backup `demo_db_backup_v1.0.0.sql` (`25/11/2026`, nền `main` `7352b27`):**
- Bộ kiểm thử tự động `.\tests\run_all_tests.ps1`: **111 / 111 PASS (100%)** (`15/15 FE` + `96/96 BE`, chi tiết tại `tests/TEST_REPORT.md`).
- Live HTTP Smoke Test (`backend/scripts/check_demo_health.py`): **10 / 10 ĐẠT** (`/api/v1/health` `200 OK` `91.1ms`, `/openapi.json` `27 routes`, `/grade-scale` `8 bậc`, Frontend `index.html` & `dashboard.html` `200 OK`, đăng nhập `demo.student01@example.com` → `3 học kỳ` → `GPA=3.03, TC đạt=39, Xếp loại=Khá` → `logout` thu hồi phiên thành công).
- Đính kèm kết quả rà soát bảo mật `docs/PB36_SECURITY_CHECKLIST.md` (`14/14` tiêu chí đạt), hiệu năng `docs/PB39_PERFORMANCE_CHECKLIST.md` (`GET /api/v1/learning-data`: 51 → 1 request, Dashboard data p95 = `27.94ms` với 40 môn) và bộ Playwright E2E `e2e/test_main_flow.py`.

---

## 4. Phương Án Dự Phòng Khi Có Sự Cố (Fallback Plan)

> **Nguyên tắc điều phối:** Khi xảy ra sự cố trên sân khấu, **Nhóm trưởng (Huỳnh Nhơn Nguyên Nghiệp)** là người duy nhất ra quyết định kích hoạt phương án dự phòng và thông báo ngắn gọn với hội đồng để không làm rối nhịp trình bày.

| # | Tình huống sự cố | Dấu hiệu nhận biết | Phương án xử lý ngay (< 60 giây) | Người ra lệnh / Thực thi |
| :-: | :--- | :--- | :--- | :--- |
| 1 | **Mất mạng Wi-Fi phòng bảo vệ** | Trình duyệt không tải được Production / timeout | 1) Kích hoạt **Hotspot 4G/5G** dự phòng.<br>2) Nếu mạng vẫn yếu: bấm `Ctrl+3` chuyển sang tab **Local Docker Compose (`http://localhost:8080`)** chạy hoàn toàn offline. | **Nghiệp (ra lệnh)** · Huy (mạng) · Nguyên (chuyển tab) |
| 2 | **Server Production bị ngủ / lỗi 502–503** | `GET /api/v1/health` quá 5 giây hoặc trả `503` | Chuyển thẳng sang môi trường **Local Docker Compose** đã khởi động & đăng nhập sẵn từ đầu giờ. Nhóm trưởng thông báo lịch sự với hội đồng để giữ mạch trình bày. | **Nghiệp (dẫn lời)** · Nguyên (chuyển tab Local) |
| 3 | **Dữ liệu demo bị sửa hỏng / xóa nhầm giữa buổi** | Số liệu Dashboard/Môn học bị lệch hoặc mất học kỳ mẫu | Chạy 1 lệnh reset tức thời:<br>`docker compose exec backend python -m scripts.reset_demo_data`<br>(hoặc khôi phục file `backups/demo_db_backup_v1.0.0.sql`) rồi bấm `F5`. Thời gian khôi phục: **~3 giây**. | **Nghiệp (ra lệnh)** · Trung (thực thi lệnh) |
| 4 | **Máy demo chính đơ / không nhận cổng máy chiếu** | Màn hình đen hoặc không xuất HDMI | Rút cáp cắm sang **Laptop dự phòng** (đã mở sẵn Slide PDF + Docker Compose + tài khoản demo đăng nhập sẵn). | **Nghiệp (dẫn lời)** · Trung (đưa máy dự phòng) |
| 5 | **Cả Production & Docker gặp sự cố đồng thời** | Không chạy được server trực tiếp | Bật **Video demo dự phòng Full HD (`demo_backup_v1.0.0.mp4`)** lưu sẵn trên Desktop cả 2 máy và thuyết minh đồng bộ theo từng cảnh. | **Nghiệp (điều phối)** · Nguyên (mở video) |

---

## 5. Quy Trình Gắn Tag Phát Hành `v1.0.0`

Sau khi Nhóm trưởng nghiệm thu đủ toàn bộ tiêu chí tổng duyệt lần 2 (`PB-61`) và nhận xác nhận từ 3 thành viên còn lại, tiến hành gắn **annotated tag `v1.0.0`** trên nhánh `main`:

```bash
git tag -a v1.0.0 -m "Release v1.0.0: Chot goi demo bao ve Nhom 11 (PB-45, PB-61)"
git push origin main
git push origin v1.0.0
```

> **Quy tắc khóa nhánh (Code Freeze):** Sau khi Nhóm trưởng duyệt gắn `v1.0.0`, **không merge thêm tính năng mới**, giữ nguyên mã nguồn ổn định cho ngày bảo vệ (`PB-62`).

---

## 6. Checklist Chuẩn Bị Ngày Bảo Vệ (6 Hạng Mục Bắt Buộc — PB-45)

| STT | Hạng mục | Tiêu chuẩn đạt | Phân công thực hiện | Nhóm trưởng nghiệm thu |
| :-: | :--- | :--- | :---: | :---: |
| 1 | **Laptop chính & Laptop dự phòng** | Cả 2 máy sạc đầy 100%, đã build sẵn Docker image (`docker compose up -d` chạy offline), đã nạp sẵn `demo.student01..03`, tắt thông báo Zalo/Messenger/Windows Update | Nguyên (máy chính) · Trung (máy dự phòng) | ⬜ Nghiệp kiểm tra tối trước bảo vệ |
| 2 | **Hotspot 4G/5G dự phòng** | Tối thiểu 2 điện thoại 2 nhà mạng khác nhau (Viettel + VNPT/Mobifone), còn dung lượng tốc độ cao, đã kết nối thử sẵn với cả 2 laptop | Huy & Nghiệp | ⬜ Nghiệp kiểm tra tối trước bảo vệ |
| 3 | **Cáp kết nối & Nguồn điện** | Cáp HDMI + đầu chuyển USB-C sang HDMI, sạc laptop chính + sạc dự phòng, chuột không dây + bút trình chiếu | Trung & Huy | ⬜ Nghiệp kiểm tra tối trước bảo vệ |
| 4 | **Slide thuyết trình bản PDF** | Đã xuất file `.pdf` (tránh vỡ font PowerPoint/Canva), lưu bản offline trên cả 2 laptop + 1 USB + Google Drive | Nguyên & Nghiệp | ⬜ Nghiệp duyệt bản cuối |
| 5 | **Video demo dự phòng** | Quay màn hình 1080p sắc nét, không tạp âm, dài 3–5 phút đi đủ 6 chặng luồng chính, lưu sẵn `demo_backup_v1.0.0.mp4` trên Desktop cả 2 laptop + USB | Nghiệp & Nguyên | ⬜ Nghiệp kiểm tra đủ 6 chặng |
| 6 | **Gói dữ liệu & công cụ kỹ thuật** | Có sẵn `backups/demo_db_backup_v1.0.0.sql`, `demo_import_valid.csv`, `demo_import_invalid.csv`, script `reset_demo_data.py` & `check_demo_health.py` đã kiểm chứng PASS 100% | Nghiệp (đóng gói) · Trung/Huy (phối hợp) | ✅ Đã hoàn tất & nghiệm thu trong repo |

---

### Xác nhận chốt gói của Nhóm trưởng
- **Nhóm trưởng:** Huỳnh Nhơn Nguyên Nghiệp (`N25DTCN038`)
- **Trạng thái kỹ thuật nội bộ:** Đạt `111/111` auto test + `10/10` live HTTP smoke test + backup SQL (`0007_audit_logs`) khôi phục sạch 100%.
- **Điều kiện mở khóa gắn tag `v1.0.0` lên remote:** Hoàn tất điền link Production (Huy), xác nhận Docker Compose máy thứ hai (Trung) và đủ 6/6 hạng mục checklist vật lý.
