"""PB-22: persist one GPA goal per user."""

import sqlalchemy as sa
from alembic import op

revision = "0006_gpa_goals"
down_revision = "0005_grade_scale"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "goals",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_gpa", sa.Double, nullable=False),
        sa.Column("target_date", sa.Date, nullable=False),
        sa.Column("remaining_credits", sa.Integer, nullable=False),
        sa.UniqueConstraint("user_id", name="uq_goals_user_id"),
        sa.CheckConstraint("target_gpa BETWEEN 0 AND 4", name="ck_goals_target_gpa"),
        sa.CheckConstraint("remaining_credits > 0 AND remaining_credits <= 2147483647", name="ck_goals_remaining_credits"),
    )


def downgrade():
    op.drop_table("goals")
