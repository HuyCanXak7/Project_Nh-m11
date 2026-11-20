"""GPA goal CRUD; account identity always comes from the authenticated user."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Goal
from app.schemas.goal import GoalWrite


def goal_error(status, code, message):
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def existing_goal(db: Session, user_id: int):
    return db.query(Goal).filter(Goal.user_id == user_id).one_or_none()


def get_goal(db: Session, user_id: int) -> Goal:
    goal = existing_goal(db, user_id)
    if goal is None:
        raise goal_error(404, "NOT_FOUND", "Bạn chưa có mục tiêu GPA. Hãy tạo mục tiêu mới.")
    return goal


def conflict():
    return goal_error(409, "GOAL_EXISTS", "Bạn đã có mục tiêu GPA. Hãy dùng chức năng sửa (PUT /api/v1/goals).")


def create_goal(db: Session, user_id: int, payload: GoalWrite) -> Goal:
    if existing_goal(db, user_id) is not None:
        raise conflict()
    goal = Goal(user_id=user_id, target_gpa=payload.targetGpa,
                target_date=payload.targetDate, remaining_credits=payload.remainingCredits)
    db.add(goal)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # The DB unique constraint also handles concurrent POSTs that both passed the initial check.
        if existing_goal(db, user_id) is not None:
            raise conflict() from None
        raise
    db.refresh(goal)
    return goal


def update_goal(db: Session, user_id: int, payload: GoalWrite) -> Goal:
    goal = get_goal(db, user_id)
    goal.target_gpa = payload.targetGpa
    goal.target_date = payload.targetDate
    goal.remaining_credits = payload.remainingCredits
    db.commit()
    db.refresh(goal)
    return goal


def delete_goal(db: Session, user_id: int):
    db.delete(get_goal(db, user_id))
    db.commit()


def serialize_goal(goal: Goal) -> dict:
    return {"id": goal.id, "targetGpa": goal.target_gpa, "targetDate": goal.target_date.isoformat(),
            "remainingCredits": goal.remaining_credits}
