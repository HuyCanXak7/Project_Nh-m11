"""Entity môn học, dữ liệu đầu vào để tính GPA học kỳ và tích lũy."""

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.grade_component import GradeComponent
    from app.models.semester import Semester


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint("credits > 0", name="ck_courses_credits"),
        CheckConstraint(
            "(grade10 IS NULL AND grade4 IS NULL) OR "
            "(grade10 IS NOT NULL AND grade4 IS NOT NULL "
            "AND grade10 BETWEEN 0 AND 10 AND grade4 BETWEEN 0 AND 4)",
            name="ck_courses_final_grades",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    semester_id: Mapped[int] = mapped_column(
        ForeignKey("semesters.id", ondelete="CASCADE"), index=True, nullable=False
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    credits: Mapped[int] = mapped_column(nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    is_retake: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Hai cột này chỉ có giá trị khi môn đã đủ điểm thành phần.
    grade10: Mapped[Decimal | None] = mapped_column(Numeric(3, 1))
    grade4: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))

    semester: Mapped["Semester"] = relationship(back_populates="courses")
    grade_components: Mapped[list["GradeComponent"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )
