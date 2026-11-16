"""Khởi tạo FastAPI, exception handlers và liên kết các router."""

import logging
import json
import os
from pathlib import Path
from contextlib import asynccontextmanager
from secrets import token_urlsafe

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.security import hash_password
from app.db.database import Base, engine, get_db
from app.routers.auth import router as auth_router
from app.routers.courses import router as course_router
from app.routers.gpa import router as gpa_router
from app.routers.grades import router as grade_router
from app.routers.grade_scale import router as grade_scale_router
from app.routers.semesters import router as semester_router
from app.routers.statistics import router as statistics_router
from app.routers.goals import router as goals_router
from app.utils.responses import api_response

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Tạo các bảng còn thiếu khi backend khởi động."""
    # Import models phía trên giúp Base.metadata nhận đủ tất cả entity.
    Base.metadata.create_all(bind=engine)
    app.state.dummy_password_hash = hash_password(token_urlsafe(32))
    yield


app = FastAPI(title="Hệ thống quản lý chỉ số học tập", version="1.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware,
                   allow_origins=[origin.strip() for origin in os.environ.get("CORS_ORIGINS", "http://localhost:8080").split(",")],
                   allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])


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
app.include_router(grade_router)
app.include_router(grade_scale_router)
app.include_router(gpa_router)
app.include_router(statistics_router)
app.include_router(goals_router)


@app.get("/api/v1/health", tags=["Health"])
def health(request: Request, db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return api_response(request, 503, "Cơ sở dữ liệu chưa sẵn sàng.",
                            error={"code": "SERVICE_UNAVAILABLE", "details": []})
    return api_response(request, 200, "Sẵn sàng.", {"status": "ok", "database": "ok"})


def contract_openapi():
    if app.openapi_schema is None:
        path = Path(os.environ.get("API_CONTRACT_PATH", str(Path(__file__).resolve().parents[2] / "docs/api/openapi.json")))
        app.openapi_schema = json.loads(path.read_text(encoding="utf-8"))
        app.openapi_schema["paths"] = {"/api/v1" + key: value for key, value in app.openapi_schema["paths"].items()}
        app.openapi_schema["servers"] = [{"url": "/"}]
    return app.openapi_schema


app.openapi = contract_openapi
