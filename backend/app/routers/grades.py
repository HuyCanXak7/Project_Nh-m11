"""Endpoint cấu hình thành phần điểm; nghiệp vụ được xử lý tại service."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.grade import (
    CourseScoresUpdate,
    GradeComponentCreate,
    GradeComponentUpdate,
)
from app.services.grade_service import (
    complete_grade_configuration,
    create_grade_component,
    delete_grade_component,
    list_grade_components,
    update_course_scores,
    update_grade_component,
)
from app.utils.responses import api_response


router = APIRouter(prefix="/api/v1", tags=["Grade components"])


@router.get("/courses/{course_id}/grade-components")
def get_course_grade_components(
    course_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = list_grade_components(db, course_id, user.id)
    return api_response(request, 200, "Cấu hình thành phần điểm.", result)


@router.post(
    "/courses/{course_id}/grade-components", status_code=status.HTTP_201_CREATED
)
def add_grade_component(
    course_id: int,
    data: GradeComponentCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = create_grade_component(db, course_id, user.id, data)
    return api_response(request, 201, "Thêm thành phần điểm thành công.", result)


@router.put("/grade-components/{component_id}")
def edit_grade_component(
    component_id: int,
    data: GradeComponentUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = update_grade_component(db, component_id, user.id, data)
    return api_response(request, 200, "Cập nhật thành phần điểm thành công.", result)


@router.delete("/grade-components/{component_id}")
def remove_grade_component(
    component_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = delete_grade_component(db, component_id, user.id)
    return api_response(request, 200, "Xóa thành phần điểm thành công.", result)


@router.post("/courses/{course_id}/grade-components/complete")
def complete_course_grade_configuration(
    course_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = complete_grade_configuration(db, course_id, user.id)
    return api_response(request, 200, "Cấu hình trọng số đã hoàn tất.", result)


@router.put("/courses/{course_id}/scores")
def enter_or_edit_course_scores(
    course_id: int,
    data: CourseScoresUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB-15: nhập hoặc sửa điểm, còn tính điểm chính thức thuộc PB-16."""
    result = update_course_scores(db, course_id, user.id, data)
    return api_response(request, 200, "Lưu điểm thành phần thành công.", result)
