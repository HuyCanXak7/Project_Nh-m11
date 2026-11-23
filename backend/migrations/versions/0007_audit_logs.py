"""Ghi nhật ký hành động quản trị viên lên tài khoản sinh viên."""

from alembic import op
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func


revision = "0007_audit_logs"
down_revision = "0006_goals"
branch_labels = None
depends_on = None


def upgrade():
    """Tạo bảng audit_logs để lưu lý do khóa/mở khóa và người thực hiện."""
    op.create_table(
        "audit_logs",
        Column("id", Integer(), primary_key=True),
        Column(
            "user_id",
            Integer(),
            ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        Column("action", String(50), nullable=False),
        Column(
            "target_user_id",
            Integer(),
            ForeignKey("users.id", ondelete="CASCADE"),
        ),
        Column("created_at", DateTime(), server_default=func.now(), nullable=False),
        Column("reason", String(255)),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_target_user_id", "audit_logs", ["target_user_id"])


def downgrade():
    """Xóa bảng nhật ký khi rollback migration."""
    op.drop_index("ix_audit_logs_target_user_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")
