"""Mục tiêu GPA cá nhân, mỗi sinh viên có tối đa một mục tiêu."""

from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Goal(Base):
    __tablename__ = "goals"
    __table_args__ = (
        CheckConstraint("target_gpa >= 0 AND target_gpa <= 4", name="ck_goals_target_gpa"),
        CheckConstraint("remaining_credits > 0", name="ck_goals_remaining_credits"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    target_gpa: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    remaining_credits: Mapped[int] = mapped_column(nullable=False)
