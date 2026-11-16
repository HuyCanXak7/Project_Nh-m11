# Hợp đồng API v1.1 · PB-51 · T0694D7

Ngày chuẩn bị: 17/11/2026 (Asia/Saigon). Người phụ trách BE: Nguyễn Hoàng Đức Huy.

File nộp: `docs/api/openapi.json` (OpenAPI 3.0, `info.version=1.1.0`).
Bản v1 được giữ tại `docs/api/openapi-v1.json` để so sánh. Swagger UI: `/docs`; tải hợp đồng được phục vụ tại `/openapi.json`.

## Thay đổi so với v1

Giữ các endpoint v1; bổ sung các endpoint sau, tiền tố chung `/api/v1`:

| Method | Path | Mục đích | Trạng thái BE trong thay đổi này |
|---|---|---|---|
| GET | `/statistics/summary` | GPA, tín chỉ tính GPA/tín chỉ đạt, xếp loại, số môn | Đã triển khai |
| GET | `/statistics/semesters` | GPA từng kỳ và GPA tích lũy sau mỗi kỳ | Đã triển khai |
| GET | `/statistics/distribution` | Số lần học theo điểm chữ | Đã triển khai |
| GET | `/statistics/dashboard` | Gộp ba nhóm thống kê trong một request | Đã triển khai |
| GET | `/grade-scale` | FE đọc bảng quy đổi từ DB | Đã triển khai |
| GET | `/goals/required-score` | Tính điểm cần đạt từ mục tiêu đã lưu | Hợp đồng cho task triển khai Goals |
| POST | `/import/grades` | Lưu hàng loạt, validation lại, transaction toàn bộ | Hợp đồng cho task triển khai Import |
| GET | `/admin/users` | Tìm/lọc/phân trang tài khoản | Hợp đồng cho task triển khai Admin |
| PATCH | `/admin/users/{userId}/status` | Khóa/mở, thu hồi phiên, ghi audit | Hợp đồng cho task triển khai Admin |
| PUT | `/admin/grade-scale` | Thay bảng quy đổi, tính lại grade4 | Hợp đồng cho task triển khai Admin |
| GET | `/admin/statistics` | Thống kê toàn hệ thống | Hợp đồng cho task triển khai Admin |
| GET | `/admin/audit-logs` | Lịch sử khóa/mở có phân trang | Hợp đồng cho task triển khai Admin |
| GET | `/auth/me` | Mô tả endpoint đã có trong backend | Đã triển khai |
| GET | `/health` | Kiểm tra BE và kết nối DB, 503 nếu DB lỗi | Đã triển khai |

Mỗi operation có `x-implementation=implemented` hoặc `contract-only`. Việc có hợp đồng không có nghĩa endpoint đã chạy. Swagger runtime dùng path đầy đủ `/api/v1/...`; file nộp dùng server `/api/v1` và path tương đối, tương đương về URL.

Mỗi endpoint bổ sung có schema response, mã lỗi, ví dụ; endpoint ghi có schema request. Không thêm endpoint What-if hoặc Export vì xử lý tại FE.

## Quy tắc FE/BE cần dùng chung

- Bearer token quyết định owner. API thống kê không nhận userId để chọn tài khoản.
- GPA kỳ giữ mọi lần học đã đủ điểm trong kỳ. GPA tích lũy lấy điểm cao nhất theo mã môn trim + uppercase; bằng hệ 4 thì so hệ 10, bằng cả hai thì giữ ID nhỏ nhất.
- Môn F tham gia GPA nhưng không tăng `passedCredits`. `includedCredits` là tín chỉ tính GPA, khác tín chỉ đạt.
- GPA làm tròn HALF_UP 2 chữ số trước xếp loại. `average10` là trung bình có trọng số của điểm hệ 10 thật, không lấy GPA nhân 2.5.
- `totalCourses` là số lần học; `completedCourses` và `passedCourses` trong summary đã gộp học lại. Phân bố điểm chữ đếm mọi lần học đã đủ điểm (`ALL_COMPLETED_ATTEMPTS`) để khớp danh sách môn.
- Kỳ sắp theo ngày bắt đầu rồi ID tăng dần. `cumulativeGpa4` chỉ tính các kỳ đã đi qua trong thứ tự này.
- Rỗng: GPA/điểm trung bình/xếp loại là null; các bộ đếm bằng 0, danh sách kỳ rỗng. GPA 0.00 có nghĩa đã có điểm và toàn bộ là F, không phải rỗng.
- Grade scale đọc từ DB sau migration `0003_grade_scale`. FE không hard-code mốc quy đổi.
- Import dùng UPSERT (theo ghi chú cuối README v1): khóa theo owner, học kỳ, mã môn, tên thành phần; không chấp nhận hai dòng cùng khóa trong một request. Payload JSON tối đa 2 MiB, 1–1000 dòng; một transaction. CSV do FE đọc có giới hạn 2 MB. Kỳ mới cần thêm năm học/ngày bắt đầu/ngày kết thúc ở bước xác nhận vì CSV v1 chưa có các cột này.
- Lỗi có khung `{success,statusCode,message,data,error,timestamp,path}`; `error.details` chứa `{row,field,reason}` cho import. Bổ sung 413 `IMPORT_FILE_INVALID`, 503 `SERVICE_UNAVAILABLE` và 400 `GRADE_SCALE_INVALID` cho các trường hợp đã mô tả.

## Thông báo sẵn để gửi nhóm

> Huy đã chuẩn bị Swagger v1.1 cho PB-51/T0694D7 tại docs/api/openapi.json. Bổ sung thống kê summary/theo kỳ/phân bố, Dashboard gộp, required-score, grade-scale, import bulk và Admin; có request/response/lỗi. What-if và Export vẫn xử lý ở FE. FE đọc x-implementation trước khi nối; hiện thống kê, grade-scale và health đã có BE. Lưu ý phân bố đếm từng lần học, GPA tích lũy lấy lần điểm cao nhất; không dùng số mẫu khi dữ liệu rỗng hoặc API lỗi. Nhờ FE/BE review hợp đồng và ghi nhận chốt trước khi nối các API mới.

Thông báo trên là nội dung bàn giao chuẩn bị sẵn, **chưa gửi nhóm**. Chưa có bằng chứng FE/BE đã xác nhận chốt; không ghi nhận mốc lịch sử trước hạn 12/11 khi không có dữ liệu chứng minh.

## Kiểm tra và chốt

```powershell
.\.venv\Scripts\python.exe -X utf8 backend/scripts/update_contract_v11.py
.\.venv\Scripts\python.exe -m openapi_spec_validator docs/api/openapi.json
Set-Location backend
..\.venv\Scripts\python.exe -m unittest tests.test_contract tests.test_statistics -v
```

Trước khi nối FE: nhóm review file và changelog, xác nhận trong PR, merge theo quy trình. Sau khi chốt, thay đổi payload cần cập nhật hợp đồng và thông báo nhóm trước khi tích hợp.
