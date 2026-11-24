"""PB-39: kiểm thử endpoint bootstrap và độ phức tạp truy vấn của Dashboard."""

from datetime import date
from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import event

from app.db.database import SessionLocal, engine
from app.main import app
from app.models import Course, GradeComponent, Semester, User


PASSWORD = "password123"


def register_and_login(client: TestClient, email: str) -> dict:
    registered = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Sinh viên hiệu năng",
            "password": PASSWORD,
        },
    )
    assert registered.status_code == 201
    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert logged_in.status_code == 200
    return {"Authorization": f"Bearer {logged_in.json()['data']['accessToken']}"}


def seed_learning_data(email: str, semester_count: int = 8, courses_per_semester: int = 5):
    """Tạo 40 môn/120 thành phần trực tiếp để test đúng quy mô NFR."""
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).one()
        for semester_index in range(1, semester_count + 1):
            semester = Semester(
                user_id=user.id,
                name=f"Học kỳ {semester_index}",
                academic_year="2026-2027",
                start_date=date(2026, semester_index, 1),
                end_date=date(2026, semester_index, 28),
            )
            db.add(semester)
            db.flush()

            for course_index in range(1, courses_per_semester + 1):
                course = Course(
                    semester_id=semester.id,
                    code=f"PERF{semester_index:02d}{course_index:02d}",
                    name=f"Môn hiệu năng {semester_index}-{course_index}",
                    credits=3,
                    category="GENERAL",
                    grade10=Decimal("8.0"),
                    grade4=Decimal("3.5"),
                )
                db.add(course)
                db.flush()
                db.add_all(
                    [
                        GradeComponent(
                            course_id=course.id,
                            name="Chuyên cần",
                            weight_percent=Decimal("10"),
                            score=Decimal("8.0"),
                        ),
                        GradeComponent(
                            course_id=course.id,
                            name="Giữa kỳ",
                            weight_percent=Decimal("30"),
                            score=Decimal("8.0"),
                        ),
                        GradeComponent(
                            course_id=course.id,
                            name="Cuối kỳ",
                            weight_percent=Decimal("60"),
                            score=Decimal("8.0"),
                        ),
                    ]
                )
        db.commit()


def delete_user(email: str) -> None:
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if user is not None:
            db.delete(user)
            db.commit()


def test_learning_data_requires_authentication():
    with TestClient(app) as client:
        response = client.get("/api/v1/learning-data")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_learning_data_returns_40_courses_in_constant_query_count():
    email = f"perf.bootstrap.{uuid4().hex}@example.com"
    try:
        with TestClient(app) as client:
            headers = register_and_login(client, email)
            seed_learning_data(email)

            select_statements: list[str] = []

            def count_select(conn, cursor, statement, parameters, context, executemany):
                if statement.lstrip().upper().startswith("SELECT"):
                    select_statements.append(statement)

            event.listen(engine, "before_cursor_execute", count_select)
            try:
                response = client.get("/api/v1/learning-data", headers=headers)
            finally:
                event.remove(engine, "before_cursor_execute", count_select)

        assert response.status_code == 200
        data = response.json()["data"]

        assert len(data["semesters"]) == 8
        assert len(data["courses"]) == 40
        assert sum(len(course["components"]) for course in data["courses"]) == 120
        assert data["gradeScale"]
        assert data["cumulativeGpa"] == {
            "gpa4": 3.5,
            "includedCredits": 120,
            "passedCredits": 120,
            "ranking": "Giỏi",
            "retakePolicy": "HIGHEST_GRADE_BY_COURSE_CODE",
        }

        first_course = data["courses"][0]
        assert first_course["semester_id"] == data["semesters"][0]["id"]
        assert first_course["components"][0] == {
            "id": first_course["components"][0]["id"],
            "courseId": first_course["id"],
            "name": "Chuyên cần",
            "weightPercent": 10.0,
            "score": 8.0,
        }

        # Nếu N+1 xảy ra, số SELECT sẽ tăng theo 40 môn/120 thành phần.
        # Hiện tại chỉ auth (2) + grade scale (2) + eager load (3) = 7 truy vấn.
        assert len(select_statements) == 7, (
            f"Phát hiện N+1: {len(select_statements)} SELECT thay vì 7"
        )
    finally:
        delete_user(email)


def test_learning_data_is_isolated_between_users():
    first_email = f"perf.first.{uuid4().hex}@example.com"
    second_email = f"perf.second.{uuid4().hex}@example.com"
    try:
        with TestClient(app) as client:
            first_headers = register_and_login(client, first_email)
            second_headers = register_and_login(client, second_email)
            seed_learning_data(first_email, semester_count=1, courses_per_semester=1)

            first = client.get("/api/v1/learning-data", headers=first_headers).json()["data"]
            second = client.get("/api/v1/learning-data", headers=second_headers).json()["data"]

        assert len(first["courses"]) == 1
        assert len(second["courses"]) == 0
        assert second["semesters"] == []
        assert second["cumulativeGpa"]["gpa4"] is None
    finally:
        delete_user(first_email)
        delete_user(second_email)
