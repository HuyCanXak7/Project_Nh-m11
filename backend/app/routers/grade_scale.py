"""Endpoint cho frontend đọc và ADMIN cập nhật bảng quy đổi điểm."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_admin
from app.models import User
from app.schemas.grade_scale import GradeScaleResponse, GradeScaleUpdate
from app.services.grade_scale import get_grade_scale, replace_grade_scale
from app.utils.responses import api_response


router = APIRouter(prefix="/api/v1", tags=["Grade scale"])


def serialize_grade_scale(scales) -> list[dict]:
    """Chuyển entity sang response camelCase dùng chung cho GET và PUT."""
    return [
        GradeScaleResponse.model_validate(scale).model_dump(
            mode="json", by_alias=True
        )
        for scale in scales
    ]


@router.get("/grade-scale")
def list_grade_scale(
    request: Request,
    db: Session = Depends(get_db),
):
    """Bảng quy đổi là cấu hình đọc công khai, không chứa dữ liệu người dùng."""
    scales = get_grade_scale(db)
    return api_response(
        request, 200, "Bảng quy đổi điểm.", serialize_grade_scale(scales)
    )


@router.put("/grade-scale")
def update_grade_scale(
    data: GradeScaleUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """ADMIN thay toàn bộ bảng quy đổi; BE kiểm tra phủ kín và không chồng lấn."""
    scales = replace_grade_scale(db, data)
    return api_response(
        request,
        200,
        "Đã cập nhật bảng quy đổi điểm.",
        serialize_grade_scale(scales),
    )
