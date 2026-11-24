# PB-36 / T0694F6 — Checklist kiểm thử bảo mật

Ngày rà soát: 2026-11-24  
Phạm vi: backend FastAPI, frontend tĩnh và các kiểm thử hồi quy liên quan.

## 1. Kết quả tổng hợp

| # | Tiêu chí (README mục 5) | Cách đáp ứng | Minh chứng |
|---|---|---|---|
| 1 | Mật khẩu băm bcrypt, không lưu thô | `hash_password()` / `verify_password()` dùng bcrypt; đăng ký, đổi mật khẩu và seed đều đi qua helper này | `backend/app/core/security.py:11-23`; `test_password_is_bcrypt_hashed_and_never_compared_as_plain_text`, `test_bcrypt_rejects_password_longer_than_72_bytes` |
| 2 | Access token 15 phút, refresh token 7 ngày | Cấu hình TTL và `create_tokens()` dùng đúng giá trị cấu hình | `backend/app/core/config.py:19-20`; `backend/app/services/auth.py:208-230`; `test_jwt_uses_15_minute_access_and_7_day_refresh` |
| 3 | Sai đăng nhập báo lỗi chung, không lộ email tồn tại | Email không tồn tại vẫn chạy bcrypt với hash giả; mọi trường hợp sai trả cùng `INVALID_CREDENTIALS` | `backend/app/services/auth.py:113-127` |
| 4 | Rate limit đăng nhập theo số lần **sai** | `check_login_limit()` chỉ kiểm tra; `record_login_failure()` tăng bộ đếm khi sai mật khẩu hoặc tài khoản bị khóa; `clear_login_limit()` reset sau khi đăng nhập đúng | `backend/app/services/auth.py:47-88`; `test_failed_logins_are_rate_limited_and_success_resets_counter` |
| 5 | Mã lỗi rate limit đúng hợp đồng API | Trả `429`, `error.code = TOO_MANY_REQUESTS` và header `Retry-After` | `backend/app/services/auth.py:59-69`; `docs/api/openapi.json:3290-3305`; test số 4 |
| 6 | Refresh token bị thu hồi khi logout | Xóa `AuthSession`; access token cũ cũng bị từ chối vì dependency kiểm tra phiên còn tồn tại | `backend/app/services/auth.py:194-205`; `test_logout_revokes_access_and_refresh_tokens` |
| 7 | Refresh token bị thu hồi khi đổi mật khẩu | Đổi hash, xóa toàn bộ phiên cũ, cấp cặp token mới cho thiết bị hiện tại | `backend/app/services/auth.py:143-171`; `test_password_change_revokes_old_session` |
| 8 | Tài khoản bị khóa không đăng nhập/dùng token được; khóa thu hồi phiên | `require_active_user()` chặn đăng nhập và mọi request; admin khóa tài khoản xóa toàn bộ `AuthSession` và ghi audit log | `backend/app/services/auth.py:29-39`; `backend/app/services/admin.py:222-248`; `test_admin_lock_and_unlock_revokes_sessions_and_keeps_audit` |
| 9 | CORS chỉ cho phép domain frontend | `allow_origins` đọc từ `FRONTEND_ORIGIN` (hỗ trợ danh sách phân tách bằng dấu phẩy), không dùng `*` | `backend/app/main.py:42-47`; `test_cors_allows_only_configured_frontend_origin` |
| 10 | Chống SQL injection | Không có `execute(f"...")`, `text(f"...")` hoặc `.raw(f"...")` trong `backend/app`; dữ liệu đi qua SQLAlchemy ORM/tham số | Quét mã nguồn ngày 2026-11-24: không có kết quả |
| 11 | Chống XSS ở dữ liệu hiển thị | Escape đầy đủ `& < > " '`; avatar dựng bằng DOM; toast dùng `textContent`; bỏ nối chuỗi id vào inline `onclick` (dùng `data-*`) | `frontend/assets/js/app_shell.js:126-133`, `266-292`; `frontend/assets/js/profile.js:30-47`; `frontend/assets/js/app_common.js:22-35`, `101-103`; `frontend/pages/schedule.html:176-178`, `266-270`; `frontend/assets/js/courses.js:138-145`, `415-434`; `frontend/assets/js/semesters.js:81-85` |
| 12 | Không commit secret | `.env` bị ignore; chỉ `.env.example` được track và chứa giá trị mẫu/placeholder | `.gitignore:1`; `git ls-files` chỉ trả `.env.example`, `backend/.env.example` |
| 13 | Lỗi hệ thống không lộ stack trace | Handler chung cho `HTTPException`, validation, `SQLAlchemyError` và `Exception`; chi tiết chỉ ghi log phía server | `backend/app/main.py:51-100`; `test_unexpected_errors_return_generic_500_without_internal_details` |
| 14 | Phân quyền owner/admin | Endpoint dữ liệu cá nhân lọc theo user hiện tại; endpoint admin yêu cầu role ADMIN | `backend/tests/test_admin_user_api.py` (`test_admin_endpoints_reject_non_admin_and_missing_token`, `test_profile_update_only_changes_own_name`) |

### Kiểm tra bổ sung ngoài 14 tiêu chí README mục 5

- Mã lỗi 401 khi thiếu/sai/hết hạn token đã đồng bộ với README mục 6.2 và OpenAPI: `UNAUTHORIZED` (trước đó là `INVALID_TOKEN`).
- Minh chứng: `test_missing_token_returns_contract_unauthorized_code`.

## 2. Thay đổi chính trong đợt rà soát

- Tách rate limiter thành ba bước: kiểm tra, ghi nhận lỗi, xóa bộ đếm khi thành công.
- Đồng bộ mã lỗi 429 với README/OpenAPI: `TOO_MANY_REQUESTS`.
- Đồng bộ mã lỗi 401 với README/OpenAPI: `UNAUTHORIZED` (thay cho `INVALID_TOKEN`).
- Escape dấu nháy đơn/nháy kép trong `escapeHtml`; áp dụng cho avatar, initials và các helper escape cục bộ.
- Thay các sink XSS trong `schedule.html` (học kỳ, tên/mã môn) bằng `escapeHtml`.
- Avatar không còn ghép `avatar_url` vào `innerHTML`; toast không còn dùng `innerHTML`.
- Loại bỏ nối chuỗi `sem.id` vào inline `onclick` ở tab học kỳ, dùng `data-semester-id`.
- Thêm `backend/tests/test_security_review.py` cho các tiêu chí bảo mật chính.

## 3. Lệnh kiểm chứng

Chạy trong `backend`:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_security_review.py -q
# 9 passed

.\.venv\Scripts\python.exe -m pytest -q
# 89 passed

.\.venv\Scripts\python.exe -m compileall -q app tests
# exit code 0
```

Kiểm tra cú pháp frontend bằng Edge headless (môi trường không có Node.js):

```powershell
# Mở lần lượt các trang có JS đã sửa, lọc log SyntaxError/Uncaught
# schedule, courses, profile, transcript, goals, import, semesters,
# admin-user, login, statistics, dashboard
# Kết quả: không có SyntaxError/Uncaught.
```

Kiểm tra secret:

```powershell
git check-ignore -v backend/.env
# .gitignore:1:.env    backend/.env

git ls-files | Select-String '\.env'
# .env.example
# backend/.env.example

git log --all --name-only -S 'SECRET_KEY='
# Chỉ chạm .env.example / backend/.env.example
```

## 4. Ghi chú

- Bộ đếm rate limit hiện lưu trong bộ nhớ tiến trình, phù hợp demo/UAT một instance. Khi chạy nhiều instance production cần chuyển sang Redis hoặc store dùng chung.
- `Retry-After` được tính theo cửa sổ 60 giây hiện tại.
- Các giá trị trong `.env.example` chỉ là mẫu local, không phải secret production.
