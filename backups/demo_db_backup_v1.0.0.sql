-- =============================================================================
-- Bản sao lưu CSDL Demo — Hệ thống Quản lý Chỉ số Học tập (Nhóm 11 - StudyLIMS)
-- Nhãn snapshot : PB-45 + PB-48 + PB-59 Clean Demo Snapshot
-- Thời điểm xuất: 2026-11-25 20:02:14
-- Phiên bản     : v1.0.0 (tương thích MySQL 8.0 & Alembic head 0007_audit_logs)
-- Lưu ý         : Không chứa auth_sessions/audit_logs; mật khẩu đã được băm bcrypt.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- Dọn dữ liệu cũ theo thứ tự khóa ngoại (bảng con -> bảng cha)
DELETE FROM audit_logs;
DELETE FROM auth_sessions;
DELETE FROM goals;
DELETE FROM grade_components;
DELETE FROM courses;
DELETE FROM semesters;
DELETE FROM users;
DELETE FROM grade_scale;

-- Bảng grade_scale (8 bản ghi)
INSERT INTO grade_scale (id, min_score, max_score, letter, gpa4) VALUES (1, 8.5, 10, 'A', 4);
INSERT INTO grade_scale (id, min_score, max_score, letter, gpa4) VALUES (2, 8, 8.4, 'B+', 3.5);
INSERT INTO grade_scale (id, min_score, max_score, letter, gpa4) VALUES (3, 7, 7.9, 'B', 3);
INSERT INTO grade_scale (id, min_score, max_score, letter, gpa4) VALUES (4, 6.5, 6.9, 'C+', 2.5);
INSERT INTO grade_scale (id, min_score, max_score, letter, gpa4) VALUES (5, 5.5, 6.4, 'C', 2);
INSERT INTO grade_scale (id, min_score, max_score, letter, gpa4) VALUES (6, 5, 5.4, 'D+', 1.5);
INSERT INTO grade_scale (id, min_score, max_score, letter, gpa4) VALUES (7, 4, 4.9, 'D', 1);
INSERT INTO grade_scale (id, min_score, max_score, letter, gpa4) VALUES (8, 0, 3.9, 'F', 0);

-- Bảng users (5 bản ghi)
INSERT INTO users (id, email, full_name, password_hash, student_code, major, role, is_active, created_at) VALUES (1, 'admin@example.com', 'Quản trị viên mẫu', '$2b$12$XHD30miCEvAKT2J9eGtTU.NaLL5UCHDZFltFOJugNNt3Kh3zsPyi.', NULL, NULL, 'ADMIN', 1, '2026-11-25 13:02:09');
INSERT INTO users (id, email, full_name, password_hash, student_code, major, role, is_active, created_at) VALUES (2, 'student@example.com', 'Sinh viên mẫu', '$2b$12$AfkRJwj/lpBp0qpodTXDG.sf5Eg6s.ONDv7vt0mpJNYUhGH/3LsUu', NULL, NULL, 'STUDENT', 1, '2026-11-25 13:02:09');
INSERT INTO users (id, email, full_name, password_hash, student_code, major, role, is_active, created_at) VALUES (3, 'demo.student01@example.com', 'Sinh viên demo 01', '$2b$12$1Yd8mJeO7SMR5IOUVgQzpeCW6rx7rv13HqXbHQOrMph59IE1oWkA.', 'DEMO-001', 'Công nghệ thông tin', 'STUDENT', 1, '2026-11-25 13:02:14');
INSERT INTO users (id, email, full_name, password_hash, student_code, major, role, is_active, created_at) VALUES (4, 'demo.student02@example.com', 'Sinh viên demo 02', '$2b$12$pY8CMxrf3I6r2dseOmQUV.j8pnab8Ah8xNegR9gnd8EZer2yISqQy', 'DEMO-002', 'An toàn thông tin', 'STUDENT', 1, '2026-11-25 13:02:14');
INSERT INTO users (id, email, full_name, password_hash, student_code, major, role, is_active, created_at) VALUES (5, 'demo.student03@example.com', 'Sinh viên demo 03', '$2b$12$74k8.zwWVE7wdsSGGUz2QusLKz2q/mCmwI1QO70H3ndOM.KuvJRsm', 'DEMO-003', 'Kỹ thuật phần mềm', 'STUDENT', 1, '2026-11-25 13:02:14');

-- Bảng semesters (8 bản ghi)
INSERT INTO semesters (id, user_id, name, academic_year, start_date, end_date) VALUES (1, 3, 'Học kỳ 1', '2023-2024', '2023-09-01', '2024-01-15');
INSERT INTO semesters (id, user_id, name, academic_year, start_date, end_date) VALUES (2, 3, 'Học kỳ 2', '2023-2024', '2024-02-01', '2024-06-15');
INSERT INTO semesters (id, user_id, name, academic_year, start_date, end_date) VALUES (3, 3, 'Học kỳ hè', '2023-2024', '2024-06-20', '2024-08-15');
INSERT INTO semesters (id, user_id, name, academic_year, start_date, end_date) VALUES (4, 4, 'Học kỳ 1', '2024-2025', '2024-09-01', '2025-01-15');
INSERT INTO semesters (id, user_id, name, academic_year, start_date, end_date) VALUES (5, 4, 'Học kỳ 2', '2024-2025', '2025-02-01', '2025-06-15');
INSERT INTO semesters (id, user_id, name, academic_year, start_date, end_date) VALUES (6, 4, 'Học kỳ hè', '2024-2025', '2025-06-20', '2025-08-15');
INSERT INTO semesters (id, user_id, name, academic_year, start_date, end_date) VALUES (7, 5, 'Học kỳ 1', '2025-2026', '2025-09-01', '2026-01-15');
INSERT INTO semesters (id, user_id, name, academic_year, start_date, end_date) VALUES (8, 5, 'Học kỳ 2', '2025-2026', '2026-02-01', '2026-06-15');

-- Bảng courses (40 bản ghi)
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (1, 1, 'INT1001', 'Nhập môn lập trình', 3, 'FOUNDATION', 0, 3.9, 0);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (2, 1, 'BAS1001', 'Giải tích 1', 3, 'GENERAL', 0, 5.2, 1.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (3, 1, 'BAS1002', 'Đại số tuyến tính', 3, 'GENERAL', 0, 6.8, 2.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (4, 1, 'INT1002', 'Tin học cơ sở', 3, 'FOUNDATION', 0, 7.5, 3);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (5, 1, 'ENG1001', 'Tiếng Anh cơ bản', 2, 'GENERAL', 0, 8.6, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (6, 2, 'INT1001', 'Nhập môn lập trình', 3, 'FOUNDATION', 1, 8.5, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (7, 2, 'BAS1003', 'Xác suất thống kê', 3, 'GENERAL', 0, 6.2, 2);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (8, 2, 'INT1004', 'Cơ sở dữ liệu', 3, 'SPECIALIZED', 0, 9, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (9, 2, 'INT1005', 'Mạng máy tính', 3, 'SPECIALIZED', 0, 7.8, 3);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (10, 2, 'INT1006', 'Phát triển ứng dụng web', 3, 'SPECIALIZED', 0, 8.8, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (11, 3, 'BAS1004', 'Triết học Mác - Lênin', 2, 'GENERAL', 0, 5, 1.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (12, 3, 'INT1007', 'Kỹ thuật lập trình', 3, 'FOUNDATION', 0, 7.2, 3);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (13, 3, 'INT1008', 'Hệ điều hành', 3, 'SPECIALIZED', 0, 6.5, 2.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (14, 3, 'INT1009', 'Kiến trúc máy tính', 3, 'FOUNDATION', 0, 8.4, 3.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (15, 3, 'ENG1002', 'Tiếng Anh chuyên ngành', 2, 'GENERAL', 0, 9.2, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (16, 4, 'INT1001', 'Nhập môn lập trình', 3, 'FOUNDATION', 0, 3.9, 0);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (17, 4, 'BAS1001', 'Giải tích 1', 3, 'GENERAL', 0, 5.2, 1.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (18, 4, 'BAS1002', 'Đại số tuyến tính', 3, 'GENERAL', 0, 6.8, 2.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (19, 4, 'INT1002', 'Tin học cơ sở', 3, 'FOUNDATION', 0, 7.5, 3);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (20, 4, 'ENG1001', 'Tiếng Anh cơ bản', 2, 'GENERAL', 0, 8.6, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (21, 5, 'INT1003', 'Cấu trúc dữ liệu', 3, 'FOUNDATION', 0, 8.2, 3.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (22, 5, 'BAS1003', 'Xác suất thống kê', 3, 'GENERAL', 0, 6.2, 2);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (23, 5, 'INT1004', 'Cơ sở dữ liệu', 3, 'SPECIALIZED', 0, 9, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (24, 5, 'INT1005', 'Mạng máy tính', 3, 'SPECIALIZED', 0, 7.8, 3);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (25, 5, 'INT1006', 'Phát triển ứng dụng web', 3, 'SPECIALIZED', 0, 8.8, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (26, 6, 'BAS1004', 'Triết học Mác - Lênin', 2, 'GENERAL', 0, 5, 1.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (27, 6, 'INT1007', 'Kỹ thuật lập trình', 3, 'FOUNDATION', 0, 7.2, 3);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (28, 6, 'INT1008', 'Hệ điều hành', 3, 'SPECIALIZED', 0, 6.5, 2.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (29, 6, 'INT1009', 'Kiến trúc máy tính', 3, 'FOUNDATION', 0, 8.4, 3.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (30, 6, 'ENG1002', 'Tiếng Anh chuyên ngành', 2, 'GENERAL', 0, 9.2, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (31, 7, 'INT1001', 'Nhập môn lập trình', 3, 'FOUNDATION', 0, 3.9, 0);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (32, 7, 'BAS1001', 'Giải tích 1', 3, 'GENERAL', 0, 5.2, 1.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (33, 7, 'BAS1002', 'Đại số tuyến tính', 3, 'GENERAL', 0, 6.8, 2.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (34, 7, 'INT1002', 'Tin học cơ sở', 3, 'FOUNDATION', 0, 7.5, 3);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (35, 7, 'ENG1001', 'Tiếng Anh cơ bản', 2, 'GENERAL', 0, 8.6, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (36, 8, 'INT1003', 'Cấu trúc dữ liệu', 3, 'FOUNDATION', 0, 8.2, 3.5);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (37, 8, 'BAS1003', 'Xác suất thống kê', 3, 'GENERAL', 0, 6.2, 2);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (38, 8, 'INT1004', 'Cơ sở dữ liệu', 3, 'SPECIALIZED', 0, 9, 4);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (39, 8, 'INT1005', 'Mạng máy tính', 3, 'SPECIALIZED', 0, 7.8, 3);
INSERT INTO courses (id, semester_id, code, name, credits, category, is_retake, grade10, grade4) VALUES (40, 8, 'INT1006', 'Phát triển ứng dụng web', 3, 'SPECIALIZED', 0, 8.8, 4);

-- Bảng grade_components (120 bản ghi)
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (1, 1, 'Quá trình', 10, 3.9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (2, 1, 'Giữa kỳ', 30, 3.9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (3, 1, 'Cuối kỳ', 60, 3.9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (4, 2, 'Quá trình', 10, 5.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (5, 2, 'Giữa kỳ', 30, 5.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (6, 2, 'Cuối kỳ', 60, 5.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (7, 3, 'Quá trình', 10, 6.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (8, 3, 'Giữa kỳ', 30, 6.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (9, 3, 'Cuối kỳ', 60, 6.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (10, 4, 'Quá trình', 10, 7.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (11, 4, 'Giữa kỳ', 30, 7.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (12, 4, 'Cuối kỳ', 60, 7.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (13, 5, 'Quá trình', 10, 8.6);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (14, 5, 'Giữa kỳ', 30, 8.6);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (15, 5, 'Cuối kỳ', 60, 8.6);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (16, 6, 'Quá trình', 10, 8.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (17, 6, 'Giữa kỳ', 30, 8.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (18, 6, 'Cuối kỳ', 60, 8.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (19, 7, 'Quá trình', 10, 6.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (20, 7, 'Giữa kỳ', 30, 6.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (21, 7, 'Cuối kỳ', 60, 6.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (22, 8, 'Quá trình', 10, 9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (23, 8, 'Giữa kỳ', 30, 9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (24, 8, 'Cuối kỳ', 60, 9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (25, 9, 'Quá trình', 10, 7.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (26, 9, 'Giữa kỳ', 30, 7.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (27, 9, 'Cuối kỳ', 60, 7.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (28, 10, 'Quá trình', 10, 8.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (29, 10, 'Giữa kỳ', 30, 8.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (30, 10, 'Cuối kỳ', 60, 8.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (31, 11, 'Quá trình', 10, 5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (32, 11, 'Giữa kỳ', 30, 5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (33, 11, 'Cuối kỳ', 60, 5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (34, 12, 'Quá trình', 10, 7.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (35, 12, 'Giữa kỳ', 30, 7.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (36, 12, 'Cuối kỳ', 60, 7.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (37, 13, 'Quá trình', 10, 6.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (38, 13, 'Giữa kỳ', 30, 6.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (39, 13, 'Cuối kỳ', 60, 6.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (40, 14, 'Quá trình', 10, 8.4);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (41, 14, 'Giữa kỳ', 30, 8.4);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (42, 14, 'Cuối kỳ', 60, 8.4);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (43, 15, 'Quá trình', 10, 9.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (44, 15, 'Giữa kỳ', 30, 9.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (45, 15, 'Cuối kỳ', 60, 9.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (46, 16, 'Quá trình', 10, 3.9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (47, 16, 'Giữa kỳ', 30, 3.9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (48, 16, 'Cuối kỳ', 60, 3.9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (49, 17, 'Quá trình', 10, 5.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (50, 17, 'Giữa kỳ', 30, 5.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (51, 17, 'Cuối kỳ', 60, 5.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (52, 18, 'Quá trình', 10, 6.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (53, 18, 'Giữa kỳ', 30, 6.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (54, 18, 'Cuối kỳ', 60, 6.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (55, 19, 'Quá trình', 10, 7.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (56, 19, 'Giữa kỳ', 30, 7.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (57, 19, 'Cuối kỳ', 60, 7.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (58, 20, 'Quá trình', 10, 8.6);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (59, 20, 'Giữa kỳ', 30, 8.6);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (60, 20, 'Cuối kỳ', 60, 8.6);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (61, 21, 'Quá trình', 10, 8.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (62, 21, 'Giữa kỳ', 30, 8.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (63, 21, 'Cuối kỳ', 60, 8.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (64, 22, 'Quá trình', 10, 6.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (65, 22, 'Giữa kỳ', 30, 6.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (66, 22, 'Cuối kỳ', 60, 6.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (67, 23, 'Quá trình', 10, 9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (68, 23, 'Giữa kỳ', 30, 9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (69, 23, 'Cuối kỳ', 60, 9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (70, 24, 'Quá trình', 10, 7.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (71, 24, 'Giữa kỳ', 30, 7.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (72, 24, 'Cuối kỳ', 60, 7.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (73, 25, 'Quá trình', 10, 8.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (74, 25, 'Giữa kỳ', 30, 8.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (75, 25, 'Cuối kỳ', 60, 8.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (76, 26, 'Quá trình', 10, 5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (77, 26, 'Giữa kỳ', 30, 5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (78, 26, 'Cuối kỳ', 60, 5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (79, 27, 'Quá trình', 10, 7.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (80, 27, 'Giữa kỳ', 30, 7.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (81, 27, 'Cuối kỳ', 60, 7.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (82, 28, 'Quá trình', 10, 6.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (83, 28, 'Giữa kỳ', 30, 6.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (84, 28, 'Cuối kỳ', 60, 6.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (85, 29, 'Quá trình', 10, 8.4);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (86, 29, 'Giữa kỳ', 30, 8.4);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (87, 29, 'Cuối kỳ', 60, 8.4);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (88, 30, 'Quá trình', 10, 9.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (89, 30, 'Giữa kỳ', 30, 9.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (90, 30, 'Cuối kỳ', 60, 9.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (91, 31, 'Quá trình', 10, 3.9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (92, 31, 'Giữa kỳ', 30, 3.9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (93, 31, 'Cuối kỳ', 60, 3.9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (94, 32, 'Quá trình', 10, 5.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (95, 32, 'Giữa kỳ', 30, 5.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (96, 32, 'Cuối kỳ', 60, 5.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (97, 33, 'Quá trình', 10, 6.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (98, 33, 'Giữa kỳ', 30, 6.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (99, 33, 'Cuối kỳ', 60, 6.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (100, 34, 'Quá trình', 10, 7.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (101, 34, 'Giữa kỳ', 30, 7.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (102, 34, 'Cuối kỳ', 60, 7.5);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (103, 35, 'Quá trình', 10, 8.6);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (104, 35, 'Giữa kỳ', 30, 8.6);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (105, 35, 'Cuối kỳ', 60, 8.6);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (106, 36, 'Quá trình', 10, 8.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (107, 36, 'Giữa kỳ', 30, 8.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (108, 36, 'Cuối kỳ', 60, 8.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (109, 37, 'Quá trình', 10, 6.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (110, 37, 'Giữa kỳ', 30, 6.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (111, 37, 'Cuối kỳ', 60, 6.2);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (112, 38, 'Quá trình', 10, 9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (113, 38, 'Giữa kỳ', 30, 9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (114, 38, 'Cuối kỳ', 60, 9);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (115, 39, 'Quá trình', 10, 7.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (116, 39, 'Giữa kỳ', 30, 7.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (117, 39, 'Cuối kỳ', 60, 7.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (118, 40, 'Quá trình', 10, 8.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (119, 40, 'Giữa kỳ', 30, 8.8);
INSERT INTO grade_components (id, course_id, name, weight_percent, score) VALUES (120, 40, 'Cuối kỳ', 60, 8.8);

-- Bảng goals (3 bản ghi)
INSERT INTO goals (id, user_id, target_gpa, target_date, remaining_credits) VALUES (1, 3, 3.6, '2027-06-30', 30);
INSERT INTO goals (id, user_id, target_gpa, target_date, remaining_credits) VALUES (2, 4, 3.6, '2027-06-30', 30);
INSERT INTO goals (id, user_id, target_gpa, target_date, remaining_credits) VALUES (3, 5, 3.6, '2027-06-30', 30);

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
