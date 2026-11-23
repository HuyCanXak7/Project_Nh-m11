"""Endpoint cho frontend đọc bảng quy đổi điểm."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_admin
from app.models import User
from app.schemas.grade_scale import GradeScaleResponse, GradeScaleUpdate
from app.services.grade_scale import get_grade_scale, replace_grade_scale
from app.utils.responses import api_response


router = APIRouter(prefix="/api/v1", tags=["Grade scale"])


@router.get("/grade-scale")
def list_grade_scale(
    request: Request,
    db: Session = Depends(get_db),
):
    """Bảng quy đổi là cấu hình đọc công khai, không chứa dữ liệu người dùng."""
    scales = get_grade_scale(db)
    result = [
        GradeScaleResponse.model_validate(scale).model_dump(
            mode="json", by_alias=True
        )
        for scale in scales
    ]
    return api_response(request, 200, "Bảng quy đổi điểm.", result)


@router.put("/grade-scale")
def edit_grade_scale(
    data: GradeScaleUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """PB-32: chỉ ADMIN thay bảng quy đổi; áp dụng cho các lần tính điểm/GPA tiếp theo."""
    scales = replace_grade_scale(db, data.items)
    result = [
        GradeScaleResponse.model_validate(scale).model_dump(mode="json", by_alias=True)
        for scale in scales
    ]
    return api_response(request, 200, "Cập nhật bảng quy đổi điểm thành công.", result)
