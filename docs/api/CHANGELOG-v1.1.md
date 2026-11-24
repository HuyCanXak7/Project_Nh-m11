# Hợp đồng API v1.1 · PB-51 · T0694D7

Ngày chuẩn bị: 17/11/2026 (Asia/Saigon). Người phụ trách BE: Nguyễn Hoàng Đức Huy.

File nộp: `docs/api/openapi.json` (OpenAPI 3.0, `info.version=1.1.0`).
Bản v1 được giữ tại `docs/api/openapi-v1.json` để so sánh. Swagger UI: `/docs`; tải hợp đồng được phục vụ tại `/openapi.json`.

Hợp đồng và changelog đã xuất bản trong [PR #22](https://github.com/HuyCanXak7/Project_Nh-m11/pull/22) để nhóm review trước tích hợp. Chưa có approval/xác nhận chốt của thành viên khác.

## Thay đổi so với v1

Đối chiếu bản dự thảo v1 với mã ORM đã merge trên main; bổ sung các endpoint sau, tiền tố chung `/api/v1`:

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
- Giữ nguyên grade-scale công khai hiện có của nhóm (PB-17), đọc từ DB sau migration `0005_grade_scale`: `data` là mảng `{id,minScore,maxScore,letter,gpa4}`, không cần Bearer token. FE không hard-code mốc quy đổi. Các endpoint thống kê cá nhân vẫn bắt buộc token.
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
..\.venv\Scripts\python.exe -m pytest tests/test_contract.py tests/test_statistics.py -v
```

Trước khi nối FE: nhóm review file và changelog, xác nhận trong PR, merge theo quy trình. Sau khi chốt, thay đổi payload cần cập nhật hợp đồng và thông báo nhóm trước khi tích hợp.

## Chênh lệch dự thảo v1 với API đã merge trên main

v1 cũ là dự thảo, không phản ánh đầy đủ các PR của nhóm sau đó. v1.1 lấy request từ Pydantic/router hiện hành, giữ nguyên hành vi BE. Các khác biệt dưới đây cần FE review trước khi nối:

- Auth register nhận `full_name`; học kỳ dùng `academic_year`, `start_date`, `end_date`; Course dùng `semester_id`, `is_retake`, category `GENERAL/FOUNDATION/SPECIALIZED`. Thông tin user trong `/auth/me` và các API thống kê mới vẫn dùng camelCase như schema mô tả. Không áp dụng một phép đổi casing chung cho mọi endpoint.
- Tham số URL hiện dùng `{semester_id}`, `{course_id}`, `{component_id}`. Đây chỉ là tên tham số trong tài liệu; URL số ID tương đương.
- Cấu hình điểm dùng `/courses/{course_id}/grade-components` (GET/POST), `/grade-components/{component_id}` (PUT/DELETE), `/courses/{course_id}/grade-components/complete` (POST) và `/courses/{course_id}/scores` (PUT với `scores[{component_id,score}]`). Bỏ các path dự thảo `/components`, `/components/.../score` và `/courses/.../grade` chưa tồn tại. Điểm môn/quy đổi trả kèm cấu hình điểm.
- Preview xóa môn dùng `/courses/{course_id}/deletion-preview`, trường `gradeComponentsToDelete`. Không quảng bá endpoint preview học kỳ chưa có BE. Xóa trả `deletedCourses`/`deletedGradeComponents` theo tài nguyên.
- GET `/grade-scale` là cấu hình công khai và trả mảng trực tiếp trong `data`. Giữ nguyên API PB-17 đã merge; không thêm endpoint trùng hoặc migration thang điểm thứ hai.
- Request import mới dùng category enum và cấu trúc semester hiện hành. Goals/import/Admin vẫn được đánh dấu contract-only cho người phụ trách triển khai; không coi chúng đã có BE chỉ vì xuất hiện trong Swagger.

Các khác biệt so với dự thảo v1 ở trên đã được liệt kê để nhóm thống nhất; không tuyên bố tương thích payload v1 chưa từng chốt/triển khai đầy đủ.

## Bổ sung triển khai FR-11 / PB-22

POST/GET/PUT/DELETE `/goals` đã chuyển thành `x-implementation=implemented`; request vẫn giữ `targetGpa`, `targetDate`, `remainingCredits`. Swagger đồng bộ request với model đang chạy, bổ sung giới hạn số nguyên tín chỉ và mô tả ngày theo UTC+7. POST tạo trùng trả 409 `GOAL_EXISTS` và hướng dẫn dùng PUT; DB unique theo user bảo vệ request đồng thời. Chưa có mục tiêu trả 404; DELETE thành công trả 200 với data=null. Hướng dẫn tích hợp: `docs/guides/FR11-PB22-BE.md`. `/goals/required-score` giữ trạng thái contract-only cho chức năng riêng.

## Bổ sung triển khai FR-18 / PB-33 · T0694F2

`GET /api/v1/admin/statistics` chỉ cho ADMIN. Response chỉ có `totalUsers`, `totalCourses` và `averageGpa4`; không trả dữ liệu nhận diện cá nhân. GPA trung bình là trung bình cộng GPA tích lũy theo từng sinh viên có môn đủ điểm, áp dụng quy tắc học lại lấy điểm cao nhất theo mã môn; nếu chưa có GPA, trả `null`.
