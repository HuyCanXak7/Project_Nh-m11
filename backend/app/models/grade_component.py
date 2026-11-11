"""Entity thành phần điểm để xóa dây chuyền cùng môn/học kỳ."""

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.course import Course


class GradeComponent(Base):
    __tablename__ = "grade_components"
    __table_args__ = (
        CheckConstraint(
            "weight_percent > 0 AND weight_percent <= 100",
            name="ck_grade_components_weight",
        ),
        CheckConstraint(
            "score IS NULL OR (score >= 0 AND score <= 10)",
            name="ck_grade_components_score",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    weight_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    score: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))

    course: Mapped["Course"] = relationship(back_populates="grade_components")
