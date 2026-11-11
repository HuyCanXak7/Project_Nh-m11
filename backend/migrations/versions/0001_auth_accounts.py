"""Create account and login-session tables."""

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, ForeignKey, Integer, String, UniqueConstraint, true
from alembic import op

revision = "0001_auth_accounts"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        Column("id", Integer, primary_key=True),
        Column("email", String(254), nullable=False),
        Column("full_name", String(150), nullable=False),
        Column("password_hash", String(60), nullable=False),
        Column("role", String(7), nullable=False),
        Column("is_active", Boolean, nullable=False, server_default=true()),
        UniqueConstraint("email", name="uq_users_email"),
        CheckConstraint("role IN ('ADMIN', 'STUDENT')", name="ck_users_role"),
    )
    op.create_table(
        "auth_sessions",
        Column("id", String(32), primary_key=True),
        Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        Column("expires_at", BigInteger, nullable=False),
    )


def downgrade():
    op.drop_table("auth_sessions")
    op.drop_table("users")
