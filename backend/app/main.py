import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from secrets import token_urlsafe
from threading import Lock
from uuid import uuid4

import jwt
import sqlalchemy as sa
from cachetools import TTLCache
from fastapi import Depends, FastAPI, HTTPException, Path, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, SecretStr

from backend.app.db.database import auth_sessions, get_engine, users
from backend.app.services.gpa import cumulative_gpa, semester_gpa
from passwords import hash_password, verify_password

ACCESS_SECONDS = 15 * 60
REFRESH_SECONDS = 7 * 24 * 60 * 60
LOGIN_WINDOW_SECONDS = 60
LOGIN_ATTEMPT_LIMIT = 20
login_attempts = TTLCache(maxsize=10_000, ttl=LOGIN_WINDOW_SECONDS)
login_lock = Lock()
bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app):
    secret = os.environ.get("JWT_SECRET", "")
    if len(secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET phải có ít nhất 32 byte.")
    app.state.jwt_secret = secret
    app.state.dummy_password_hash = hash_password(token_urlsafe(32))
    yield


app = FastAPI(title="Hệ thống quản lý chỉ số học tập", lifespan=lifespan)


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    password: SecretStr = Field(min_length=1, max_length=72)


class RefreshRequest(BaseModel):
    refreshToken: SecretStr = Field(min_length=1, max_length=4096)


def response(request, status, message, data=None, error=None, headers=None):
    return JSONResponse(
        status_code=status,
        headers=headers,
        content={
            "success": status < 400,
            "statusCode": status,
            "message": message,
            "data": data,
            "error": error,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": request.url.path,
        },
    )


def auth_error(status, code, message, headers=None):
    return HTTPException(status, detail={"code": code, "message": message}, headers=headers)


@app.exception_handler(HTTPException)
async def handle_http_error(request, error):
    return response(
        request, error.status_code, error.detail["message"],
        error={"code": error.detail["code"], "details": []}, headers=error.headers,
    )


@app.exception_handler(RequestValidationError)
async def handle_invalid_request(request, error):
    details = [{"field": ".".join(map(str, item["loc"][1:])), "reason": item["msg"]} for item in error.errors()]
    return response(
        request, 400, "Dữ liệu không hợp lệ.",
        error={"code": "VALIDATION_ERROR", "details": details},
    )


@app.exception_handler(sa.exc.SQLAlchemyError)
async def handle_database_error(request, error):
    logger.error("Database error during %s", request.url.path, exc_info=error)
    return response(request, 500, "Đã xảy ra lỗi máy chủ.", error={"code": "INTERNAL_ERROR", "details": []})


def check_login_limit(request):
    address = request.client.host if request.client else "unknown"
    with login_lock:
        count, reset_at = login_attempts.get(address, (0, 0))
        now = time.monotonic()
        if now >= reset_at:
            count, reset_at = 0, now + LOGIN_WINDOW_SECONDS
        if count >= LOGIN_ATTEMPT_LIMIT:
            raise auth_error(
                429, "TOO_MANY_ATTEMPTS", "Bạn đã thử đăng nhập quá nhiều lần.",
                headers={"Retry-After": str(max(1, int(reset_at - now + 0.999)))},
            )
        login_attempts[address] = (count + 1, reset_at)


def session_invalid():
    return auth_error(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ.")


def get_active_user(user):
    if user is None:
        raise session_invalid()
    if not user["is_active"]:
        raise auth_error(403, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa.")
    return user


def decode_token(request, token, token_type):
    try:
        claims = jwt.decode(
            token, request.app.state.jwt_secret, algorithms=["HS256"],
            options={"require": ["exp", "sub", "sid", "type"]},
        )
    except jwt.InvalidTokenError:
        raise session_invalid() from None
    if claims["type"] != token_type:
        raise session_invalid()
    return claims


def issue_tokens(request, connection, user_id):
    session_id = uuid4().hex
    now = int(time.time())
    claims = {"sub": str(user_id), "sid": session_id}
    secret = request.app.state.jwt_secret
    connection.execute(auth_sessions.insert().values(
        id=session_id, user_id=user_id, expires_at=now + REFRESH_SECONDS,
    ))
    return {
        "accessToken": jwt.encode({**claims, "type": "access", "exp": now + ACCESS_SECONDS}, secret, algorithm="HS256"),
        "refreshToken": jwt.encode({**claims, "type": "refresh", "exp": now + REFRESH_SECONDS}, secret, algorithm="HS256"),
        "tokenType": "bearer",
        "accessExpiresInSeconds": ACCESS_SECONDS,
        "refreshExpiresInSeconds": REFRESH_SECONDS,
    }


def session_filter(claims):
    return sa.and_(
        auth_sessions.c.id == claims["sid"],
        auth_sessions.c.user_id == int(claims["sub"]),
        auth_sessions.c.expires_at > int(time.time()),
    )


@app.post("/api/v1/auth/login", tags=["Auth"])
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


@app.post("/api/v1/auth/refresh", tags=["Auth"])
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


@app.post("/api/v1/auth/logout", tags=["Auth"])
def logout(payload: RefreshRequest, request: Request):
    claims = decode_token(request, payload.refreshToken.get_secret_value(), "refresh")
    with get_engine().begin() as connection:
        if connection.execute(auth_sessions.delete().where(session_filter(claims))).rowcount != 1:
            raise session_invalid()
    return response(request, 200, "Đăng xuất thành công.")


def current_user(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if credentials is None:
        raise session_invalid()
    claims = decode_token(request, credentials.credentials, "access")
    with get_engine().connect() as connection:
        user = connection.execute(
            sa.select(users).join(auth_sessions, users.c.id == auth_sessions.c.user_id)
            .where(session_filter(claims))
        ).mappings().one_or_none()
    return get_active_user(user)


@app.get("/api/v1/auth/me", tags=["Auth"])
def me(request: Request, user: sa.RowMapping = Depends(current_user)):
    return response(request, 200, "Thông tin tài khoản.", {
        "id": user["id"], "email": user["email"], "fullName": user["full_name"],
        "role": user["role"], "isActive": user["is_active"],
    })


@app.get("/api/v1/semesters/{semesterId}/gpa", tags=["Grades"])
def get_semester_gpa(
    request: Request,
    semesterId: int = Path(gt=0, le=2_147_483_647),
    user: sa.RowMapping = Depends(current_user),
):
    data = semester_gpa(user["id"], semesterId)
    if data is None:
        raise auth_error(404, "NOT_FOUND", "Không tìm thấy học kỳ.")
    return response(request, 200, "Đã tính GPA học kỳ.", data)


@app.get("/api/v1/gpa/cumulative", tags=["Grades"])
def get_cumulative_gpa(request: Request, user: sa.RowMapping = Depends(current_user)):
    return response(request, 200, "Đã tính GPA tích lũy.", cumulative_gpa(user["id"]))
