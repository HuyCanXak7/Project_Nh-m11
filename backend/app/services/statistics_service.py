"""Owner-scoped statistics, using the GPA rules shared with PB-18/19."""

from decimal import Decimal, ROUND_HALF_UP

import sqlalchemy as sa

from app.db.session import get_engine
from app.db.tables import courses, semesters, grade_scale
from app.services.gpa_service import summarize_gpa


def snapshot(user_id):
    # One transaction and two queries, independent of the number of semesters.
    with get_engine().begin() as connection:
        rows = connection.execute(
            sa.select(
                semesters.c.id.label("semester_id"), semesters.c.name.label("semester_name"),
                semesters.c.academic_year, semesters.c.start_date,
                courses.c.id.label("course_id"), courses.c.code, courses.c.credits,
                courses.c.grade10, courses.c.grade4,
            ).select_from(semesters.outerjoin(courses))
            .where(semesters.c.user_id == user_id)
            .order_by(semesters.c.start_date, semesters.c.id, courses.c.id)
        ).all()
        scale = connection.execute(sa.select(grade_scale).order_by(grade_scale.c.min10.desc())).mappings().all()
    return rows, scale


def best_attempts(rows):
    best = {}
    for row in rows:
        if row.grade4 is None:
            continue
        code = row.code.strip().upper()
        old = best.get(code)
        if old is None or (row.grade4, row.grade10, -row.course_id) > (old.grade4, old.grade10, -old.course_id):
            best[code] = row
    return list(best.values())


def summary(rows):
    completed = best_attempts(rows)
    credits = sum(row.credits for row in completed)
    average = None
    if credits:
        average = float((sum(row.grade10 * row.credits for row in completed) / credits).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP,
        ))
    return {
        **summarize_gpa(completed),
        "average10": average,
        "totalCourses": len({row.course_id for row in rows if row.course_id is not None}),
        "completedCourses": len(completed),
        "passedCourses": sum(row.grade10 >= 4 for row in completed),
        "retakePolicy": "HIGHEST_GRADE_BY_COURSE_CODE",
    }


def by_semester(rows):
    groups = {}
    for row in rows:
        groups.setdefault(row.semester_id, []).append(row)
    result, history = [], []
    for semester_id, attempts in groups.items():
        first = attempts[0]
        completed = [row for row in attempts if row.grade4 is not None]
        history.extend(attempts)
        result.append({
            "semesterId": semester_id, "name": first.semester_name,
            "academicYear": first.academic_year, "startDate": first.start_date.isoformat(),
            **summarize_gpa(completed),
            "cumulativeGpa4": summarize_gpa(best_attempts(history))["gpa4"],
        })
    return {"items": result}


def distribution(rows, scale):
    # Count every completed course attempt, matching the course list (not the retake-deduplicated GPA).
    counts = {entry["letter"]: 0 for entry in scale}
    for row in rows:
        if row.grade10 is None:
            continue
        entry = next(entry for entry in scale if entry["min10"] <= row.grade10 <= entry["max10"])
        counts[entry["letter"]] += 1
    return {
        "items": [{"grade": grade, "count": count} for grade, count in counts.items()],
        "totalCourses": sum(counts.values()), "countingPolicy": "ALL_COMPLETED_ATTEMPTS",
    }
