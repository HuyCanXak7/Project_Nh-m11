"""Nghiệp vụ tạo, xem, tìm kiếm, cập nhật và xóa môn học."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Course, GradeComponent, Semester
from app.schemas.course import CourseCreate, CourseUpdate
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


def get_courses(
    db: Session,
    semester_id: int,
    user_id: int,
    keyword: str | None = None,
    category: str | None = None,
) -> list[Course]:
    """Lấy các môn của một học kỳ, có thể tìm theo mã/tên và lọc loại môn."""
    get_owned_semester(db, semester_id, user_id)

    query = db.query(Course).filter(Course.semester_id == semester_id)
    if keyword and keyword.strip():
        search_value = f"%{keyword.strip()}%"
        query = query.filter(
            Course.code.ilike(search_value) | Course.name.ilike(search_value)
        )
    if category:
        query = query.filter(Course.category == category)

    return query.order_by(Course.code.asc()).all()


def get_owned_course(db: Session, course_id: int, user_id: int) -> Course:
    """Lấy môn học và đồng thời kiểm tra quyền sở hữu qua học kỳ."""
    course = (
        db.query(Course)
        .join(Semester, Course.semester_id == Semester.id)
        .filter(Course.id == course_id, Semester.user_id == user_id)
        .first()
    )
    if course is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Không tìm thấy môn học."},
        )
    return course


def update_course(
    db: Session, course_id: int, user_id: int, data: CourseUpdate
) -> Course:
    """Cập nhật môn học thuộc tài khoản hiện tại bằng dữ liệu đã validate."""
    course = get_owned_course(db, course_id, user_id)
    for field, value in data.model_dump().items():
        setattr(course, field, value)

    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course_id: int, user_id: int) -> dict:
    """Xóa môn và trả số thành phần điểm bị xóa dây chuyền."""
    course = get_owned_course(db, course_id, user_id)
    component_count = (
        db.query(GradeComponent)
        .filter(GradeComponent.course_id == course.id)
        .count()
    )
    db.delete(course)
    db.commit()
    return {"deletedGradeComponents": component_count}


def get_course_deletion_preview(db: Session, course_id: int, user_id: int) -> dict:
    """Trả số thành phần điểm sẽ mất để FE hiển thị trước khi xác nhận xóa."""
    course = get_owned_course(db, course_id, user_id)
    component_count = (
        db.query(GradeComponent)
        .filter(GradeComponent.course_id == course.id)
        .count()
    )
    return {"gradeComponentsToDelete": component_count}
