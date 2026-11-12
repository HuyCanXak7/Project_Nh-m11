"""Smoke test cho toàn bộ API hiện được liên kết trong app.main."""

from fastapi.testclient import TestClient

from app.main import app


def register(client, email):
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Sinh viên kiểm thử", "password": "password123"},
    )


def login(client, email):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert response.status_code == 200
    return response.json()["data"]


def test_auth_semester_and_gpa_flow():
    with TestClient(app) as client:
        email = "student.api@example.com"
        assert register(client, email).status_code == 201
        assert register(client, email).status_code == 409

        tokens = login(client, email)
        headers = {"Authorization": f"Bearer {tokens['accessToken']}"}
        assert client.get("/api/v1/auth/me", headers=headers).status_code == 200

        created = client.post(
            "/api/v1/semesters",
            headers=headers,
            json={
                "name": "Học kỳ 1",
                "academic_year": "2026-2027",
                "start_date": "2026-09-01",
                "end_date": "2027-01-15",
            },
        )
        assert created.status_code == 201
        semester_id = created.json()["data"]["id"]

        course = client.post(
            f"/api/v1/semesters/{semester_id}/courses",
            headers=headers,
            json={
                "code": "it001",
                "name": "Nhập môn Công nghệ thông tin",
                "credits": 3,
                "category": "GENERAL",
            },
        )
        assert course.status_code == 201
        assert course.json()["data"] == {
            "id": course.json()["data"]["id"],
            "semester_id": semester_id,
            "code": "IT001",
            "name": "Nhập môn Công nghệ thông tin",
            "credits": 3,
            "category": "GENERAL",
            "is_retake": False,
        }

        assert client.get("/api/v1/semesters", headers=headers).status_code == 200
        assert client.get(f"/api/v1/semesters/{semester_id}", headers=headers).status_code == 200
        assert client.put(
            f"/api/v1/semesters/{semester_id}",
            headers=headers,
            json={
                "name": "Học kỳ 1 đã sửa",
                "academic_year": "2026-2027",
                "start_date": "2026-09-01",
                "end_date": "2027-01-20",
            },
        ).status_code == 200

        semester_gpa = client.get(
            f"/api/v1/semesters/{semester_id}/gpa", headers=headers
        )
        assert semester_gpa.status_code == 200
        assert semester_gpa.json()["data"]["gpa4"] is None
        assert client.get("/api/v1/gpa/cumulative", headers=headers).status_code == 200

        refreshed = client.post(
            "/api/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]}
        )
        assert refreshed.status_code == 200
        new_tokens = refreshed.json()["data"]
        assert client.post(
            "/api/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]}
        ).status_code == 401

        new_headers = {"Authorization": f"Bearer {new_tokens['accessToken']}"}
        assert client.delete(
            f"/api/v1/semesters/{semester_id}", headers=new_headers
        ).status_code == 200
        assert client.post(
            "/api/v1/auth/logout", json={"refreshToken": new_tokens["refreshToken"]}
        ).status_code == 200
        assert client.get("/api/v1/auth/me", headers=new_headers).status_code == 401


def test_semester_ownership_and_validation():
    with TestClient(app) as client:
        register(client, "owner@example.com")
        register(client, "other@example.com")
        owner = login(client, "owner@example.com")
        other = login(client, "other@example.com")
        owner_headers = {"Authorization": f"Bearer {owner['accessToken']}"}
        other_headers = {"Authorization": f"Bearer {other['accessToken']}"}

        invalid = client.post(
            "/api/v1/semesters",
            headers=owner_headers,
            json={
                "name": "Sai ngày",
                "academic_year": "2026-2027",
                "start_date": "2027-01-01",
                "end_date": "2026-01-01",
            },
        )
        assert invalid.status_code == 400

        created = client.post(
            "/api/v1/semesters",
            headers=owner_headers,
            json={
                "name": "Kỳ riêng tư",
                "academic_year": "2026-2027",
                "start_date": "2026-09-01",
                "end_date": "2027-01-01",
            },
        )
        semester_id = created.json()["data"]["id"]
        assert client.post(
            f"/api/v1/semesters/{semester_id}/courses",
            headers=other_headers,
            json={
                "code": "PRIVATE01",
                "name": "Môn không được phép thêm",
                "credits": 3,
                "category": "SPECIALIZED",
            },
        ).status_code == 404
        assert client.post(
            f"/api/v1/semesters/{semester_id}/courses",
            headers=owner_headers,
            json={
                "code": "INVALID01",
                "name": "Môn sai tín chỉ",
                "credits": 0,
                "category": "GENERAL",
            },
        ).status_code == 400
        assert client.post(
            f"/api/v1/semesters/{semester_id}/courses",
            headers=owner_headers,
            json={
                "code": "INVALID02",
                "name": "Môn sai loại",
                "credits": 3,
                "category": "OTHER",
            },
        ).status_code == 400
        assert client.get(
            f"/api/v1/semesters/{semester_id}", headers=other_headers
        ).status_code == 404
        assert client.delete(
            f"/api/v1/semesters/{semester_id}", headers=other_headers
        ).status_code == 404
