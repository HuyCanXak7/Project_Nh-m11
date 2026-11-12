# FR-09 · GPA học kỳ · PB-18 · T0694D8

Người phụ trách BE: Nguyễn Hoàng Đức Huy (N25DTCN093). FE theo task: Vũ Cao Nguyên.

Lần nộp trước bị fail vì chưa có link minh chứng. Lần nộp lại cần có link PR, commit hoặc nhánh đã push lên GitHub; file trên máy chưa phải link minh chứng mà người review truy cập được.

## Phạm vi đã có

- API `GET /api/v1/semesters/{semesterId}/gpa`, yêu cầu Bearer access token.
- GPA = tổng (điểm hệ 4 × tín chỉ) / tổng tín chỉ của các môn đủ điểm.
- Môn F vẫn tính vào GPA; không cộng vào tín chỉ đạt.
- Môn chưa đủ điểm bị loại khỏi cả tử số và mẫu số.
- Học kỳ rỗng/chỉ có môn chưa đủ điểm: `gpa4=null`, `ranking=null`, tín chỉ tính GPA bằng 0.
- Học kỳ có toàn môn F: GPA thực bằng 0, xếp loại Yếu / Kém.
- Làm tròn HALF_UP hai chữ số trước khi xếp loại, theo README: ≥3.60 Xuất sắc; ≥3.20 Giỏi; ≥2.50 Khá; ≥2.00 Trung bình; còn lại Yếu / Kém.
- Không tồn tại/khác chủ sở hữu: 404; thiếu token: 401; ID sai: 400.
- Swagger sinh từ backend có schema response và mô tả FR-09.
- Trang học kỳ và bảng điểm hiển thị GPA, xếp loại, trạng thái chưa đủ điểm.

Frontend hiện dùng localStorage và đăng nhập giả lập. Kiểm thử API bên dưới chạy FastAPI thật qua TestClient trên SQLite tạm. Đây là minh chứng BE và kiểm thử logic FE riêng; chưa phải kiểm thử luồng frontend gọi database backend. Không ghi trong bài nộp rằng đã tích hợp FE–BE toàn bộ.

## File chính để review

| File | Vai trò |
|---|---|
| `backend/app/routers/gpa.py` | Endpoint, owner check qua service, Swagger |
| `backend/app/schemas/gpa.py` | Schema GPA học kỳ và response |
| `backend/app/services/gpa_service.py` | Trọng số tín chỉ, làm tròn, xếp loại |
| `backend/app/repositories/gpa_repository.py` | Truy vấn theo user và học kỳ |
| `backend/tests/test_gpa.py` | Kiểm thử API và các trường hợp biên |
| `backend/scripts/verify_fr09.py` | Xuất minh chứng API bằng database tạm |
| `frontend/assets/js/gradeCalculator.js` | Công thức FE, kiểm tra môn đủ điểm |
| `frontend/assets/js/pages/semesters.js` | Hiển thị GPA và xếp loại trên thẻ học kỳ |
| `frontend/assets/js/pages/transcript.js` | Hiển thị xếp loại trên bảng điểm |
| `frontend/assets/js/pages/dashboard.js` | Bỏ qua học kỳ chưa có GPA khi dựng biểu đồ |
| `frontend/tests/test_semester_gpa.cjs` | Kiểm thử logic và HTML thẻ học kỳ |
| `.github/workflows/ci.yml` | Chạy kiểm thử BE và FE trên GitHub |

## Chạy lại để lấy minh chứng

Từ thư mục gốc `Project_Nh-m11`, dùng PowerShell. Cài dependency kiểm thử nếu chưa có:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-test.txt
Set-Location backend
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
..\.venv\Scripts\python.exe -m scripts.verify_fr09
Set-Location ..
node --test frontend/tests/test_semester_gpa.cjs
.\.venv\Scripts\python.exe -m unittest discover -s frontend/tests -v
```

JavaScript test yêu cầu Node.js 22 như CI. Máy hiện tại không có lệnh `node` trên PATH nên phiên thực hiện đã chạy sáu test FE bằng Node VM có harness gọi các test đồng bộ; đã kiểm tra cú pháp 17 file JavaScript. Chưa chạy trình duyệt hoặc CI trên GitHub trong phiên này.

Script `verify_fr09` luôn dùng SQLite tạm, bỏ qua `DATABASE_URL` ứng dụng và `GPA_TEST_DATABASE_URL`, dọn dữ liệu sau khi chạy. Không in mật khẩu hoặc token. Nó cần các dependency kiểm thử và thư mục `backend/tests`.

Các file minh chứng đã tạo:

- [Kết quả backend: 14 tests OK](../evidence/T0694D8-backend-tests.txt).
- [Phản hồi API: 8 trường hợp](../evidence/T0694D8-api-results.json).
- [Kết quả FE: 6 tests đạt và 17 file đúng cú pháp](../evidence/T0694D8-frontend-tests.json).

Ví dụ đối chiếu:

| Môn | Tín chỉ | Hệ 4 | Tính vào GPA |
|---|---:|---:|---|
| A | 3 | 4.0 | Có |
| B | 2 | 0.0 | Có |
| C | 20 | Chưa đủ điểm | Không |

Kết quả: `(4×3 + 0×2)/(3+2) = 2.40`, xếp loại Trung bình; tín chỉ tính GPA 5, tín chỉ đạt 3. Tình huống này nằm trong JSON minh chứng API và test FE.

## Minh chứng giao diện bổ sung

Chạy frontend theo `development.md`, đăng nhập tài khoản demo FE rồi mở trang Học kỳ. Tạo một học kỳ thử, thêm môn/điểm theo bảng trên và chụp thẻ học kỳ có GPA 2.40, xếp loại Trung bình. Chụp thêm học kỳ chưa đủ điểm để thấy dấu `--` và thông báo tương ứng. Có thể mở trang Bảng điểm để đối chiếu cùng học kỳ.

Ảnh này là minh chứng giao diện localStorage; dùng JSON/test backend để chứng minh API. Khi chụp Swagger, cần dữ liệu học kỳ trong database đang chạy; ID trong JSON là ID của database kiểm thử tạm, không được mặc định dùng làm ID của MySQL local.

## Đưa mã và minh chứng lên GitHub

1. Mở Source Control, xem lại thay đổi. Workspace có sẵn nhiều thay đổi chuyển file từ thư mục gốc sang `backend/` và `frontend/`; kiểm tra cả file mới và file cũ bị xóa để không bỏ sót phụ thuộc khi commit. Chọn các thay đổi đã review và stage bằng Source Control.
2. Kiểm tra nội dung đã stage và commit với mã task:

```powershell
git status --short
git diff --cached --stat
git commit -m "feat(gpa): complete semester GPA and evidence [PB-18] T0694D8"
git push -u origin HEAD
```

3. Trên GitHub, tạo PR từ nhánh vừa push vào `develop` theo quy ước README. Tiêu đề: `T0694D8 [PB-18] Hoàn thiện tính GPA học kỳ`.
4. Chờ GitHub Actions chạy. Chỉ ghi CI xanh sau khi kiểm tra kết quả thực tế. Không cần merge PR chỉ để lấy link nộp minh chứng.
5. Sao chép URL PR. Nếu chưa tạo PR, vào mục Commits của nhánh vừa push, mở commit có mã T0694D8 rồi sao chép URL commit. Link thường có dạng `https://github.com/HuyCanXak7/Project_Nh-m11/commit/<SHA-thật>`; thay bằng URL thực, không nộp nguyên mẫu.

Mẫu mô tả PR:

```text
FR-09 / PB-18 / T0694D8: GPA học kỳ có trọng số tín chỉ, chỉ tính môn đủ điểm.
Môn F vẫn tham gia GPA; phân biệt GPA bằng 0 với chưa có dữ liệu; xếp loại theo README.
Bổ sung schema Swagger và hiển thị xếp loại trên học kỳ/bảng điểm.

Validation: 14 backend tests OK; 6 FE checks đạt qua Node VM; static links OK.
Kết quả và phản hồi API tại docs/evidence/T0694D8-*.
FE đang dùng localStorage; chưa kiểm thử luồng FE gọi backend trên trình duyệt.
```

## Nộp lại task

Trong task T0694D8, điền **Link minh chứng** bằng URL PR hoặc commit thực tế đã push. Ghi chú có thể sao chép:

```text
Nộp lại FR-09 / PB-18 – BE Nguyễn Hoàng Đức Huy (N25DTCN093).
API GET /api/v1/semesters/{semesterId}/gpa tính GPA theo tín chỉ,
loại môn chưa đủ điểm, vẫn tính môn F, trả GPA và xếp loại.
Đã kiểm tra học kỳ rỗng, GPA bằng 0, làm tròn, ngưỡng xếp loại và quyền sở hữu.
14 backend tests OK. Minh chứng phản hồi API và kết quả test ở docs/evidence/.
FE bổ sung hiển thị xếp loại trên dữ liệu localStorage; chưa tích hợp FE–BE toàn bộ.
```

Nhấn **Thêm link**, kiểm tra link xuất hiện trong mục Minh chứng, rồi chuyển task sang Hoàn thành/nộp review theo quy trình lớp. Các file TXT/JSON có thể tải lên bổ sung; link PR/commit là minh chứng chính theo lý do fail trước đó. Tài khoản người review cần có quyền xem repository nếu repository private.
