# Bàn giao BE Huy · T0694D7 / T0694DB / T0694DC / T0694DE

Phạm vi theo yêu cầu: phần BE của Huy. Không chuyển các task sang Done thay cho nhóm.

Kiểm tra local bản tích hợp main: 32 test BE, 6 test Node FE, 1 test liên kết FE đã qua; Ruff, ESLint và OpenAPI validator đã qua. Số đo 40 môn/50 request: p95 7.07 ms trên SQLite tạm với TestClient (xem JSON minh chứng). Docker/MySQL và deploy staging cần xác nhận bằng CI/host thật; máy local hiện không có Docker.

## API cho Dashboard và biểu đồ

Từ gốc repo: copy `.env.example` thành `.env` nếu chưa có, đặt `SECRET_KEY` ngẫu nhiên ít nhất 32 byte rồi chạy `docker compose up --build`. Backend chạy migration và Uvicorn `app.main:app`; FE ở http://localhost:8080, Swagger ở http://localhost:8000/docs. Đăng nhập bằng tài khoản seed thật qua `POST /api/v1/auth/login`, lấy `data.accessToken` để Authorize trong Swagger. Seed bằng `docker compose exec backend python -m scripts.seed_accounts` sau khi đặt hai biến SEED_* trong `.env`.

| Task | API / tài liệu | Minh chứng local |
|---|---|---|
| T0694D7 · PB-51 | `docs/api/openapi.json`, `docs/api/CHANGELOG-v1.1.md` | Test hợp đồng, schema và ví dụ request/response |
| T0694DB · PB-20 | `GET /api/v1/statistics/summary` hoặc `/statistics/dashboard` | GPA khớp API tích lũy; có null/zero, kiểm tra owner |
| T0694DC · PB-21 | `GET /api/v1/statistics/semesters`, `/statistics/distribution` | GPA từng kỳ khớp API kỳ, phân bố khớp số lần học, có kỳ rỗng |
| T0694DE · PB-43 | `.github/workflows/ci.yml`, `staging.yml`, `deploy/` | Lint/test local và cấu hình staging; cần chạy CI/deploy thực tế |

Dashboard gộp trả `{summary,semesters:{items},distribution:{items,totalCourses,countingPolicy}}` trong `data`. FE có thể lấy toàn bộ bằng một request. Endpoint lẻ có cùng dữ liệu tương ứng.

FE cần thực hiện loading trước request; thành công với `gpa4=null` thì hướng dẫn tạo học kỳ/nhập điểm; lỗi request thì hiển thị lỗi và nút thử lại. Không dùng `value || số_mẫu` vì GPA 0 hợp lệ. Dùng `passedCredits` cho tín chỉ đạt, `ranking` từ BE. Biểu đồ kỳ bỏ qua điểm null hoặc hiển thị chưa có điểm. Biểu đồ phân bố dùng `grade/count` từ API.

Giao diện hiện vẫn dùng dữ liệu mẫu/localStorage, phiên mock và URL auth cũ; **chưa đạt tiêu chí giao diện loading/rỗng/lỗi và tải Dashboard dưới 2 giây** chỉ nhờ thay đổi BE này. FE cần nối auth thật (`/api/v1`, unwrap `data`, gọi `/auth/me`, TTL `accessExpiresInSeconds`/`refreshExpiresInSeconds`) và các endpoint thống kê. Đây là phần tích hợp FE, không thuộc yêu cầu chỉ làm BE Huy.

## Tái tạo minh chứng

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m pytest tests -v
..\.venv\Scripts\python.exe -X utf8 -m scripts.verify_statistics > ../docs/evidence/BE-Huy-statistics.json
Set-Location ..
.\.venv\Scripts\python.exe -m ruff check backend
.\.venv\Scripts\python.exe -m openapi_spec_validator docs/api/openapi.json
python -m unittest discover -s frontend/tests -v
node --test frontend/tests/test_frontend.cjs
npx --yes --package eslint@9.39.1 eslint frontend/assets/js
```

Script dùng DB SQLite tạm riêng, chạy migration, tạo 40 môn, gọi API thật qua TestClient, xác nhận số liệu và đo 50 request Dashboard. Không dùng DB/tài khoản thật, không ghi token/mật khẩu vào kết quả. Số đo warm API local không chứng minh tải FE <2 giây hay hiệu năng staging/MySQL. PB-39 cần đo từ điều hướng đến render xong Dashboard trên trình duyệt với 40 môn, ghi thiết bị/mạng, cold/warm, thời điểm và kết quả.

Pytest đặt `DATABASE_URL` vào SQLite tạm trước khi import ứng dụng và migrate đến head; không dùng `.env` thật. Chỉ đặt `TEST_DATABASE_URL` khi cần MySQL thử nghiệm **riêng và trống** (CI tạo service tạm). Các test API của nhóm tạo tài khoản/dữ liệu; không dùng biến này với DB staging/production.

## Điều kiện còn lại để nộp đủ task

1. Nhóm xác nhận chốt Swagger v1.1 trước khi nối API và gửi thông báo changelog (mẫu có sẵn); không tự ghi là đã gửi.
2. FE tích hợp và xác minh loading/rỗng/lỗi, biểu đồ, số liệu và thời gian render theo PB-39.
3. Thiết lập host/URL staging, secrets/variables, `develop` và quy tắc review theo `staging.md`; chạy CI xanh, deploy và healthcheck thật.
4. Có ít nhất một thành viên review rồi merge PR; gắn link PR/run/URL staging làm minh chứng. Không tự approve PR thay thành viên khác.
