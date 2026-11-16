import sqlalchemy as sa
from fastapi import APIRouter, Depends, Request

from app.core.responses import response
from app.db.session import get_engine
from app.db.tables import grade_scale
from app.services.auth_service import current_user
from app.services import statistics_service as stats

router = APIRouter(prefix="/api/v1", tags=["Statistics"])


@router.get("/statistics/summary")
def get_summary(request: Request, user=Depends(current_user)):
    rows, _ = stats.snapshot(user["id"])
    return response(request, 200, "Thống kê tổng quan.", stats.summary(rows))


@router.get("/statistics/semesters")
def get_semesters(request: Request, user=Depends(current_user)):
    rows, _ = stats.snapshot(user["id"])
    return response(request, 200, "GPA theo học kỳ.", stats.by_semester(rows))


@router.get("/statistics/distribution")
def get_distribution(request: Request, user=Depends(current_user)):
    rows, scale = stats.snapshot(user["id"])
    return response(request, 200, "Phân bố điểm chữ.", stats.distribution(rows, scale))


@router.get("/statistics/dashboard")
def get_dashboard(request: Request, user=Depends(current_user)):
    rows, scale = stats.snapshot(user["id"])
    return response(request, 200, "Dữ liệu Dashboard.", {
        "summary": stats.summary(rows), "semesters": stats.by_semester(rows),
        "distribution": stats.distribution(rows, scale),
    })


@router.get("/grade-scale", tags=["Grade scale"])
def get_grade_scale(request: Request, user=Depends(current_user)):
    with get_engine().connect() as connection:
        rows = connection.execute(sa.select(grade_scale).order_by(grade_scale.c.min10.desc())).mappings()
        data = [{"letter": row["letter"], "min10": float(row["min10"]),
                 "max10": float(row["max10"]), "grade4": float(row["grade4"])} for row in rows]
    return response(request, 200, "Bảng quy đổi điểm.", {"items": data})
