"""Bắt buộc mọi môn học có loại môn hợp lệ để API danh sách luôn ổn định."""

from alembic import op
from sqlalchemy import String

revision = "0004_require_course_category"
down_revision = "0003_expand_srs_models"
branch_labels = None
depends_on = None


def upgrade():
    """Gán loại mặc định cho dữ liệu cũ rồi chuyển cột thành NOT NULL."""
    op.execute("UPDATE courses SET category = 'GENERAL' WHERE category IS NULL")
    with op.batch_alter_table("courses") as batch_op:
        batch_op.alter_column(
            "category",
            existing_type=String(50),
            nullable=False,
        )


def downgrade():
    """Cho phép category rỗng trở lại khi rollback migration."""
    with op.batch_alter_table("courses") as batch_op:
        batch_op.alter_column(
            "category",
            existing_type=String(50),
            nullable=True,
        )
