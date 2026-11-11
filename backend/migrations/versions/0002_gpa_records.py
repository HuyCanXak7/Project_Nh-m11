"""Create academic records for GPA."""

import sqlalchemy as sa
from alembic import op

revision = "0002_gpa_records"
down_revision = "0001_auth_accounts"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "semesters",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("academic_year", sa.String(20), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.CheckConstraint("end_date >= start_date", name="ck_semesters_date_order"),
    )
    op.create_index("ix_semesters_user_id", "semesters", ["user_id"])
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("semester_id", sa.Integer, sa.ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("credits", sa.Integer, nullable=False),
        sa.Column("grade10", sa.Numeric(3, 1)),
        sa.Column("grade4", sa.Numeric(3, 2)),
        sa.CheckConstraint("credits > 0", name="ck_courses_credits"),
        sa.CheckConstraint(
            "(grade10 IS NULL AND grade4 IS NULL) OR "
            "(grade10 IS NOT NULL AND grade4 IS NOT NULL AND grade10 BETWEEN 0 AND 10 AND grade4 BETWEEN 0 AND 4)",
            name="ck_courses_final_grades",
        ),
    )
    op.create_index("ix_courses_semester_id", "courses", ["semester_id"])


def downgrade():
    op.drop_table("courses")
    op.drop_table("semesters")
