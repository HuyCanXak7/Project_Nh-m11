"""Bổ sung các thuộc tính và bảng thành phần điểm theo SRS."""

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, String, false, func
from alembic import op

revision = "0003_expand_srs_models"
down_revision = "0002_gpa_records"
branch_labels = None
depends_on = None


def upgrade():
    """Nâng database cũ lên đúng cấu trúc của các ORM model mới."""
    # batch_alter_table tương thích cả MySQL lẫn SQLite dùng trong unit test.
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(Column("student_code", String(30)))
        batch_op.add_column(Column("major", String(150)))
        batch_op.add_column(
            Column(
                "created_at",
                DateTime(),
                server_default=func.now(),
                nullable=False,
            )
        )
        batch_op.create_unique_constraint("uq_users_student_code", ["student_code"])
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])

    op.add_column("courses", Column("category", String(50)))
    op.add_column(
        "courses",
        Column("is_retake", Boolean(), server_default=false(), nullable=False),
    )

    op.create_table(
        "grade_components",
        Column("id", Integer(), primary_key=True),
        Column(
            "course_id",
            Integer(),
            ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        Column("name", String(100), nullable=False),
        Column("weight_percent", Numeric(5, 2), nullable=False),
        Column("score", Numeric(4, 2)),
        CheckConstraint(
            "weight_percent > 0 AND weight_percent <= 100",
            name="ck_grade_components_weight",
        ),
        CheckConstraint(
            "score IS NULL OR (score >= 0 AND score <= 10)",
            name="ck_grade_components_score",
        ),
    )
    op.create_index("ix_grade_components_course_id", "grade_components", ["course_id"])


def downgrade():
    """Đưa schema về trạng thái trước migration này."""
    op.drop_table("grade_components")
    op.drop_column("courses", "is_retake")
    op.drop_column("courses", "category")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("uq_users_student_code", type_="unique")
        batch_op.drop_column("created_at")
        batch_op.drop_column("major")
        batch_op.drop_column("student_code")
