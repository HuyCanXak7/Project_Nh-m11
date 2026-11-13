"""Kiểm thử PB-50: đánh dấu môn học lại và nhận diện các lần học cùng mã."""

from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.main import app
from app.models import Course


def register_and_login(client: TestClient) -> dict:
    """Mỗi lần test dùng tài khoản riêng để không phụ thuộc dữ liệu cũ."""
    email = f"retake.{uuid4().hex}@example.com"
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Sinh viên", "password": "password123"},
    )
    assert registered.status_code == 201
    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert logged_in.status_code == 200
    token = logged_in.json()["data"]["accessToken"]
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
    credits: int = 3,
    is_retake: bool = False,
) -> dict:
    response = client.post(
        f"/api/v1/semesters/{semester_id}/courses",
        headers=headers,
        json={
            "code": code,
            "name": name,
            "credits": credits,
            "category": "FOUNDATION",
            "is_retake": is_retake,
        },
    )
    assert response.status_code == 201
    return response.json()["data"]


def set_completed_grade(course_id: int, grade10: str, grade4: str) -> None:
    """Gắn điểm hoàn chỉnh để kiểm tra quy tắc GPA; nhập điểm thuộc task khác."""
    with SessionLocal() as db:
        course = db.get(Course, course_id)
        assert course is not None
        course.grade10 = Decimal(grade10)
        course.grade4 = Decimal(grade4)
        db.commit()


def test_mark_unmark_retake_and_show_in_course_list():
    """Có thể đánh dấu lúc tạo, bỏ/đánh dấu lại lúc sửa và xem trong danh sách."""
    with TestClient(app) as client:
        owner_headers = register_and_login(client)
        other_headers = register_and_login(client)
        semester_id = create_semester(client, owner_headers, "Học kỳ học lại")

        course = create_course(
            client,
            owner_headers,
            semester_id,
            "it001",
            "Nhập môn CNTT học lại",
            is_retake=True,
        )
        assert course["code"] == "IT001"
        assert course["is_retake"] is True

        # Bỏ đánh dấu khi sửa môn.
        unmarked = client.put(
            f"/api/v1/courses/{course['id']}",
            headers=owner_headers,
            json={
                "code": "it001",
                "name": "Nhập môn CNTT học lại",
                "credits": 3,
                "category": "FOUNDATION",
                "is_retake": False,
            },
        )
        assert unmarked.status_code == 200
        assert unmarked.json()["data"]["is_retake"] is False

        # Đánh dấu lại và kiểm tra cờ được trả rõ trong danh sách môn.
        marked_again = client.put(
            f"/api/v1/courses/{course['id']}",
            headers=owner_headers,
            json={
                "code": "IT001",
                "name": "Nhập môn CNTT học lại",
                "credits": 3,
                "category": "FOUNDATION",
                "is_retake": True,
            },
        )
        assert marked_again.status_code == 200
        listed = client.get(
            f"/api/v1/semesters/{semester_id}/courses", headers=owner_headers
        )
        assert listed.status_code == 200
        assert listed.json()["data"][0]["is_retake"] is True

        # Người dùng khác không được thay đổi cờ học lại của môn này.
        forbidden = client.put(
            f"/api/v1/courses/{course['id']}",
            headers=other_headers,
            json={
                "code": "IT001",
                "name": "Không được sửa",
                "credits": 3,
                "category": "FOUNDATION",
                "is_retake": False,
            },
        )
        assert forbidden.status_code == 404


def test_same_course_code_uses_best_attempt_inside_current_account_only():
    """Các lần học cùng mã được nhóm theo user và GPA chỉ lấy điểm cao nhất."""
    with TestClient(app) as client:
        owner_headers = register_and_login(client)
        other_headers = register_and_login(client)

        first_semester = create_semester(client, owner_headers, "Học kỳ lần đầu")
        second_semester = create_semester(client, owner_headers, "Học kỳ học lại")
        other_semester = create_semester(client, other_headers, "Học kỳ người khác")

        first_attempt = create_course(
            client, owner_headers, first_semester, "CS101", "Lập trình", is_retake=False
        )
        second_attempt = create_course(
            client, owner_headers, second_semester, "cs101", "Lập trình", is_retake=True
        )
        another_course = create_course(
            client, owner_headers, second_semester, "MA101", "Toán", credits=2
        )
        other_user_attempt = create_course(
            client, other_headers, other_semester, "CS101", "Lập trình người khác"
        )

        # Cùng mã CS101 của chủ sở hữu: lần học lại 3.5 cao hơn lần đầu 2.0.
        set_completed_grade(first_attempt["id"], "5.0", "2.0")
        set_completed_grade(second_attempt["id"], "8.0", "3.5")
        set_completed_grade(another_course["id"], "9.0", "4.0")
        # Điểm 4.0 của tài khoản khác tuyệt đối không được đưa vào kết quả owner.
        set_completed_grade(other_user_attempt["id"], "10.0", "4.0")

        cumulative = client.get("/api/v1/gpa/cumulative", headers=owner_headers)
        assert cumulative.status_code == 200
        data = cumulative.json()["data"]
        assert data["retakePolicy"] == "HIGHEST_GRADE_BY_COURSE_CODE"
        assert data["includedCredits"] == 5
        assert data["passedCredits"] == 5
        assert data["gpa4"] == 3.7
