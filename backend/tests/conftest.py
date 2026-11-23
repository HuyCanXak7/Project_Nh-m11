import pytest

from app.services.auth import login_attempts


@pytest.fixture(autouse=True)
def reset_login_limit():
    """Bộ đếm chống dò mật khẩu theo IP dùng chung cả phiên test → xóa để các test không ảnh hưởng nhau."""
    login_attempts.clear()
