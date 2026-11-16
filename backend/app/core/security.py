"""Các hàm bảo mật nhỏ: băm mật khẩu và mã hóa/giải mã JWT."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import setting


def hash_password(password: str) -> str:
    """Băm mật khẩu bằng bcrypt trước khi lưu vào database."""
    if len(password) < 8:
        raise ValueError("Mật khẩu phải có ít nhất 8 ký tự.")
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Mật khẩu không được vượt quá 72 byte.")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """So sánh mật khẩu người dùng nhập với chuỗi bcrypt đã lưu."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_token(data: dict, expires_delta: timedelta) -> str:
    """Tạo JWT từ dữ liệu truyền vào và thời gian hết hạn."""
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, setting.SECRET_KEY, algorithm=setting.ALGORITHM)


def decode_token(token: str) -> dict:
    """Giải mã và kiểm tra chữ ký, thuật toán, thời hạn của JWT."""
    return jwt.decode(token, setting.SECRET_KEY, algorithms=[setting.ALGORITHM])
