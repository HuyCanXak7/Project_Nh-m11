"""Kiểm thử PB-11, PB-12 và PB-13 cho API quản lý môn học."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.main import app
from app.models import GradeComponent


def register_and_login(client: TestClient, email: str) -> dict:
    # Thêm chuỗi ngẫu nhiên để test có thể chạy lặp lại trên cùng test database.
    local_part, domain = email.split("@", maxsplit=1)
    email = f"{local_part}.{uuid4().hex}@{domain}"
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


def create_semester(client: TestClient, headers: dict, name: str) -> int:
    response = client.post(
        "/api/v1/semesters",
        headers=headers,
        json={
            "name": name,
            "academic_year": "2026-2027",
            "start_date": "2026-09-01",
            "end_date": "2027-01-15",
        },
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


def create_course(
    client: TestClient,
    headers: dict,
    semester_id: int,
    code: str,
    name: str,
    category: str,
) -> dict:
    response = client.post(
        f"/api/v1/semesters/{semester_id}/courses",
        headers=headers,
        json={"code": code, "name": name, "credits": 3, "category": category},
    )
    assert response.status_code == 201
    return response.json()["data"]


def test_list_courses_empty_search_filter_and_owner():
    with TestClient(app) as client:
        owner_headers = register_and_login(client, "course.owner@example.com")
        other_headers = register_and_login(client, "course.other@example.com")
        semester_id = create_semester(client, owner_headers, "Học kỳ danh sách")

        # PB-11: học kỳ chưa có môn trả danh sách rỗng, không phải lỗi 404.
        empty_response = client.get(
            f"/api/v1/semesters/{semester_id}/courses", headers=owner_headers
        )
        assert empty_response.status_code == 200
        assert empty_response.json()["data"] == []

        create_course(client, owner_headers, semester_id, "IT001", "Nhập môn CNTT", "GENERAL")
        create_course(client, owner_headers, semester_id, "CS201", "Cấu trúc dữ liệu", "FOUNDATION")
        create_course(client, owner_headers, semester_id, "AI301", "Trí tuệ nhân tạo", "SPECIALIZED")

        all_courses = client.get(
            f"/api/v1/semesters/{semester_id}/courses", headers=owner_headers
        )
        assert all_courses.status_code == 200
        assert len(all_courses.json()["data"]) == 3

        # PB-13: tìm không phân biệt hoa thường theo mã hoặc tên.
        by_code = client.get(
            f"/api/v1/semesters/{semester_id}/courses?keyword=it001",
            headers=owner_headers,
        )
        assert [item["code"] for item in by_code.json()["data"]] == ["IT001"]
        by_name = client.get(
            f"/api/v1/semesters/{semester_id}/courses?keyword=trúc",
            headers=owner_headers,
        )
        assert [item["code"] for item in by_name.json()["data"]] == ["CS201"]

        filtered = client.get(
            f"/api/v1/semesters/{semester_id}/courses?category=SPECIALIZED",
            headers=owner_headers,
        )
        assert [item["code"] for item in filtered.json()["data"]] == ["AI301"]
        assert client.get(
            f"/api/v1/semesters/{semester_id}/courses?category=INVALID",
            headers=owner_headers,
        ).status_code == 400

        # Xóa query filter nghĩa là gọi URL gốc và nhận lại đủ danh sách.
        reset_filter = client.get(
            f"/api/v1/semesters/{semester_id}/courses", headers=owner_headers
        )
        assert len(reset_filter.json()["data"]) == 3
        blank_keyword = client.get(
            f"/api/v1/semesters/{semester_id}/courses?keyword=%20%20%20",
            headers=owner_headers,
        )
        assert len(blank_keyword.json()["data"]) == 3

        # Người khác không được xem cả học kỳ lẫn danh sách môn.
        assert client.get(
            f"/api/v1/semesters/{semester_id}/courses", headers=other_headers
        ).status_code == 404


def test_update_delete_course_validation_owner_and_cascade():
    with TestClient(app) as client:
        owner_headers = register_and_login(client, "manage.owner@example.com")
        other_headers = register_and_login(client, "manage.other@example.com")
        semester_id = create_semester(client, owner_headers, "Học kỳ quản lý")
        course = create_course(
            client, owner_headers, semester_id, "CS101", "Môn ban đầu", "GENERAL"
        )
        course_id = course["id"]

        updated = client.put(
            f"/api/v1/courses/{course_id}",
            headers=owner_headers,
            json={
                "code": "cs102",
                "name": "Môn đã cập nhật",
                "credits": 4,
                "category": "FOUNDATION",
                "is_retake": True,
            },
        )
        assert updated.status_code == 200
        assert updated.json()["data"]["code"] == "CS102"
        assert updated.json()["data"]["credits"] == 4
        assert updated.json()["data"]["is_retake"] is True

        assert client.put(
            f"/api/v1/courses/{course_id}",
            headers=owner_headers,
            json={
                "code": "CS102",
                "name": "Sai tín chỉ",
                "credits": 0,
                "category": "FOUNDATION",
            },
        ).status_code == 400
        assert client.put(
            f"/api/v1/courses/{course_id}",
            headers=owner_headers,
            json={
                "code": "CS102",
                "name": "Sai loại môn",
                "credits": 3,
                "category": "OTHER",
            },
        ).status_code == 400
        assert client.put(
            f"/api/v1/courses/{course_id}",
            headers=other_headers,
            json={
                "code": "HACKED",
                "name": "Không được sửa",
                "credits": 3,
                "category": "GENERAL",
            },
        ).status_code == 404
        assert client.delete(
            f"/api/v1/courses/{course_id}", headers=other_headers
        ).status_code == 404

        # Tạo hai thành phần điểm để xác nhận số dữ liệu mất và cascade delete.
        with SessionLocal() as db:
            db.add_all(
                [
                    GradeComponent(course_id=course_id, name="Giữa kỳ", weight_percent=40),
                    GradeComponent(course_id=course_id, name="Cuối kỳ", weight_percent=60),
                ]
            )
            db.commit()

        preview = client.get(
            f"/api/v1/courses/{course_id}/deletion-preview", headers=owner_headers
        )
        assert preview.status_code == 200
        assert preview.json()["data"] == {"gradeComponentsToDelete": 2}
        assert client.get(
            f"/api/v1/courses/{course_id}/deletion-preview", headers=other_headers
        ).status_code == 404

        deleted = client.delete(
            f"/api/v1/courses/{course_id}", headers=owner_headers
        )
        assert deleted.status_code == 200
        assert deleted.json()["data"] == {"deletedGradeComponents": 2}

        with SessionLocal() as db:
            assert (
                db.query(GradeComponent)
                .filter(GradeComponent.course_id == course_id)
                .count()
                == 0
            )

        assert client.delete(
            f"/api/v1/courses/{course_id}", headers=owner_headers
        ).status_code == 404
