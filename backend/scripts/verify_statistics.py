"""Reproducible API evidence on an isolated migrated SQLite DB with 40 courses."""

import json
import os
import time
from datetime import date
from pathlib import Path
from secrets import token_urlsafe
from tempfile import TemporaryDirectory
from unittest.mock import patch


def verify():
    with TemporaryDirectory() as directory, patch.dict(os.environ, {
        "DATABASE_URL": "sqlite:///" + (Path(directory) / "evidence.db").as_posix(), "SECRET_KEY": token_urlsafe(32),
    }):
        from alembic import command
        from alembic.config import Config
        from fastapi.testclient import TestClient
        from app.core.security import hash_password
        from app.db.database import engine, SessionLocal
        from app.models import Course, Semester, User
        from app.main import app

        try:
            command.upgrade(Config(str(Path(__file__).resolve().parents[1] / "alembic.ini")), "head")
            password = token_urlsafe(16)
            with SessionLocal() as db:
                user = User(email="evidence@example.com", full_name="Evidence", password_hash=hash_password(password))
                db.add(user)
                db.flush()
                for month in range(1, 5):
                    semester = Semester(user_id=user.id, name=f"HK {month}", academic_year="2026-2027",
                                        start_date=date(2026, month, 1), end_date=date(2026, month, 28))
                    db.add(semester)
                    db.flush()
                    for index in range(10):
                        db.add(Course(semester_id=semester.id, code=f"CS{month}{index}", name=f"Course {index}",
                                      credits=3, category="GENERAL", grade10=9 if index % 2 == 0 else 3.9,
                                      grade4=4 if index % 2 == 0 else 0))
                db.commit()
            with TestClient(app) as client:
                login = client.post("/api/v1/auth/login", json={"email": "evidence@example.com", "password": password})
                headers = {"Authorization": "Bearer " + login.json()["data"]["accessToken"]}
                evidence = {}
                for path in ["/statistics/dashboard", "/statistics/summary", "/statistics/semesters",
                             "/statistics/distribution", "/grade-scale", "/health"]:
                    result = client.get("/api/v1" + path, headers=headers)
                    assert result.status_code == 200, result.text
                    evidence[path] = result.json()
                summary = evidence["/statistics/summary"]["data"]
                assert summary["gpa4"] == 2 and summary["includedCredits"] == 120 and summary["passedCredits"] == 60
                assert evidence["/statistics/distribution"]["data"]["totalCourses"] == 40
                timings = []
                for _ in range(50):
                    start = time.perf_counter()
                    result = client.get("/api/v1/statistics/dashboard", headers=headers)
                    timings.append((time.perf_counter() - start) * 1000)
                    assert result.status_code == 200
                p95 = sorted(timings)[47]
                evidence["measurement"] = {
                    "database": "isolated SQLite, migrated to head", "courses": 40, "requests": 50,
                    "p95Ms": round(p95, 2), "maxMs": round(max(timings), 2), "apiTargetMs": 500,
                    "passedApiTarget": p95 < 500,
                    "scope": "Warm TestClient HTTP API; excludes network, cold start and FE rendering. PB-39 must measure full Dashboard <2s separately.",
                }
                return evidence
        finally:
            engine.dispose()


if __name__ == "__main__":
    print(json.dumps(verify(), ensure_ascii=False, indent=2))
