"""Đọc cấu hình backend từ file backend/.env và biến môi trường."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Dùng đường dẫn tuyệt đối để cấu hình vẫn đúng dù chạy lệnh ở thư mục khác.
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"


class Setting(BaseSettings):
    """Các cấu hình có thể thay đổi mà không cần sửa source code."""

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Pydantic v2 dùng model_config thay cho class Config cũ.
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


setting = Setting()
