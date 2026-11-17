"""Add one GPA goal per user."""

from alembic import op
from sqlalchemy import CheckConstraint, Column, Date, ForeignKey, Integer, Numeric, UniqueConstraint


revision = "0006_goals"
down_revision = "0005_grade_scale"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "goals",
        Column("id", Integer(), primary_key=True),
        Column("user_id", Integer(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        Column("target_gpa", Numeric(3, 2), nullable=False),
        Column("target_date", Date(), nullable=False),
        Column("remaining_credits", Integer(), nullable=False),
        CheckConstraint("target_gpa >= 0 AND target_gpa <= 4", name="ck_goals_target_gpa"),
        CheckConstraint("remaining_credits > 0", name="ck_goals_remaining_credits"),
        UniqueConstraint("user_id", name="uq_goals_user_id"),
    )


def downgrade():
    op.drop_table("goals")
