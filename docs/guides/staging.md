# Staging · PB-43 · T0694DE

Stack: Nginx phục vụ FE + proxy API/Swagger, FastAPI, MySQL 8 với volume bền vững. Chỉ Nginx mở cổng host; BE/DB ở mạng Docker nội bộ. Dùng host Docker có sẵn hoặc VM gói miễn phí do nhóm cấp. Cấu hình này không tự tạo tài khoản hay đăng ký gói hosting.

## Chuẩn bị một lần trên host

Yêu cầu Docker Engine và Compose v2 hỗ trợ `up --wait`; SSH bằng khóa. Tạo `~/nhom11-staging/.env` từ `.env.example`, điền secret thật. `DATABASE_URL` phải trỏ tới `db:3306`, cùng user/database/password trong `.env` (URL-encode mật khẩu trong URL). Không upload `.env` lên GitHub.

Biến tùy chọn: `STAGING_BIND=127.0.0.1`, `STAGING_PORT=8080`. Mặc định chỉ nghe loopback; dùng reverse proxy HTTPS của host trỏ vào port này. Nếu cần demo HTTP trực tiếp trong mạng nội bộ, đặt `STAGING_BIND=0.0.0.0` và firewall phù hợp. `CORS_ORIGINS` đặt đúng origin FE nếu FE khác origin; stack mẫu dùng cùng origin.

```bash
cd ~/nhom11-staging
chmod 600 .env
bash deploy/deploy.sh
docker compose --env-file .env -f deploy/compose.staging.yaml exec backend python -m scripts.seed_accounts
```

Seed cần đặt hai biến SEED_* trong `.env`. Không dùng mật khẩu local mẫu cho staging. Sao lưu DB trước khi áp dụng migration mới; deploy không xóa volume. Khi deploy lỗi, kiểm tra logs tại host, khôi phục bản code trước và DB backup nếu migration không tương thích; workflow không tự rollback DB.

## GitHub Actions và review

Workflow `Project checks` chạy trên push/PR: Ruff và test BE, validate OpenAPI + payload ví dụ, ESLint + kiểm tra cú pháp/test FE, và test thống kê trên MySQL 8. Deploy chỉ chạy sau **tất cả** job này thành công, với push vào `develop`; không deploy code PR.

1. Tạo nhánh `develop` từ nhánh tích hợp được nhóm thống nhất; hiện remote chưa có `develop` tại thời điểm kiểm tra. Không lấy nhánh cũ bỏ qua các thay đổi cần tích hợp.
2. Repo Settings → Rules/Branches: bảo vệ `develop`, bắt buộc pull request, ít nhất **1 approval**, dismiss stale approvals, required checks `backend`, `frontend`, `mysql`; tắt force push/deletion và bypass nếu quy trình nhóm yêu cầu. Tài liệu/PR template không tự cưỡng chế các quy tắc này; cần quyền admin thiết lập thực tế.
3. Tạo Environment **staging**, giới hạn deployment branch `develop`.
4. Environment secrets: `STAGING_SSH_KEY` (private key deploy), `STAGING_KNOWN_HOSTS` (host key đã kiểm chứng ngoài luồng).
5. Environment variables: `STAGING_SSH_TARGET=user@host`, `STAGING_URL=https://...` (base URL, không có `/api/v1` hay `/pages`). Host phải được GitHub runner truy cập được. Host key phải khớp cổng SSH mặc định 22.
6. Merge PR đã review vào develop. Workflow gửi đúng commit đã qua CI, không gửi `.env`; chạy migration và chờ FE/BE/DB healthy. Bước cuối kiểm tra cả FE và `/api/v1/health` qua URL public.

Tên job checks phải khớp tên hiển thị trên GitHub sau run đầu tiên. Nếu dùng tên hiển thị khác do ruleset/reusable workflow, chọn checks thực tế từ run thay vì nhập tên suy đoán.

## Trước demo trên gói miễn phí có thể ngủ

```powershell
.\.venv\Scripts\python.exe backend/scripts/warm_staging.py https://STAGING-DOMAIN
```

Script retry tối đa 18 lần, cách 10 giây, timeout mỗi request 10 giây; chỉ báo ready sau khi BE kiểm tra DB thành công và trang Dashboard trả 200. Không chạy keep-alive định kỳ để né giới hạn hosting.

Minh chứng cần nộp: link PR có approval, CI run xanh (FE/BE/MySQL), deployment run thành công, URL FE, `/docs`, `/api/v1/health`, kết quả warm-up trước demo. Khi chưa có host/secrets/run thật, chỉ ghi **đã chuẩn bị cấu hình**, chưa ghi staging đã deploy.

Tham chiếu cấu hình: [Docker Compose up --wait](https://docs.docker.com/reference/cli/docker/compose/up/), [GitHub reusable workflows và environment secrets](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows).
