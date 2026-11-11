"""Create academic records for GPA."""

from sqlalchemy import CheckConstraint, Column, Date, ForeignKey, Integer, Numeric, String
from alembic import op

revision = "0002_gpa_records"
down_revision = "0001_auth_accounts"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "semesters",
        Column("id", Integer, primary_key=True),
        Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        Column("name", String(150), nullable=False),
        Column("academic_year", String(20), nullable=False),
        Column("start_date", Date, nullable=False),
        Column("end_date", Date, nullable=False),
        CheckConstraint("end_date >= start_date", name="ck_semesters_date_order"),
    )
    op.create_index("ix_semesters_user_id", "semesters", ["user_id"])
    op.create_table(
        "courses",
        Column("id", Integer, primary_key=True),
        Column("semester_id", Integer, ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False),
        Column("code", String(50), nullable=False),
        Column("name", String(150), nullable=False),
        Column("credits", Integer, nullable=False),
        Column("grade10", Numeric(3, 1)),
        Column("grade4", Numeric(3, 2)),
        CheckConstraint("credits > 0", name="ck_courses_credits"),
        CheckConstraint(
            "(grade10 IS NULL AND grade4 IS NULL) OR "
            "(grade10 IS NOT NULL AND grade4 IS NOT NULL AND grade10 BETWEEN 0 AND 10 AND grade4 BETWEEN 0 AND 4)",
            name="ck_courses_final_grades",
        ),
    )
    op.create_index("ix_courses_semester_id", "courses", ["semester_id"])


def downgrade():
    op.drop_table("courses")
    op.drop_table("semesters")
