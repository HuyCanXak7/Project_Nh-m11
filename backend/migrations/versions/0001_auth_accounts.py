"""Create account and login-session tables."""

import sqlalchemy as sa
from alembic import op

revision = "0001_auth_accounts"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("password_hash", sa.String(60), nullable=False),
        sa.Column("role", sa.String(7), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint("role IN ('ADMIN', 'STUDENT')", name="ck_users_role"),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.BigInteger, nullable=False),
    )


def downgrade():
    op.drop_table("auth_sessions")
    op.drop_table("users")
