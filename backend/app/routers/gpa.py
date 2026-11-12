"""Các endpoint GPA; công thức và truy vấn nằm trong services/gpa.py."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.services.gpa import cumulative_gpa, semester_gpa
from app.utils.responses import api_response

router = APIRouter(prefix="/api/v1", tags=["GPA"])


@router.get("/semesters/{semester_id}/gpa")
def get_semester_gpa(
    semester_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = semester_gpa(db, user.id, semester_id)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Không tìm thấy học kỳ."},
        )
    return api_response(request, 200, "Đã tính GPA học kỳ.", data)


@router.get("/gpa/cumulative")
def get_cumulative_gpa(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return api_response(
        request, 200, "Đã tính GPA tích lũy.", cumulative_gpa(db, user.id)
    )
