"""Entity nhật ký hành động quản trị (khóa/mở khóa tài khoản)."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AuditLog(Base):
    """Ghi lại ai đã tác động lên tài khoản nào, phục vụ truy vết của quản trị viên."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Người thực hiện hành động (ADMIN).
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    # Tài khoản bị tác động; có thể null nếu sau này có hành động không gắn tài khoản.
    target_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    # Lý do khóa/mở khóa do ADMIN nhập (tùy chọn) để nhật ký có ngữ cảnh.
    reason: Mapped[str | None] = mapped_column(String(255))
