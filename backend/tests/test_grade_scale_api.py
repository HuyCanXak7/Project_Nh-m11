"""Kiểm thử PB-17: đọc bảng quy đổi và các ngưỡng biên."""

from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.main import app
from app.models import Course, User
from app.services.grade_scale import DEFAULT_GRADE_SCALE


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


DEFAULT_ITEMS = [
    {"minScore": float(lo), "maxScore": float(hi), "letter": letter, "gpa4": float(gpa4)}
    for lo, hi, letter, gpa4 in DEFAULT_GRADE_SCALE
]


def make_admin(headers: dict) -> None:
    """Đổi role trực tiếp trong DB; dependency đọc role mới ở mỗi request."""
    with TestClient(app) as client:
        user_id = client.get("/api/v1/auth/me", headers=headers).json()["data"]["id"]
    with SessionLocal() as db:
        db.get(User, user_id).role = "ADMIN"
        db.commit()


def test_only_admin_can_edit_grade_scale():
    with TestClient(app) as client:
        headers = register_and_login(client)
        response = client.put("/api/v1/grade-scale", headers=headers, json={"items": DEFAULT_ITEMS})
        assert response.status_code == 403
        assert client.put("/api/v1/grade-scale", json={"items": DEFAULT_ITEMS}).status_code == 401


def test_invalid_grade_scale_is_rejected_and_table_unchanged():
    with TestClient(app) as client:
        headers = register_and_login(client)
        make_admin(headers)
        before = client.get("/api/v1/grade-scale").json()["data"]

        def with_changes(**changes):
            items = [dict(item) for item in DEFAULT_ITEMS]
            for index, fields in changes.items():
                items[int(index[1:])].update(fields)
            return items

        invalid_tables = [
            with_changes(i1={"maxScore": 8.5}),                    # B+ chồng lấn A
            with_changes(i1={"maxScore": 8.3}),                    # hở 8.4
            with_changes(i7={"minScore": 0.5}),                    # không phủ 0.0
            with_changes(i0={"maxScore": 9.9}),                    # không phủ 10.0
            with_changes(i1={"letter": "a"}),                      # trùng điểm chữ
            with_changes(i0={"minScore": 9.0, "maxScore": 8.5}),   # min > max
            with_changes(i0={"gpa4": 4.5}),                        # hệ 4 vượt 4
            with_changes(i0={"maxScore": 10.05}),                  # quá 1 chữ số thập phân
            [],
        ]
        for items in invalid_tables:
            response = client.put("/api/v1/grade-scale", headers=headers, json={"items": items})
            assert response.status_code == 400, items
            assert response.json()["error"]["code"] in {"INVALID_GRADE_SCALE", "VALIDATION_ERROR"}

        assert client.get("/api/v1/grade-scale").json()["data"] == before


def test_new_grade_scale_applies_to_next_calculation():
    with TestClient(app) as client:
        headers = register_and_login(client)
        course_id, component_id = create_course_with_one_component(client, headers)
        client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=headers,
            json={"scores": [{"component_id": component_id, "score": 4.2}]},
        )
        assert client.get("/api/v1/gpa/cumulative", headers=headers).json()["data"]["gpa4"] == 1.0

        make_admin(headers)
        stricter = [dict(item) for item in DEFAULT_ITEMS]
        stricter[6].update(minScore=4.5)   # D: 4.5–4.9
        stricter[7].update(maxScore=4.4)   # F: 0.0–4.4
        try:
            response = client.put("/api/v1/grade-scale", headers=headers, json={"items": stricter})
            assert response.status_code == 200
            assert response.json()["data"][-1] == {"id": response.json()["data"][-1]["id"], "minScore": 0.0, "maxScore": 4.4, "letter": "F", "gpa4": 0.0}

            # GPA đã lưu được quy đổi lại theo bảng mới
            assert client.get("/api/v1/gpa/cumulative", headers=headers).json()["data"]["gpa4"] == 0.0
            # Lần nhập điểm tiếp theo cũng dùng bảng mới
            data = client.put(
                f"/api/v1/courses/{course_id}/scores",
                headers=headers,
                json={"scores": [{"component_id": component_id, "score": 4.4}]},
            ).json()["data"]
            assert data["letterGrade"] == "F"
            assert data["grade4"] == 0.0
        finally:
            restored = client.put("/api/v1/grade-scale", headers=headers, json={"items": DEFAULT_ITEMS})
            assert restored.status_code == 200
