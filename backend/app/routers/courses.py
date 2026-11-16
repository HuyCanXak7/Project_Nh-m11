"""Các endpoint tạo, xem, tìm kiếm, cập nhật và xóa môn học."""

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.course import CourseCategory, CourseCreate, CourseResponse, CourseUpdate
from app.services.course import (
    create_course,
    delete_course,
    get_course_deletion_preview,
    get_courses,
    update_course,
)
from app.utils.responses import api_response

router = APIRouter(prefix="/api/v1", tags=["Courses"])


@router.post("/semesters/{semester_id}/courses", status_code=status.HTTP_201_CREATED)
def add_course(
    semester_id: int,
    data: CourseCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Nhận request, gọi service tạo môn và trả response chuẩn."""
    course = create_course(db, semester_id, user.id, data)
    result = CourseResponse.model_validate(course).model_dump(mode="json")
    return api_response(request, 201, "Thêm môn học thành công.", result)


@router.get("/semesters/{semester_id}/courses")
def list_courses(
    semester_id: int,
    request: Request,
    keyword: str | None = Query(default=None, max_length=150),
    category: CourseCategory | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Danh sách rỗng được biểu diễn bằng data = []."""
    courses = get_courses(db, semester_id, user.id, keyword, category)
    result = [
        CourseResponse.model_validate(course).model_dump(mode="json")
        for course in courses
    ]
    return api_response(request, 200, "Danh sách môn học.", result)


@router.put("/courses/{course_id}")
def edit_course(
    course_id: int,
    data: CourseUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = update_course(db, course_id, user.id, data)
    result = CourseResponse.model_validate(course).model_dump(mode="json")
    return api_response(request, 200, "Cập nhật môn học thành công.", result)


@router.delete("/courses/{course_id}")
def remove_course(
    course_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = delete_course(db, course_id, user.id)
    return api_response(request, 200, "Xóa môn học thành công.", deleted)


@router.get("/courses/{course_id}/deletion-preview")
def course_deletion_preview(
    course_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preview = get_course_deletion_preview(db, course_id, user.id)
    return api_response(request, 200, "Dữ liệu sẽ bị xóa cùng môn học.", preview)
