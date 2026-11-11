"""Entity tài khoản phục vụ đăng ký, đăng nhập và phân quyền."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.auth_session import AuthSession
    from app.models.semester import Semester


class User(Base):
    """Một sinh viên sở hữu nhiều học kỳ và nhiều phiên đăng nhập."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('ADMIN', 'STUDENT')", name="ck_users_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    # Chỉ lưu chuỗi bcrypt, tuyệt đối không lưu mật khẩu thô.
    password_hash: Mapped[str] = mapped_column(String(60), nullable=False)
    student_code: Mapped[str | None] = mapped_column(String(30), unique=True)
    major: Mapped[str | None] = mapped_column(String(150))
    role: Mapped[str] = mapped_column(String(7), default="STUDENT", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # cascade giúp xóa dữ liệu con khi tài khoản bị xóa qua ORM.
    semesters: Mapped[list["Semester"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    auth_sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
