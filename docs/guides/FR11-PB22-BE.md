# FR-11 · PB-22 · Backend mục tiêu GPA

Người thực hiện BE: Nguyễn Hoàng Đức Huy. FE tích hợp: Vũ Cao Nguyên. Hợp đồng nằm trong `docs/api/openapi.json`, Swagger UI `/docs`.

## Chạy và tích hợp

Backend dùng migration `0006_gpa_goals` trên nền `0005_grade_scale`. Chạy từ gốc repo:

```powershell
docker compose up -d --build
```

Compose tự chạy `alembic upgrade head` trước khi mở API. Nếu chạy Uvicorn trực tiếp, đặt `DATABASE_URL` và `SECRET_KEY` hoặc cấu hình `backend/.env`, chạy `python -m alembic upgrade head` rồi `python -m uvicorn app.main:app` từ thư mục backend.

Đăng nhập `POST /api/v1/auth/login`, lấy `data.accessToken`, gửi header `Authorization: Bearer <accessToken>` cho cả bốn thao tác:

| Method | URL | Kết quả |
|---|---|---|
| POST | `/api/v1/goals` | 201, tạo mục tiêu; 409 `GOAL_EXISTS` nếu đã có |
| GET | `/api/v1/goals` | 200, đọc mục tiêu của chính tài khoản; chưa có trả 404 |
| PUT | `/api/v1/goals` | 200, thay toàn bộ ba trường, giữ ID; chưa có trả 404 |
| DELETE | `/api/v1/goals` | 200, `data=null`; chưa có/đã xóa trả 404 |

POST và PUT dùng cùng body, JSON camelCase như Swagger đã bàn giao:

```json
{
  "targetGpa": 3.5,
  "targetDate": "2027-06-30",
  "remainingCredits": 30
}
```

Thành công tạo/xem/sửa trả trong khung response chung:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Tạo mục tiêu GPA thành công.",
  "data": {
    "id": 7,
    "targetGpa": 3.5,
    "targetDate": "2027-06-30",
    "remainingCredits": 30
  },
  "error": null,
  "timestamp": "2026-11-17T02:00:00+00:00",
  "path": "/api/v1/goals"
}
```

Đây là ví dụ định dạng; ID, timestamp và ngày mẫu cần thay theo dữ liệu thực tế.

## Validation và quyền truy cập

- `targetGpa`: số JSON hữu hạn trong 0–4, nhận cả hai biên. Không tự làm tròn. Từ chối chuỗi, bool, null, NaN/Infinity.
- `targetDate`: chuỗi ngày hợp lệ chính xác `YYYY-MM-DD`; hôm nay được phép, ngày trước hôm nay bị từ chối. Ngày hiện tại tính theo Việt Nam UTC+7, nhất quán dù server đặt UTC. Không nhận timestamp/epoch.
- `remainingCredits`: số nguyên JSON 1–2147483647 (giới hạn INTEGER DB). Không nhận số thập phân, chuỗi hoặc bool.
- Cả ba trường bắt buộc trên POST/PUT; không nhận trường thừa như `userId`, `user_id`, `id`.
- Validation sai: 400 `VALIDATION_ERROR`, `error.details[{field,reason}]`; không thay đổi mục tiêu đã lưu.
- Chưa đăng nhập/token lỗi: 401. Tài khoản bị khóa: 403 `ACCOUNT_LOCKED`.
- Chưa có mục tiêu: 404 `NOT_FOUND`. FE hiển thị form tạo; PUT không tự tạo mới.
- Tạo trùng: 409 `GOAL_EXISTS`, message hướng dẫn dùng `PUT /api/v1/goals`; mục tiêu cũ được giữ nguyên.
- Owner luôn lấy từ token; mỗi người có một mục tiêu riêng. Unique constraint `uq_goals_user_id` bảo vệ cả trường hợp POST đồng thời; lỗi unique được rollback và chuyển thành 409.
- Mục tiêu đã qua ngày vẫn được GET/xóa; khi sửa phải chọn ngày từ hôm nay trở đi. Sau xóa có thể tạo lại.
- GET `/goals/required-score` vẫn là hợp đồng cho chức năng tính điểm cần đạt riêng; FR-11/PB-22 triển khai CRUD.

## Kiểm chứng

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m pytest tests/test_goals.py tests/test_contract.py -v
..\.venv\Scripts\python.exe -m pytest tests -v
Set-Location ..
.\.venv\Scripts\python.exe -m ruff check backend
.\.venv\Scripts\python.exe -m openapi_spec_validator docs/api/openapi.json
```

Pytest dùng DB SQLite tạm, chạy migration đến head. CI chạy thêm các test Goals trên MySQL 8 riêng; không dùng DB staging/production cho kiểm thử. Các ca gồm CRUD/xóa-tạo lại, thiếu mục tiêu, giới hạn dữ liệu, ngày hôm nay/quá khứ/UTC+7, quyền sở hữu, tài khoản khóa, ràng buộc unique DB và chuyển lỗi khi hai POST cùng vượt kiểm tra ban đầu.

Kết quả local: toàn bộ 101 test BE đã qua, Ruff và OpenAPI validator đã qua. Log tại `docs/evidence/PB22-backend-tests.txt`.

FE Nguyên nối bốn endpoint trên, unwrap `data`, hiển thị validation và chuyển từ tạo sang sửa khi nhận 409. PR cần một thành viên khác review trước khi merge develop theo quy tắc hiện có.
