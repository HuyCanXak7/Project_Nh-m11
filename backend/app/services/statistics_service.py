"""Owner-scoped statistics, using the GPA rules shared with PB-18/19."""

from decimal import Decimal, ROUND_HALF_UP

import sqlalchemy as sa

from app.models import Course, Semester, GradeScale
from app.services.gpa import summarize_gpa


def snapshot(db, user_id):
    # One transaction and two queries, independent of the number of semesters.
    rows = db.execute(
        sa.select(
            Semester.id.label("semester_id"), Semester.name.label("semester_name"),
            Semester.academic_year, Semester.start_date,
            Course.id.label("course_id"), Course.code, Course.credits,
            Course.grade10, Course.grade4,
        ).select_from(Semester).outerjoin(Course)
        .where(Semester.user_id == user_id)
        .order_by(Semester.start_date, Semester.id, Course.id)
    ).all()
    scale = [{"letter": entry.letter, "min10": entry.min_score, "max10": entry.max_score}
             for entry in db.query(GradeScale).order_by(GradeScale.min_score.desc()).all()]
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
