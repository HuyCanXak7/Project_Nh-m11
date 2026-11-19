# Hệ thống quản lý chỉ số học tập – Nhóm 11

Ứng dụng web giúp sinh viên quản lý học kỳ, môn học và điểm thành phần. Hệ thống tự tính điểm môn, quy đổi sang điểm chữ và hệ 4, tính GPA học kỳ và GPA tích lũy, đặt mục tiêu GPA và mô phỏng kết quả. Quản trị viên quản lý tài khoản, thang điểm và xem thống kê.

Tài liệu này **chốt các nguyên tắc làm việc và quy tắc nghiệp vụ chung** của cả nhóm (theo PB-46 trong Product Backlog). Mọi thành viên FE và BE làm theo đúng tài liệu này. Khi cần thay đổi, phải thảo luận trong nhóm, cập nhật README và SRS trước rồi mới code.

> Đặc tả chi tiết từng yêu cầu: xem `docs/SRS_Nhom11_QuanLyChiSoHocTap.docx`.

---

## Mục lục

1. [Thành viên và phân công](#1-thành-viên-và-phân-công)
2. [Công nghệ và kiến trúc](#2-công-nghệ-và-kiến-trúc)
3. [Quy tắc nghiệp vụ chung](#3-quy-tắc-nghiệp-vụ-chung)
4. [Kiểm tra dữ liệu (validation)](#4-kiểm-tra-dữ-liệu-validation)
5. [Bảo mật và phân quyền](#5-bảo-mật-và-phân-quyền)
6. [Quy ước API](#6-quy-ước-api)
7. [Mẫu tệp import CSV](#7-mẫu-tệp-import-csv)
8. [Quy ước Git](#8-quy-ước-git)
9. [Định nghĩa hoàn thành (Definition of Done)](#9-định-nghĩa-hoàn-thành-definition-of-done)
10. [Mức ưu tiên và mức độ lỗi](#10-mức-ưu-tiên-và-mức-độ-lỗi)
11. [Kế hoạch sprint](#11-kế-hoạch-sprint)
12. [Chạy dự án](#12-chạy-dự-án)

---

## 1. Thành viên và phân công

| Thành viên | Vai trò chính | Phạm vi |
|---|---|---|
| Nguyên | Frontend | Auth, Dashboard, GPA, Mục tiêu, Mô phỏng, Responsive, E2E |
| Nghiệp | Frontend | Học kỳ, Môn học, Nhập điểm, Import, Bảng điểm, Xuất/In |
| Huy | Backend | Auth, Học kỳ, GPA, Admin, Swagger, CI/CD, Deploy |
| Trung | Backend | Môn học, Điểm, Quy đổi, Import, Docker, Bảo mật, Kiểm thử |

Công cụ quản lý công việc: Trello (board theo ngày, nhãn Sprint / Frontend / Backend / Must–Should–Could).

## 2. Công nghệ và kiến trúc

```
Frontend (web)  ──REST/JSON──▶  Backend (API)  ──▶  MySQL
        │                            │
        └── What-if, đọc CSV, xuất tệp xử lý tại FE (không có endpoint)
```

- **CSDL:** MySQL 8 trong Docker Compose; thay đổi schema qua Alembic migration.
- **Xác thực:** JWT (access token + refresh token), mật khẩu băm bằng bcrypt.
- **Tài liệu API:** Swagger.
- **Môi trường:** Docker Compose (`docker compose up`).
- **CI/CD:** GitHub Actions chạy lint + test cho FE và BE.
- **Môi trường triển khai:** `local` → `staging` (demo nội bộ) → `production` (HTTPS, UAT và bảo vệ).

## 3. Quy tắc nghiệp vụ chung

### 3.1. Điểm thành phần và điểm môn

| Mã | Quy tắc |
|---|---|
| BR-01 | Điểm thành phần trong khoảng **0–10**. Tổng trọng số các thành phần của một môn phải **đúng 100%**. |
| BR-02 | **Điểm môn = Σ (điểm thành phần × trọng số)**, làm tròn **1 chữ số thập phân**. |
| BR-03 | Môn **chưa đủ điểm** hoặc **tổng trọng số ≠ 100%**: không tính điểm môn, hiển thị "chưa thể tính". |

### 3.2. Quy đổi thang điểm

| Mã | Quy tắc |
|---|---|
| BR-04 | Quy đổi hệ 10 → điểm chữ → hệ 4 theo **bảng `grade_scale`** trong CSDL. FE đọc bảng qua `GET /grade-scale`, **không hard-code** ở FE. |
| BR-05 | Môn **đạt** khi điểm môn **≥ 4.0**; dưới 4.0 là **rớt (F)**. |
| BR-06 | Các mốc biên phải cho kết quả đúng: **3.9/4.0, 4.9/5.0, 8.4/8.5, 10**. |

**Bảng quy đổi (đối chiếu quy chế đào tạo của trường):**

| Điểm hệ 10 | Điểm chữ | Hệ 4 | Kết quả |
|:---:|:---:|:---:|---|
| 8.5 – 10.0 | A | 4.0 | Đạt |
| 8.0 – 8.4 | B+ | 3.5 | Đạt |
| 7.0 – 7.9 | B | 3.0 | Đạt |
| 6.5 – 6.9 | C+ | 2.5 | Đạt |
| 5.5 – 6.4 | C | 2.0 | Đạt |
| 5.0 – 5.4 | D+ | 1.5 | Đạt |
| 4.0 – 4.9 | D | 1.0 | Đạt (qua môn) |
| 0.0 – 3.9 | F | 0.0 | Rớt môn |

> Điểm môn được làm tròn 1 chữ số thập phân (BR-02) **trước** khi tra bảng, nên các khoảng trên liền nhau, không có khe hở (ví dụ 8.45 → 8.5 → A).

**Xếp loại GPA tích lũy toàn khóa (hệ 4):**

| GPA tích lũy | Xếp loại |
|:---:|---|
| ≥ 3.6 | Xuất sắc |
| 3.2 – 3.59 | Giỏi |
| 2.5 – 3.19 | Khá |
| 2.0 – 2.49 | Trung bình |
| < 2.0 | Yếu / Kém |

### 3.3. GPA và tín chỉ

| Mã | Quy tắc |
|---|---|
| BR-07 | **GPA học kỳ = Σ (điểm hệ 4 × tín chỉ) / Σ tín chỉ**, chỉ tính các môn đã đủ điểm. |
| BR-08 | **GPA tích lũy** tính trên mọi môn đã đủ điểm. Môn **F vẫn tham gia GPA** nhưng **không cộng vào tín chỉ đạt**. |
| BR-09 | **Học lại:** các lần học cùng **mã môn** trong một tài khoản được coi là một môn; **lấy điểm cao nhất**. |
| BR-10 | Tổng tín chỉ bằng 0: không chia, hiển thị trạng thái chưa có dữ liệu. |

### 3.4. Mục tiêu GPA và mô phỏng

| Mã | Quy tắc |
|---|---|
| BR-11 | Mỗi tài khoản có **tối đa 1 mục tiêu**. Tạo khi đã có → trả **409**, hướng dẫn dùng chức năng sửa. |
| BR-12 | Mục tiêu gồm: GPA mục tiêu **0–4.0**, ngày mục tiêu **không ở quá khứ**, **số tín chỉ còn lại dự kiến > 0**. |
| BR-13 | **Điểm cần đạt** (hệ 4, trung bình các môn còn lại) = **(GPA mục tiêu × (TC đã học + TC còn lại) − Σ(điểm hệ 4 × TC) đã có) / TC còn lại**. |
| BR-14 | Kết quả BR-13 **> 4.0** → báo **không khả thi**; **≤ 0** → báo **đã đạt mục tiêu**. |
| BR-15 | **Mô phỏng (What-if)** tính tại FE, dùng **cùng công thức và bảng quy đổi** với BE, **không ghi** vào điểm thật. Kết quả FE phải trùng với BE ở các mốc biên. |
| BR-16 | **Cảnh báo** khi GPA kỳ **< 2.0** hoặc có môn rớt; tự mất khi không còn thỏa điều kiện. |

### 3.5. Xóa dữ liệu

| Mã | Quy tắc |
|---|---|
| BR-17 | Xóa **học kỳ** → xóa dây chuyền các **môn** và **thành phần điểm** của kỳ đó. |
| BR-18 | Xóa **môn** → xóa dây chuyền các **thành phần điểm** của môn đó. |
| BR-19 | Mọi thao tác xóa phải có **hộp xác nhận** và hiển thị **số dữ liệu sẽ mất**. |

### 3.6. Import và export

| Mã | Quy tắc |
|---|---|
| BR-20 | Tệp import: **CSV** (`.xlsx` nếu còn thời gian), tối đa **2 MB** và **1.000 dòng**. |
| BR-21 | FE kiểm tra từng dòng và hiển thị **xem trước + lỗi theo số dòng**; chỉ gửi **dòng hợp lệ** sau khi người dùng xác nhận. |
| BR-22 | BE **kiểm tra lại toàn bộ** (không tin dữ liệu FE), lưu trong **một giao dịch**; lỗi giữa chừng thì **không lưu dở**. |
| BR-23 | Học kỳ / môn chưa tồn tại được **tạo mới** khi người dùng xác nhận ở bước xem trước. |
| BR-24 | Xuất bảng điểm tạo tệp **tại FE**. Ô văn bản bắt đầu bằng `=`, `+`, `-`, `@` phải thêm `'` phía trước (chống CSV injection). |

> ⚠️ **TODO – nhóm chốt:** cách xử lý dòng import **trùng** với dữ liệu đã có (bỏ qua / ghi đè / báo lỗi).

## 4. Kiểm tra dữ liệu (validation)

Mọi ràng buộc phải được kiểm tra **ở cả FE và BE**.

| Đối tượng | Ràng buộc |
|---|---|
| Tài khoản | Email đúng định dạng và chưa được dùng; họ tên không rỗng; mật khẩu ≥ 8 ký tự |
| Học kỳ | Tên, năm học, ngày bắt đầu, ngày kết thúc bắt buộc; ngày kết thúc ≥ ngày bắt đầu |
| Môn học | Mã, tên, tín chỉ, loại môn bắt buộc; tín chỉ > 0; loại ∈ {đại cương, cơ sở ngành, chuyên ngành} |
| Thành phần | Trọng số hợp lệ; tổng = 100% mới được hoàn tất cấu hình |
| Điểm | 0 ≤ điểm ≤ 10 |
| Mục tiêu | Xem BR-11, BR-12 |

## 5. Bảo mật và phân quyền

- Mật khẩu **băm bcrypt**, không bao giờ lưu dạng thô.
- **Access token 15 phút**, **refresh token 7 ngày**. Secret JWT lấy từ **biến môi trường**.
- Refresh token bị **thu hồi** khi: đăng xuất, đổi mật khẩu, tài khoản bị khóa.
- Đăng nhập sai báo **lỗi chung**, không tiết lộ email có tồn tại hay không. Có **rate limit** đăng nhập.
- Tài khoản `is_active = false` không đăng nhập và không dùng token được.
- **Không commit secret.** Chỉ commit `.env.example` với giá trị giả.
- CORS chỉ cho phép domain FE. Dùng ORM / truy vấn tham số hóa (chống SQL injection), escape dữ liệu hiển thị (chống XSS).

**Phân quyền:**

| Vai trò | Được phép |
|---|---|
| `STUDENT` | Chỉ đọc/ghi **dữ liệu của chính mình** |
| `ADMIN` | Quản lý người dùng, khóa/mở tài khoản, cấu hình thang điểm, xem thống kê |

- **Mọi endpoint dữ liệu cá nhân phải kiểm tra owner.** Truy cập dữ liệu người khác → **403/404**.
- Endpoint admin gọi bằng tài khoản sinh viên → **403**.
- Thao tác quản trị (khóa/mở tài khoản) được ghi **audit log**.

## 6. Quy ước API

- **Swagger là hợp đồng.** Mọi thay đổi request/response phải **cập nhật Swagger và báo nhóm trước khi code**.
  - **v1:** Auth, Semester, Course, Grade, Goal.
  - **v1.1:** Thống kê, Goals required-score, `GET /grade-scale`, lưu hàng loạt cho import, Admin.
- Có endpoint **healthcheck** cho staging/production.
- **What-if** và **Export** không có endpoint (xử lý tại FE).

### 6.1. Định dạng response chung

**Mọi endpoint** (kể cả khi lỗi) trả về cùng một khung:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `success` | boolean | `true` nếu xử lý thành công, `false` nếu lỗi |
| `statusCode` | number | Trùng với HTTP status code (200, 201, 400, 401, 403, 404, 409, 429, 500) |
| `message` | string | Thông báo ngắn, tiếng Việt, FE có thể hiển thị trực tiếp |
| `data` | object \| array \| null | Dữ liệu trả về; `null` khi lỗi |
| `error` | object \| null | Chi tiết lỗi; `null` khi thành công |
| `error.code` | string | Mã lỗi máy đọc được (xem bảng 6.2) |
| `error.details` | array | Lỗi theo từng trường / từng dòng; `[]` nếu không có |
| `timestamp` | string | Thời điểm phản hồi, ISO 8601 có múi giờ |
| `path` | string | Đường dẫn của request |

**Thành công:**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Tạo môn học thành công",
  "data": {
    "id": 12,
    "code": "INT1001",
    "name": "Nhập môn lập trình",
    "credits": 3,
    "category": "đại cương",
    "isRetake": false
  },
  "error": null,
  "timestamp": "2026-11-06T11:35:00+07:00",
  "path": "/api/v1/semesters/3/courses"
}
```

**Lỗi validation:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Dữ liệu không hợp lệ",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "weight_percent", "reason": "Tổng trọng số phải bằng 100% (hiện tại: 90%)" }
    ]
  },
  "timestamp": "2026-11-06T11:35:00+07:00",
  "path": "/api/v1/courses/12/components"
}
```

**Lỗi import theo dòng** (thêm `row` trong `details`):

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Tệp import có 2 dòng lỗi, không có dữ liệu nào được lưu",
  "data": null,
  "error": {
    "code": "IMPORT_INVALID_ROWS",
    "details": [
      { "row": 4, "field": "score", "reason": "Điểm phải trong khoảng 0–10" },
      { "row": 9, "field": "credits", "reason": "Tín chỉ phải lớn hơn 0" }
    ]
  },
  "timestamp": "2026-11-06T11:35:00+07:00",
  "path": "/api/v1/import/grades"
}
```

**Danh sách có phân trang** (thêm `meta` trong `data`):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": {
    "items": [ { "id": 1, "email": "sv01@example.com", "fullName": "Sinh viên 01", "isActive": true } ],
    "meta": { "page": 1, "pageSize": 20, "totalItems": 57, "totalPages": 3 }
  },
  "error": null,
  "timestamp": "2026-11-06T11:35:00+07:00",
  "path": "/api/v1/admin/users?page=1&q=sv"
}
```

### 6.2. Mã lỗi chuẩn

| `statusCode` | `error.code` | Khi nào |
|:---:|---|---|
| 400 | `VALIDATION_ERROR` | Dữ liệu sai định dạng / vi phạm ràng buộc (mục 4) |
| 400 | `IMPORT_INVALID_ROWS` | Tệp import có dòng lỗi |
| 400 | `IMPORT_FILE_INVALID` | Tệp sai định dạng, quá 2 MB hoặc quá 1.000 dòng |
| 401 | `UNAUTHORIZED` | Thiếu token, token sai hoặc hết hạn |
| 401 | `INVALID_CREDENTIALS` | Sai email hoặc mật khẩu (thông báo chung, không lộ email tồn tại) |
| 403 | `FORBIDDEN` | Không đủ quyền (sinh viên gọi API admin, truy cập dữ liệu người khác) |
| 403 | `ACCOUNT_LOCKED` | Tài khoản bị khóa (`is_active = false`) |
| 404 | `NOT_FOUND` | Không tìm thấy tài nguyên |
| 409 | `EMAIL_EXISTS` | Email đăng ký đã được dùng |
| 409 | `GOAL_EXISTS` | Đã có mục tiêu GPA, cần dùng chức năng sửa (BR-11) |
| 429 | `TOO_MANY_REQUESTS` | Vượt giới hạn đăng nhập sai (rate limit) |
| 500 | `INTERNAL_ERROR` | Lỗi hệ thống; **không trả stack trace** ra ngoài |

**Quy ước chung:**

- Tên trường JSON dùng **camelCase**; tên cột CSDL và cột CSV dùng **snake_case**.
- Thời gian luôn là **ISO 8601 có múi giờ**.
- Response lỗi 500 chỉ có `message` chung; chi tiết lỗi ghi vào log phía BE.
- Thêm mã lỗi mới phải **cập nhật bảng này và Swagger** trước khi code.

**Chỉ tiêu hiệu năng:** API < **500 ms** ở 95% request (40 môn/người dùng); Dashboard tải < **2 giây**.

## 7. Mẫu tệp import CSV

```csv
semester_name,course_code,course_name,credits,category,component_name,weight_percent,score
HK1 2025-2026,INT1001,Nhập môn lập trình,3,đại cương,Chuyên cần,10,9
HK1 2025-2026,INT1001,Nhập môn lập trình,3,đại cương,Giữa kỳ,30,7.5
HK1 2025-2026,INT1001,Nhập môn lập trình,3,đại cương,Cuối kỳ,60,8
```

### 7.1. API lưu batch import (v1.1 / PB-26)

`POST /api/v1/import/grades` yêu cầu access token và nhận `{ "rows": [...] }`. Mỗi dòng dùng tám cột nghiệp vụ của mẫu CSV, kèm `row` để báo lỗi theo dòng. Để tạo học kỳ mới, gửi thêm `semester_academic_year`, `semester_start_date` và `semester_end_date` dạng ISO (`YYYY-MM-DD`); nếu học kỳ đã tồn tại, các metadata này có thể bỏ qua hoặc gửi đúng với dữ liệu hiện có.

Backend giới hạn 1.000 dòng, kiểm tra lại dữ liệu và owner từ token, tổng trọng số theo môn phải bằng 100%, và chỉ commit toàn bộ batch khi hợp lệ. Thành phần trùng với dữ liệu hiện có hoặc lặp trong batch bị từ chối; không ghi đè điểm. Lỗi trả `IMPORT_INVALID_ROWS` cùng `error.details` có `row`, `field`, `reason`; không có bản ghi nào được lưu. Export tiếp tục được tạo ở FE theo BR-24.

| Cột | Ý nghĩa |
|---|---|
| `semester_name` | Tên học kỳ |
| `course_code` | Mã môn |
| `course_name` | Tên môn |
| `credits` | Số tín chỉ (> 0) |
| `category` | `đại cương` / `cơ sở ngành` / `chuyên ngành` |
| `component_name` | Tên thành phần điểm |
| `weight_percent` | Trọng số %, tổng theo môn = 100 |
| `score` | Điểm 0–10 |

## 8. Quy ước Git

### 8.1. Nhánh

| Nhánh | Mục đích |
|---|---|
| `main` | Bản ổn định, chỉ nhận merge từ `develop` khi phát hành; có tag version |
| `develop` | Nhánh tích hợp chung |
| `feature/<mã-PB>-<mô-tả>` | Tính năng, ví dụ `feature/PB-14-grade-components` |
| `fix/<mã-PB>-<mô-tả>` | Sửa lỗi, ví dụ `fix/PB-17-boundary-8.5` |
| `docs/<mô-tả>` | Tài liệu |

**Không push thẳng** lên `main` và `develop`.

### 8.2. Commit

Theo [Conventional Commits](https://www.conventionalcommits.org/), có mã PB:

```
<type>(<phạm vi>): <mô tả ngắn> [PB-xx]
```

| `type` | Khi nào |
|---|---|
| `feat` | Thêm tính năng |
| `fix` | Sửa lỗi |
| `docs` | Tài liệu, README, Swagger |
| `test` | Thêm/sửa test |
| `refactor` | Sửa code không đổi hành vi |
| `chore` | Cấu hình, CI, Docker, dependency |

Ví dụ:

```
feat(grade): tính điểm môn theo trọng số [PB-16]
fix(auth): thu hồi refresh token khi đổi mật khẩu [PB-05]
docs(api): cập nhật Swagger v1.1 [PB-51]
```

### 8.3. Pull Request

- PR từ `feature/*` hoặc `fix/*` vào `develop`.
- Tiêu đề PR có mã PB; mô tả ghi **làm gì, cách kiểm tra, ảnh chụp** (nếu có UI).
- **Ít nhất 1 thành viên review** và **CI xanh** (lint + test) mới được merge.
- Đổi hợp đồng API → PR phải kèm cập nhật Swagger.

### 8.4. Phiên bản

| Tag | Thời điểm |
|---|---|
| `v0.9.0` | Deploy production để UAT (PB-54) |
| `v1.0.0` | Chốt gói demo bảo vệ (PB-45) |

**Khóa tính năng:** sau khi sửa lỗi P0/P1 sau UAT (PB-56), **không merge tính năng mới**, chỉ sửa lỗi P0.

## 9. Định nghĩa hoàn thành (Definition of Done)

Một card trên Trello chỉ được chuyển sang **Done** khi:

- [ ] Đạt **toàn bộ tiêu chí chấp nhận** trong SRS.
- [ ] Validation có ở **cả FE và BE**; endpoint có **kiểm tra owner**.
- [ ] Trang có đủ trạng thái **loading / rỗng / lỗi**; dùng được ở **360px**.
- [ ] Có **test** cho logic mới (bắt buộc với phần tính điểm/GPA); **CI xanh**.
- [ ] **Swagger** đã cập nhật nếu đổi API.
- [ ] PR đã được **review và merge** vào `develop`.

## 10. Mức ưu tiên và mức độ lỗi

**Ưu tiên (MoSCoW):**

| Mức | Ý nghĩa |
|---|---|
| **Must** | Bắt buộc có trong bản bảo vệ |
| **Should** | Nên có, làm sau khi Must ổn định |
| **Could** | Bonus, chỉ làm nếu còn thời gian và phải xong trước mốc khóa tính năng |

**Mức độ lỗi:**

| Mức | Ý nghĩa | Xử lý |
|---|---|---|
| **P0** | Chặn demo | Sửa ngay, bắt buộc trước bảo vệ |
| **P1** | Quan trọng | Sửa, hoặc quyết định rõ ràng là hoãn |
| **P2** | Để sau | Ghi vào danh sách hạn chế |

## 11. Kế hoạch sprint

| Sprint | Ngày | Trọng tâm |
|---|---|---|
| 1 | 01 – 06 | Chốt quy tắc, Swagger v1, Docker dev, Auth, CRUD học kỳ |
| 2 | 07 – 12 | Môn học, thành phần điểm, tính điểm, quy đổi, GPA, Dashboard, mục tiêu, mô phỏng, CI/staging |
| 3 | 13 – 18 | Hồ sơ, import, bảng điểm, Admin, bảo mật, phân quyền, responsive, deploy production, UAT, slide |
| 4 | 19 – 20 | Tổng duyệt lần 2, chốt gói demo, ngày bảo vệ |

## 12. Chạy toàn bộ dự án bằng Docker Compose (PB-47)

Compose khởi chạy frontend tĩnh, FastAPI backend và MySQL 8. Backend đợi MySQL healthcheck đạt, chạy Alembic migration rồi mở API. Frontend được phục vụ bằng Nginx. Cơ sở dữ liệu được giữ trong named volume khi container dừng hoặc được tạo lại.

## Yêu cầu

- Cài Docker Desktop (Windows/macOS) hoặc Docker Engine và Docker Compose v2 (Linux).
- Trên máy kiểm tra thứ hai, chỉ cần có Docker; không cần cài riêng Python, Node.js hay MySQL.
- Giải nén/clone source dự án về máy và chạy lệnh tại thư mục chứa `docker-compose.yaml`.

## Chạy lần đầu

Tạo file cấu hình local từ mẫu. PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

`.env.example` chỉ có thông tin mẫu phục vụ local. Không thay bằng secret production và không commit `.env`. Các mật khẩu mẫu dùng được cho môi trường local. Tránh ký tự URL đặc biệt trong mật khẩu MySQL local, hoặc URL-encode thông tin user/password khi sửa `DATABASE_URL`.

Khởi chạy cả ba service:

```bash
docker compose up --build
```

Để chạy nền:

```bash
docker compose up --build -d
```

## Địa chỉ và kiểm tra khởi động

- Frontend: <http://localhost:8080>
- Backend health qua OpenAPI: <http://localhost:8000/openapi.json>
- Swagger UI: <http://localhost:8000/docs>
- MySQL từ máy host: `localhost:3306`, dùng user và mật khẩu trong `.env`.
- Từ backend container, host DB là `db`, cổng `3306`. Không dùng `localhost` vì khi đó backend sẽ tìm MySQL bên trong chính container backend.

Kiểm tra các service đã chạy khỏe:

```bash
docker compose ps
```

`db` và `backend` cần có trạng thái `healthy`; frontend cần `running`. Có thể mở trang FE và Swagger trong trình duyệt để kiểm tra. Giao diện hiện vẫn dùng mock/localStorage ở một số luồng, vì vậy trang FE tải được không đồng nghĩa mọi chức năng đã nối backend.

## Log, dừng và chạy lại

```bash
docker compose logs -f                 # xem log tất cả service
docker compose logs -f backend         # chỉ xem log backend/migration
docker compose down                    # dừng container, giữ dữ liệu MySQL
docker compose up --build -d           # chạy lại sau khi cập nhật source
```

Muốn xóa cả dữ liệu MySQL local và tạo DB trống, dùng `docker compose down -v`. Lệnh này xóa volume database; chỉ dùng khi thực sự muốn reset dữ liệu local.

## Kiểm tra task trên máy thứ hai

1. Cài Docker Desktop/Engine và bật Docker daemon.
2. Lấy source từ nhánh/commit cần nghiệm thu, mở terminal tại thư mục gốc repo.
3. Tạo `.env` từ `.env.example` bằng lệnh ở trên.
4. Chạy `docker compose up --build` và đợi `db`/`backend` healthy.
5. Mở `http://localhost:8080` và `http://localhost:8000/docs`.
6. Ghi nhận kết quả `docker compose ps`, log khởi động không có lỗi và ảnh/link minh chứng theo quy trình nộp task.

Lệnh `docker compose config` kiểm tra khả năng phân tích và nội suy cấu hình trước khi tạo container:

```bash
docker compose config
```

Không ghi task PB-47 là đã pass máy thứ hai cho tới khi bước 4–6 được thực hiện trên một máy khác thực tế.

## Seed tài khoản demo (PB-48)

Trong `.env`, điền `SEED_ADMIN_PASSWORD` và `SEED_STUDENT_PASSWORD`. Mỗi mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8. Giữ file `.env` trên máy.

Chạy các lệnh từ thư mục gốc của repo. Compose chờ MySQL sẵn sàng và backend áp dụng migration khi khởi động.

```bash
docker compose up -d --build
docker compose exec backend python -m scripts.seed_accounts
```

Nếu vừa sửa `.env` khi container đã chạy, chạy lại `docker compose up -d` để nạp cấu hình mới trước khi seed.

| Email | Vai trò | Biến môi trường chứa mật khẩu |
|---|---|---|
| `admin@example.com` | `ADMIN` | `SEED_ADMIN_PASSWORD` |
| `student@example.com` | `STUDENT` | `SEED_STUDENT_PASSWORD` |

Chạy lại script sẽ giữ nguyên tài khoản đã có, kể cả mật khẩu và trạng thái. Nếu một email mẫu đã thuộc vai trò khác, script báo lỗi và hủy giao dịch.

Để kiểm tra, mở Swagger UI tại `http://localhost:8000/docs`. Gọi `POST /api/v1/auth/login` với email và mật khẩu mẫu. Dùng `data.accessToken` để **Authorize**, rồi gọi `GET /api/v1/auth/me` và xem `data.role`. Giao diện HTML hiện dùng đăng nhập giả lập, vì vậy hãy kiểm tra các tài khoản này qua Swagger.

## Reset dữ liệu demo (PB-59)

Script tạo lại dữ liệu cho riêng ba tài khoản `demo.student01@example.com`, `demo.student02@example.com` và `demo.student03@example.com`: 8 học kỳ, 40 lượt môn, thành phần điểm hợp lệ, môn F, một lần học lại có cùng mã môn và mục tiêu GPA mẫu 3.60. Mật khẩu dùng chung lấy từ biến môi trường `SEED_DEMO_PASSWORD`; script chỉ nhận các tài khoản demo đã dành riêng (vai trò `STUDENT` và mã `DEMO-001..003`).

Lệnh chỉ xóa học kỳ, môn, thành phần điểm, mục tiêu GPA và phiên đăng nhập thuộc ba tài khoản demo. Tài khoản và dữ liệu người dùng khác, bảng thang điểm và schema được giữ nguyên. Chỉ dùng với database demo/local. Migration tự tạo bảng `goals` khi backend khởi động; mục tiêu có một bản ghi cho mỗi tài khoản.

Đặt `SEED_DEMO_PASSWORD` trong môi trường backend (dài 8–72 byte UTF-8), sau đó chạy từ thư mục `backend`:

```bash
alembic upgrade head
python -m scripts.reset_demo_data
```

Nếu chạy trực tiếp trên máy, dùng `.env` của backend và chạy migration trước lệnh reset. Trong Docker Compose, backend tự chạy migration khi khởi động; sau khi service sẵn sàng, chạy từ thư mục chứa `docker-compose.yaml`:

```bash
docker compose exec backend python -m scripts.reset_demo_data
```

Hai tệp mẫu import theo 8 cột chuẩn nằm tại `backend/scripts/demo_import_valid.csv` và `backend/scripts/demo_import_invalid.csv`; tệp lỗi có điểm ngoài khoảng 0–10 để kiểm tra báo lỗi theo dòng. Frontend hiện lưu mục tiêu mẫu trong `localStorage`; backend có bản ghi mục tiêu tương ứng để phục vụ dữ liệu demo API/DB. Mục tiêu ở hai nơi được quản lý độc lập theo kiến trúc hiện tại.

## Dữ liệu GPA (PB-18, PB-19)

`GET /api/v1/semesters/{semesterId}/gpa` đọc môn từ cơ sở dữ liệu của người dùng đã đăng nhập. Backend tính điểm môn ghi đồng thời `courses.grade10` và `courses.grade4` sau khi đủ điểm, hoặc để cả hai là `NULL` nếu chưa thể tính. GPA được làm tròn đến hai chữ số thập phân trước khi xếp loại.

`GET /api/v1/gpa/cumulative` gộp các lần học theo mã môn đã bỏ khoảng trắng hai đầu và quy về chữ hoa. Mỗi mã lấy lần có điểm hệ 4 cao nhất, sau đó so điểm hệ 10 nếu bằng nhau. Nếu cả hai điểm bằng nhau, giữ bản ghi có ID nhỏ nhất. Môn rớt vẫn tính vào GPA, còn tín chỉ đạt chỉ cộng các môn có điểm hệ 10 từ 4.0.
