"""Persist the agreed grade scale for FE and statistics (PB-51)."""

import sqlalchemy as sa
from alembic import op

revision = "0003_grade_scale"
down_revision = "0002_gpa_records"
branch_labels = None
depends_on = None


def upgrade():
    table = op.create_table(
        "grade_scale",
        sa.Column("letter", sa.String(2), primary_key=True),
        sa.Column("min10", sa.Numeric(3, 1), nullable=False),
        sa.Column("max10", sa.Numeric(3, 1), nullable=False),
        sa.Column("grade4", sa.Numeric(3, 2), nullable=False),
        sa.CheckConstraint("min10 >= 0 AND max10 <= 10 AND min10 <= max10", name="ck_scale_bounds"),
        sa.CheckConstraint("grade4 BETWEEN 0 AND 4", name="ck_scale_grade4"),
    )
    op.bulk_insert(table, [
        dict(letter=letter, min10=low, max10=high, grade4=grade)
        for letter, low, high, grade in [
            ("A", 8.5, 10, 4), ("B+", 8, 8.4, 3.5), ("B", 7, 7.9, 3),
            ("C+", 6.5, 6.9, 2.5), ("C", 5.5, 6.4, 2), ("D+", 5, 5.4, 1.5),
            ("D", 4, 4.9, 1), ("F", 0, 3.9, 0),
        ]
    ])


def downgrade():
    op.drop_table("grade_scale")
