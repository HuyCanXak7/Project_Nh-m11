"""Minimal aggregate statistics for administrators; never returns user records."""

from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_admin
from app.models import Course, Semester, User
from app.utils.responses import api_response

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/statistics")
def get_admin_statistics(
    request: Request,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Return counts and mean per-student cumulative GPA, excluding ungraded users."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_courses = db.query(func.count(Course.id)).scalar() or 0

    completed = (
        db.query(Course, Semester.user_id)
        .join(Semester, Course.semester_id == Semester.id)
        .filter(Course.grade4.is_not(None))
        .order_by(Course.id)
        .all()
    )
    by_user = {}
    for course, user_id in completed:
        key = course.code.strip().upper()
        best = by_user.setdefault(user_id, {})
        current = best.get(key)
        if current is None or (course.grade4, course.grade10, -course.id) > (
            current.grade4, current.grade10, -current.id
        ):
            best[key] = course

    student_gpas = []
    for courses in by_user.values():
        credits = sum(course.credits for course in courses.values())
        if credits:
            student_gpas.append(
                sum(course.grade4 * course.credits for course in courses.values()) / credits
            )
    average_gpa = None
    if student_gpas:
        average_gpa = float(
            (sum(student_gpas) / len(student_gpas)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        )
    return api_response(request, 200, "Thống kê toàn hệ thống.", {
        "totalUsers": total_users,
        "totalCourses": total_courses,
        "averageGpa4": average_gpa,
    })
