"""PB-20/PB-21: actual API, owner isolation, retakes, null/zero and DB-backed scale."""

import json
from datetime import date
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from jsonschema import RefResolver
from openapi_schema_validator import OAS30Validator

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.main import app
from app.models import Course, GradeScale, Semester, User

SPEC = json.loads((Path(__file__).resolve().parents[2] / "docs/api/openapi.json").read_text(encoding="utf-8"))


@pytest.fixture
def fixture():
    password = "test-password-123"
    with TestClient(app) as client, SessionLocal() as db:
        owner = User(email=f"stats.{uuid4().hex}@example.com", full_name="Stats", password_hash=hash_password(password))
        other = User(email=f"empty.{uuid4().hex}@example.com", full_name="Empty", password_hash=hash_password(password))
        db.add_all([owner, other])
        db.flush()
        ids = []
        for month in range(1, 5):
            semester = Semester(user_id=owner.id, name=f"HK {month}", academic_year="2026-2027",
                                start_date=date(2026, month, 1), end_date=date(2026, month, 28))
            db.add(semester)
            db.flush()
            ids.append(semester.id)
        attempts = [(0,"CS1",3,"9", "4"),(0,"CS2",2,"3.9","0"),(0,"PENDING",9,None,None),
                    (1," cs1 ",8,"8.5","4"),(1,"CS2",4,"7.5","3"),(1,"CS1",7,"9","4"),
                    (2,"FAILED",2,"0","0")]
        for semester, code, credits, grade10, grade4 in attempts:
            db.add(Course(semester_id=ids[semester], code=code, name=code, credits=credits, category="GENERAL",
                          grade10=Decimal(grade10) if grade10 is not None else None,
                          grade4=Decimal(grade4) if grade4 is not None else None))
        db.commit()
        def login(user):
            result = client.post("/api/v1/auth/login", json={"email": user.email, "password": password})
            assert result.status_code == 200
            return {"Authorization": "Bearer " + result.json()["data"]["accessToken"]}
        yield client, db, owner, other, ids, login(owner), login(other)
        db.rollback()
        db.delete(owner)
        db.delete(other)
        db.commit()


def get(client, path, headers=None):
    result = client.get("/api/v1" + path, headers=headers)
    assert result.status_code == 200, result.text
    schema = SPEC["paths"][path]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    OAS30Validator(schema, resolver=RefResolver.from_schema(SPEC)).validate(result.json())
    return result.json()["data"]


def test_summary_matches_cumulative_gpa(fixture):
    client, _, _, _, _, headers, _ = fixture
    data = get(client, "/statistics/summary", headers)
    cumulative = get(client, "/gpa/cumulative", headers)
    assert all(data[key] == value for key, value in cumulative.items())
    assert data == dict(gpa4=2.67, includedCredits=9, passedCredits=7, ranking="Khá", average10=6.33,
                        totalCourses=7, completedCourses=3, passedCourses=2, retakePolicy="HIGHEST_GRADE_BY_COURSE_CODE")


def test_trend_matches_semester_apis_and_zero_is_not_empty(fixture):
    client, _, _, _, ids, headers, _ = fixture
    items = get(client, "/statistics/semesters", headers)["items"]
    assert [item["semesterId"] for item in items] == ids
    for item in items:
        result = client.get(f"/api/v1/semesters/{item['semesterId']}/gpa", headers=headers).json()["data"]
        assert all(item[key] == value for key, value in result.items())
    assert items[2]["gpa4"] == 0
    assert items[2]["ranking"] == "Yếu / Kém"
    assert items[3]["gpa4"] is None
    assert items[-1]["cumulativeGpa4"] == get(client, "/statistics/summary", headers)["gpa4"]


def test_distribution_counts_all_completed_attempts(fixture):
    client, _, _, _, _, headers, _ = fixture
    result = get(client, "/statistics/distribution", headers)
    assert result["totalCourses"] == 6
    assert {item["grade"]: item["count"] for item in result["items"]} == {
        "A": 3, "B+": 0, "B": 1, "C+": 0, "C": 0, "D+": 0, "D": 0, "F": 2}


def test_empty_dashboard_and_owner_isolation(fixture):
    client, _, _, other, _, headers, empty_headers = fixture
    empty = get(client, "/statistics/dashboard", empty_headers)
    assert empty["summary"]["gpa4"] is None
    assert empty["summary"]["average10"] is None
    assert empty["summary"]["ranking"] is None
    assert empty["summary"]["passedCredits"] == 0
    assert empty["semesters"]["items"] == []
    assert empty["distribution"]["totalCourses"] == 0
    own = get(client, "/statistics/dashboard", headers)
    assert own["summary"] == get(client, "/statistics/summary", headers)
    for path in ["/summary", "/semesters", "/distribution", "/dashboard"]:
        assert client.get("/api/v1/statistics" + path).status_code == 401
        spoofed = client.get(f"/api/v1/statistics{path}?userId={other.id}", headers=headers)
        assert spoofed.json()["data"] == get(client, "/statistics" + path, headers)


def test_scale_is_public_and_comes_from_database(fixture):
    client, db, _, _, _, headers, _ = fixture
    scale = db.query(GradeScale).filter_by(letter="A").one()
    before = scale.letter
    try:
        scale.letter = "A1"
        db.commit()
        assert get(client, "/grade-scale")[0]["letter"] == "A1"
        assert get(client, "/statistics/distribution", headers)["items"][0]["grade"] == "A1"
    finally:
        scale.letter = before
        db.commit()


@pytest.mark.parametrize("score,letter", [("3.9","F"),("4.0","D"),("4.9","D"),("5.0","D+"),("8.4","B+"),("8.5","A"),("10","A")])
def test_distribution_boundaries(fixture, score, letter):
    client, db, _, _, ids, headers, _ = fixture
    before = {item["grade"]: item["count"] for item in get(client, "/statistics/distribution", headers)["items"]}
    db.add(Course(semester_id=ids[-1], code="BOUNDARY", name="Boundary", category="GENERAL", credits=1,
                  grade10=Decimal(score), grade4=0))
    db.commit()
    after = {item["grade"]: item["count"] for item in get(client, "/statistics/distribution", headers)["items"]}
    assert after[letter] == before[letter] + 1


def test_locked_account_cannot_read_statistics(fixture):
    client, db, owner, _, _, headers, _ = fixture
    owner.is_active = False
    db.commit()
    result = client.get("/api/v1/statistics/dashboard", headers=headers)
    assert result.status_code == 403
    assert result.json()["error"]["code"] == "ACCOUNT_LOCKED"


def test_error_envelope_and_health_database_check(fixture, caplog):
    client, _, _, _, _, headers, _ = fixture
    get(client, "/health")
    with patch("app.services.statistics_service.snapshot", side_effect=sa.exc.OperationalError("private-sql", {}, Exception("private-detail"))):
        result = client.get("/api/v1/statistics/dashboard", headers=headers)
    assert result.status_code == 500
    assert result.json()["data"] is None
    assert result.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "private-detail" not in result.text
    with patch("sqlalchemy.orm.Session.execute", side_effect=sa.exc.OperationalError("select", {}, Exception("private"))):
        result = client.get("/api/v1/health")
    assert result.status_code == 503
    assert result.json()["error"]["code"] == "SERVICE_UNAVAILABLE"
