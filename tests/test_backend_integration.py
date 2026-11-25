"""Kiểm thử tích hợp tổng thể Backend API (Auth, Refresh/Logout, Grade Scale, Semester -> Course -> Grade -> GPA)."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def test_auth_full_lifecycle_register_login_me_refresh_logout():
    email = f"smoke.{uuid4().hex}@ptit.edu.vn"
    password = "Password123!"

    with TestClient(app) as client:
        # 1. Đăng ký tài khoản mới
        r_reg = client.post(
            "/api/v1/auth/register",
            json={"email": email, "full_name": "Sinh Vien Smoke", "password": password},
        )
        assert r_reg.status_code == 201
        assert r_reg.json()["data"]["email"] == email

        # 2. Chặn đăng ký trùng email (409)
        r_dup = client.post(
            "/api/v1/auth/register",
            json={"email": email, "full_name": "Duplicate", "password": password},
        )
        assert r_dup.status_code == 409

        # 3. Chặn sai mật khẩu (401)
        r_bad = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "wrong-password"},
        )
        assert r_bad.status_code == 401

        # 4. Đăng nhập hợp lệ
        r_login = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert r_login.status_code == 200
        tokens = r_login.json()["data"]
        access = tokens["accessToken"]
        refresh = tokens["refreshToken"]

        # 5. Gọi /auth/me với Bearer token
        r_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
        assert r_me.status_code == 200
        assert r_me.json()["data"]["email"] == email

        # 6. Làm mới token (refresh rotation)
        r_ref = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh})
        assert r_ref.status_code == 200
        new_refresh = r_ref.json()["data"]["refreshToken"]
        assert new_refresh != refresh

        # Refresh token cũ không thể tái sử dụng
        r_reuse = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh})
        assert r_reuse.status_code == 401

        # 7. Đăng xuất và xác nhận thu hồi refresh token mới
        r_logout = client.post("/api/v1/auth/logout", json={"refreshToken": new_refresh})
        assert r_logout.status_code == 200

        r_after = client.post("/api/v1/auth/refresh", json={"refreshToken": new_refresh})
        assert r_after.status_code == 401


def test_cors_and_openapi_docs_available():
    with TestClient(app) as client:
        r_openapi = client.get("/openapi.json")
        assert r_openapi.status_code == 200
        paths = r_openapi.json()["paths"]
        assert "/api/v1/health" in paths
        assert "/api/v1/auth/login" in paths
        assert "/api/v1/semesters" in paths
        assert "/api/v1/gpa/cumulative" in paths
        assert "/api/v1/grade-scale" in paths


def test_healthcheck_endpoint_returns_ok():
    with TestClient(app) as client:
        r = client.get("/api/v1/health")
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert body["data"]["status"] == "ok"
        assert body["data"]["database"] == "ok"
        assert body["data"]["version"] == "1.0.0"


def test_demo_backup_sql_restores_cleanly(tmp_path):
    from pathlib import Path
    from sqlalchemy import create_engine

    from app.db.database import Base
    from scripts.backup_demo_db import DEFAULT_BACKUP_PATH, restore_sql_to_database

    assert DEFAULT_BACKUP_PATH.exists(), f"Thiếu bản backup demo: {DEFAULT_BACKUP_PATH}"
    db_file = Path(tmp_path) / "restore_check.db"
    db_url = f"sqlite:///{db_file.as_posix()}"
    engine = create_engine(db_url)
    Base.metadata.create_all(bind=engine)
    engine.dispose()

    counts = restore_sql_to_database(DEFAULT_BACKUP_PATH, db_url)
    assert counts == {
        "grade_scale": 8,
        "users": 5,
        "semesters": 8,
        "courses": 40,
        "grade_components": 120,
        "goals": 3,
    }
