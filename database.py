import os
from functools import cache

import sqlalchemy as sa

metadata = sa.MetaData()

users = sa.Table(
    "users",
    metadata,
    sa.Column("id", sa.Integer, primary_key=True),
    sa.Column("email", sa.String(254), nullable=False),
    sa.Column("full_name", sa.String(150), nullable=False),
    sa.Column("password_hash", sa.String(60), nullable=False),
    sa.Column("role", sa.String(7), nullable=False),
    sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
    sa.UniqueConstraint("email", name="uq_users_email"),
    sa.CheckConstraint("role IN ('ADMIN', 'STUDENT')", name="ck_users_role"),
)

auth_sessions = sa.Table(
    "auth_sessions",
    metadata,
    sa.Column("id", sa.String(32), primary_key=True),
    sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    sa.Column("expires_at", sa.BigInteger, nullable=False),
)

semesters = sa.Table(
    "semesters",
    metadata,
    sa.Column("id", sa.Integer, primary_key=True),
    sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
    sa.Column("name", sa.String(150), nullable=False),
    sa.Column("academic_year", sa.String(20), nullable=False),
    sa.Column("start_date", sa.Date, nullable=False),
    sa.Column("end_date", sa.Date, nullable=False),
    sa.CheckConstraint("end_date >= start_date", name="ck_semesters_date_order"),
)

courses = sa.Table(
    "courses",
    metadata,
    sa.Column("id", sa.Integer, primary_key=True),
    sa.Column("semester_id", sa.Integer, sa.ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False, index=True),
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


@cache
def get_engine():
    return sa.create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True, hide_parameters=True)
