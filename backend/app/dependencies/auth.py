"""Dependency kiểm tra người dùng hiện tại và quyền quản trị viên."""

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import User
from app.services.auth import bearer_scheme, find_active_session, read_token


def authentication_error() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={"code": "UNAUTHORIZED", "message": "Phiên đăng nhập không hợp lệ."},
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Lấy User từ access token và kiểm tra phiên còn hiệu lực."""
    if credentials is None:
        raise authentication_error()

    try:
        payload = read_token(credentials.credentials, "access")
        auth_session = find_active_session(db, payload)
        user = db.get(User, int(payload["sub"]))
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise authentication_error() from None

    if auth_session is None or user is None:
        raise authentication_error()
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail={"code": "ACCOUNT_LOCKED", "message": "Tài khoản đã bị khóa."},
        )
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Chỉ cho phép tài khoản có role ADMIN đi tiếp vào endpoint."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Bạn không có quyền quản trị."},
        )
    return current_user
