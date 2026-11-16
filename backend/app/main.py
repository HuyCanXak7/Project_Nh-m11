import os
import json
from pathlib import Path
from contextlib import asynccontextmanager
from secrets import token_urlsafe

import sqlalchemy as sa
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.core.errors import handle_database_error, handle_http_error, handle_invalid_request
from app.core.security import hash_password
from app.routers import auth, gpa, statistics
from app.core.responses import response
from app.db.session import get_engine


@asynccontextmanager
async def lifespan(app):
    secret = os.environ.get("JWT_SECRET", "")
    if len(secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET phải có ít nhất 32 byte.")
    app.state.jwt_secret = secret
    app.state.dummy_password_hash = hash_password(token_urlsafe(32))
    yield


app = FastAPI(title="Hệ thống quản lý chỉ số học tập", version="1.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:8080").split(","),
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_exception_handler(HTTPException, handle_http_error)
app.add_exception_handler(RequestValidationError, handle_invalid_request)
app.add_exception_handler(sa.exc.SQLAlchemyError, handle_database_error)
app.include_router(auth.router)
app.include_router(gpa.router)
app.include_router(statistics.router)


def contract_openapi():
    if app.openapi_schema is None:
        path = Path(os.environ.get("API_CONTRACT_PATH", str(Path(__file__).resolve().parents[2] / "docs/api/openapi.json")))
        app.openapi_schema = json.loads(path.read_text(encoding="utf-8"))
        # The downloadable contract uses a /api/v1 server; Swagger exposes absolute route paths.
        app.openapi_schema["paths"] = {"/api/v1" + key: value for key, value in app.openapi_schema["paths"].items()}
        app.openapi_schema["servers"] = [{"url": "/"}]
    return app.openapi_schema


app.openapi = contract_openapi


@app.get("/api/v1/health", tags=["Health"])
def health(request: Request):
    try:
        with get_engine().connect() as connection:
            connection.execute(sa.text("SELECT 1"))
    except sa.exc.SQLAlchemyError:
        return response(request, 503, "Cơ sở dữ liệu chưa sẵn sàng.",
                        error={"code": "SERVICE_UNAVAILABLE", "details": []})
    return response(request, 200, "Sẵn sàng.", {"status": "ok", "database": "ok"})
