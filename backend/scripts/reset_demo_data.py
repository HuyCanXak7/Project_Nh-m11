"""Reset and recreate the isolated PB-59 demo dataset."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy.exc import SQLAlchemyError

from app.core.security import hash_password
from app.core.config import setting
from app.db.database import SessionLocal
from app.models import AuthSession, Course, Goal, GradeComponent, Semester, User
from app.services.grade_scale import convert_grade, ensure_default_grade_scale


DEMO_PASSWORD_ENV = "SEED_DEMO_PASSWORD"
DEMO_USERS = (
    ("demo.student01@example.com", "Sinh viên demo 01", "DEMO-001", "Công nghệ thông tin"),
    ("demo.student02@example.com", "Sinh viên demo 02", "DEMO-002", "An toàn thông tin"),
    ("demo.student03@example.com", "Sinh viên demo 03", "DEMO-003", "Kỹ thuật phần mềm"),
)

# Tám học kỳ, mỗi kỳ 5 lượt môn = 40 lượt môn. INT1001 được học lại ở kỳ sau.
SEMESTERS = (
    (0, "Học kỳ 1", "2023-2024", date(2023, 9, 1), date(2024, 1, 15)),
    (0, "Học kỳ 2", "2023-2024", date(2024, 2, 1), date(2024, 6, 15)),
    (0, "Học kỳ hè", "2023-2024", date(2024, 6, 20), date(2024, 8, 15)),
    (1, "Học kỳ 1", "2024-2025", date(2024, 9, 1), date(2025, 1, 15)),
    (1, "Học kỳ 2", "2024-2025", date(2025, 2, 1), date(2025, 6, 15)),
    (1, "Học kỳ hè", "2024-2025", date(2025, 6, 20), date(2025, 8, 15)),
    (2, "Học kỳ 1", "2025-2026", date(2025, 9, 1), date(2026, 1, 15)),
    (2, "Học kỳ 2", "2025-2026", date(2026, 2, 1), date(2026, 6, 15)),
)

COURSES = (
    ("INT1001", "Nhập môn lập trình", 3, "FOUNDATION", Decimal("3.9")),
    ("BAS1001", "Giải tích 1", 3, "GENERAL", Decimal("5.2")),
    ("BAS1002", "Đại số tuyến tính", 3, "GENERAL", Decimal("6.8")),
    ("INT1002", "Tin học cơ sở", 3, "FOUNDATION", Decimal("7.5")),
    ("ENG1001", "Tiếng Anh cơ bản", 2, "GENERAL", Decimal("8.6")),
    ("INT1003", "Cấu trúc dữ liệu", 3, "FOUNDATION", Decimal("8.2")),
    ("BAS1003", "Xác suất thống kê", 3, "GENERAL", Decimal("6.2")),
    ("INT1004", "Cơ sở dữ liệu", 3, "SPECIALIZED", Decimal("9.0")),
    ("INT1005", "Mạng máy tính", 3, "SPECIALIZED", Decimal("7.8")),
    ("INT1006", "Phát triển ứng dụng web", 3, "SPECIALIZED", Decimal("8.8")),
    ("BAS1004", "Triết học Mác - Lênin", 2, "GENERAL", Decimal("5.0")),
    ("INT1007", "Kỹ thuật lập trình", 3, "FOUNDATION", Decimal("7.2")),
    ("INT1008", "Hệ điều hành", 3, "SPECIALIZED", Decimal("6.5")),
    ("INT1009", "Kiến trúc máy tính", 3, "FOUNDATION", Decimal("8.4")),
    ("ENG1002", "Tiếng Anh chuyên ngành", 2, "GENERAL", Decimal("9.2")),
)

COMPONENTS = (
    ("Quá trình", Decimal("10.00")),
    ("Giữa kỳ", Decimal("30.00")),
    ("Cuối kỳ", Decimal("60.00")),
)


def reset_demo_data() -> tuple[int, int, int]:
    """Replace only the three explicitly reserved demo accounts and their records."""
    password = getattr(setting, DEMO_PASSWORD_ENV) or ""
    if len(password) < 8 or len(password.encode("utf-8")) > 72:
        raise ValueError(f"{DEMO_PASSWORD_ENV} phải dài từ 8 đến 72 byte UTF-8.")

    db = SessionLocal()
    try:
        users: list[User] = []
        for email, full_name, student_code, major in DEMO_USERS:
            user = db.query(User).filter(User.email == email).one_or_none()
            if user and (user.role != "STUDENT" or user.student_code != student_code):
                raise ValueError(
                    f"Từ chối reset: {email} đã tồn tại nhưng không khớp tài khoản demo đã dành riêng."
                )
            if user is None:
                user = User(
                    email=email,
                    full_name=full_name,
                    student_code=student_code,
                    major=major,
                    role="STUDENT",
                    is_active=True,
                    password_hash=hash_password(password),
                )
                db.add(user)
            else:
                user.full_name = full_name
                user.major = major
                user.is_active = True
                user.password_hash = hash_password(password)
            users.append(user)

        db.flush()
        demo_user_ids = [user.id for user in users]
        semester_ids = [
            row[0]
            for row in db.query(Semester.id)
            .filter(Semester.user_id.in_(demo_user_ids))
            .all()
        ]
        course_ids = [
            row[0]
            for row in db.query(Course.id)
            .filter(Course.semester_id.in_(semester_ids))
            .all()
        ]

        if course_ids:
            db.query(GradeComponent).filter(
                GradeComponent.course_id.in_(course_ids)
            ).delete(synchronize_session=False)
            db.query(Course).filter(Course.id.in_(course_ids)).delete(
                synchronize_session=False
            )
        if semester_ids:
            db.query(Semester).filter(Semester.id.in_(semester_ids)).delete(synchronize_session=False)
        db.query(AuthSession).filter(AuthSession.user_id.in_(demo_user_ids)).delete(
            synchronize_session=False
        )
        db.query(Goal).filter(Goal.user_id.in_(demo_user_ids)).delete(
            synchronize_session=False
        )

        ensure_default_grade_scale(db)
        db.flush()
        for user in users:
            db.add(
                Goal(
                    user_id=user.id,
                    target_gpa=Decimal("3.60"),
                    target_date=date(2027, 6, 30),
                    remaining_credits=30,
                )
            )

        for index, (
            user_index,
            name,
            academic_year,
            start_date,
            end_date,
        ) in enumerate(SEMESTERS):
            semester = Semester(
                user_id=users[user_index].id,
                name=name,
                academic_year=academic_year,
                start_date=start_date,
                end_date=end_date,
            )
            db.add(semester)
            db.flush()

            for offset in range(5):
                course_index = (index * 5 + offset) % len(COURSES)
                code, course_name, credits, category, target_score = COURSES[course_index]
                # Môn đầu tiên của sinh viên 01 bị rớt; kỳ kế tiếp có cùng mã để minh họa học lại.
                is_failed_attempt = index == 0 and offset == 0
                is_retake = index == 1 and offset == 0
                if is_retake:
                    code, course_name, credits, category, target_score = COURSES[0]
                if is_failed_attempt:
                    target_score = Decimal("3.9")
                elif is_retake:
                    target_score = Decimal("8.5")

                course = Course(
                    semester_id=semester.id,
                    code=code,
                    name=course_name,
                    credits=credits,
                    category=category,
                    is_retake=is_retake,
                )
                db.add(course)
                db.flush()
                for component_name, weight in COMPONENTS:
                    db.add(
                        GradeComponent(
                            course_id=course.id,
                            name=component_name,
                            weight_percent=weight,
                            score=target_score,
                        )
                    )
                conversion = convert_grade(db, target_score)
                course.grade10 = target_score
                course.grade4 = Decimal(str(conversion["grade4"]))

        db.commit()
        return len(users), len(SEMESTERS), len(SEMESTERS) * 5
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    try:
        user_count, semester_count, course_count = reset_demo_data()
    except (ValueError, SQLAlchemyError) as error:
        raise SystemExit(f"Không reset được dữ liệu demo: {error}") from None

    print(
        "Đã reset dữ liệu demo: "
        f"{user_count} sinh viên, {semester_count} học kỳ, {course_count} lượt môn. "
        "Dữ liệu và tài khoản khác được giữ nguyên."
    )
