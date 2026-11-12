import os
from contextlib import asynccontextmanager
from secrets import token_urlsafe

import sqlalchemy as sa
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError

from app.core.errors import handle_database_error, handle_http_error, handle_invalid_request
from app.core.security import hash_password
from app.routers import auth, gpa


@asynccontextmanager
async def lifespan(app):
    secret = os.environ.get("JWT_SECRET", "")
    if len(secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET phải có ít nhất 32 byte.")
    app.state.jwt_secret = secret
    app.state.dummy_password_hash = hash_password(token_urlsafe(32))
    yield


app = FastAPI(title="Hệ thống quản lý chỉ số học tập", lifespan=lifespan)
app.add_exception_handler(HTTPException, handle_http_error)
app.add_exception_handler(RequestValidationError, handle_invalid_request)
app.add_exception_handler(sa.exc.SQLAlchemyError, handle_database_error)
app.include_router(auth.router)
app.include_router(gpa.router)
