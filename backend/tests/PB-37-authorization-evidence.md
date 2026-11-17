# PB-37 — Bằng chứng kiểm thử phân quyền

## Mục tiêu và môi trường

- Dữ liệu kiểm thử được tạo trong SQLite in-memory riêng cho từng test; không sử dụng database cấu hình trong `.env`.
- Lệnh chạy từ thư mục `backend`: `python -m pytest tests/test_authorization_isolation.py -q`.
- Kết quả xác minh ngày 18/11/2026: `7 passed` trong 5.66 giây bằng `.venv\\Scripts\\python.exe -m pytest tests/test_authorization_isolation.py -q`.

## Phạm vi được kiểm tra

- Student A nhận 404 khi đọc, sửa, xóa học kỳ/môn/thành phần điểm của B, nhập điểm hoặc tính GPA trên tài nguyên của B; dữ liệu B không bị thay đổi bởi các request bị từ chối.
- Chủ sở hữu vẫn đọc và cập nhật được dữ liệu của mình.
- Endpoint `POST /api/v1/import/grades` yêu cầu đăng nhập. Nếu tên học kỳ/mã môn giống dữ liệu thuộc tài khoản khác, import chỉ tạo/tìm các bản ghi trong phạm vi người gọi và không đọc, sửa hay gắn thành phần điểm vào dữ liệu của tài khoản kia.
- Role gate `get_current_admin`: Student nhận 403 (`FORBIDDEN`), Admin đi qua được. Hiện kiểm tra bằng route probe trong test vì chưa có endpoint quản trị nghiệp vụ production.

## Import và giới hạn phạm vi

- Import revalidate từng dòng ở backend, giới hạn 1.000 dòng, kiểm tra 0–10 và tổng trọng số 100% theo môn, rồi lưu trong một giao dịch.
- Batch có lỗi bị từ chối toàn bộ và trả lỗi theo số dòng; tên thành phần đã tồn tại không bị ghi đè.
- Học kỳ mới cần năm học và ngày bắt đầu/kết thúc; backend không tự gán ngày hoặc năm giả.
- Export được SRS quy định tạo tại frontend nên không có endpoint backend. API Goals cũng chưa nằm trong phạm vi triển khai hiện tại; cần kiểm tra owner khi route Goals được bổ sung.
- Router Admin hiện chưa có endpoint nghiệp vụ. PB-32/PB-33 là các task bonus riêng; test role gate chưa thay thế kiểm thử endpoint Admin thật.

## Tệp kiểm thử

`backend/tests/test_authorization_isolation.py`
