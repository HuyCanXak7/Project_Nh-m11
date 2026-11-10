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


@cache
def get_engine():
    return sa.create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True, hide_parameters=True)
