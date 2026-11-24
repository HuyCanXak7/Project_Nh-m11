# PB-39 / T0694F7 – Tối ưu hiệu năng Dashboard và API

## 1. Chỉ tiêu nghiệm thu (README mục 6)

- API phản hồi dưới **500 ms ở p95** với dữ liệu **40 môn/người dùng**.
- Dashboard tải xong dưới **2 giây**.

## 2. Nguyên nhân gây chậm

`frontend/assets/js/storageService.js` cũ tải dữ liệu theo kiểu fan-out:

1. `GET /semesters` (1 request)
2. `GET /grade-scale` (1 request)
3. `GET /semesters/{id}/courses` cho từng học kỳ (8 request)
4. `GET /courses/{id}/grade-components` cho từng môn (40 request)
5. Dashboard gọi thêm `GET /gpa/cumulative` (1 request)

Tổng cộng **51 request** cho một lần mở Dashboard. Mỗi request lại đi qua
dependency xác thực và mở session/DB riêng, nên chi phí tăng tuyến tính theo số
môn và tạo thời gian chờ không cần thiết.

## 3. Thay đổi đã triển khai

- Thêm `GET /api/v1/learning-data`:
  - trả học kỳ, môn học, thành phần điểm, bảng quy đổi và GPA tích lũy trong
    **một response**;
  - dùng `selectinload(Semester.courses).selectinload(Course.grade_components)`
    nên số truy vấn **không tăng theo số môn**;
  - tính GPA trực tiếp trên dữ liệu vừa eager-load, không query lại bảng `courses`.
- `StorageService.load()` chuyển sang gọi endpoint tổng hợp và cache GPA.
- `dashboard.js` dùng GPA trong cache bootstrap, bỏ request `/gpa/cumulative`
  khi mở Dashboard.
- Tách `summarize_cumulative_gpa()` và `serialize_grade_scale()` để tái sử dụng
  đúng logic cũ, không thay đổi công thức GPA/quy đổi điểm.
- Giữ nguyên toàn bộ endpoint CRUD cũ để không phá vỡ các trang khác.

## 4. Kết quả đo thực tế

Môi trường: Windows, Python 3.14.6, FastAPI 0.162.4, SQLAlchemy 2.0.57,
MySQL local, Uvicorn 1 worker.

Dữ liệu: **8 học kỳ / 40 môn / 120 thành phần điểm**, mỗi môn đủ điểm.
Cách đo: 3 lượt warm-up, 20 lượt đo, mỗi request dùng kết nối HTTP mới
(conservative hơn browser keep-alive); p95 theo nearest-rank.

| Chỉ số | Trước tối ưu | Sau tối ưu |
|---|---:|---:|
| Request mỗi lần mở Dashboard | 51 | **1** |
| Số SELECT cho toàn bộ dữ liệu | tăng theo số môn | **7** (cố định) |
| Dashboard data load p50 | 223,17 ms | **10,38 ms** |
| Dashboard data load p95 | 271,41 ms | **27,94 ms** |
| Dashboard data load p99 | 289,66 ms | 28,09 ms |

API p95 trong 1.020 request của luồng cũ: **36,59 ms**. Endpoint mới:

| Endpoint | p50 | p95 | p99 | Max |
|---|---:|---:|---:|---:|
| `GET /learning-data` | 10,34 ms | **27,86 ms** | 28,05 ms | 28,05 ms |
| `GET /semesters` | 4,41 ms | 25,66 ms | 31,27 ms | 31,27 ms |
| `GET /semesters/{id}/courses` | 20,48 ms | 37,35 ms | 60,23 ms | 66,48 ms |
| `GET /courses/{id}/grade-components` | 23,97 ms | 36,61 ms | 52,07 ms | 77,32 ms |
| `GET /gpa/cumulative` | 4,89 ms | 17,11 ms | 18,57 ms | 18,57 ms |
| `GET /grade-scale` | 3,48 ms | 15,63 ms | 15,84 ms | 15,84 ms |

Kết luận: **API p95 < 500 ms** và **thời gian tải dữ liệu Dashboard p95
< 2 giây** (27,94 ms, còn dư lớn cho render phía trình duyệt). So với luồng cũ,
thời gian tải dữ liệu Dashboard giảm khoảng **9,7 lần** ở p95.

Dữ liệu thô: `docs/pb39_benchmark_raw.json`.

## 5. Kiểm thử hồi quy

- `backend/tests/test_learning_data_api.py`
  - yêu cầu đăng nhập (401);
  - trả đủ 40 môn/120 thành phần/8 học kỳ;
  - GPA tích lũy đúng và không lẫn dữ liệu user khác;
  - đếm SELECT: **đúng 7** với 40 môn, chặn N+1 nếu code thay đổi.
- Toàn bộ backend suite: **92 passed**.

## 6. Cách chạy lại

```powershell
# Terminal 1
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2
cd backend
$env:PERF_USER_EMAIL = "perf.student@example.com"
$env:PERF_USER_PASSWORD = "<mật khẩu perf>"
.\.venv\Scripts\python.exe scripts\benchmark_dashboard.py --iterations 20 --keep-data `
  --json-out ..\docs\pb39_benchmark_raw.json
```

Nếu chưa có tài khoản perf, bỏ `PERF_USER_PASSWORD`; script tự đăng ký và in
mật khẩu một lần. Bỏ `--keep-data` để script tự xóa dữ liệu đo sau khi chạy.

## 7. Ghi chú

- Không cần migration/index mới: các khóa ngoại `semesters.user_id`,
  `courses.semester_id`, `grade_components.course_id` đã có index.
- Không thêm dependency hay cache Redis; endpoint dùng đúng SQLAlchemy session
  hiện có và không lưu dữ liệu người dùng ra ngoài DB.
- Phép đo "Dashboard data load" đo thời gian lấy và parse payload bootstrap,
  chưa gồm first paint. Với p95 27,94 ms, ngân sách còn lại cho render là rất lớn
  so với mốc 2 giây; khi có môi trường browser CI có thể bổ sung E2E first-paint.
