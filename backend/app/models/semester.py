"""Entity học kỳ thuộc riêng từng tài khoản sinh viên."""

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.user import User


class Semester(Base):
    __tablename__ = "semesters"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_semesters_date_order"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    user: Mapped["User"] = relationship(back_populates="semesters")
    courses: Mapped[list["Course"]] = relationship(
        back_populates="semester", cascade="all, delete-orphan"
    )
