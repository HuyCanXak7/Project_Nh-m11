# Danh Sách Trang Đã Rà Soát Trạng Thái UX (PB-40) & Responsive (PB-34)

- **Dự án**: Hệ thống Quản lý chỉ số học tập — Nhóm 11
- **Sprint**: Sprint 3 (16/11/2026 – 20/11/2026)
- **Mã công việc**:
  - `[T0694DD]` — PB-25, PB-26: Tải mẫu và chọn tệp điểm CSV / Excel (`.xlsx`), kiểm tra giới hạn 2 MB & 1.000 dòng, tự động tạo mới học kỳ / môn học khi xác nhận ở bước xem trước.
  - `[T0694E5]` — PB-52: Xem bảng điểm tổng hợp theo học kỳ của người dùng hiện tại.
  - `[T0694E6]` — PB-27: Xuất bảng điểm CSV / Excel (`.xlsx`) tại FE, chống CSV Formula Injection (`=`, `+`, `-`, `@`).
  - `[T0694EC]` — PB-34 (FR-19): Giao diện responsive mobile-first từ chiều rộng `360px`, `tablet` (`768px`) và `desktop` (`1280px+`).
  - `[T0694ED]` — PB-40 (NFR-UX): Rà soát trạng thái đang tải (`loading`), rỗng (`empty`) và lỗi (`error`) trên mọi trang.

---

## 1. Bảng Rà Soát Trạng Thái Loading, Empty & Error Trên Toàn Bộ Trang (`PB-40` · `[T0694ED]`)

| STT | Trang / Màn hình | Đường dẫn file | Trạng thái Đang tải (Loading) | Trạng thái Rỗng (Empty State) | Trạng thái Lỗi & Thử lại (Error & Retry) | Chặn hiển thị dữ liệu lỗi như hợp lệ |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Đăng nhập** | `frontend/pages/login.html` | Nút submit khóa tạm thời (`disabled`) và đổi nhãn `"Đang đăng nhập..."` | Form trống mặc định có gợi ý tài khoản demo | Báo lỗi trực tiếp dưới từng ô input và modal lỗi xác thực | Kiểm tra định dạng email & mật khẩu trước khi gửi |
| 2 | **Đăng ký** | `frontend/pages/register.html` | Nút submit khóa tạm thời (`disabled`) và đổi nhãn `"Đang tạo tài khoản..."` | Form trống có hướng dẫn | Báo lỗi từng trường và modal lỗi nếu email trùng | Chặn mật khẩu `< 8` ký tự hoặc xác nhận không khớp |
| 3 | **Quên / Đặt lại mật khẩu** | `frontend/pages/forgot-password.html`, `reset-password.html` | Nút submit hiển thị trạng thái đang gửi yêu cầu | Form nhập email / mã khôi phục | Hiển thị thông báo lỗi rõ ràng kèm nút thử lại | Kiểm tra mã xác nhận và độ dài mật khẩu mới |
| 4 | **Dashboard (Trang chủ)** | `frontend/pages/dashboard.html`, `assets/js/dashboard.js` | Khung biểu đồ hiển thị `"Đang tải dữ liệu tổng quan..."` | Khi tài khoản chưa có môn học: hiển thị `0.00` GPA, khung biểu đồ trống kèm nút `+ Thêm môn & nhập điểm` và `Nạp dữ liệu mẫu` | Khối `try/catch` hiển thị thông báo lỗi kèm nút `Thử tải lại` | Chỉ tính môn có trọng số đúng `100%` và điểm `0.0–10.0` |
| 5 | **Thống kê học tập** | `frontend/pages/statistics.html`, `assets/js/statistics.js` | Khung biểu đồ hiển thị `"Đang tải dữ liệu thống kê..."` | Khi chưa có dữ liệu: biểu đồ GPA, phân bố điểm chữ và môn nổi bật hiển thị trạng thái rỗng rõ ràng | Khối `try/catch` hiển thị thông báo lỗi kèm nút `Thử tải lại` | Loại bỏ các môn chưa đủ điểm hoặc sai trọng số khỏi thống kê |
| 6 | **Quản lý Học kỳ** | `frontend/pages/semesters.html`, `assets/js/semesters.js` | Khởi tạo đồng bộ từ `StorageService` theo tài khoản hiện tại | Hiển thị biểu tượng lịch, thông báo `"Chưa có học kỳ nào"` kèm nút `+ Tạo học kỳ đầu tiên` và `Nạp dữ liệu mẫu` | Bắt lỗi ngày kết thúc `<` ngày bắt đầu; khối `try/catch` có nút `Thử tải lại` | Chặn lưu học kỳ có khoảng thời gian không hợp lệ |
| 7 | **Quản lý Môn học & Điểm** | `frontend/pages/courses.html`, `assets/js/courses.js` | Cập nhật tức thời theo bộ lọc và học kỳ | Hiển thị trạng thái rỗng riêng khi chưa có môn học hoặc khi không khớp bộ lọc (kèm nút `✕ Xóa điều kiện lọc`) | Cảnh báo đỏ khi tổng trọng số `!= 100%` hoặc điểm ngoài khoảng `0..10`; khóa nút lưu khi sai trọng số | Môn sai trọng số hiển thị nhãn `Sai trọng số` / `Lỗi TS`, tuyệt đối không tính thành điểm hợp lệ |
| 8 | **Nhập điểm CSV / Excel** | `frontend/pages/import.html`, `assets/js/import.js` | Banner `#importStatusBanner` hiển thị spinner `"Đang đọc và kiểm tra tệp..."` | Vùng kéo thả (`#dropZone`) hiển thị biểu tượng tải lên và hướng dẫn cấu trúc 8 cột chuẩn | Banner lỗi rõ ràng kèm nút `Tải mẫu chuẩn` và `Chọn lại tệp khác` khi tệp sai định dạng, `> 2 MB`, `> 1.000 dòng` hoặc thiếu cột | Dòng lỗi được tô đỏ trong bảng xem trước và bị loại khỏi danh sách lưu |
| 9 | **Bảng điểm tổng hợp & In A4** | `frontend/pages/transcript.html`, `assets/js/transcript.js` | Hiển thị `"Đang tải dữ liệu bảng điểm cá nhân..."` khi khởi tạo | Hiển thị trạng thái rỗng kèm nút `+ Thêm môn học`, `Nhập từ CSV / Excel`, `Nạp dữ liệu mẫu`; trạng thái rỗng khi lọc không khớp | Khối `try/catch` hiển thị thông báo lỗi kèm nút `Thử tải lại` và `Nạp lại dữ liệu mẫu` | Chỉ lấy dữ liệu của người dùng đang đăng nhập; môn chưa đủ điểm hiển thị `--` và `Chưa đủ điểm` |
| 10 | **Mục tiêu & Mô phỏng GPA** | `frontend/pages/goals.html`, `assets/js/goals.js` | Hiển thị trạng thái tính toán mục tiêu tức thời | Bảng What-If hiển thị trạng thái rỗng kèm nút `+ Thêm môn học` khi chưa có môn học | Cảnh báo đỏ `"MỤC TIÊU KHÔNG KHẢ THI!"` nếu điểm cần đạt `> 4.0`; báo lỗi khi nhập điểm giả định ngoài `0..10` | Ô điểm giả định ngoài `0..10` gắn nhãn `Điểm 0-10` và không tính sai vào GPA |
| 11 | **Thời khóa biểu** | `frontend/pages/schedule.html` | Hiển thị `"Đang tải thời khóa biểu..."` khi chuyển học kỳ | Hiển thị trạng thái rỗng kèm nút `+ Thêm môn học` khi học kỳ chưa có môn | Khối `try/catch` hiển thị thông báo lỗi kèm nút `Thử tải lại` | Đồng bộ trực tiếp từ danh sách môn của người dùng hiện tại |
| 12 | **Hồ sơ cá nhân & Cài đặt** | `frontend/pages/profile.html`, `assets/js/profile.js` | Hiển thị trạng thái xử lý khi tải ảnh đại diện | Hiển thị chữ cái viết tắt tên sinh viên (`SV`) khi chưa tải ảnh đại diện | Báo lỗi khi tệp ảnh không hợp lệ, quá dung lượng hoặc mật khẩu xác nhận không khớp | Tách biệt hoàn toàn dữ liệu hồ sơ theo từng tài khoản đăng nhập |

---

## 2. Kết Quả Kiểm Tra Giao Diện Responsive (`PB-34` · `[T0694EC]`)

Đã kiểm tra trên 3 mốc kích thước màn hình mục tiêu theo thiết kế **StudyTrack-E (Swiss Grid)**:
1. **Điện thoại (`360px × 800px`)**:
   - Thanh điều hướng trên cùng (`.sidebar` Top Bar) thu gọn các mục `01..07` vào menu trượt xuống khi bấm nút `#menuToggle`, giữ logo và cụm tài khoản gọn trong chiều rộng `360px`.
   - Các lưới thẻ (`.stats`, `.dash-row--hero`, `.dash-row--bottom`, `.stats-row--top`, `.stats-row--bottom`, `.course-sem-strip`, `.semester-grid`, `.goals-top-grid`, `.profile-grid`) tự động chuyển về 1 cột (`grid-template-columns: 1fr`), không gây tràn ngang trang (`overflow-x: hidden`).
   - Toàn bộ bảng dữ liệu (`courses.html`, `transcript.html`, `import.html`, `goals.html`, `schedule.html`) nằm trong khung `.table-wrap` có thanh cuộn ngang độc lập (`overflow-x: auto; -webkit-overflow-scrolling: touch`).
   - Thanh công cụ lọc (`.course-toolbar`, `.filter-bar`) và các nút hành động trên header tự động xuống dòng gọn gàng ở mốc `360px`.
2. **Máy tính bảng (`768px × 1024px`)**:
   - Thẻ thống kê (`.stats`, `.course-sem-strip`) hiển thị lưới 2×2 cân đối.
   - Bảng dữ liệu và biểu đồ cột/đường `.e-html-chart` tự động co giãn theo khung nhìn khi xoay màn hình (`resize`).
3. **Máy tính để bàn (`1280px – 1920px+`)**:
   - Thanh điều hướng ngang cố định phía trên (`54px`), khung lưới `<main class="dash">` tự động co giãn vừa khít 100% chiều rộng và chiều cao màn hình (`min-height: calc(100vh - 54px)`), không để lại khoảng trống thừa bên dưới và tự động giãn khi thêm môn học.
