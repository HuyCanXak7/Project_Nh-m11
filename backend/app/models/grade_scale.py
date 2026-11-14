"""Entity bảng quy đổi điểm hệ 10 sang điểm chữ và hệ 4."""

from decimal import Decimal

from sqlalchemy import CheckConstraint, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class GradeScale(Base):
    __tablename__ = "grade_scale"
    __table_args__ = (
        CheckConstraint(
            "min_score >= 0 AND max_score <= 10 AND min_score <= max_score",
            name="ck_grade_scale_score_range",
        ),
        CheckConstraint(
            "gpa4 >= 0 AND gpa4 <= 4",
            name="ck_grade_scale_gpa4",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    min_score: Mapped[Decimal] = mapped_column(Numeric(3, 1), nullable=False)
    max_score: Mapped[Decimal] = mapped_column(Numeric(3, 1), nullable=False)
    letter: Mapped[str] = mapped_column(String(2), unique=True, nullable=False)
    gpa4: Mapped[Decimal] = mapped_column(Numeric(2, 1), nullable=False)
