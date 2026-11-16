"""Nghiệp vụ quản lý học kỳ của người dùng hiện tại."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import GradeComponent, Semester
from app.schemas.semester import SemesterCreate, SemesterUpdate


def get_semesters(db: Session, user_id: int) -> list[Semester]:
    return (
        db.query(Semester)
        .filter(Semester.user_id == user_id)
        .order_by(Semester.start_date.desc())
        .all()
    )


def get_owned_semester(db: Session, semester_id: int, user_id: int) -> Semester:
    semester = (
        db.query(Semester)
        .filter(Semester.id == semester_id, Semester.user_id == user_id)
        .first()
    )
    if semester is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Không tìm thấy học kỳ."},
        )
    return semester


def create_semester(db: Session, user_id: int, data: SemesterCreate) -> Semester:
    semester = Semester(user_id=user_id, **data.model_dump())
    db.add(semester)
    db.commit()
    db.refresh(semester)
    return semester


def update_semester(
    db: Session, semester_id: int, user_id: int, data: SemesterUpdate
) -> Semester:
    semester = get_owned_semester(db, semester_id, user_id)
    for field, value in data.model_dump().items():
        setattr(semester, field, value)
    db.commit()
    db.refresh(semester)
    return semester


def delete_semester(db: Session, semester_id: int, user_id: int) -> dict:
    semester = get_owned_semester(db, semester_id, user_id)
    course_ids = [course.id for course in semester.courses]
    course_count = len(course_ids)
    component_count = 0
    if course_ids:
        component_count = (
            db.query(GradeComponent)
            .filter(GradeComponent.course_id.in_(course_ids))
            .count()
        )

    db.delete(semester)
    db.commit()
    return {"deletedCourses": course_count, "deletedGradeComponents": component_count}
