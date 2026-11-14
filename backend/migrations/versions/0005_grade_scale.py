"""Tạo và seed bảng quy đổi điểm mặc định theo SRS."""

from decimal import Decimal

from alembic import op
from sqlalchemy import CheckConstraint, Column, Integer, Numeric, String, column, table

revision = "0005_grade_scale"
down_revision = "0004_require_course_category"
branch_labels = None
depends_on = None


def upgrade():
    """Tạo bảng grade_scale và thêm 8 khoảng điểm mặc định."""
    op.create_table(
        "grade_scale",
        Column("id", Integer(), primary_key=True),
        Column("min_score", Numeric(3, 1), nullable=False),
        Column("max_score", Numeric(3, 1), nullable=False),
        Column("letter", String(2), unique=True, nullable=False),
        Column("gpa4", Numeric(2, 1), nullable=False),
        CheckConstraint(
            "min_score >= 0 AND max_score <= 10 AND min_score <= max_score",
            name="ck_grade_scale_score_range",
        ),
        CheckConstraint(
            "gpa4 >= 0 AND gpa4 <= 4",
            name="ck_grade_scale_gpa4",
        ),
    )

    grade_scale = table(
        "grade_scale",
        column("min_score", Numeric(3, 1)),
        column("max_score", Numeric(3, 1)),
        column("letter", String(2)),
        column("gpa4", Numeric(2, 1)),
    )
    op.bulk_insert(
        grade_scale,
        [
            {"min_score": Decimal("8.5"), "max_score": Decimal("10.0"), "letter": "A", "gpa4": Decimal("4.0")},
            {"min_score": Decimal("8.0"), "max_score": Decimal("8.4"), "letter": "B+", "gpa4": Decimal("3.5")},
            {"min_score": Decimal("7.0"), "max_score": Decimal("7.9"), "letter": "B", "gpa4": Decimal("3.0")},
            {"min_score": Decimal("6.5"), "max_score": Decimal("6.9"), "letter": "C+", "gpa4": Decimal("2.5")},
            {"min_score": Decimal("5.5"), "max_score": Decimal("6.4"), "letter": "C", "gpa4": Decimal("2.0")},
            {"min_score": Decimal("5.0"), "max_score": Decimal("5.4"), "letter": "D+", "gpa4": Decimal("1.5")},
            {"min_score": Decimal("4.0"), "max_score": Decimal("4.9"), "letter": "D", "gpa4": Decimal("1.0")},
            {"min_score": Decimal("0.0"), "max_score": Decimal("3.9"), "letter": "F", "gpa4": Decimal("0.0")},
        ],
    )


def downgrade():
    """Xóa bảng quy đổi khi rollback migration."""
    op.drop_table("grade_scale")
