"""Authenticated batch import endpoint (PB-26)."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.import_grade import ImportGradesRequest
from app.services.grade_import import import_grades
from app.utils.responses import api_response

router = APIRouter(prefix="/api/v1/import", tags=["Import"])


@router.post("/grades")
def save_imported_grades(
    payload: ImportGradesRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = import_grades(db, user, payload.rows)
    return api_response(request, 200, "Đã lưu dữ liệu import.", result)
