"""Kiểm thử PB-17: đọc bảng quy đổi và các ngưỡng biên."""

from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.main import app
from app.models import Course


def register_and_login(client: TestClient) -> dict:
    email = f"scale.{uuid4().hex}@example.com"
    assert client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Sinh viên", "password": "password123"},
    ).status_code == 201
    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert logged_in.status_code == 200
    token = logged_in.json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def create_course_with_one_component(client: TestClient, headers: dict) -> tuple[int, int]:
    semester = client.post(
        "/api/v1/semesters",
        headers=headers,
        json={
            "name": "Học kỳ quy đổi",
            "academic_year": "2026-2027",
            "start_date": "2026-09-01",
            "end_date": "2027-01-15",
        },
    )
    assert semester.status_code == 201
    semester_id = semester.json()["data"]["id"]
    course = client.post(
        f"/api/v1/semesters/{semester_id}/courses",
        headers=headers,
        json={
            "code": "PB17",
            "name": "Môn quy đổi điểm",
            "credits": 3,
            "category": "FOUNDATION",
        },
    )
    assert course.status_code == 201
    course_id = course.json()["data"]["id"]
    component = client.post(
        f"/api/v1/courses/{course_id}/grade-components",
        headers=headers,
        json={"name": "Tổng kết", "weight_percent": 100},
    )
    assert component.status_code == 201
    component_id = component.json()["data"]["components"][0]["id"]
    return course_id, component_id


def test_get_default_grade_scale():
    """FE đọc được đủ 8 khoảng quy đổi đúng thứ tự trong SRS."""
    with TestClient(app) as client:
        response = client.get("/api/v1/grade-scale")
        assert response.status_code == 200
        data = response.json()["data"]
        assert [(item["letter"], item["minScore"], item["maxScore"], item["gpa4"]) for item in data] == [
            ("A", 8.5, 10.0, 4.0),
            ("B+", 8.0, 8.4, 3.5),
            ("B", 7.0, 7.9, 3.0),
            ("C+", 6.5, 6.9, 2.5),
            ("C", 5.5, 6.4, 2.0),
            ("D+", 5.0, 5.4, 1.5),
            ("D", 4.0, 4.9, 1.0),
            ("F", 0.0, 3.9, 0.0),
        ]


def test_grade_conversion_boundaries_and_persistence():
    """Các ngưỡng biên quy đổi đúng và kết quả hoàn chỉnh được lưu vào môn."""
    with TestClient(app) as client:
        headers = register_and_login(client)
        course_id, component_id = create_course_with_one_component(client, headers)

        cases = (
            (3.9, "F", 0.0, False),
            (4.0, "D", 1.0, True),
            (4.9, "D", 1.0, True),
            (5.0, "D+", 1.5, True),
            (8.4, "B+", 3.5, True),
            (8.5, "A", 4.0, True),
        )
        for score, letter, grade4, is_passed in cases:
            response = client.put(
                f"/api/v1/courses/{course_id}/scores",
                headers=headers,
                json={"scores": [{"component_id": component_id, "score": score}]},
            )
            assert response.status_code == 200
            data = response.json()["data"]
            assert data["courseGrade10"] == score
            assert data["letterGrade"] == letter
            assert data["grade4"] == grade4
            assert data["isPassed"] is is_passed

        with SessionLocal() as db:
            course = db.get(Course, course_id)
            assert course is not None
            assert course.grade10 == Decimal("8.5")
            assert course.grade4 == Decimal("4.00")

        # Cấu hình bị đổi còn 90% phải xóa kết quả cũ để GPA không dùng sai.
        incomplete = client.put(
            f"/api/v1/grade-components/{component_id}",
            headers=headers,
            json={"name": "Tổng kết", "weight_percent": 90},
        )
        assert incomplete.status_code == 200
        data = incomplete.json()["data"]
        assert data["courseGrade10"] is None
        assert data["letterGrade"] is None
        assert data["grade4"] is None
        assert data["isPassed"] is None

        with SessionLocal() as db:
            course = db.get(Course, course_id)
            assert course is not None
            assert course.grade10 is None
            assert course.grade4 is None
