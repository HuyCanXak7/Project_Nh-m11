import os
import tempfile
from pathlib import Path

# Mặc định test dùng DB SQLite riêng, không ghi tài khoản test vào DB dev trong backend/.env.
# Phải đặt trước khi import app (config đọc DATABASE_URL lúc import); CI muốn dùng DB khác thì tự set biến này.
os.environ.setdefault(
    "DATABASE_URL", f"sqlite:///{Path(tempfile.gettempdir()) / 'quanlichisohoctap_test.db'}"
)

import pytest  # noqa: E402

from app.services.auth import login_attempts  # noqa: E402


@pytest.fixture(autouse=True)
def reset_login_limit():
    """Bộ đếm chống dò mật khẩu theo IP dùng chung cả phiên test → xóa để các test không ảnh hưởng nhau."""
    login_attempts.clear()
