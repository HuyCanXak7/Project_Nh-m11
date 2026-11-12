import time
from threading import Lock
from uuid import uuid4

import jwt
import sqlalchemy as sa
from cachetools import TTLCache
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import ACCESS_SECONDS, REFRESH_SECONDS, LOGIN_WINDOW_SECONDS, LOGIN_ATTEMPT_LIMIT
from app.core.errors import auth_error, session_invalid
from app.db.session import get_engine
from app.db.tables import auth_sessions, users

login_attempts = TTLCache(maxsize=10_000, ttl=LOGIN_WINDOW_SECONDS)
login_lock = Lock()
bearer = HTTPBearer(auto_error=False)


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
