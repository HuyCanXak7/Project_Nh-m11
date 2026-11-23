"""Kiểm thử PB-04: sửa họ tên hồ sơ của chính mình."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def login(client: TestClient) -> dict:
    email = f"profile.{uuid4().hex}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Tên cũ", "password": "password123"},
    )
    token = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password123"}
    ).json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def test_update_own_profile_name():
    with TestClient(app) as client:
        headers = login(client)
        response = client.patch(
            "/api/v1/auth/profile", headers=headers, json={"fullName": "  Nguyễn Văn B  "}
        )
        assert response.status_code == 200
        assert response.json()["data"]["fullName"] == "Nguyễn Văn B"
        assert client.get("/api/v1/auth/me", headers=headers).json()["data"]["fullName"] == "Nguyễn Văn B"


def test_update_profile_rejects_invalid_or_anonymous():
    with TestClient(app) as client:
        headers = login(client)
        for body in ({"fullName": " A "}, {"fullName": ""}, {}):
            assert client.patch("/api/v1/auth/profile", headers=headers, json=body).status_code == 400
        assert client.patch("/api/v1/auth/profile", json={"fullName": "Hợp lệ"}).status_code == 401
        assert client.get("/api/v1/auth/me", headers=headers).json()["data"]["fullName"] == "Tên cũ"
