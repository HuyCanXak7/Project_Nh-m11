"""Các hàm tính GPA sử dụng ORM Session."""

from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.models import Course, Semester

RANKINGS = (
    (Decimal("3.60"), "Xuất sắc"),
    (Decimal("3.20"), "Giỏi"),
    (Decimal("2.50"), "Khá"),
    (Decimal("2.00"), "Trung bình"),
    (Decimal("0.00"), "Yếu / Kém"),
)


def summarize_gpa(completed_courses):
    included_credits = passed_credits = 0
    weighted_points = Decimal(0)
    for course in completed_courses:
        included_credits += course.credits
        weighted_points += course.grade4 * course.credits
        if course.grade10 >= 4:
            passed_credits += course.credits

    gpa = ranking = None
    if included_credits:
        gpa = (weighted_points / included_credits).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        ranking = next(label for threshold, label in RANKINGS if gpa >= threshold)
    return {
        "gpa4": float(gpa) if gpa is not None else None,
        "includedCredits": included_credits,
        "passedCredits": passed_credits,
        "ranking": ranking,
    }


def semester_gpa(db: Session, user_id: int, semester_id: int):
    """Tính GPA của một học kỳ và kiểm tra học kỳ thuộc đúng user."""
    semester = (
        db.query(Semester)
        .filter(Semester.id == semester_id, Semester.user_id == user_id)
        .first()
    )
    if semester is None:
        return None

    completed_courses = (
        db.query(Course)
        .filter(Course.semester_id == semester_id, Course.grade4.is_not(None))
        .all()
    )
    return {"semesterId": semester_id, **summarize_gpa(completed_courses)}


def summarize_cumulative_gpa(courses) -> dict:
    """Tính GPA tích lũy từ danh sách môn đã tải sẵn.

    Tách khỏi truy vấn để endpoint bootstrap dùng lại dữ liệu vừa eager-load,
    tránh phát sinh thêm một truy vấn giống hệt.
    """
    best_attempts = {}
    for course in courses:
        if course.grade4 is None:
            continue
        code = course.code.strip().upper()
        best = best_attempts.get(code)
        if best is None or (course.grade4, course.grade10) > (
            best.grade4,
            best.grade10,
        ):
            best_attempts[code] = course

    return {
        **summarize_gpa(best_attempts.values()),
        "retakePolicy": "HIGHEST_GRADE_BY_COURSE_CODE",
    }


def cumulative_gpa(db: Session, user_id: int):
    """Tính GPA tích lũy, mỗi mã môn chỉ giữ lần học có điểm cao nhất."""
    completed_courses = (
        db.query(Course)
        .join(Semester)
        .filter(Semester.user_id == user_id, Course.grade4.is_not(None))
        .order_by(Course.id)
        .all()
    )
    return summarize_cumulative_gpa(completed_courses)
