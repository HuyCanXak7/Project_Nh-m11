from datetime import date
from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.main import app
from app.models import Course, Semester, User


def test_admin_statistics_is_aggregate_and_admin_only():
    password = "admin-statistics-password"
    suffix = uuid4().hex
    admin = User(email=f"admin.{suffix}@example.com", full_name="Private Admin",
                 password_hash=hash_password(password), role="ADMIN")
    student = User(email=f"private.{suffix}@example.com", full_name="Private Student",
                   password_hash=hash_password(password))
    empty_student = User(email=f"empty.{suffix}@example.com", full_name="Empty Student",
                         password_hash=hash_password(password))
    with TestClient(app) as client, SessionLocal() as db:
        db.add_all([admin, student, empty_student])
        db.flush()
        semester = Semester(user_id=student.id, name="HK1", academic_year="2026-2027",
                            start_date=date(2026, 9, 1), end_date=date(2027, 1, 31))
        db.add(semester)
        db.flush()
        db.add_all([
            Course(semester_id=semester.id, code="CS101", name="Course", credits=3,
                   category="GENERAL", grade10=Decimal("8.5"), grade4=Decimal("4.0")),
            Course(semester_id=semester.id, code="PENDING", name="Pending", credits=2,
                   category="GENERAL"),
        ])
        db.commit()

        def auth_headers(user):
            response = client.post("/api/v1/auth/login", json={"email": user.email, "password": password})
            assert response.status_code == 200
            return {"Authorization": "Bearer " + response.json()["data"]["accessToken"]}

        assert client.get("/api/v1/admin/statistics").status_code == 401
        assert client.get("/api/v1/admin/statistics", headers=auth_headers(student)).status_code == 403
        result = client.get("/api/v1/admin/statistics", headers=auth_headers(admin))

    assert result.status_code == 200
    data = result.json()["data"]
    assert data["totalUsers"] >= 3
    assert data["totalCourses"] >= 2
    assert data["averageGpa4"] == 4.0
    assert set(data) == {"totalUsers", "totalCourses", "averageGpa4"}
    assert "Private Student" not in result.text
    assert f"private.{suffix}@example.com" not in result.text
