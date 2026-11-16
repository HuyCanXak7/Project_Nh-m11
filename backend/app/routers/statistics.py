"""Owner-scoped Dashboard and chart endpoints for PB-20/PB-21."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.services import statistics_service as stats
from app.utils.responses import api_response

router = APIRouter(prefix="/api/v1/statistics", tags=["Statistics"])


@router.get("/summary")
def get_summary(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows, _ = stats.snapshot(db, user.id)
    return api_response(request, 200, "Thống kê tổng quan.", stats.summary(rows))


@router.get("/semesters")
def get_semesters(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows, _ = stats.snapshot(db, user.id)
    return api_response(request, 200, "GPA theo học kỳ.", stats.by_semester(rows))


@router.get("/distribution")
def get_distribution(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows, scale = stats.snapshot(db, user.id)
    return api_response(request, 200, "Phân bố điểm chữ.", stats.distribution(rows, scale))


@router.get("/dashboard")
def get_dashboard(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows, scale = stats.snapshot(db, user.id)
    return api_response(request, 200, "Dữ liệu Dashboard.", {
        "summary": stats.summary(rows), "semesters": stats.by_semester(rows),
        "distribution": stats.distribution(rows, scale),
    })
