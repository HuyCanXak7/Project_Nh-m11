"""Khởi tạo FastAPI, exception handlers và liên kết các router."""

import logging
from contextlib import asynccontextmanager
from secrets import token_urlsafe

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.core.security import hash_password
from app.db.database import Base, engine
from app.models import AuthSession, Course, GradeComponent, Semester, User
from app.routers.auth import router as auth_router
from app.routers.courses import router as course_router
from app.routers.gpa import router as gpa_router
from app.routers.semesters import router as semester_router
from app.utils.responses import api_response

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Tạo các bảng còn thiếu khi backend khởi động."""
    # Import models phía trên giúp Base.metadata nhận đủ tất cả entity.
    Base.metadata.create_all(bind=engine)
    app.state.dummy_password_hash = hash_password(token_urlsafe(32))
    yield


app = FastAPI(title="Hệ thống quản lý chỉ số học tập", lifespan=lifespan)


@app.exception_handler(HTTPException)
async def handle_http_error(request: Request, error: HTTPException):
    detail = error.detail if isinstance(error.detail, dict) else {}
    message = detail.get("message", str(error.detail))
    code = detail.get("code", "HTTP_ERROR")
    return api_response(
        request,
        error.status_code,
        message,
        error={"code": code, "details": []},
        headers=error.headers,
    )


@app.exception_handler(RequestValidationError)
async def handle_invalid_request(request: Request, error: RequestValidationError):
    details = [
        {"field": ".".join(map(str, item["loc"][1:])), "reason": item["msg"]}
        for item in error.errors()
    ]
    return api_response(
        request,
        400,
        "Dữ liệu không hợp lệ.",
        error={"code": "VALIDATION_ERROR", "details": details},
    )


@app.exception_handler(SQLAlchemyError)
async def handle_database_error(request: Request, error: SQLAlchemyError):
    logger.error("Database error during %s", request.url.path, exc_info=error)
    return api_response(
        request,
        500,
        "Đã xảy ra lỗi máy chủ.",
        error={"code": "INTERNAL_ERROR", "details": []},
    )


# Main chỉ liên kết router; endpoint và nghiệp vụ nằm ở tầng riêng.
app.include_router(auth_router)
app.include_router(semester_router)
app.include_router(course_router)
app.include_router(gpa_router)
