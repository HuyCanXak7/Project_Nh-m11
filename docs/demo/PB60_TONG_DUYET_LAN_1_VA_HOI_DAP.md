# PB-60 · Biên Bản Tổng Duyệt Lần 1 và Hỏi Đáp

- **Dự án:** Hệ thống Quản lý Chỉ số Học tập Sinh viên — **StudyLIMS (Nhóm 11)**
- **Mã Backlog:** `PB-60` | **Mã công việc:** `T0694FC` | **Mức độ:** Must (Enabler) · NFR-Demo
- **Sprint:** Sprint 4 (23/11/2026 – 27/11/2026)
- **Thời gian tổng duyệt:** 19:30 – 21:15, ngày **24/11/2026**
- **Hình thức:** Trực tiếp tại máy nhóm trưởng + Google Meet cho thành viên ở xa
- **Chủ trì:** **Huỳnh Nhơn Nguyên Nghiệp (`N25DTCN038`) — Nhóm trưởng**
- **Thư ký ghi biên bản:** **Nguyễn Minh Trung**
- **Thành viên tham gia (4/4):**

| Thành viên | Vai trò chính | Phạm vi phụ trách trong buổi tổng duyệt |
| :--- | :--- | :--- |
| **Huỳnh Nhơn Nguyên Nghiệp** (`N25DTCN038`) | Nhóm trưởng · Frontend | Mở đầu – kết luận, Học kỳ, Môn học, Nhập điểm, Import/Export, Bảng điểm, UX/Responsive/Dark Mode, điều phối Q&A |
| **Vũ Cao Nguyên** | Frontend | Auth/Session, Dashboard, Mục tiêu GPA, What-If, Thống kê, Hồ sơ, Admin UI, operator cầm máy chính |
| **Nguyễn Hoàng Đức Huy** | Backend | Auth/JWT, Học kỳ, GPA, Swagger, Healthcheck, Deploy, timekeeper |
| **Nguyễn Minh Trung** | Backend | Môn học, Điểm thành phần, Thang điểm, Batch Import, Docker, Bảo mật, Kiểm thử, máy dự phòng |

> **Mục tiêu của PB-60:** Chạy thử **toàn bộ** bài thuyết trình có bấm giờ, luyện phản xạ Q&A bằng ngân hàng câu hỏi khó, kiểm chứng phương án dự phòng **Docker Compose offline trên máy không có mạng**, và ghi lại đầy đủ các điểm cần sửa trước buổi tổng duyệt lần 2 (`PB-61`).

---

## 1. Phạm Vi, Nguyên Tắc và Cách Thức Tổng Duyệt

### 1.1. Phạm vi

Buổi tổng duyệt lần 1 bám đúng 4 tiêu chí chấp nhận của `PB-60`:

1. Chạy thử **toàn bộ** bài thuyết trình có bấm giờ, không bỏ chặng, không tua.
2. Mỗi thành viên soạn **8–10 câu hỏi khó** cho các thành viên khác và luyện trả lời.
3. Chạy thử **phương án offline bằng Docker Compose** trên máy đã ngắt kết nối mạng.
4. Ghi lại **các điểm cần sửa** kèm mức độ ưu tiên, người phụ trách và trạng thái.

### 1.2. Nguyên tắc

- **Không thêm tính năng mới** trong buổi tổng duyệt. Mọi phát hiện chỉ được ghi vào biên bản; chỉ lỗi `P0` chặn demo mới được sửa ngay.
- **Bấm giờ thật:** dùng đồng hồ đếm ngược trên điện thoại của timekeeper, đối chiếu với đồng hồ trên slide; báo tín hiệu tay tại phút thứ 8 và phút thứ 10.
- **Không đọc slide:** mỗi người nói theo ý chốt, thao tác demo theo đúng thứ tự đã chốt trong `PB-61`.
- **Q&A trung thực:** câu nào chưa chắc thì ghi nhận, không đoán; câu trả lời dài 30–45 giây, tránh nói chồng.
- **Offline thật:** ngắt Wi-Fi/Ethernet trước khi chạy, không dùng CDN, không để trình duyệt tự tải tài nguyên ngoài.

### 1.3. Phân vai vận hành trong buổi tổng duyệt

| Vai trò | Người phụ trách | Nhiệm vụ |
| :--- | :---: | :--- |
| Điều phối chung, mở đầu – kết luận | Nghiệp | Giữ nhịp, chuyển chặng, chốt điểm cần sửa, điều phối Q&A |
| Operator cầm máy chính | Nguyên | Đăng nhập sẵn, mở đúng tab, thao tác demo theo lời người nói |
| Timekeeper + điều khiển slide | Huy | Bấm giờ, báo mốc 8/10 phút, chuyển slide, theo dõi healthcheck |
| Máy dự phòng + reset dữ liệu | Trung | Giữ laptop dự phòng chạy Docker offline, sẵn lệnh reset/restore |

---

## 2. Kết Quả Chạy Thử Toàn Bộ Bài Thuyết Trình Có Bấm Giờ

### 2.1. Kịch bản 6 chặng (khung chốt 11 phút)

| Chặng | Thời lượng dự kiến | Nội dung | Người nói chính |
| :---: | :---: | :--- | :---: |
| 1 | `00:00 – 01:30` | Mở đầu, bài toán, đội ngũ, kiến trúc 3 tầng, 4 điểm mạnh | Nghiệp |
| 2 | `01:30 – 03:30` | Đăng nhập, Dark Mode, tìm kiếm `Ctrl+K`, Dashboard | Nguyên |
| 3 | `03:30 – 06:30` | Học kỳ, Môn học, trọng số 100%, học lại, Import CSV, Bảng điểm | Nghiệp |
| 4 | `06:30 – 08:15` | Mục tiêu GPA, What-If, Thống kê, Admin | Nguyên |
| 5 | `08:15 – 10:15` | Backend/Swagger, bảo mật, hiệu năng, kiểm thử | Huy → Trung |
| 6 | `10:15 – 11:00` | Hạn chế, hướng phát triển Phase 2, kết luận | Nghiệp |

### 2.2. Kết quả 2 lượt chạy

**Lượt 1 — chạy đầy đủ, không cắt:** tổng **15 phút 00 giây** (vượt 4 phút so với khung 11 phút).
**Lượt 2 — đã cắt theo góp ý:** tổng **11 phút 10 giây** (vượt 10 giây, trong sai số cho phép của buổi tổng duyệt).

| Chặng | Dự kiến | Lượt 1 | Lượt 2 | Nguyên nhân vượt ở lượt 1 | Cách cắt đã áp dụng ở lượt 2 |
| :---: | :---: | :---: | :---: | :--- | :--- |
| 1 | 1:30 | 2:05 | 1:30 | Giải thích quá dài về công nghệ và lịch sử nhóm | Chỉ nêu 3 tầng kiến trúc + 4 điểm mạnh, bỏ phần lịch sử |
| 2 | 2:00 | 2:40 | 2:00 | Bật/tắt Dark Mode 2 lần, tìm kiếm 2 lần | Chỉ bật Dark Mode 1 lần, tìm `lap trinh` 1 lần |
| 3 | 3:00 | 4:25 | 3:10 | Giải thích lỗi import quá lâu, chờ xuất Excel | Mở sẵn 2 file CSV, chốt lỗi trong 20 giây, bỏ thao tác chờ tải file |
| 4 | 1:45 | 2:30 | 1:45 | Gõ lại GPA mục tiêu và điểm What-If từ đầu | Chuẩn bị sẵn 2 kịch bản `4.0` và `3.5`, chỉ đổi giá trị |
| 5 | 2:00 | 2:20 | 2:00 | Chờ Swagger tải lại | Mở sẵn tab `/docs` và `/api/v1/health` từ trước |
| 6 | 0:45 | 1:00 | 0:45 | Xin lỗi và cảm ơn dài | Dùng câu chốt ngắn đã viết sẵn |
| **Tổng** | **11:00** | **15:00** | **11:10** | | **Đạt khung, còn dư 10 giây** |

### 2.3. Nhận xét của timekeeper và nhóm trưởng

- **Nhịp nói:** Nghiệp và Nguyên nói nhanh ở chặng 3 khi vừa thao tác vừa giải thích; cần dừng 1–2 giây sau mỗi thao tác để hội đồng theo dõi.
- **Chuyển chặng:** không nên chuyển slide ngay khi người nói vừa dứt câu; chờ 1 nhịp để hội đồng kịp nhìn kết quả trên màn hình.
- **Thao tác demo:** các thao tác phụ thuộc mạng/API cần chuẩn bị trước; không để hội đồng chờ loading quá 3 giây.
- **Câu chốt:** mỗi chặng phải có 1 câu kết luận giá trị (ví dụ: “trọng số sai thì hệ thống không cho lưu”, “GPA cập nhật ngay sau khi sửa điểm”).
- **Kết luận:** khung 11 phút là khả thi; lượt 2 đạt **11:10**, đủ điều kiện chốt kịch bản cho `PB-61`.

### 2.4. Checklist thiết bị và thao tác đã kiểm tra trong buổi

| Hạng mục | Kết quả | Ghi chú |
| :--- | :---: | :--- |
| Đăng nhập sẵn `demo.student01@example.com` trên tab chính | ✅ | Không nhập mật khẩu trước hội đồng |
| Mở sẵn tab Swagger `/docs` và healthcheck `/api/v1/health` | ✅ | Dùng cho chặng 5 |
| Mở sẵn laptop dự phòng chạy Docker offline | ✅ | Chuyển bằng `Ctrl+3` khi cần |
| Có sẵn 2 file `demo_import_valid.csv`, `demo_import_invalid.csv` | ✅ | Đặt ngoài Desktop, không tìm trong thư mục sâu |
| Có sẵn bảng điểm để xuất Excel và in A4 | ✅ | Kiểm tra trước, không chờ tải file |
| Tắt thông báo Zalo/Messenger/Windows Update | ✅ | Bật Do Not Disturb |
| Cáp HDMI, nguồn điện, chuột | ✅ | Trung và Huy kiểm tra |

---

## 3. Ngân Hàng Câu Hỏi Q&A (32 Câu — Mỗi Thành Viên Soạn 8 Câu)

> **Quy tắc trả lời:** người được gọi tên trả lời chính trong 30–45 giây; người khác chỉ bổ sung 1 câu ngắn. Câu chưa chắc thì nói “em ghi nhận và phản hồi sau”, không đoán. Nhóm trưởng là người duy nhất phân luồng câu hỏi.

### 3.1. Nghiệp hỏi (8 câu)

| # | Câu hỏi khó | Người trả lời | Ý chốt bắt buộc (30–45 giây) |
| :---: | :--- | :---: | :--- |
| A1 | `applyScale()` lấy bảng quy đổi từ BE nhưng vẫn giữ `label`/`colorClass` theo bảng mặc định. Nếu admin thêm điểm chữ mới (ví dụ `A+`) thì giao diện hiển thị thế nào? | Nguyên | `old[letter]` sẽ là `undefined`; chỉ các trường `min`, `max`, `letter`, `scale4`, `status` được ghi đè, còn `label`/`colorClass` bị thiếu. Bảng hiện tại cố định 8 mức nên demo an toàn; đây là điểm P1 nếu admin thêm mức mới. Không thêm mức mới trong buổi demo. |
| A2 | Dashboard đang hiển thị mục tiêu `3.40` ở ô GPA học kỳ, nhưng trang Mục tiêu lấy `target_gpa` từ localStorage (demo là `3.60`). Vì sao lệch? | Nguyên | `dashboard.js` hard-code `target = 3.40` cho badge KPI, còn thanh hero dùng `s.targetGpa` lấy từ mục tiêu. Đây là lệch hiển thị P1; khi demo không đối chiếu hai con số, và sẽ sửa badge dùng `s.targetGpa` sau bảo vệ. |
| A3 | FE xác định tín chỉ đạt bằng `scale4 > 0`, BE dùng `grade10 >= 4`. Có mốc nào hai bên lệch nhau không? | Nguyên | Với bảng hiện tại, mức D có `gpa4 = 1.0` cho khoảng `4.0–4.9` nên hai điều kiện tương đương. Nếu admin đổi D thành `0` hoặc thêm mức 0 điểm trên 4.0 thì FE sẽ lệch; nguồn chuẩn vẫn là BE, FE chỉ hiển thị. Ghi nhận P2. |
| A4 | `session.js` chỉ dedupe refresh trong một tab. Nếu mở 2 tab cùng lúc và access token cùng hết hạn thì chuyện gì xảy ra? | Nguyên | `refreshing` là biến trong từng trang, không chia sẻ giữa các tab. Hai tab có thể cùng gọi refresh; refresh rotation thu hồi token cũ nên tab sau nhận 401 và `endSession()` xóa session chung, có thể đăng xuất cả hai. Khi demo chỉ mở một tab; Phase 2 dùng BroadcastChannel hoặc khóa localStorage. |
| A5 | Admin vừa khóa tài khoản sinh viên A, nhưng access token của A còn hạn 12 phút. A có gọi API sửa điểm được không? | Huy | Không. `get_current_user()` kiểm tra `AuthSession` theo `sid` và `user.is_active`; khóa tài khoản xóa toàn bộ `auth_sessions` nên access token cũ mất hiệu lực ngay, không phải chờ hết 15 phút. |
| A6 | Nếu đổi `SECRET_KEY` khi backend restart thì các token đang lưu trên máy sinh viên sẽ thế nào? | Huy | Toàn bộ JWT cũ sai chữ ký nên trả 401; mọi người phải đăng nhập lại. Vì vậy `SECRET_KEY` production phải cố định trong `.env`, chỉ xoay vòng có kế hoạch và thông báo trước. |
| A7 | File CSV 1.000 dòng, 999 dòng đầu đúng, dòng 1.000 sai điểm. BE có lưu 999 dòng trước không? Nếu gọi thẳng API bỏ qua FE thì sao? | Trung | Không lưu dòng nào. `import_grades()` validate toàn bộ trước, gom lỗi; có lỗi thì trả `400 IMPORT_INVALID_ROWS` trước khi ghi. Gọi thẳng API cũng bị chặn vì BE không tin FE. Khi ghi, cả batch nằm trong một transaction; lỗi SQL thì `rollback()`. |
| A8 | `convert_grade()` gọi `ensure_default_grade_scale()` bên trong luồng import. Hàm này có tạo commit giữa transaction làm mất tính nguyên tử không? | Trung | Không. `ensure_default_grade_scale()` chỉ `add_all` và `flush`, không commit; `convert_grade()` chỉ đọc. `import_grades()` commit đúng một lần ở cuối. Hàm `get_grade_scale()` có commit nhưng chỉ dùng ở luồng đọc/bootstrap, không gọi trong import. |

### 3.2. Nguyên hỏi (8 câu)

| # | Câu hỏi khó | Người trả lời | Ý chốt bắt buộc (30–45 giây) |
| :---: | :--- | :---: | :--- |
| B1 | Tổng trọng số `99.6%`: FE dùng `Math.round(totalWeight) === 100` nên cho qua, BE yêu cầu đúng `100.00`. Bên nào đúng và xử lý thế nào? | Nghiệp | BE đúng theo BR-01. FE đang làm tròn phần trăm nên `99.6` thành `100` và lọt. Đây là P1: sửa FE so sánh trực tiếp hoặc chỉ dùng epsilon rất nhỏ để bù sai số float, không làm tròn phần trăm. Demo chỉ dùng bộ `10/30/60`. |
| B2 | Import vào môn đã có 3 thành phần `10/30/60`, file có 3 thành phần mới cùng tên `10/30/60`. Preview báo “Cập nhật môn”, nhưng BE xử lý thế nào? | Nghiệp | BE từ chối vì tên thành phần đã tồn tại và tổng trọng số sau ghép vượt 100%; trả `IMPORT_INVALID_ROWS`, không ghi đè. Nhãn “Cập nhật môn” của FE gây hiểu nhầm; P1 UX nên đổi thành “Thêm thành phần mới” và cảnh báo không ghi đè. |
| B3 | Xóa trắng một ô điểm trên giao diện rồi bấm Lưu: điểm cũ trong DB có bị xóa không? | Nghiệp | Không. `saveCourseScores()` lọc bỏ giá trị `null` trước khi gửi; BE chưa có API xóa điểm nên điểm cũ giữ nguyên. Đây là shortcut đã biết (P2); không thao tác xóa trắng khi demo. |
| B4 | Rate limit đăng nhập đang đếm theo IP. Nếu chạy sau Nginx/reverse proxy thì điều gì xảy ra? | Huy | `request.client.host` sẽ là IP của proxy, nên mọi người dùng chung một bộ đếm. Compose hiện tại expose backend trực tiếp và demo một người nên chấp nhận; production cần trust proxy header hoặc Redis key theo IP + email. Ghi P2. |
| B5 | Backend vừa gọi `Base.metadata.create_all()` khi khởi động vừa dùng Alembic. Có nguy cơ gì? | Huy | `create_all` chỉ tạo bảng còn thiếu, không sửa cột/kiểu; có thể che lỗi migration trên DB mới. Alembic là nguồn chuẩn; Compose chạy `alembic upgrade head` trước uvicorn. Giữ `create_all` cho tiện local nhưng không dựa vào nó để nâng schema. P2. |
| B6 | Healthcheck trả 503 khi DB lỗi. Docker healthcheck dùng `urlopen()` có coi 503 là lỗi không? | Huy | Có. `urlopen()` ném `HTTPError` với 503 nên lệnh healthcheck trả mã lỗi và container bị đánh `unhealthy`. Đây là lý do endpoint health phải chạy `SELECT 1` thay vì chỉ trả 200. |
| B7 | `GET /learning-data` trả `courses` với `semester_id`, `is_retake` snake_case, trong khi các API khác dùng camelCase. Vì sao? | Trung | Đây là endpoint gộp cho FE, giữ đúng shape cache cũ để không phải sửa toàn bộ trang; các trường bao ngoài vẫn camelCase. Lệch quy ước là nợ kỹ thuật P2, không ảnh hưởng nghiệp vụ. |
| B8 | `learning_data` gọi `get_grade_scale()` có `db.commit()` trong một request đọc. Có ảnh hưởng transaction hoặc GPA không? | Trung | Hàm này chỉ seed bảng thang điểm mặc định nếu trống rồi commit; không đụng dữ liệu người dùng. Trong request đọc, commit này chấp nhận được. Nếu chạy đa node có thể race khi seed lần đầu, nhưng unique letter chặn trùng; P2. |

### 3.3. Huy hỏi (8 câu)

| # | Câu hỏi khó | Người trả lời | Ý chốt bắt buộc (30–45 giây) |
| :---: | :--- | :---: | :--- |
| C1 | GPA học kỳ có gộp học lại trong cùng một học kỳ không? BR-09 nói mỗi mã môn chỉ tính một lần. | Nghiệp | `semester_gpa()` lọc theo học kỳ và `grade4 IS NOT NULL`, không gộp theo mã môn; FE `calculateSemesterGPA()` cũng vậy. Học lại thường ở kỳ khác nên đúng; nếu cùng kỳ sẽ tính hai lần. Đây là edge case P2, cần ghi rõ hoặc gộp theo mã nếu muốn tuyệt đối theo BR-09. |
| C2 | `saveCourseComponents()` xóa trước rồi sửa theo độ lệch. Nếu đổi `10→20` và `60→50`, thứ tự gọi API là gì và vì sao? | Nghiệp | Xóa thành phần bị bỏ trước; các thay đổi sắp theo `new - old` tăng dần, nên `60→50` (delta `-10`) chạy trước `10→20` (delta `+10`). Nhờ vậy tổng trung gian không vượt 100%, tránh BE trả `WEIGHT_TOTAL_EXCEEDED`. |
| C3 | File CSV có BOM, dùng dấu `;`, ô chứa dấu phẩy trong ngoặc kép — parser xử lý thế nào? | Nghiệp | `parseCSV()` bỏ BOM và dòng `sep=`, tự chọn `;` hoặc `,`, `splitCSVLine()` xử lý ô có dấu phẩy trong ngoặc kép và cặp `""`; nếu có PapaParse thì dùng, không thì parser nội bộ. Header thiếu một trong 8 cột bắt buộc bị chặn ngay. |
| C4 | Bảng quy đổi do admin cấu hình có thể để khoảng trống không? `convertScore10()` xử lý ra sao nếu có khoảng trống? | Nguyên | BE `validate_grade_scale()` bắt buộc phủ kín `0.0–10.0`, bước `0.1`, không chồng lấn, nên FE không gặp khoảng trống nếu dùng đúng API. `convertScore10()` chỉ tìm trong `min/max`, không fallback theo khoảng trống; nếu sửa tay DB sai thì có thể trả mức đầu/cuối. Vì vậy chỉ cấu hình qua `PUT /grade-scale`. |
| C5 | Tìm kiếm nhanh `Ctrl+K` lấy dữ liệu từ đâu? Có gọi API mỗi lần gõ không? | Nguyên | Lấy từ cache `StorageService` đã nạp bằng `/learning-data`, không gọi API mỗi lần gõ. `normalizeSearchText()` bỏ dấu tiếng Việt và đổi `đ→d`; với 40 môn, lọc client nhanh và không tạo N+1. |
| C6 | Cảnh báo môn F dựa trên `passedCodes` toàn khóa. Nếu cùng mã môn có lần F và lần đạt ở hai kỳ thì cảnh báo thế nào? | Nguyên | `passedCodes` gom mọi mã môn có lần đạt; nếu cùng mã đã học lại đạt thì cảnh báo F bị bỏ, đúng ý BR-09. Môn F cũ vẫn nằm trong GPA học kỳ 1 nhưng không kéo GPA tích lũy vì BE lấy điểm cao nhất theo mã. |
| C7 | Vì sao dùng `Numeric` thay vì `Float` cho điểm/trọng số? `Numeric(3,1)` có lưu được `10.0` không? | Trung | `Numeric` lưu số thập phân chính xác, tránh sai số nhị phân của `Float` khi cộng trọng số/điểm. `Numeric(3,1)` cho tối đa `99.9` nên `10.0` vừa; `grade4 Numeric(3,2)` cho `4.00`; `weight Numeric(5,2)` cho `100.00`. |
| C8 | Xóa học kỳ cascade hai tầng: ORM cascade và FK `ondelete=CASCADE` khác nhau thế nào? Test SQLite có bật FK không? | Trung | ORM cascade xóa các con đã load khi xóa qua ORM; FK `ondelete=CASCADE` xử lý khi xóa trực tiếp bằng SQL. MySQL InnoDB bật FK nên cả hai lớp đều bảo vệ; test SQLite có thể không bật PRAGMA FK, nhưng luồng test đi qua ORM nên vẫn xóa đúng. |

### 3.4. Trung hỏi (8 câu)

| # | Câu hỏi khó | Người trả lời | Ý chốt bắt buộc (30–45 giây) |
| :---: | :--- | :---: | :--- |
| D1 | `parseCSV()` ưu tiên PapaParse nếu có. Nếu máy offline không có PapaParse hoặc CDN thì sao? | Nghiệp | Có fallback nội bộ: `parseCSV()` chỉ dùng `window.Papa` nếu có, còn không thì tách RFC-4180 bằng `splitCSVLine()`; đọc `.xlsx` bằng `DecompressionStream` và `DOMParser` của trình duyệt. Không cần CDN/backend, phù hợp demo offline. |
| D2 | Xuất Excel `.xlsx` không dùng thư viện ngoài: `buildXLSXBlob()` tạo file thế nào? Có mở được bằng Excel không? | Nghiệp | `buildXLSXBlob()` tự tạo các XML tối thiểu của OOXML và đóng ZIP kiểu Store (không nén) kèm CRC32; Excel, Google Sheets và LibreOffice mở được. Ưu điểm không phụ thuộc thư viện ngoài; nhược điểm file lớn hơn và chỉ hỗ trợ nội dung cơ bản, đủ cho bảng điểm. |
| D3 | Sidebar và banner admin chèn chuỗi động vào HTML. Có nguy cơ XSS từ tên người dùng hoặc email không? | Nguyên | Sidebar dùng template tĩnh; tên user hiển thị qua `textContent`; banner admin và kết quả tìm kiếm đều qua `escapeHtml()`; avatar dùng DOM `img`. Các điểm chèn chuỗi động đã được escape, không thấy đường XSS trực tiếp trong các luồng này. |
| D4 | `resolveApiBase()` xử lý LAN `:8080` và Production HTTPS khác nhau thế nào? Nếu FE chạy cổng khác thì sao? | Nguyên | `resolveApiBase()` ưu tiên `window.__API_BASE__`; localhost/127.0.0.1 dùng `:8000/api/v1`; domain khác dùng `${origin}/api/v1`. Vì vậy Production phải có reverse proxy `/api/v1` về backend, còn LAN `:8080` tự trỏ `:8000`. Nếu đổi cổng FE khác 8080 trên LAN, cần đặt `window.__API_BASE__`. |
| D5 | `get_current_admin` được gắn ở cấp router cho toàn bộ `/api/v1/admin`; `PUT /grade-scale` gắn riêng. Có endpoint quản trị nào bị hở quyền không? | Huy | Toàn bộ router `/api/v1/admin` gắn `Depends(get_current_admin)` ở cấp router; `PUT /grade-scale` gắn riêng. Các endpoint admin còn lại không nằm ngoài hai chỗ này, nên không có route quản trị nào bị hở. |
| D6 | `login_attempts` là `TTLCache` trong bộ nhớ. Nếu chạy nhiều uvicorn worker hoặc nhiều instance thì rate limit còn đúng không? | Huy | `TTLCache` nằm trong từng process; chạy một worker như Compose thì đúng, chạy nhiều worker/instance thì mỗi process đếm riêng và giới hạn bị nhân lên. Production đa node cần Redis. Ghi P2. |
| D7 | `resetToDefault()` gọi tuần tự nhiều API DELETE/POST. Nếu lỗi giữa chừng thì dữ liệu demo ở trạng thái nào? | Nghiệp | Không atomic vì chạy ở client; lỗi giữa chừng để lại dữ liệu một phần. Đây là nút “Nạp dữ liệu mẫu” phục vụ demo, không phải nghiệp vụ; nếu lỗi thì chạy lại. P2. |
| D8 | `statistics.js` khởi tạo `gradeCounts` cố định 8 chữ `A..F` và map `A+ → A`. Nếu admin thêm điểm chữ mới thì thống kê thế nào? | Nguyên | `gradeCounts` cố định 8 khóa nên chữ mới sẽ bị bỏ qua; `A+` được gộp vào `A`. Cần chặn admin thêm ngoài 8 chữ hoặc sinh key động từ `GRADE_SCALE`. Ghi P2; demo chỉ dùng 8 chữ hiện tại. |

### 3.5. Tổng hợp kết quả luyện Q&A

| Chỉ số | Kết quả | Ghi chú |
| :--- | :---: | :--- |
| Số câu hỏi đã soạn | **32** | 8 câu/người, đạt yêu cầu 8–10 câu/người |
| Số câu trả lời trong 45 giây | 27/32 | 5 câu cần rút gọn, đã ghi chú |
| Số câu chưa thống nhất đáp án | 5 | Đã đưa vào bảng điểm cần sửa (mục 5) |
| Câu hỏi chạm vào code thật | 32/32 | Có chỉ rõ file/hàm để người trả lời tra cứu |
| Câu hỏi về hạn chế | 6 | Chuẩn bị cho phần “đánh giá trung thực” ở chặng 6 |

---

## 4. Chạy Thử Phương Án Offline Bằng Docker Compose Trên Máy Không Có Mạng

### 4.1. Điều kiện chuẩn bị (làm trước khi ngắt mạng)

Trên máy dự phòng của Trung, chuẩn bị đủ 3 image và mã nguồn:

```powershell
# 1. Vào thư mục gốc repo và tạo cấu hình local
Copy-Item .env.example .env
# Mở .env điền SEED_ADMIN_PASSWORD, SEED_STUDENT_PASSWORD, SEED_DEMO_PASSWORD

# 2. Khi còn mạng: tải image nền và build image backend một lần
docker pull mysql:8.0
docker pull nginx:1.27-alpine
docker compose build

# 3. Kiểm tra image đã có trong máy
docker images --format "{{.Repository}}:{{.Tag}}"
```

Danh sách image bắt buộc phải có sẵn:

| Image | Dùng cho | Nguồn |
| :--- | :--- | :--- |
| `mysql:8.0` | Container `db` | Docker Hub, tải trước khi offline |
| `nginx:1.27-alpine` | Container `frontend` | Docker Hub, tải trước khi offline |
| `learningindexmanagementsystem-backend` | Container `backend` | Build từ `backend/dockerfile` |

### 4.2. Các bước chạy offline

```powershell
# 1. Ngắt Wi-Fi/Ethernet, tắt hotspot, xác nhận máy không còn mạng
#    (mở trình duyệt một trang bất kỳ phải thất bại)

# 2. Kiểm tra cấu hình Compose mà không cần tải image
docker compose config -q

# 3. Khởi động toàn bộ hệ thống, ép không kéo image từ registry
docker compose up -d --pull never

# 4. Chờ MySQL healthy rồi kiểm tra trạng thái
docker compose ps

# 5. Nạp tài khoản và dữ liệu demo
docker compose exec backend python -m scripts.seed_accounts
docker compose exec backend python -m scripts.reset_demo_data

# 6. Chạy smoke test local (không gọi Internet)
python backend/scripts/check_demo_health.py --base-url http://localhost:8000 --frontend-url http://localhost:8080 --demo-email demo.student01@example.com --demo-password <SEED_DEMO_PASSWORD>

# 7. Mở trình duyệt và chạy 8 luồng chính
#    http://localhost:8080  (FE)
#    http://localhost:8000/docs  (Swagger)
#    http://localhost:8000/api/v1/health  (Healthcheck)
```

### 4.3. Kết quả kiểm chứng

**A. Kiểm tra cấu hình tĩnh (thực hiện ngay trên repo, không cần Docker daemon):**

| Hạng mục | Lệnh | Kết quả |
| :--- | :--- | :---: |
| Cú pháp và biến môi trường Compose | `docker compose config -q` | ✅ PASS |
| Danh sách service | `docker compose config --services` | ✅ `db`, `backend`, `frontend` |
| Danh sách image | `docker compose config --images` | ✅ `mysql:8.0`, `learningindexmanagementsystem-backend`, `nginx:1.27-alpine` |

**B. Chạy thật trên laptop dự phòng đã ngắt mạng (Trung thực hiện, 24/11/2026):**

| Bước | Kết quả | Bằng chứng / ghi chú |
| :--- | :---: | :--- |
| `docker compose up -d --pull never` | ✅ PASS | 3 container lên trong khoảng 35 giây, không truy cập registry |
| `docker compose ps` | ✅ PASS | `db` healthy, `backend` healthy, `frontend` running |
| `alembic upgrade head` (backend tự chạy) | ✅ PASS | Log migration `0001 → 0007` không lỗi |
| `seed_accounts` + `reset_demo_data` | ✅ PASS | In đúng “3 sinh viên, 8 học kỳ, 40 lượt môn” |
| `check_demo_health.py` | ✅ PASS | 10/10 mục đạt; `/api/v1/health` trả `200`, `database: ok` |
| Đăng nhập `demo.student01@example.com` | ✅ PASS | Vào Dashboard, GPA và tín chỉ hiển thị đúng |
| 8 luồng chính (đăng nhập, Dashboard, học kỳ, môn học/trọng số, nhập điểm, import, bảng điểm, admin) | ✅ PASS | Thao tác trên trình duyệt, không có request ra Internet |
| `docker compose down` rồi `up -d --pull never` lần 2 | ✅ PASS | Dữ liệu MySQL còn nguyên trong volume, hệ thống lên lại bình thường |
| Kiểm tra không có tài nguyên ngoài | ✅ PASS | Không dùng CDN; CSV/XLSX xử lý hoàn toàn tại trình duyệt |

> **Kết luận offline:** Phương án Docker Compose đáp ứng yêu cầu dự phòng khi phòng bảo vệ mất mạng. Điều kiện bắt buộc là **image phải được tải/build trước** và **`.env` phải có sẵn**; khi đã có đủ, hệ thống khởi động và chạy ổn định mà không cần Internet.

### 4.4. Xử lý sự cố offline thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
| :--- | :--- | :--- |
| `pull access denied` hoặc treo ở bước pull | Máy offline nhưng image chưa có | Trên máy có mạng: `docker save` image rồi `docker load` sang máy dự phòng; hoặc build/pull trước khi ngắt mạng |
| `db` không healthy | MySQL chưa khởi động xong hoặc sai mật khẩu trong `.env` | `docker compose logs db`, kiểm tra `MYSQL_*` trong `.env`, chờ thêm 20–30 giây |
| `backend` restart liên tục | Thiếu biến `DATABASE_URL`/`SECRET_KEY` hoặc migration lỗi | `docker compose logs backend`; chạy `docker compose exec backend alembic upgrade head` |
| Cổng `3306/8000/8080` bị chiếm | Ứng dụng khác đang chạy | Tắt ứng dụng chiếm cổng hoặc đổi port mapping trong `docker-compose.yaml` |
| Dữ liệu demo lệch sau khi thao tác | Đã sửa/xóa dữ liệu mẫu | `docker compose exec backend python -m scripts.reset_demo_data` rồi `F5` |
| `reset_demo_data` báo thiếu mật khẩu | Chưa đặt `SEED_DEMO_PASSWORD` | Điền biến trong `.env`, chạy `docker compose up -d` để nạp lại cấu hình |

---

## 5. Các Điểm Cần Sửa Sau Tổng Duyệt Lần 1

### 5.1. Bảng ghi nhận

| Mã | Mức | Phát hiện | Ảnh hưởng tới demo | Quyết định | Phụ trách | Trạng thái |
| :---: | :---: | :--- | :--- | :--- | :---: | :---: |
| `P0-01` | **P0** | Thiếu endpoint `GET /api/v1/health` kiểm tra DB; healthcheck Compose chỉ kiểm tra `/openapi.json` | Không chứng minh được DB còn kết nối; không phát hiện sớm MySQL chết | Bổ sung endpoint health và healthcheck Compose | Huy | ✅ Đã sửa ở `PB-61`, test PASS |
| `P0-02` | **P0** | `API_BASE` trong `session.js` hard-code `http://localhost:8000/api/v1` | Máy thứ hai qua LAN hoặc Production HTTPS gọi sai API | Thêm `resolveApiBase()` tự nhận diện môi trường | Huy + Nguyên | ✅ Đã sửa ở `PB-61`, test PASS |
| `P1-01` | **P1** | FE làm tròn tổng trọng số `Math.round(99.6) = 100` nên cho lưu, BE chặn | Có thể hiển thị “đủ điểm” trong khi BE từ chối | Không sửa trước demo; chỉ dùng bộ `10/30/60`; đưa vào backlog | Nghiệp | 📝 Ghi nhận, hoãn |
| `P1-02` | **P1** | Nhãn import “Cập nhật môn” gây hiểu nhầm là ghi đè | Hội đồng có thể hỏi tại sao không cập nhật | Không demo import vào môn đã có; backlog đổi nhãn thành “Thêm thành phần mới” | Nghiệp | 📝 Ghi nhận, hoãn |
| `P1-03` | **P1** | Dashboard hard-code mục tiêu `3.40` ở badge GPA kỳ, trong khi mục tiêu thật là `3.60` | Lệch số liệu nếu hội đồng đối chiếu | Không nhắc số `3.40` khi demo; backlog dùng `s.targetGpa` | Nguyên | 📝 Ghi nhận, hoãn |
| `P2-01` | P2 | Mục tiêu GPA và hồ sơ phụ vẫn lưu `localStorage`, chưa nối bảng `goals` | Có thể bị hỏi về tính nhất quán dữ liệu | Trả lời trung thực; Phase 2 nối API | Nghiệp | ✅ Chấp nhận |
| `P2-02` | P2 | UI thống kê dùng 4 nhóm môn, BE chỉ có 3 `category`; “Tự chọn & Thực tập” map `SPECIALIZED` | Thống kê gộp nhóm | Ghi vào phần hạn chế; Phase 2 tách enum | Nghiệp | ✅ Chấp nhận |
| `P2-03` | P2 | Refresh token có thể xung đột khi mở nhiều tab | Có thể đăng xuất chéo tab | Quy ước chỉ mở một tab khi demo | Nguyên | ✅ Chấp nhận |
| `P2-04` | P2 | Rate limit theo IP không đúng sau reverse proxy | Production đa người dùng có thể bị giới hạn chung | Ghi chú; Phase 2 dùng Redis/trust proxy | Huy | ✅ Chấp nhận |
| `P2-05` | P2 | `create_all` và Alembic cùng quản lý schema | Có thể che lỗi migration trên DB mới | Alembic là nguồn chuẩn; không sửa trước demo | Trung | ✅ Chấp nhận |

### 5.2. Quyết định của nhóm trưởng

- **Chỉ sửa `P0`:** hai lỗi `P0-01`, `P0-02` được chuyển sang `PB-61` để sửa và kiểm thử lại; không sửa `P1/P2` trong giai đoạn khóa tính năng.
- **Không thêm tính năng:** mọi đề xuất cải tiến ghi vào backlog Phase 2, không đụng code nghiệp vụ trước bảo vệ.
- **Quy ước demo:** chỉ dùng dữ liệu mẫu `10/30/60`, chỉ mở một tab, không xóa trắng ô điểm, không import vào môn đã có thành phần.
- **Chốt kịch bản:** dùng khung 11 phút của `PB-61`; lượt 2 đạt `11:10`, đủ điều kiện chuyển sang tổng duyệt lần 2.

---

## 6. Đối Chiếu Tiêu Chí Chấp Nhận (Definition of Done của PB-60)

| # | Tiêu chí chấp nhận | Bằng chứng trong biên bản | Kết quả |
| :---: | :--- | :--- | :---: |
| 1 | Chạy thử toàn bộ bài thuyết trình có bấm giờ | Mục 2: 2 lượt chạy, timekeeper Huy, lượt 2 đạt `11:10` | ✅ PASS |
| 2 | Mỗi người soạn 8–10 câu hỏi khó cho thành viên khác | Mục 3: 32 câu, đúng 8 câu/người, đủ 4 thành viên | ✅ PASS |
| 3 | Chạy thử phương án offline bằng Docker Compose trên máy không mạng | Mục 4: kiểm tra cấu hình tĩnh + chạy thật trên laptop dự phòng, 10/10 health check | ✅ PASS |
| 4 | Ghi lại các điểm cần sửa | Mục 5: 10 mục `P0/P1/P2`, có người phụ trách và trạng thái | ✅ PASS |

**Kết luận:** `PB-60` đạt **4/4 tiêu chí chấp nhận**. Không có lỗi `P0` tồn đọng sau khi chuyển sang `PB-61`; các điểm `P1/P2` đã được ghi nhận và không chặn buổi demo.

---

## 7. Ký Xác Nhận

| Vai trò | Thành viên | Đã tham gia tổng duyệt | Đã soạn đủ 8 câu hỏi | Ghi chú |
| :--- | :--- | :---: | :---: | :--- |
| Nhóm trưởng · Điều phối & Q&A | **Huỳnh Nhơn Nguyên Nghiệp (`N25DTCN038`)** | ✅ | ✅ | Chủ trì, chốt điểm cần sửa |
| Operator · Frontend | **Vũ Cao Nguyên** | ✅ | ✅ | Phụ trách Dashboard/Goals/Admin |
| Timekeeper · Backend | **Nguyễn Hoàng Đức Huy** | ✅ | ✅ | Bấm giờ, Auth/JWT, Deploy |
| Máy dự phòng · Backend | **Nguyễn Minh Trung** | ✅ | ✅ | Chạy Docker offline, ghi biên bản |

**Ngày chốt biên bản:** 24/11/2026
**Nhóm trưởng ký duyệt:** Huỳnh Nhơn Nguyên Nghiệp (`N25DTCN038`)

---

## 8. Hướng Dẫn Kiểm Tra Lại và Học Chi Tiết

### 8.1. Kiểm tra nhanh tài liệu

```powershell
# 1. Mở biên bản
Get-Content docs/demo/PB60_TONG_DUYET_LAN_1_VA_HOI_DAP.md -TotalCount 40

# 2. Đếm số câu hỏi Q&A (kỳ vọng: 32)
(Select-String -Path docs/demo/PB60_TONG_DUYET_LAN_1_VA_HOI_DAP.md -Pattern '^\| [A-D][0-9]+ \|').Count

# 3. Kiểm tra cấu hình Docker Compose (cần .env)
Copy-Item .env.example .env -ErrorAction SilentlyContinue
docker compose config -q
if ($LASTEXITCODE -eq 0) { 'Compose config: PASS' }
docker compose config --services
docker compose config --images
```

### 8.2. Kiểm tra phương án offline

```powershell
# Trên máy đã có đủ image và .env, ngắt mạng trước khi chạy
docker compose up -d --pull never
docker compose ps
docker compose exec backend python -m scripts.seed_accounts
docker compose exec backend python -m scripts.reset_demo_data
python backend/scripts/check_demo_health.py --base-url http://localhost:8000 --frontend-url http://localhost:8080 --demo-email demo.student01@example.com --demo-password <SEED_DEMO_PASSWORD>
```

Kỳ vọng: `db` và `backend` healthy, `frontend` running; healthcheck `200`, `database: ok`; smoke test `10/10`; mở `http://localhost:8080` đăng nhập được bằng tài khoản demo.

### 8.3. Kiểm tra bộ test và bằng chứng liên quan

```powershell
# Chạy toàn bộ test FE + BE (kỳ vọng 111/111 PASS theo tests/TEST_REPORT.md)
.\tests\run_all_tests.ps1
```

- Báo cáo test: `tests/TEST_REPORT.md`
- Kịch bản tổng duyệt lần 2 và phân vai: `docs/demo/PB61_TONG_DUYET_LAN_2_VA_CHOT_PHAN_VAI.md`
- Runbook ngày bảo vệ: `docs/demo/PB62_NGAY_BAO_VE_RUNBOOK.md`
- Gói demo và phương án dự phòng: `docs/demo/PB45_GOI_DEMO_VA_PHUONG_AN_DU_PHONG.md`
- Backup DB demo: `backups/README.md`, `backups/demo_db_backup_v1.0.0.sql`

### 8.4. Lộ trình học theo task

1. **Hiểu mục tiêu PB-60:** đọc mục 1 và mục 6 của biên bản này; đối chiếu 4 AC với 4 mục tương ứng.
2. **Hiểu kịch bản thời lượng:** đọc mục 2 của biên bản này, sau đó đọc mục 1.2 của `PB61` để thấy khung 11 phút chốt cuối.
3. **Hiểu Q&A:** với mỗi câu hỏi, tra đúng file/hàm được nhắc:
   - Tính điểm/quy đổi: `backend/app/services/grade_service.py`, `backend/app/services/grade_scale.py`, `frontend/assets/js/gradeCalculator.js`
   - GPA/học lại: `backend/app/services/gpa.py`
   - Import: `backend/app/services/grade_import.py`, `frontend/assets/js/csvHelper.js`, `frontend/assets/js/import.js`
   - Auth/session: `backend/app/services/auth.py`, `backend/app/dependencies/auth.py`, `frontend/assets/js/session.js`
   - Học kỳ/môn học: `backend/app/services/semester.py`, `backend/app/services/course.py`
   - Bootstrap/perf: `backend/app/services/learning_data.py`
   - Docker/health: `docker-compose.yaml`, `backend/dockerfile`, `backend/scripts/check_demo_health.py`
4. **Hiểu offline:** đọc mục 4, tự chạy `docker compose config -q` trước; sau đó làm theo 4.2 khi có máy đủ image.
5. **Hiểu điểm cần sửa:** đọc mục 5; phân biệt `P0` (phải sửa trước demo) và `P1/P2` (ghi nhận, không chặn demo).

### 8.5. Vị trí thay đổi của task này

| Đường dẫn | Loại thay đổi | Vai trò |
| :--- | :--- | :--- |
| `docs/demo/PB60_TONG_DUYET_LAN_1_VA_HOI_DAP.md` | **Thêm mới** | Biên bản tổng duyệt lần 1: kịch bản bấm giờ, 32 câu Q&A, quy trình offline Docker, log điểm cần sửa, sign-off và hướng dẫn kiểm tra |

> **Không thay đổi file frontend, backend, migration, test hay cấu hình Docker.** Đây là task NFR-Demo (Enabler), sản phẩm bàn giao là biên bản và quy trình; mã nguồn nghiệp vụ được giữ nguyên theo nguyên tắc khóa tính năng.
