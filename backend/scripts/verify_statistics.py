"""Generate reproducible API evidence on an isolated, migrated SQLite DB (40 courses)."""

import json
import os
import time
from datetime import date
from pathlib import Path
from secrets import token_urlsafe
from tempfile import TemporaryDirectory
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.session import get_engine
from app.db.tables import courses, semesters, users
from app.main import app


def verify():
    with TemporaryDirectory() as directory, patch.dict(os.environ, {
        "DATABASE_URL": "sqlite:///" + (Path(directory) / "evidence.db").as_posix(),
        "JWT_SECRET": token_urlsafe(32),
    }):
        get_engine.cache_clear()
        engine = get_engine()
        try:
            command.upgrade(Config(str(Path(__file__).resolve().parents[1] / "alembic.ini")), "head")
            password = token_urlsafe(16)
            with engine.begin() as connection:
                connection.execute(users.insert().values(id=1, email="evidence@example.com", full_name="Evidence",
                                                         role="STUDENT", password_hash=hash_password(password)))
                for semester_id in range(1, 5):
                    connection.execute(semesters.insert().values(
                        id=semester_id, user_id=1, name=f"HK {semester_id}", academic_year="2026-2027",
                        start_date=date(2026, semester_id, 1), end_date=date(2026, semester_id, 28),
                    ))
                    for index in range(10):
                        connection.execute(courses.insert().values(
                            semester_id=semester_id, code=f"CS{semester_id}{index}", name=f"Course {index}", credits=3,
                            grade10=9 if index % 2 == 0 else 3.9, grade4=4 if index % 2 == 0 else 0,
                        ))
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
            get_engine.cache_clear()


if __name__ == "__main__":
    print(json.dumps(verify(), ensure_ascii=False, indent=2))
