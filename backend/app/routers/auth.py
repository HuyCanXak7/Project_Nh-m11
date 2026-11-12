import sqlalchemy as sa
from fastapi import APIRouter, Depends, Request

from app.core.errors import auth_error, session_invalid
from app.core.responses import response
from app.core.security import verify_password
from app.db.session import get_engine
from app.db.tables import auth_sessions, users
from app.schemas.auth import LoginRequest, RefreshRequest
from app.services.auth_service import (
    check_login_limit, current_user, decode_token, get_active_user, issue_tokens, session_filter,
)

router = APIRouter()


@router.post("/api/v1/auth/login", tags=["Auth"])
def login(payload: LoginRequest, request: Request):
    check_login_limit(request)
    with get_engine().begin() as connection:
        user = connection.execute(
            sa.select(users).where(users.c.email == payload.email.strip().lower())
        ).mappings().one_or_none()
        password_hash = user["password_hash"] if user else request.app.state.dummy_password_hash
        if not verify_password(payload.password.get_secret_value(), password_hash) or user is None:
            raise auth_error(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.")
        tokens = issue_tokens(request, connection, get_active_user(user)["id"])
    return response(request, 200, "Đăng nhập thành công.", tokens)


@router.post("/api/v1/auth/refresh", tags=["Auth"])
def refresh(payload: RefreshRequest, request: Request):
    claims = decode_token(request, payload.refreshToken.get_secret_value(), "refresh")
    with get_engine().begin() as connection:
        if connection.execute(auth_sessions.delete().where(session_filter(claims))).rowcount != 1:
            raise session_invalid()
        user = connection.execute(
            sa.select(users).where(users.c.id == int(claims["sub"]))
        ).mappings().one_or_none()
        tokens = issue_tokens(request, connection, get_active_user(user)["id"])
    return response(request, 200, "Đã làm mới phiên đăng nhập.", tokens)


@router.post("/api/v1/auth/logout", tags=["Auth"])
def logout(payload: RefreshRequest, request: Request):
    claims = decode_token(request, payload.refreshToken.get_secret_value(), "refresh")
    with get_engine().begin() as connection:
        if connection.execute(auth_sessions.delete().where(session_filter(claims))).rowcount != 1:
            raise session_invalid()
    return response(request, 200, "Đăng xuất thành công.")


@router.get("/api/v1/auth/me", tags=["Auth"])
def me(request: Request, user: sa.RowMapping = Depends(current_user)):
    return response(request, 200, "Thông tin tài khoản.", {
        "id": user["id"], "email": user["email"], "fullName": user["full_name"],
        "role": user["role"], "isActive": user["is_active"],
    })
