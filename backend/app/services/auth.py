"""Nghiệp vụ token và HTTP Bearer dùng cho xác thực."""

import time
from datetime import timedelta
from secrets import token_urlsafe
from threading import Lock
from uuid import uuid4

import jwt
from cachetools import TTLCache
from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import setting
from app.core.security import create_token, decode_token, hash_password, verify_password
from app.models import AuthSession, User
from app.schemas.auth import LoginRequest, RegisterRequest


# auto_error=False để dependencies tự trả về nội dung lỗi thống nhất.
bearer_scheme = HTTPBearer(auto_error=False)
LOGIN_WINDOW_SECONDS = 60
LOGIN_ATTEMPT_LIMIT = 20
login_attempts = TTLCache(maxsize=10_000, ttl=LOGIN_WINDOW_SECONDS)
login_lock = Lock()


def auth_error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def require_active_user(user: User | None) -> User:
    if user is None:
        raise auth_error(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ.")
    if not user.is_active:
        raise auth_error(403, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa.")
    return user


def check_login_limit(request: Request) -> None:
    """Giới hạn số lần thử đăng nhập theo IP trong một phút."""
    address = request.client.host if request.client else "unknown"
    with login_lock:
        count, reset_at = login_attempts.get(address, (0, 0))
        now = time.monotonic()
        if now >= reset_at:
            count, reset_at = 0, now + LOGIN_WINDOW_SECONDS
        if count >= LOGIN_ATTEMPT_LIMIT:
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "TOO_MANY_ATTEMPTS",
                    "message": "Bạn đã thử đăng nhập quá nhiều lần.",
                },
                headers={"Retry-After": str(max(1, int(reset_at - now + 0.999)))},
            )
        login_attempts[address] = (count + 1, reset_at)


def register_user(db: Session, data: RegisterRequest) -> User:
    """Đăng ký sinh viên mới và bảo đảm email không bị trùng."""
    email = str(data.email).strip().lower()
    full_name = data.full_name.strip()
    if not full_name:
        raise auth_error(400, "VALIDATION_ERROR", "Họ tên không được để trống.")
    if db.query(User).filter(User.email == email).first():
        raise auth_error(409, "EMAIL_EXISTS", "Email đã được sử dụng.")

    user = User(
        email=email,
        full_name=full_name,
        password_hash=hash_password(data.password.get_secret_value()),
        role="STUDENT",
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise auth_error(409, "EMAIL_EXISTS", "Email đã được sử dụng.") from None
    return user


def login_user(db: Session, data: LoginRequest, request: Request) -> dict:
    """Kiểm tra thông tin đăng nhập rồi tạo cặp access/refresh token."""
    check_login_limit(request)
    email = str(data.email).strip().lower()
    user = db.query(User).filter(User.email == email).first()

    # Hash giả giúp thời gian phản hồi gần giống nhau dù email không tồn tại.
    dummy_hash = getattr(request.app.state, "dummy_password_hash", None)
    if dummy_hash is None:
        dummy_hash = hash_password(token_urlsafe(32))
    password_hash = user.password_hash if user else dummy_hash

    if not verify_password(data.password.get_secret_value(), password_hash) or user is None:
        raise auth_error(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.")

    tokens = create_tokens(db, require_active_user(user).id)
    db.commit()
    return tokens


def refresh_tokens(db: Session, refresh_token: str) -> dict:
    """Thu hồi phiên cũ và cấp cặp token mới."""
    try:
        payload = read_token(refresh_token, "refresh")
        auth_session = find_active_session(db, payload)
        user = db.get(User, int(payload["sub"]))
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise auth_error(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ.") from None

    if auth_session is None:
        raise auth_error(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ.")

    user = require_active_user(user)
    db.delete(auth_session)
    db.flush()
    tokens = create_tokens(db, user.id)
    db.commit()
    return tokens


def logout_user(db: Session, refresh_token: str) -> None:
    """Xóa phiên hiện tại để refresh token không thể dùng lại."""
    try:
        payload = read_token(refresh_token, "refresh")
        auth_session = find_active_session(db, payload)
    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise auth_error(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ.") from None

    if auth_session is None:
        raise auth_error(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ.")
    db.delete(auth_session)
    db.commit()


def create_tokens(db: Session, user_id: int) -> dict:
    """Tạo access/refresh token và lưu phiên để có thể thu hồi khi logout."""
    session_id = uuid4().hex
    access_minutes = setting.ACCESS_TOKEN_EXPIRE_MINUTES
    refresh_days = setting.REFRESH_TOKEN_EXPIRE_DAYS
    refresh_seconds = refresh_days * 24 * 60 * 60

    auth_session = AuthSession(
        id=session_id,
        user_id=user_id,
        expires_at=int(time.time()) + refresh_seconds,
    )
    db.add(auth_session)

    common_data = {"sub": str(user_id), "sid": session_id}
    return {
        "accessToken": create_token(
            {**common_data, "type": "access"}, timedelta(minutes=access_minutes)
        ),
        "refreshToken": create_token(
            {**common_data, "type": "refresh"}, timedelta(days=refresh_days)
        ),
        "tokenType": "bearer",
        "accessExpiresInSeconds": access_minutes * 60,
        "refreshExpiresInSeconds": refresh_seconds,
    }


def read_token(token: str, expected_type: str) -> dict:
    """Giải mã token và bảo đảm đúng loại access hoặc refresh."""
    payload = decode_token(token)
    if payload.get("type") != expected_type:
        raise ValueError("Token không đúng loại.")
    return payload


def find_active_session(db: Session, payload: dict) -> AuthSession | None:
    """Tìm phiên còn hạn khớp với user và session id trong token."""
    return (
        db.query(AuthSession)
        .filter(
            AuthSession.id == payload.get("sid"),
            AuthSession.user_id == int(payload.get("sub", 0)),
            AuthSession.expires_at > int(time.time()),
        )
        .first()
    )
