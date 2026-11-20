"""One GPA goal per account, enforced by a database unique constraint."""

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, Double, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Goal(Base):
    __tablename__ = "goals"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_goals_user_id"),
        CheckConstraint("target_gpa BETWEEN 0 AND 4", name="ck_goals_target_gpa"),
        CheckConstraint("remaining_credits > 0 AND remaining_credits <= 2147483647", name="ck_goals_remaining_credits"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_gpa: Mapped[float] = mapped_column(Double, nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    remaining_credits: Mapped[int] = mapped_column(nullable=False)

    user: Mapped["User"] = relationship(back_populates="goal")
