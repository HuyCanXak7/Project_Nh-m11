from decimal import Decimal, ROUND_HALF_UP

import sqlalchemy as sa

from backend.app.db.database import courses, get_engine, semesters

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
        gpa = (weighted_points / included_credits).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        ranking = next(label for threshold, label in RANKINGS if gpa >= threshold)
    return {
        "gpa4": float(gpa) if gpa is not None else None,
        "includedCredits": included_credits,
        "passedCredits": passed_credits,
        "ranking": ranking,
    }


def semester_gpa(user_id, semester_id):
    completed = semesters.outerjoin(
        courses, (courses.c.semester_id == semesters.c.id) & courses.c.grade4.is_not(None),
    )
    query = (
        sa.select(courses.c.credits, courses.c.grade4, courses.c.grade10)
        .select_from(completed)
        .where(semesters.c.id == semester_id, semesters.c.user_id == user_id)
    )
    with get_engine().connect() as connection:
        rows = connection.execute(query).all()
    if not rows:
        return None
    return {
        "semesterId": semester_id,
        **summarize_gpa(row for row in rows if row.grade4 is not None),
    }


def cumulative_gpa(user_id):
    query = (
        sa.select(courses.c.code, courses.c.credits, courses.c.grade4, courses.c.grade10)
        .join(semesters, courses.c.semester_id == semesters.c.id)
        .where(semesters.c.user_id == user_id, courses.c.grade4.is_not(None))
        .order_by(courses.c.id)
    )
    best_attempts = {}
    with get_engine().connect() as connection:
        for attempt in connection.execute(query):
            code = attempt.code.strip().upper()
            best = best_attempts.get(code)
            if best is None or (attempt.grade4, attempt.grade10) > (best.grade4, best.grade10):
                best_attempts[code] = attempt

    return {
        **summarize_gpa(best_attempts.values()),
        "retakePolicy": "HIGHEST_GRADE_BY_COURSE_CODE",
    }
