"""Kiểm thử PB-14 và PB-15 về cấu hình thành phần và nhập điểm."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def register_and_login(client: TestClient) -> dict:
    """Tạo tài khoản riêng cho mỗi test để không phụ thuộc dữ liệu test cũ."""
    email = f"grade.{uuid4().hex}@example.com"
    register_response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Sinh viên", "password": "password123"},
    )
    assert register_response.status_code == 201
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def create_course(client: TestClient, headers: dict, suffix: str) -> int:
    """Tạo học kỳ và môn học thuộc đúng tài khoản đang test."""
    semester_response = client.post(
        "/api/v1/semesters",
        headers=headers,
        json={
            "name": f"Học kỳ {suffix}",
            "academic_year": "2026-2027",
            "start_date": "2026-09-01",
            "end_date": "2027-01-15",
        },
    )
    assert semester_response.status_code == 201
    semester_id = semester_response.json()["data"]["id"]
    course_response = client.post(
        f"/api/v1/semesters/{semester_id}/courses",
        headers=headers,
        json={
            "code": f"PB{suffix}",
            "name": "Môn kiểm thử điểm",
            "credits": 3,
            "category": "FOUNDATION",
        },
    )
    assert course_response.status_code == 201
    return course_response.json()["data"]["id"]


def add_component(
    client: TestClient, headers: dict, course_id: int, name: str, weight: float
) -> dict:
    response = client.post(
        f"/api/v1/courses/{course_id}/grade-components",
        headers=headers,
        json={"name": name, "weight_percent": weight},
    )
    assert response.status_code == 201
    return response.json()["data"]["components"][-1]


def test_configure_components_and_complete_only_at_100_percent():
    """PB-14: CRUD cơ bản, hiển thị tổng và chỉ hoàn tất khi đủ 100%."""
    with TestClient(app) as client:
        headers = register_and_login(client)
        course_id = create_course(client, headers, "14")

        empty = client.get(
            f"/api/v1/courses/{course_id}/grade-components", headers=headers
        )
        assert empty.status_code == 200
        assert empty.json()["data"]["components"] == []

        attendance = add_component(client, headers, course_id, "Chuyên cần", 10)
        midterm = add_component(client, headers, course_id, "Giữa kỳ", 30)
        incomplete = client.post(
            f"/api/v1/courses/{course_id}/grade-components/complete",
            headers=headers,
        )
        assert incomplete.status_code == 400
        assert incomplete.json()["error"]["code"] == "WEIGHT_TOTAL_NOT_100"

        final = add_component(client, headers, course_id, "Cuối kỳ", 60)
        completed = client.post(
            f"/api/v1/courses/{course_id}/grade-components/complete",
            headers=headers,
        )
        assert completed.status_code == 200
        assert completed.json()["data"]["totalWeightPercent"] == 100
        assert completed.json()["data"]["isComplete"] is True
        assert completed.json()["data"]["temporaryCourseScore"] is None

        # Không cho tổng vượt 100% hoặc trùng tên thành phần.
        assert client.post(
            f"/api/v1/courses/{course_id}/grade-components",
            headers=headers,
            json={"name": "Bài tập", "weight_percent": 1},
        ).status_code == 400
        assert client.put(
            f"/api/v1/grade-components/{midterm['id']}",
            headers=headers,
            json={"name": "Chuyên cần", "weight_percent": 30},
        ).status_code == 400

        deleted = client.delete(
            f"/api/v1/grade-components/{attendance['id']}", headers=headers
        )
        assert deleted.status_code == 200
        assert deleted.json()["data"]["totalWeightPercent"] == 90
        assert final["score"] is None


def test_enter_edit_scores_validation_and_ownership():
    """PB-15: nhận biên 0/10, sửa điểm và chặn tài khoản khác."""
    with TestClient(app) as client:
        owner_headers = register_and_login(client)
        other_headers = register_and_login(client)
        course_id = create_course(client, owner_headers, "15")
        first = add_component(client, owner_headers, course_id, "Chuyên cần", 20)
        second = add_component(client, owner_headers, course_id, "Giữa kỳ", 30)
        third = add_component(client, owner_headers, course_id, "Cuối kỳ", 50)

        saved = client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=owner_headers,
            json={
                "scores": [
                    {"component_id": first["id"], "score": 0},
                    {"component_id": second["id"], "score": 8.5},
                    {"component_id": third["id"], "score": 10},
                ]
            },
        )
        assert saved.status_code == 200
        assert saved.json()["data"]["temporaryCourseScore"] == 7.55
        assert saved.json()["data"]["hasAllScores"] is True

        # Cùng endpoint được dùng để sửa một điểm đã nhập trước đó.
        edited = client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=owner_headers,
            json={"scores": [{"component_id": first["id"], "score": 10}]},
        )
        assert edited.status_code == 200
        assert edited.json()["data"]["temporaryCourseScore"] == 9.55

        # Backend từ chối điểm ngoài khoảng 0-10 và component không thuộc môn.
        assert client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=owner_headers,
            json={"scores": [{"component_id": first["id"], "score": -0.01}]},
        ).status_code == 400
        assert client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=owner_headers,
            json={"scores": [{"component_id": first["id"], "score": 10.01}]},
        ).status_code == 400
        assert client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=owner_headers,
            json={"scores": [{"component_id": 999999999, "score": 8}]},
        ).status_code == 404

        # Người khác không được xem hoặc nhập điểm môn của chủ sở hữu.
        assert client.get(
            f"/api/v1/courses/{course_id}/grade-components",
            headers=other_headers,
        ).status_code == 404
        assert client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=other_headers,
            json={"scores": [{"component_id": first["id"], "score": 5}]},
        ).status_code == 404
