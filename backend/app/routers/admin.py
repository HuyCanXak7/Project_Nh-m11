"""Endpoint quản trị tài khoản sinh viên; toàn bộ yêu cầu phải là ADMIN."""

from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_admin
from app.models import User
from app.schemas.admin import StudentStatusUpdate
from app.schemas.grade import CourseScoresUpdate
from app.services.admin import (
    get_student_detail,
    get_student_grades,
    list_students,
    set_student_active,
    update_student_scores,
)
from app.utils.responses import api_response

# Gắn dependency ở router để không endpoint quản trị nào bị bỏ sót kiểm tra quyền.
router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/users")
def get_students(
    request: Request,
    q: str | None = Query(None, max_length=150),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    sort_by: Literal["createdAt", "fullName", "email", "studentCode"] = Query(
        "createdAt", alias="sortBy"
    ),
    sort_order: Literal["asc", "desc"] = Query("desc", alias="sortOrder"),
    db: Session = Depends(get_db),
):
    """Danh sách sinh viên có tìm kiếm, sắp xếp và phân trang (US-01)."""
    result = list_students(db, q, page, page_size, sort_by, sort_order)
    return api_response(request, 200, "Danh sách sinh viên.", result)


@router.get("/users/{student_id}")
def get_student(
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """Hồ sơ chi tiết của một sinh viên (US-02)."""
    result = get_student_detail(db, student_id)
    return api_response(request, 200, "Chi tiết sinh viên.", result)


@router.patch("/users/{student_id}/status")
def change_student_status(
    student_id: int,
    data: StudentStatusUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Khóa hoặc mở khóa tài khoản sinh viên (US-03)."""
    result = set_student_active(db, student_id, data.isActive, admin, data.reason)
    message = (
        "Đã khóa tài khoản sinh viên."
        if not data.isActive
        else "Đã mở khóa tài khoản sinh viên."
    )
    return api_response(request, 200, message, result)


@router.get("/users/{student_id}/grades")
def get_student_grade_table(
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """Bảng điểm đầy đủ của sinh viên (US-05)."""
    result = get_student_grades(db, student_id)
    return api_response(request, 200, "Bảng điểm sinh viên.", result)


@router.put("/users/{student_id}/courses/{course_id}/scores")
def edit_student_course_scores(
    student_id: int,
    course_id: int,
    data: CourseScoresUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """ADMIN sửa điểm thành phần của môn học thuộc sinh viên (US-06)."""
    result = update_student_scores(db, student_id, course_id, data)
    return api_response(request, 200, "Cập nhật điểm sinh viên thành công.", result)
