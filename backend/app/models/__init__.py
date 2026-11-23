"""Tập trung export model để import một lần là metadata nhận đủ các bảng."""

from app.models.audit_log import AuditLog
from app.models.auth_session import AuthSession
from app.models.course import Course
from app.models.grade_component import GradeComponent
from app.models.grade_scale import GradeScale
from app.models.goal import Goal
from app.models.semester import Semester
from app.models.user import User

__all__ = [
    "AuditLog",
    "AuthSession",
    "Course",
    "GradeComponent",
    "GradeScale",
    "Goal",
    "Semester",
    "User",
]
