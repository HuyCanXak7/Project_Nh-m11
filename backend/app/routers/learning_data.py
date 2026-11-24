"""Endpoint tổng hợp dữ liệu khởi tạo, giảm số request của Dashboard."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.services.learning_data import get_learning_data
from app.utils.responses import api_response


router = APIRouter(prefix="/api/v1", tags=["Learning data"])


@router.get("/learning-data")
def bootstrap_learning_data(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB-39: tải toàn bộ dữ liệu học tập của user trong một request.

    Response giữ nguyên shape của từng API cũ (semester/course/component),
    nhờ vậy frontend chỉ cần đổi nguồn dữ liệu, không đổi cách tính.
    """
    return api_response(
        request,
        200,
        "Dữ liệu học tập khởi tạo.",
        get_learning_data(db, user.id),
    )
