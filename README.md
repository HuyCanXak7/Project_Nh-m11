# Hướng dẫn dựng môi trường Dev Backend & Database MySQL (Docker)

Môi trường phát triển đã được đóng gói bằng Docker Compose. Hệ thống sẽ tự động khởi chạy MySQL, Backend và tự động chạy Database Migration (Alembic) chỉ bằng một lệnh.

## Yêu cầu
* Đã cài đặt [Docker](https://www.docker.com/) và Docker Compose.

## Các bước chạy dự án

**Bước 1: Thiết lập file môi trường**
Copy file `.env.example` và đổi tên thành `.env`:
```bash
cp .env.example .env