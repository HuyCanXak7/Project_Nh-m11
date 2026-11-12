"""Các endpoint CRUD học kỳ; nghiệp vụ thật nằm trong services/semester.py."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.semester import SemesterCreate, SemesterResponse, SemesterUpdate
from app.services.semester import (
    create_semester,
    delete_semester,
    get_owned_semester,
    get_semesters,
    update_semester,
)
from app.utils.responses import api_response

router = APIRouter(prefix="/api/v1/semesters", tags=["Semesters"])


@router.get("")
def list_semesters(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    semesters = get_semesters(db, user.id)
    data = [SemesterResponse.model_validate(item).model_dump(mode="json") for item in semesters]
    return api_response(request, 200, "Danh sách học kỳ.", data)


@router.get("/{semester_id}")
def semester_detail(
    semester_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    semester = get_owned_semester(db, semester_id, user.id)
    data = SemesterResponse.model_validate(semester).model_dump(mode="json")
    return api_response(request, 200, "Thông tin học kỳ.", data)


@router.post("", status_code=status.HTTP_201_CREATED)
def add_semester(
    data: SemesterCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    semester = create_semester(db, user.id, data)
    result = SemesterResponse.model_validate(semester).model_dump(mode="json")
    return api_response(request, 201, "Tạo học kỳ thành công.", result)


@router.put("/{semester_id}")
def edit_semester(
    semester_id: int,
    data: SemesterUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    semester = update_semester(db, semester_id, user.id, data)
    result = SemesterResponse.model_validate(semester).model_dump(mode="json")
    return api_response(request, 200, "Cập nhật học kỳ thành công.", result)


@router.delete("/{semester_id}")
def remove_semester(
    semester_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = delete_semester(db, semester_id, user.id)
    return api_response(request, 200, "Xóa học kỳ thành công.", deleted)
