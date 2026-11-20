"""FR-11 / PB-22: real HTTP lifecycle, validation, ownership and database uniqueness."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from jsonschema import RefResolver
from openapi_schema_validator import OAS30Validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.main import app
from app.models import Goal, User
from app.schemas.goal import today_in_vietnam

SPEC = json.loads((Path(__file__).resolve().parents[2] / "docs/api/openapi.json").read_text(encoding="utf-8"))


def payload(**changes):
    return {"targetGpa": 3.5, "targetDate": (today_in_vietnam() + timedelta(days=30)).isoformat(),
            "remainingCredits": 30, **changes}


@pytest.fixture(scope="module")
def actors():
    password = "goal-test-password"
    with TestClient(app) as client, SessionLocal() as db:
        users = [User(email=f"goal.{uuid4().hex}@example.com", full_name="Goal test", password_hash=hash_password(password))
                 for _ in range(2)]
        db.add_all(users)
        db.commit()
        ids, headers = [], []
        for user in users:
            ids.append(user.id)
            result = client.post("/api/v1/auth/login", json={"email": user.email, "password": password})
            assert result.status_code == 200
            headers.append({"Authorization": "Bearer " + result.json()["data"]["accessToken"]})
        yield client, ids, headers
        for user in users:
            db.delete(user)
        db.commit()


@pytest.fixture(autouse=True)
def clean_goals(actors):
    _, ids, _ = actors
    yield
    with SessionLocal() as db:
        db.query(Goal).filter(Goal.user_id.in_(ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(ids)).update({User.is_active: True}, synchronize_session=False)
        db.commit()


def request(actors, method, body=None, actor=0, status=200):
    client, _, headers = actors
    result = client.request(method, "/api/v1/goals", headers=headers[actor], json=body)
    assert result.status_code == status, result.text
    document = result.json()
    assert document["statusCode"] == status
    assert document["path"] == "/api/v1/goals"
    assert document["success"] == (status < 400)
    if status < 400:
        schema = SPEC["paths"]["/goals"][method.lower()]["responses"][str(status)]["content"]["application/json"]["schema"]
        OAS30Validator(schema, resolver=RefResolver.from_schema(SPEC)).validate(document)
    else:
        assert document["data"] is None
        assert isinstance(document["error"]["details"], list)
    return document


def test_goal_crud_lifecycle_and_recreate(actors):
    original = payload()
    created = request(actors, "POST", original, status=201)["data"]
    assert {key: created[key] for key in original} == original
    assert request(actors, "GET")["data"] == created
    updated = payload(targetGpa=4, remainingCredits=45)
    assert request(actors, "PUT", updated)["data"] == {"id": created["id"], **updated}
    assert request(actors, "GET")["data"] == {"id": created["id"], **updated}
    assert request(actors, "DELETE")["data"] is None
    assert request(actors, "GET", status=404)["error"]["code"] == "NOT_FOUND"
    request(actors, "POST", original, status=201)


def test_duplicate_post_returns_409_and_preserves_goal(actors):
    before = request(actors, "POST", payload(), status=201)["data"]
    duplicate = request(actors, "POST", payload(targetGpa=1), status=409)
    assert duplicate["error"]["code"] == "GOAL_EXISTS"
    assert "PUT /api/v1/goals" in duplicate["message"]
    assert request(actors, "GET")["data"] == before


@pytest.mark.parametrize("method", ["GET", "PUT", "DELETE"])
def test_missing_goal_is_404_and_put_does_not_create(actors, method):
    request(actors, method, payload() if method == "PUT" else None, status=404)
    request(actors, "GET", status=404)


@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "DELETE"])
def test_all_goal_endpoints_require_auth(actors, method):
    client, _, _ = actors
    result = client.request(method, "/api/v1/goals", json=payload() if method in {"POST", "PUT"} else None)
    assert result.status_code == 401


def test_each_account_has_an_independent_goal(actors):
    first = request(actors, "POST", payload(targetGpa=2), status=201)["data"]
    request(actors, "GET", actor=1, status=404)
    request(actors, "PUT", payload(), actor=1, status=404)
    request(actors, "DELETE", actor=1, status=404)
    second = request(actors, "POST", payload(targetGpa=4), actor=1, status=201)["data"]
    assert second["id"] != first["id"]
    client, ids, headers = actors
    assert client.get(f"/api/v1/goals?userId={ids[1]}", headers=headers[0]).json()["data"] == first
    request(actors, "DELETE", actor=1)
    assert request(actors, "GET")["data"] == first


@pytest.mark.parametrize("gpa", [0, 4, 3.123456])
def test_gpa_boundaries_and_precision(actors, gpa):
    result = request(actors, "POST", payload(targetGpa=gpa), status=201)["data"]
    assert result["targetGpa"] == pytest.approx(gpa)


INVALID = [
    {"targetGpa": -0.01}, {"targetGpa": 4.01}, {"targetGpa": "3.5"}, {"targetGpa": True}, {"targetGpa": None},
    {"remainingCredits": 0}, {"remainingCredits": -1}, {"remainingCredits": 1.5}, {"remainingCredits": "30"},
    {"remainingCredits": True}, {"remainingCredits": 2_147_483_648}, {"remainingCredits": None},
    {"targetDate": "2026-02-30"}, {"targetDate": "30/06/2027"}, {"targetDate": 1_900_000_000},
    {"targetDate": "2027-06-30T00:00:00Z"}, {"targetDate": None},
    {"userId": 999}, {"user_id": 999}, {"id": 999},
]


@pytest.mark.parametrize("changes", INVALID)
@pytest.mark.parametrize("method", ["POST", "PUT"])
def test_invalid_payload_never_modifies_stored_goal(actors, changes, method):
    before = request(actors, "POST", payload(), status=201)["data"] if method == "PUT" else None
    result = request(actors, method, payload(**changes), status=400)
    assert result["error"]["code"] == "VALIDATION_ERROR"
    assert result["error"]["details"]
    if before:
        assert request(actors, "GET")["data"] == before
    else:
        request(actors, "GET", status=404)


@pytest.mark.parametrize("field", ["targetGpa", "targetDate", "remainingCredits"])
@pytest.mark.parametrize("method", ["POST", "PUT"])
def test_all_write_fields_are_required(actors, field, method):
    if method == "PUT":
        request(actors, "POST", payload(), status=201)
    body = payload()
    del body[field]
    request(actors, method, body, status=400)


@pytest.mark.parametrize("value", ["NaN", "Infinity", "-Infinity"])
def test_nonfinite_gpa_is_rejected(actors, value):
    client, _, headers = actors
    raw = json.dumps(payload()).replace('"targetGpa": 3.5', '"targetGpa": ' + value)
    result = client.post("/api/v1/goals", headers={**headers[0], "Content-Type": "application/json"}, content=raw)
    assert result.status_code == 400
    assert result.json()["error"]["code"] == "VALIDATION_ERROR"
    request(actors, "GET", status=404)


def test_credit_integer_bounds(actors):
    request(actors, "POST", payload(remainingCredits=1), status=201)
    assert request(actors, "PUT", payload(remainingCredits=2_147_483_647))["data"]["remainingCredits"] == 2_147_483_647


def test_stored_goal_can_be_read_after_its_target_date(actors):
    with SessionLocal() as db:
        db.add(Goal(user_id=actors[1][0], target_gpa=3.5,
                    target_date=today_in_vietnam() - timedelta(days=1), remaining_credits=30))
        db.commit()
    assert request(actors, "GET")["data"]["targetDate"] == (today_in_vietnam() - timedelta(days=1)).isoformat()
    request(actors, "PUT", payload())
    request(actors, "DELETE")


def test_today_is_allowed_but_yesterday_is_rejected(actors):
    today = today_in_vietnam()
    yesterday = payload(targetDate=(today - timedelta(days=1)).isoformat())
    request(actors, "POST", yesterday, status=400)
    request(actors, "POST", payload(targetDate=today.isoformat()), status=201)
    request(actors, "PUT", yesterday, status=400)


def test_calendar_day_is_vietnam_time_not_utc():
    utc_time = datetime(2026, 11, 16, 18, 0, tzinfo=timezone.utc)
    with patch("app.schemas.goal.datetime") as clock:
        clock.now.side_effect = lambda tz: utc_time.astimezone(tz)
        assert today_in_vietnam().isoformat() == "2026-11-17"


def test_unique_constraint_race_is_reported_as_conflict(actors):
    request(actors, "POST", payload(), status=201)
    with SessionLocal() as db:
        existing = db.query(Goal).filter_by(user_id=actors[1][0]).one()
        with patch("app.services.goal.existing_goal", side_effect=[None, existing]):
            assert request(actors, "POST", payload(), status=409)["error"]["code"] == "GOAL_EXISTS"
        assert db.query(Goal).filter_by(user_id=actors[1][0]).count() == 1


def test_database_also_enforces_one_goal_per_user(actors):
    request(actors, "POST", payload(), status=201)
    with SessionLocal() as db:
        db.add(Goal(user_id=actors[1][0], target_gpa=3, target_date=today_in_vietnam(), remaining_credits=1))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        assert db.execute(text("SELECT 1")).scalar() == 1


def test_locked_account_cannot_manage_goal(actors):
    _, ids, _ = actors
    with SessionLocal() as db:
        db.get(User, ids[0]).is_active = False
        db.commit()
    for method in ["GET", "POST", "PUT", "DELETE"]:
        assert request(actors, method, payload() if method in {"POST", "PUT"} else None, status=403)["error"]["code"] == "ACCOUNT_LOCKED"
