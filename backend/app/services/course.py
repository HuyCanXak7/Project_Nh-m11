"""Nghiệp vụ môn học."""

from sqlalchemy.orm import Session

from app.models import Course
from app.schemas.course import CourseCreate
from app.services.semester import get_owned_semester


def create_course(
    db: Session, semester_id: int, user_id: int, data: CourseCreate
) -> Course:
    """Thêm môn vào học kỳ sau khi xác nhận học kỳ thuộc người dùng."""
    get_owned_semester(db, semester_id, user_id)

    course = Course(semester_id=semester_id, **data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course
