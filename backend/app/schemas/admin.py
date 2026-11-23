"""Dữ liệu vào của các API quản trị tài khoản sinh viên."""

from pydantic import BaseModel, Field


class StudentStatusUpdate(BaseModel):
    """ADMIN khóa (false) hoặc mở khóa (true) một tài khoản sinh viên."""

    isActive: bool
    # Không bắt buộc: FE hiện chỉ gửi isActive, nhưng cho phép lưu lý do truy vết.
    reason: str | None = Field(default=None, max_length=255)
