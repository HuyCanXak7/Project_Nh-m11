# PB-62 · Runbook Ngày Bảo Vệ: Kiểm Tra Đầu Ngày & Trình Bày

- **Dự án:** Hệ thống Quản lý Chỉ số Học tập Sinh viên — **StudyLIMS (Nhóm 11)**
- **Mã Backlog:** `PB-62` | **Mức độ:** Must (Enabler) · NFR-Demo
- **Điều hành ngày bảo vệ:** **Huỳnh Nhơn Nguyên Nghiệp (`N25DTCN038`) — Nhóm trưởng**
- **Phiên bản chạy bảo vệ:** Tag `v1.0.0` (chốt tại PB-45 & PB-61)
- **Tài liệu liên quan:** `docs/demo/PB45_GOI_DEMO_VA_PHUONG_AN_DU_PHONG.md` · `docs/demo/PB61_TONG_DUYET_LAN_2_VA_CHOT_PHAN_VAI.md`

> ### ⚠️ LỆNH ĐÓNG BĂNG CỦA NHÓM TRƯỞNG TRONG NGÀY BẢO VỆ
> **TUYỆT ĐỐI KHÔNG SỬA CODE, KHÔNG MERGE PR, KHÔNG CÀI LẠI DEPENDENCY TRONG NGÀY NÀY.**
> Mọi sự cố xảy ra chỉ được xử lý theo hiệu lệnh của **Nhóm trưởng** bằng đúng 3 phương án dự phòng đã chốt: **Chuyển Local Docker (`Ctrl+3`)**, **Reset DB / Restore Backup SQL**, hoặc **Phát Video Demo Dự Phòng**.

---

## 1. Checklist Kiểm Tra Đầu Ngày (Nhóm Trưởng Điều Phối Từ T − 60 Phút)

| Mốc giờ | Hạng mục kiểm tra | Lệnh / Thao tác cụ thể | Người thực hiện | Nhóm trưởng duyệt |
| :---: | :--- | :--- | :---: | :---: |
| **T − 60 phút** | **Phần cứng, nguồn điện & cáp** | - Cắm sạc laptop chính & laptop dự phòng (pin ≥ 90%).<br>- Thử cắm trực tiếp cáp HDMI / đầu chuyển USB-C sang HDMI vào máy chiếu phòng bảo vệ.<br>- Kiểm tra USB dự phòng chứa Slide PDF + Video MP4 + file CSV mẫu. | Trung & Nguyên | ⬜ Nghiệp ký nhận |
| **T − 50 phút** | **Mạng chính & Hotspot 4G/5G** | - Kết nối Wi-Fi phòng bảo vệ, đo ping ổn định.<br>- Bật sẵn Hotspot 4G/5G trên 2 điện thoại (2 nhà mạng khác nhau), đã lưu mật khẩu trên cả 2 laptop để đổi mạng trong 5 giây. | Huy & Nghiệp | ⬜ Nghiệp ký nhận |
| **T − 45 phút** | **Gọi Healthcheck Production** | Chạy lệnh kiểm tra & làm ấm Production:<br>`python backend/scripts/check_demo_health.py --base-url https://<PRODUCTION-DOMAIN> --demo-email demo.student01@example.com --demo-password <PROD_DEMO_PASS> --retry 12 --interval 5`<br>Xác nhận `/api/v1/health` trả **`200 OK`**, `database: ok`, độ trễ `< 500ms`. | Huy *(báo cáo kết quả cho Nghiệp)* | ⬜ Nghiệp ký nhận |
| **T − 35 phút** | **Khởi động sẵn dự phòng Local Docker** | Trên laptop chính & dự phòng:<br>`docker compose up -d`<br>`docker compose ps` *(đảm bảo `db` & `backend` = `healthy`, `frontend` = `running`)*<br>`python backend/scripts/check_demo_health.py --base-url http://localhost:8000 --frontend-url http://localhost:8080 --demo-email demo.student01@example.com --demo-password <LOCAL_DEMO_PASS>` | Trung *(báo cáo kết quả cho Nghiệp)* | ⬜ Nghiệp ký nhận |
| **T − 25 phút** | **Chốt dữ liệu demo sạch (PB-59)** | Nếu dữ liệu demo chưa về trạng thái sạch ban đầu:<br>`docker compose exec backend python -m scripts.reset_demo_data`<br>Xác nhận in ra: `Đã reset dữ liệu demo: 3 sinh viên, 8 học kỳ, 40 lượt môn`. | Trung | ⬜ Nghiệp ký nhận |
| **T − 15 phút** | **Đăng nhập sẵn & Dọn màn hình trình chiếu** | - Tắt toàn bộ thông báo Zalo, Messenger, Email, bật **Do Not Disturb** của Windows.<br>- Đặt mức zoom trình duyệt **110% – 125%** để hội đồng đọc rõ chữ & bảng điểm.<br>- Mở sẵn đúng **4 Tab trình duyệt** (mục 2), mở sẵn **Slide PDF** toàn màn hình & để sẵn thư mục chứa `demo_import_invalid.csv`, `demo_import_valid.csv` ngoài Desktop. | Nguyên *(Operator)* & Nghiệp | ⬜ Nghiệp ký nhận |
| **T − 05 phút** | **Hội ý nhanh & vào vị trí** | Chốt đội hình: **Nghiệp** đứng vị trí trung tâm mở đầu & điều phối, **Nguyên** ngồi cố định cạnh laptop chính, **Huy** giữ đồng hồ 11 phút & slide, **Trung** giữ laptop dự phòng sẵn lệnh reset. | Cả nhóm *(Nghiệp chủ trì)* | ⬜ Sẵn sàng |

---

## 2. Cấu Trúc 4 Tab Trình Duyệt Mở Sẵn Trên Máy Chính

| Tab | Nội dung mở sẵn | Mục đích trong kịch bản |
| :-: | :--- | :--- |
| **Tab 1** | **Dashboard (`pages/dashboard.html`)** — đã đăng nhập sẵn `demo.student01@example.com` (Production hoặc Local) | Bắt đầu chặng 2 ngay lập tức không mất thời gian nhập mật khẩu |
| **Tab 2** | **Swagger UI (`/docs`)** & **Healthcheck (`/api/v1/health`)** | Phục vụ chặng 5 chứng minh API thật, response JSON chuẩn & kiểm tra sức khỏe |
| **Tab 3** | **Local Docker Fallback (`http://localhost:8080/pages/dashboard.html`)** — đã đăng nhập sẵn `demo.student01@example.com` | Chuyển đổi dự phòng trong **1 giây (`Ctrl+3`)** khi mạng hoặc Production trục trặc |
| **Tab 4** | **Cửa sổ Ẩn danh (Incognito)** mở màn hình Đăng nhập (`index.html`) | Dùng biểu diễn đăng nhập sai (`401` lỗi chung) hoặc đăng ký/đăng nhập trực tiếp nếu hội đồng yêu cầu |

---

## 3. Trình Tự Trình Bày Theo Kịch Bản (11 Phút — Đồng Bộ PB-61)

1. **`00:00 – 01:30` — Nghiệp (Nhóm trưởng):** Chào hội đồng, giới thiệu nhóm & phân công, bài toán StudyLIMS, kiến trúc 3 tầng và 4 thế mạnh nổi bật trên Slide PDF. Giới thiệu chuyển sang phần demo trực tiếp.
2. **`01:30 – 03:30` — Nguyên (vừa nói vừa thao tác trên Tab 1):**
   - Giới thiệu 4 thẻ KPI, biểu đồ GPA từng kỳ và thanh cảnh báo học tập (PB-31).
   - Bật **Dark Mode** trên topbar cho thấy hiệu ứng mặt trời/màn sao & lưu `localStorage`.
   - Bấm **`Ctrl+K`** tìm nhanh không dấu `lap trinh` → nhảy thẳng tới môn `INT1001`.
3. **`03:30 – 06:30` — Nghiệp (Nhóm trưởng thuyết trình · Nguyên thao tác theo nhịp hoặc Nghiệp thao tác trực tiếp):**
   - Mở **Học kỳ (`03`)**: bấm `Xóa` trên 1 học kỳ để hội đồng thấy hộp cảnh báo **Cascade Delete** đếm chính xác số môn & đầu điểm sẽ mất → bấm `Hủy`.
   - Mở **Môn học (`02`)**: bấm `100%` thử chỉnh tổng trọng số ≠ 100% (nút Lưu tự khóa) → nhập sửa điểm môn rớt `INT1001` từ `3.9` (F) lên `8.5` (A) → chỉ GPA cập nhật tức thì & cảnh báo học tập biến mất.
   - Mở **Nhập điểm (`06`)**: kéo thả `demo_import_invalid.csv` → chỉ dòng 3 tô đỏ lỗi `score = 11` → chọn `demo_import_valid.csv` → chỉ badge `+ Môn mới` → bấm **Xác nhận lưu**.
   - Mở **Bảng điểm (`07`)**: chỉ GPA tích lũy, tín chỉ đạt & nhãn môn học lại → bấm **Xuất Excel (`.xlsx`)** → bấm **In A4 (`Ctrl+P`)**.
4. **`06:30 – 08:15` — Nguyên:**
   - Mở **Mục tiêu (`05`)**: nhập GPA `4.0` xem cảnh báo *"MỤC TIÊU KHÔNG KHẢ THI"* → chỉnh `3.5` xem điểm cần đạt → gõ điểm giả định bảng **What-If** thấy GPA nhảy tức thời mà không đổi DB thật.
   - Mở nhanh **Thống kê (`04`)** & màn hình **Admin** (tìm kiếm/khóa tài khoản, thang điểm).
5. **`08:15 – 10:15` — Huy (45s) → Trung (1p15s) (trên Tab 2):**
   - **Huy:** mở `/api/v1/health` (`200 OK`) & Swagger `/docs`, nêu nhanh bảo mật JWT + Stateful Session & triển khai.
   - **Trung:** nêu nhanh Owner Isolation chống IDOR (`404`), tối ưu hiệu năng `GET /learning-data` (51 → 1 request, p95 `27.94ms`), 1 lệnh `docker compose up --build` và kết quả `111/111` test tự động PASS (`tests/TEST_REPORT.md`).
6. **`10:15 – 11:00` — Nghiệp (Nhóm trưởng):** Chốt đánh giá hạn chế, lộ trình Phase 2, cảm ơn hội đồng và **đứng điều phối phiên hỏi đáp Q&A** theo ma trận đã chốt ở PB-61.

---

## 4. Cây Quyết Định Xử Lý Sự Cố Tại Phòng Bảo Vệ (Nhóm Trưởng Điều Hành)

```text
Sự cố xảy ra trong lúc demo? -> Nhóm trưởng (Nghiệp) ra hiệu lệnh & dẫn lời:
├── 1. Production quay vòng > 5 giây / lỗi 502 / 503 / mất Wi-Fi
│   └──▶ Nguyên bấm Ctrl+3 sang Tab 3 (Local Docker http://localhost:8080) ngay lập tức.
│        Nghiệp nói: "Do mạng hội trường không ổn định, em xin phép chuyển sang bản Docker
│                     cục bộ cùng phiên bản v1.0.0 để đảm bảo thời lượng trình bày của nhóm ạ."
│
├── 2. Dữ liệu demo bị sửa lỗi / xóa nhầm / import trùng lặp
│   └──▶ Trung chạy ngay 1 lệnh (~3 giây):
│        docker compose exec backend python -m scripts.reset_demo_data
│        (Hoặc restore backups/demo_db_backup_v1.0.0.sql) → Nguyên bấm F5.
│
├── 3. Laptop chính treo / mất tín hiệu HDMI
│   └──▶ Trung đưa Laptop dự phòng (đã mở sẵn Slide PDF + Local Docker) cắm cáp HDMI thay thế.
│
└── 4. Cả Production và Local Docker đều không phản hồi
    └──▶ Nguyên mở Video dự phòng `demo_backup_v1.0.0.mp4` trên Desktop; cả nhóm thuyết minh trực tiếp.
```

---

## 5. Ký Xác Nhận Hoàn Tất Ngày Bảo Vệ (Sign-off)

| Vai trò | Thành viên | Đã kiểm tra đầu ngày | Ghi chú thực tế buổi bảo vệ |
| :--- | :--- | :---: | :--- |
| **Nhóm trưởng · Điều hành & Q&A** | **Huỳnh Nhơn Nguyên Nghiệp (`N25DTCN038`)** | ⬜ | |
| Operator cầm máy chính · FE | Vũ Cao Nguyên | ⬜ | |
| Kỹ thuật Production · Timekeeper · BE | Nguyễn Hoàng Đức Huy | ⬜ | |
| Máy dự phòng · Reset DB · BE | Nguyễn Minh Trung | ⬜ | |
