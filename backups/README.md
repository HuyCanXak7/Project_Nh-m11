# Bản Sao Lưu Cơ Sở Dữ Liệu Demo (`v1.0.0` · PB-45)

Thư mục này chứa bản backup SQL sạch của bộ dữ liệu demo (PB-48 + PB-59) phục vụ buổi bảo vệ dự án **Hệ thống Quản lý Chỉ số Học tập — Nhóm 11 (StudyLIMS)**.

## Tệp backup hiện có

| Tệp | Nội dung | Phiên bản schema |
|---|---|---|
| `demo_db_backup_v1.0.0.sql` | 8 mức quy đổi Thông tư 08, 5 tài khoản demo (1 Admin, 1 Student mẫu, 3 Demo Student PB-59), 8 học kỳ, 40 lượt môn (gồm môn F `INT1001` 3.9 và lần học lại 8.5 A), 120 thành phần điểm, 3 mục tiêu GPA 3.60 | Alembic `0007_audit_logs` |

> **Bảo mật:** File SQL **chỉ chứa chuỗi băm bcrypt** (`password_hash`), không lưu mật khẩu thô và không chứa phiên đăng nhập (`auth_sessions`). Chỉ dùng cho môi trường **demo / local** — trên môi trường production thật cần đổi mật khẩu riêng trong `.env`.

---

## 1. Khôi phục nhanh vào MySQL trong Docker Compose (< 10 giây)

Chạy tại thư mục gốc `Project_Nh-m11` (sau khi `docker compose up -d` đã healthy và Alembic đã tạo đủ bảng):

### PowerShell (Windows)
```powershell
Get-Content backups\demo_db_backup_v1.0.0.sql -Raw | docker compose exec -T db sh -c 'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

### Bash (macOS / Linux)
```bash
docker compose exec -T db sh -c 'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < backups/demo_db_backup_v1.0.0.sql
```

### Khôi phục trực tiếp qua Python (không cần cài `mysql` CLI trên máy host)
```powershell
docker compose exec backend python -m scripts.backup_demo_db --mode restore --output /app/../backups/demo_db_backup_v1.0.0.sql
```
*(hoặc chạy trực tiếp trên máy đã cấu hình `DATABASE_URL` trong `.env`)*:
```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m scripts.backup_demo_db --mode restore --output ..\backups\demo_db_backup_v1.0.0.sql
```

---

## 2. Tạo bản backup mới nhất trước ngày bảo vệ

### Từ MySQL đang chạy trong Docker Compose (`mysqldump`)
```powershell
docker compose exec -T db sh -c 'mysqldump --single-transaction --routines --triggers -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > backups\live_backup_pre_defense.sql
```

### Hoặc tạo lại snapshot demo sạch & tự kiểm chứng restore
```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m scripts.backup_demo_db --mode clean-demo --output ..\backups\demo_db_backup_v1.0.0.sql
```
