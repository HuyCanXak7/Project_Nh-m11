import sqlalchemy as sa
from fastapi import APIRouter, Depends, Path, Request

from app.core.errors import auth_error
from app.core.responses import response
from app.schemas.gpa import SemesterGpaData, SemesterGpaResponse
from app.services.auth_service import current_user
from app.services.gpa_service import cumulative_gpa, semester_gpa

router = APIRouter()


@router.get(
    "/api/v1/semesters/{semesterId}/gpa",
    tags=["Grades"],
    response_model=SemesterGpaResponse,
    summary="Tính GPA học kỳ (FR-09 / PB-18 / T0694D8)",
    description=(
        "GPA = tổng (điểm hệ 4 × tín chỉ) / tổng tín chỉ, chỉ tính môn đủ điểm. "
        "Môn F vẫn tính vào GPA. Làm tròn HALF_UP đến 2 chữ số trước khi xếp loại: "
        "3.60 Xuất sắc; 3.20 Giỏi; 2.50 Khá; 2.00 Trung bình; thấp hơn là Yếu / Kém. "
        "Chưa có môn đủ điểm: gpa4 và ranking là null. Chỉ truy cập học kỳ của chính mình."
    ),
    responses={
        401: {"description": "Thiếu token, token không hợp lệ hoặc hết hạn"},
        404: {"description": "Học kỳ không tồn tại hoặc thuộc người dùng khác"},
    },
)
def get_semester_gpa(
    request: Request,
    semesterId: int = Path(gt=0, le=2_147_483_647),
    user: sa.RowMapping = Depends(current_user),
):
    data = semester_gpa(user["id"], semesterId)
    if data is None:
        raise auth_error(404, "NOT_FOUND", "Không tìm thấy học kỳ.")
    return response(request, 200, "Đã tính GPA học kỳ.", SemesterGpaData(**data).model_dump())


@router.get("/api/v1/gpa/cumulative", tags=["Grades"])
def get_cumulative_gpa(request: Request, user: sa.RowMapping = Depends(current_user)):
    return response(request, 200, "Đã tính GPA tích lũy.", cumulative_gpa(user["id"]))
