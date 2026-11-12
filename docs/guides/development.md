# Hướng dẫn phát triển

## Chạy với Docker

Chạy từ thư mục gốc `Project_Nh-m11`:

```powershell
Copy-Item .env.example .env
# Điền JWT_SECRET bằng chuỗi ngẫu nhiên ít nhất 32 byte.
docker compose up --build
```

- Frontend: http://localhost:8080
- Swagger UI: http://localhost:8000/docs
- MySQL: localhost:3306

Compose phục vụ thư mục `frontend/` bằng Nginx; backend tự chạy Alembic trước khi khởi động FastAPI. `.env` nằm ở thư mục gốc. Không ghi đè `.env` đã có khi chạy lại.

Giao diện vẫn sử dụng dữ liệu giả lập/localStorage như trước khi tổ chức lại thư mục. Tài khoản seed trong MySQL được kiểm tra qua Swagger UI.

Seed tài khoản sau khi điền `SEED_ADMIN_PASSWORD` và `SEED_STUDENT_PASSWORD` trong `.env`:

```powershell
docker compose exec backend python -m scripts.seed_accounts
```

## Chạy local không dùng Docker

Các lệnh sau dùng PowerShell, bắt đầu từ thư mục gốc. Yêu cầu Python 3.11 trở lên và MySQL đã chạy, đã tạo database/user.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m ensurepip --upgrade
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-test.txt

# Điền thông tin MySQL local và JWT_SECRET trong phiên terminal hiện tại.
$env:DATABASE_URL = "mysql+pymysql://USER:PASSWORD@127.0.0.1:3306/DATABASE"
$env:JWT_SECRET = "THAY_BANG_CHUOI_NGAU_NHIEN_IT_NHAT_32_BYTE"

Set-Location backend
..\.venv\Scripts\python.exe -m alembic upgrade head
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Backend đọc biến môi trường của tiến trình. Compose nạp `.env` tự động; khi chạy local cần đặt biến môi trường trong terminal. Nếu mật khẩu có ký tự đặc biệt, URL-encode mật khẩu trong `DATABASE_URL`.

Trong terminal khác, từ thư mục gốc, phục vụ frontend:

```powershell
.\.venv\Scripts\python.exe -m http.server 8080 --directory frontend --bind 127.0.0.1
```

Truy cập http://localhost:8080. Giữ trang đăng nhập ở `frontend/pages/index.html` giúp các liên kết tương đối và chuyển trang hiện có tiếp tục hoạt động; `frontend/index.html` là trang vào chuyển tiếp.

## Kiểm thử

Từ thư mục gốc:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
Set-Location ..
.\.venv\Scripts\python.exe -m unittest discover -s frontend/tests -v
Get-ChildItem frontend/assets/js -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Bộ kiểm thử backend chạy migration trên SQLite tạm, kiểm tra GPA, quyền truy cập dữ liệu, đăng nhập/làm mới/đăng xuất và seed lặp lại. Không cần `.env` để chạy bộ kiểm thử mặc định. `GPA_TEST_DATABASE_URL` cho phép chạy các test GPA trên một database thử nghiệm riêng; các test này tạo dữ liệu có ID cố định, vì vậy chỉ dùng database trống dành riêng cho kiểm thử.

CI chạy kiểm tra cú pháp Python/JavaScript, kiểm thử backend và kiểm tra liên kết frontend trên mỗi push/pull request. Kiểm tra liên kết không thay thế kiểm thử giao diện trên trình duyệt.

## Vị trí mã sau khi sắp xếp

| File/thư mục cũ | Vị trí mới |
|---|---|
| `main.py` | `backend/app/main.py`, `routers/`, `schemas/`, `services/`, `core/` |
| `database.py` | `backend/app/db/session.py`, `backend/app/db/tables.py` |
| `passwords.py` | `backend/app/core/security.py` |
| `gpa.py` | `backend/app/services/gpa_service.py`, `backend/app/repositories/gpa_repository.py` |
| `seed_accounts.py` | `backend/scripts/seed_accounts.py` |
| `migrations/`, `alembic.ini` | `backend/` |
| `requirements*.txt`, `tests/`, `dockerfile` | `backend/` (Dockerfile viết hoa) |
| `pages/`, `assets/` | `frontend/` |
| JavaScript riêng từng trang | `frontend/assets/js/pages/` |
| `openapi.json` | `docs/api/openapi.json` |

Dùng import tuyệt đối bắt đầu bằng `app.` trong backend. Chạy Uvicorn, Alembic và seed từ `backend/`; seed dùng `python -m scripts.seed_accounts`. Đường dẫn và định dạng dữ liệu API được giữ nguyên.
