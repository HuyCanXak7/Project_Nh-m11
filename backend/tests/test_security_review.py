"""Kiểm thử hồi quy cho checklist bảo mật PB-36 / T0694F6."""

import time
from collections.abc import Generator
from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import setting
from app.core.security import create_token, decode_token, hash_password, verify_password
from app.db.database import Base, get_db
from app.main import app
from app.services import auth as auth_service


@pytest.fixture
def security_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    """Dùng SQLite in-memory để test session/API không phụ thuộc MySQL local."""
    auth_service.login_attempts.clear()
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine, expire_on_commit=False)

    def override_get_db():
        with test_session() as db:
            yield db

    # Không chạy lifespan để tránh kết nối database thật trong lúc unit test.
    app.dependency_overrides[get_db] = override_get_db
    app.state.dummy_password_hash = hash_password("security-test-dummy")
    client = TestClient(app)
    try:
        yield client, test_session
    finally:
        client.close()
        app.dependency_overrides.clear()
        auth_service.login_attempts.clear()


def register_and_login(client: TestClient, password: str = "password123") -> tuple[str, dict]:
    """Tạo tài khoản mới rồi trả về email và token response của lần đăng nhập."""
    email = f"security.{uuid4().hex}@example.com"
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Sinh viên bảo mật", "password": password},
    )
    assert registered.status_code == 201
    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert logged_in.status_code == 200
    return email, logged_in.json()["data"]


def test_password_is_bcrypt_hashed_and_never_compared_as_plain_text():
    password = "correct-horse-battery-staple"
    password_hash = hash_password(password)

    assert password_hash != password
    assert password_hash.startswith(("$2a$", "$2b$", "$2y$"))
    assert verify_password(password, password_hash) is True
    assert verify_password("wrong-password", password_hash) is False
    # Hash hỏng/không phải bcrypt phải trả False, không làm sập endpoint login.
    assert verify_password(password, "not-a-bcrypt-hash") is False


def test_bcrypt_rejects_password_longer_than_72_bytes():
    with pytest.raises(ValueError):
        hash_password("a" * 73)


def test_jwt_uses_15_minute_access_and_7_day_refresh():
    assert setting.ACCESS_TOKEN_EXPIRE_MINUTES == 15
    assert setting.REFRESH_TOKEN_EXPIRE_DAYS == 7

    before = int(time.time())
    access_token = create_token(
        {"sub": "1", "type": "access"},
        timedelta(minutes=setting.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_token(
        {"sub": "1", "type": "refresh"},
        timedelta(days=setting.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    after = int(time.time())

    access_payload = decode_token(access_token)
    refresh_payload = decode_token(refresh_token)
    assert before + 15 * 60 - 2 <= access_payload["exp"] <= after + 15 * 60 + 2
    assert before + 7 * 24 * 60 * 60 - 2 <= refresh_payload["exp"] <= after + 7 * 24 * 60 * 60 + 2


def test_cors_allows_only_configured_frontend_origin():
    allowed_origin = setting.FRONTEND_ORIGIN.split(",")[0].strip()
    client = TestClient(app)

    allowed = client.get("/openapi.json", headers={"Origin": allowed_origin})
    assert allowed.headers.get("access-control-allow-origin") == allowed_origin

    blocked = client.get("/openapi.json", headers={"Origin": "https://evil.example"})
    assert blocked.headers.get("access-control-allow-origin") is None

    local_dev = client.get("/openapi.json", headers={"Origin": "http://127.0.0.1:5501"})
    assert local_dev.headers.get("access-control-allow-origin") == "http://127.0.0.1:5501"

    lookalike = client.get("/openapi.json", headers={"Origin": "http://localhost.evil.example"})
    assert lookalike.headers.get("access-control-allow-origin") is None

    preflight = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": allowed_origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == allowed_origin


def test_unexpected_errors_return_generic_500_without_internal_details():
    """Lỗi ngoài dự kiến không được lộ message/stack trace nội bộ ra client."""
    from app.dependencies.auth import get_current_user

    def explode():
        raise RuntimeError("internal-secret-detail")

    app.dependency_overrides[get_current_user] = explode
    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.get("/api/v1/auth/me")
    finally:
        app.dependency_overrides.clear()
        client.close()

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "internal-secret-detail" not in response.text


def test_missing_token_returns_contract_unauthorized_code():
    """401 phải dùng mã UNAUTHORIZED đúng bảng lỗi README/OpenAPI."""
    client = TestClient(app)
    try:
        response = client.get("/api/v1/auth/me")
    finally:
        client.close()

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_failed_logins_are_rate_limited_and_success_resets_counter(
    security_client: tuple[TestClient, sessionmaker], monkeypatch
):
    client, _ = security_client
    email, _ = register_and_login(client)
    monkeypatch.setattr(auth_service, "LOGIN_ATTEMPT_LIMIT", 2)

    # Hai lần sai liên tiếp được phép ghi nhận; lần thứ ba bị chặn.
    for _ in range(2):
        failed = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "wrong-password"},
        )
        assert failed.status_code == 401

    blocked = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "wrong-password"},
    )
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "TOO_MANY_REQUESTS"
    assert blocked.headers["Retry-After"]

    # Đăng nhập đúng phải xóa bộ đếm để không khóa oan người dùng hợp lệ.
    # Xóa thủ công ở đây chỉ để thoát cửa sổ đang bị chặn; sau đó một lần sai
    # + một lần đúng phải đưa bộ đếm về 0 thực sự.
    auth_service.login_attempts.clear()
    wrong_once = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "wrong-password"},
    )
    assert wrong_once.status_code == 401
    success = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert success.status_code == 200

    # Nếu success không reset, lần sai đầu tiên dưới đây đã bị 429.
    for _ in range(2):
        wrong_after_success = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "wrong-password"},
        )
        assert wrong_after_success.status_code == 401

    blocked_again = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "wrong-password"},
    )
    assert blocked_again.status_code == 429


def test_logout_revokes_access_and_refresh_tokens(security_client):
    client, _ = security_client
    _, tokens = register_and_login(client)
    access_headers = {"Authorization": f"Bearer {tokens['accessToken']}"}

    assert client.get("/api/v1/auth/me", headers=access_headers).status_code == 200
    logged_out = client.post(
        "/api/v1/auth/logout",
        json={"refreshToken": tokens["refreshToken"]},
    )
    assert logged_out.status_code == 200

    # Cả access token cũ và refresh token cũ đều không dùng lại được.
    assert client.get("/api/v1/auth/me", headers=access_headers).status_code == 401
    refresh_again = client.post(
        "/api/v1/auth/refresh",
        json={"refreshToken": tokens["refreshToken"]},
    )
    assert refresh_again.status_code == 401


def test_password_change_revokes_old_session(security_client):
    client, _ = security_client
    email, tokens = register_and_login(client)
    old_headers = {"Authorization": f"Bearer {tokens['accessToken']}"}

    changed = client.post(
        "/api/v1/auth/change-password",
        headers=old_headers,
        json={"currentPassword": "password123", "newPassword": "new-password123"},
    )
    assert changed.status_code == 200
    new_tokens = changed.json()["data"]

    assert client.get("/api/v1/auth/me", headers=old_headers).status_code == 401
    old_refresh = client.post(
        "/api/v1/auth/refresh",
        json={"refreshToken": tokens["refreshToken"]},
    )
    assert old_refresh.status_code == 401

    new_headers = {"Authorization": f"Bearer {new_tokens['accessToken']}"}
    assert client.get("/api/v1/auth/me", headers=new_headers).status_code == 200
    assert client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "new-password123"},
    ).status_code == 200

