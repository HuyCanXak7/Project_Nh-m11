"""FR-11 / PB-22: create, read, replace and delete the signed-in user's GPA goal."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.goal import GoalWrite
from app.services import goal as service
from app.utils.responses import api_response

router = APIRouter(prefix="/api/v1/goals", tags=["Goal"])


@router.post("", status_code=201)
def create_goal(payload: GoalWrite, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = service.create_goal(db, user.id, payload)
    return api_response(request, 201, "Tạo mục tiêu GPA thành công.", service.serialize_goal(goal))


@router.get("")
def read_goal(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return api_response(request, 200, "Mục tiêu GPA của bạn.", service.serialize_goal(service.get_goal(db, user.id)))


@router.put("")
def update_goal(payload: GoalWrite, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = service.update_goal(db, user.id, payload)
    return api_response(request, 200, "Cập nhật mục tiêu GPA thành công.", service.serialize_goal(goal))


@router.delete("")
def delete_goal(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    service.delete_goal(db, user.id)
    return api_response(request, 200, "Xóa mục tiêu GPA thành công.")
