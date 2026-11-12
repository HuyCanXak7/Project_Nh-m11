"""Endpoint thêm môn học vào học kỳ."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.course import CourseCreate, CourseResponse
from app.services.course import create_course
from app.utils.responses import api_response

router = APIRouter(prefix="/api/v1/semesters", tags=["Courses"])


@router.post("/{semester_id}/courses", status_code=status.HTTP_201_CREATED)
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
