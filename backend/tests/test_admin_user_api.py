"""US-01 → US-06 và PB-05: kiểm thử API quản trị sinh viên và đổi mật khẩu."""

import time
from collections.abc import Generator
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_token, hash_password
from app.db.database import Base, get_db
from app.main import app
from app.models import (
    AuditLog,
    AuthSession,
    Course,
    GradeComponent,
    GradeScale,
    Semester,
    User,
)
from app.services.auth import login_attempts
from app.services.grade_scale import DEFAULT_GRADE_SCALE

PASSWORD = "admin-test-password"
NEW_PASSWORD = "admin-test-password-2"


def build_tokens(db: Session, user: User) -> dict:
    """Tạo sẵn một phiên cố định để test không phải gọi API login mỗi lần."""
    session_id = uuid4().hex
    db.add(
        AuthSession(
            id=session_id,
            user_id=user.id,
            expires_at=int(time.time()) + 24 * 60 * 60,
        )
    )
    access_token = create_token(
        {"sub": str(user.id), "sid": session_id, "type": "access"},
        timedelta(minutes=15),
    )
    refresh_token = create_token(
        {"sub": str(user.id), "sid": session_id, "type": "refresh"},
        timedelta(days=7),
    )
    return {
        "id": user.id,
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "headers": {"Authorization": f"Bearer {access_token}"},
    }


@pytest.fixture
def admin_client() -> Generator[
    tuple[TestClient, dict[str, dict], dict[str, dict], sessionmaker], None, None
]:
    """SQLite in-memory riêng cho test, không phụ thuộc database trong .env."""
    login_attempts.clear()  # tránh dính rate limit của test khác chạy trước
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine, expire_on_commit=False)

    with test_session() as db:
        db.add_all(
            [
                GradeScale(
                    min_score=minimum,
                    max_score=maximum,
                    letter=letter,
                    gpa4=gpa4,
                )
                for minimum, maximum, letter, gpa4 in DEFAULT_GRADE_SCALE
            ]
        )
        users = {
            "admin": User(
                email=f"admin.{uuid4().hex}@example.com",
                full_name="Quản trị viên",
                password_hash=hash_password(PASSWORD),
                role="ADMIN",
            ),
            "an": User(
                email=f"an.{uuid4().hex}@example.com",
                full_name="Nguyễn Văn An",
                password_hash=hash_password(PASSWORD),
                student_code="SV001",
                major="Công nghệ thông tin",
                role="STUDENT",
            ),
            "binh": User(
                email=f"binh.{uuid4().hex}@example.com",
                full_name="Trần Thị Bình",
                password_hash=hash_password(PASSWORD),
                student_code="SV002",
                major="Khoa học máy tính",
                role="STUDENT",
            ),
            "locked": User(
                email=f"locked.{uuid4().hex}@example.com",
                full_name="Lê Văn Cường",
                password_hash=hash_password(PASSWORD),
                student_code="SV003",
                role="STUDENT",
                is_active=False,
            ),
        }
        db.add_all(users.values())
        db.flush()


        # Dữ liệu điểm của An: 2 học kỳ, 3 môn có điểm + 1 môn chưa đủ điểm.
        semester_one = Semester(
            user_id=users["an"].id,
            name="Học kỳ 1",
            academic_year="2025-2026",
            start_date=date(2025, 9, 1),
            end_date=date(2026, 1, 15),
        )
        semester_two = Semester(
            user_id=users["an"].id,
            name="Học kỳ 2",
            academic_year="2025-2026",
            start_date=date(2026, 2, 1),
            end_date=date(2026, 6, 15),
        )
        db.add_all([semester_one, semester_two])
        db.flush()

        course_one = Course(
            semester_id=semester_one.id,
            code="IT001",
            name="Nhập môn lập trình",
            credits=3,
            category="GENERAL",
            grade10=Decimal("8.6"),
            grade4=Decimal("4.0"),
        )
        course_two = Course(
            semester_id=semester_one.id,
            code="IT002",
            name="Toán rời rạc",
            credits=3,
            category="GENERAL",
            grade10=Decimal("7.0"),
            grade4=Decimal("3.0"),
        )
        course_three = Course(
            semester_id=semester_one.id,
            code="IT003",
            name="Vật lý đại cương",
            credits=3,
            category="GENERAL",
        )
        course_four = Course(
            semester_id=semester_two.id,
            code="IT004",
            name="Cấu trúc dữ liệu",
            credits=2,
            category="GENERAL",
            grade10=Decimal("5.5"),
            grade4=Decimal("2.0"),
        )
        db.add_all([course_one, course_two, course_three, course_four])
        db.flush()

        components = {
            "course_one_midterm": GradeComponent(
                course_id=course_one.id,
                name="Giữa kỳ",
                weight_percent=Decimal("40"),
                score=Decimal("8"),
            ),
            "course_one_final": GradeComponent(
                course_id=course_one.id,
                name="Cuối kỳ",
                weight_percent=Decimal("60"),
                score=Decimal("9"),
            ),
            "course_two_final": GradeComponent(
                course_id=course_two.id,
                name="Thi cuối kỳ",
                weight_percent=Decimal("100"),
                score=Decimal("7"),
            ),
            "course_three_final": GradeComponent(
                course_id=course_three.id,
                name="Thi cuối kỳ",
                weight_percent=Decimal("100"),
            ),
            "course_four_final": GradeComponent(
                course_id=course_four.id,
                name="Thi cuối kỳ",
                weight_percent=Decimal("100"),
                score=Decimal("5.5"),
            ),
        }
        db.add_all(components.values())
        db.flush()

        # Bình có môn riêng để kiểm tra ADMIN không sửa chéo dữ liệu sinh viên khác.
        binh_semester = Semester(
            user_id=users["binh"].id,
            name="Học kỳ 1",
            academic_year="2025-2026",
            start_date=date(2025, 9, 1),
            end_date=date(2026, 1, 15),
        )
        db.add(binh_semester)
        db.flush()
        binh_course = Course(
            semester_id=binh_semester.id,
            code="CS101",
            name="Lập trình căn bản",
            credits=3,
            category="GENERAL",
        )
        db.add(binh_course)
        db.flush()
        binh_component = GradeComponent(
            course_id=binh_course.id,
            name="Thi cuối kỳ",
            weight_percent=Decimal("100"),
            score=Decimal("8"),
        )
        db.add(binh_component)
        db.flush()

        identities = {
            key: build_tokens(db, user) for key, user in users.items()
        }
        db.commit()

        ids = {
            "courses": {
                "course_one": course_one.id,
                "course_two": course_two.id,
                "course_three": course_three.id,
                "course_four": course_four.id,
                "binh_course": binh_course.id,
            },
            "components": {
                **{name: item.id for name, item in components.items()},
                "binh_final": binh_component.id,
            },
        }
        ids["emails"] = {key: user.email for key, user in users.items()}

    def override_get_db() -> Generator[Session, None, None]:
        with test_session() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client, identities, ids, test_session
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_admin_lists_only_students_with_search_sort_and_pagination(admin_client):
    client, identities, _, _ = admin_client
    admin_headers = identities["admin"]["headers"]

    response = client.get("/api/v1/admin/users", headers=admin_headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    body = payload["data"]
    assert body["meta"]["totalItems"] == 3
    assert {item["studentCode"] for item in body["items"]} == {"SV001", "SV002", "SV003"}
    assert all(item["fullName"] != "Quản trị viên" for item in body["items"])
    assert body["items"][0]["createdAt"] is not None

    by_code = client.get(
        "/api/v1/admin/users", params={"q": "sv001"}, headers=admin_headers
    ).json()["data"]
    assert [item["studentCode"] for item in by_code["items"]] == ["SV001"]

    by_name = client.get(
        "/api/v1/admin/users", params={"q": "Bình"}, headers=admin_headers
    ).json()["data"]
    assert [item["studentCode"] for item in by_name["items"]] == ["SV002"]

    first_page = client.get(
        "/api/v1/admin/users",
        params={"page": 1, "pageSize": 2, "sortBy": "email", "sortOrder": "asc"},
        headers=admin_headers,
    ).json()["data"]
    second_page = client.get(
        "/api/v1/admin/users",
        params={"page": 2, "pageSize": 2, "sortBy": "email", "sortOrder": "asc"},
        headers=admin_headers,
    ).json()["data"]
    assert len(first_page["items"]) == 2
    assert len(second_page["items"]) == 1
    assert first_page["meta"]["totalPages"] == 2
    emails = [item["email"] for item in first_page["items"] + second_page["items"]]
    assert emails == sorted(emails)

    invalid = client.get(
        "/api/v1/admin/users", params={"sortBy": "password_hash"}, headers=admin_headers
    )
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "VALIDATION_ERROR"

def test_admin_student_detail_and_grade_transcript(admin_client):
    client, identities, _, _ = admin_client
    admin_headers = identities["admin"]["headers"]
    student_id = identities["an"]["id"]

    detail = client.get(f"/api/v1/admin/users/{student_id}", headers=admin_headers)
    assert detail.status_code == 200
    body = detail.json()["data"]
    student = body["student"]
    assert student["studentCode"] == "SV001"
    assert student["major"] == "Công nghệ thông tin"
    assert body["summary"]["semesterCount"] == 2
    assert body["summary"]["courseCount"] == 4
    assert body["summary"]["gpa4"] == 3.13
    assert body["summary"]["includedCredits"] == 8
    assert body["summary"]["ranking"] == "Khá"
    assert len(body["semesters"]) == 2

    grades = client.get(
        f"/api/v1/admin/users/{student_id}/grades", headers=admin_headers
    )
    assert grades.status_code == 200
    body = grades.json()["data"]
    assert body["student"]["studentCode"] == "SV001"
    assert body["cumulative"]["gpa4"] == 3.13
    assert body["cumulative"]["includedCredits"] == 8
    assert body["cumulative"]["passedCredits"] == 8
    assert body["cumulative"]["ranking"] == "Khá"

    semester_one = next(
        item for item in body["semesters"] if item["name"] == "Học kỳ 1"
    )
    assert semester_one["gpa4"] == 3.5  # (4.0*3 + 3.0*3) / 6
    assert semester_one["includedCredits"] == 6
    assert semester_one["ranking"] == "Giỏi"
    assert len(semester_one["courses"]) == 3

    programming = next(
        item for item in semester_one["courses"] if item["code"] == "IT001"
    )
    assert programming["courseGrade10"] == 8.6
    assert programming["letterGrade"] == "A"
    assert programming["grade4"] == 4.0
    assert programming["isPassed"] is True
    assert [item["name"] for item in programming["components"]] == [
        "Giữa kỳ",
        "Cuối kỳ",
    ]
    assert programming["components"][0]["weightPercent"] == 40.0

    physics = next(item for item in semester_one["courses"] if item["code"] == "IT003")
    assert physics["courseGrade10"] is None
    assert physics["letterGrade"] is None

    missing = client.get("/api/v1/admin/users/999999", headers=admin_headers)
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "NOT_FOUND"

    admin_as_student = client.get(
        f"/api/v1/admin/users/{identities['admin']['id']}", headers=admin_headers
    )
    assert admin_as_student.status_code == 404

def test_admin_can_update_scores_and_gpa_is_recalculated(admin_client):
    client, identities, ids, test_session = admin_client
    admin_headers = identities["admin"]["headers"]
    student_id = identities["an"]["id"]
    course_two_id = ids["courses"]["course_two"]

    response = client.put(
        f"/api/v1/admin/users/{student_id}/courses/{course_two_id}/scores",
        json={
            "scores": [
                {"component_id": ids["components"]["course_two_final"], "score": 9}
            ]
        },
        headers=admin_headers,
    )
    assert response.status_code == 200
    course = response.json()["data"]
    assert course["courseId"] == course_two_id
    assert course["courseGrade10"] == 9.0
    assert course["letterGrade"] == "A"
    assert course["grade4"] == 4.0
    assert course["isPassed"] is True

    grades = client.get(
        f"/api/v1/admin/users/{student_id}/grades", headers=admin_headers
    ).json()["data"]
    assert grades["cumulative"]["gpa4"] == 3.5  # (4.0*3 + 4.0*3 + 2.0*2) / 8
    assert grades["cumulative"]["ranking"] == "Giỏi"
    assert grades["cumulative"]["includedCredits"] == 8

    with test_session() as db:
        persisted = db.get(Course, course_two_id)
        assert float(persisted.grade10) == 9.0
        assert float(persisted.grade4) == 4.0

    cross_student = client.put(
        f"/api/v1/admin/users/{student_id}/courses/{ids['courses']['binh_course']}/scores",
        json={
            "scores": [
                {"component_id": ids["components"]["binh_final"], "score": 9}
            ]
        },
        headers=admin_headers,
    )
    assert cross_student.status_code == 404
    assert cross_student.json()["error"]["code"] == "NOT_FOUND"

    wrong_component = client.put(
        f"/api/v1/admin/users/{student_id}/courses/{course_two_id}/scores",
        json={
            "scores": [
                {"component_id": ids["components"]["course_one_midterm"], "score": 8}
            ]
        },
        headers=admin_headers,
    )
    assert wrong_component.status_code == 404
    assert wrong_component.json()["error"]["code"] == "COMPONENT_NOT_FOUND"

    duplicated = client.put(
        f"/api/v1/admin/users/{student_id}/courses/{course_two_id}/scores",
        json={
            "scores": [
                {"component_id": ids["components"]["course_two_final"], "score": 8},
                {"component_id": ids["components"]["course_two_final"], "score": 9},
            ]
        },
        headers=admin_headers,
    )
    assert duplicated.status_code == 400
    assert duplicated.json()["error"]["code"] == "DUPLICATE_COMPONENT"

    out_of_range = client.put(
        f"/api/v1/admin/users/{student_id}/courses/{course_two_id}/scores",
        json={
            "scores": [
                {"component_id": ids["components"]["course_two_final"], "score": 11}
            ]
        },
        headers=admin_headers,
    )
    assert out_of_range.status_code == 400
    assert out_of_range.json()["error"]["code"] == "VALIDATION_ERROR"

def test_admin_can_replace_grade_scale_and_recalculate_grades(admin_client):
    """ADMIN lưu bảng quy đổi mới; điểm hệ 4 và GPA đã lưu phải dùng bảng mới."""
    client, identities, ids, test_session = admin_client
    admin_headers = identities["admin"]["headers"]
    student_headers = identities["an"]["headers"]

    def put_scale(items: list[dict], headers: dict):
        return client.put(
            "/api/v1/grade-scale", json={"items": items}, headers=headers
        )

    invalid_items = [
        {"letter": "A", "minScore": 6, "maxScore": 10, "gpa4": 4},
        {"letter": "B", "minScore": 0, "maxScore": 7, "gpa4": 3},
    ]
    forbidden = put_scale(invalid_items, student_headers)
    assert forbidden.status_code == 403

    invalid = put_scale(invalid_items, admin_headers)
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "INVALID_GRADE_SCALE"
    assert any(
        "chồng lấn" in item["reason"]
        for item in invalid.json()["error"]["details"]
    )

    # Request lỗi không được thay đổi bảng đang dùng.
    assert len(client.get("/api/v1/grade-scale").json()["data"]) == 8

    new_items = [
        {"letter": "F", "minScore": 0, "maxScore": 3.9, "gpa4": 0},
        {"letter": "C", "minScore": 4, "maxScore": 5.9, "gpa4": 2},
        {"letter": "B", "minScore": 6, "maxScore": 7.9, "gpa4": 3.7},
        {"letter": "A", "minScore": 8, "maxScore": 10, "gpa4": 4},
    ]
    updated = put_scale(new_items, admin_headers)
    assert updated.status_code == 200
    scale = updated.json()["data"]
    assert [
        (item["letter"], item["minScore"], item["maxScore"], item["gpa4"])
        for item in scale
    ] == [
        ("A", 8.0, 10.0, 4.0),
        ("B", 6.0, 7.9, 3.7),
        ("C", 4.0, 5.9, 2.0),
        ("F", 0.0, 3.9, 0.0),
    ]

    grades = client.get(
        f"/api/v1/admin/users/{identities['an']['id']}/grades",
        headers=admin_headers,
    ).json()["data"]
    courses = {
        course["code"]: course
        for semester in grades["semesters"]
        for course in semester["courses"]
    }
    assert courses["IT001"]["grade4"] == 4.0  # 8.6 -> A
    assert courses["IT002"]["grade4"] == 3.7  # 7.0 -> B
    assert courses["IT004"]["grade4"] == 2.0  # 5.5 -> C
    assert courses["IT003"]["grade4"] is None
    # (4.0*3 + 3.7*3 + 2.0*2) / 8 = 3.3875 -> 3.39
    assert grades["cumulative"]["gpa4"] == 3.39
    assert grades["cumulative"]["ranking"] == "Giỏi"

    with test_session() as db:
        persisted = db.get(Course, ids["courses"]["course_two"])
        assert persisted is not None
        assert float(persisted.grade4) == 3.7
        assert db.query(GradeScale).count() == 4


def test_admin_lock_and_unlock_revokes_sessions_and_keeps_audit(admin_client):
    client, identities, ids, test_session = admin_client
    admin_headers = identities["admin"]["headers"]
    student_id = identities["an"]["id"]

    locked = client.patch(
        f"/api/v1/admin/users/{student_id}/status",
        json={"isActive": False, "reason": "Vi phạm nội quy"},
        headers=admin_headers,
    )
    assert locked.status_code == 200
    assert locked.json()["data"]["isActive"] is False

    with test_session() as db:
        sessions = (
            db.query(AuthSession)
            .filter(AuthSession.user_id == student_id)
            .count()
        )
        assert sessions == 0
        log = (
            db.query(AuditLog)
            .filter(AuditLog.target_user_id == student_id)
            .one()
        )
        assert log.action == "USER_LOCKED"
        assert log.user_id == identities["admin"]["id"]
        assert log.reason == "Vi phạm nội quy"

    # Access token cũ mất hiệu lực ngay vì AuthSession đã bị xóa.
    revoked = client.get("/api/v1/auth/me", headers=identities["an"]["headers"])
    assert revoked.status_code == 401
    revoked_refresh = client.post(
        "/api/v1/auth/refresh",
        json={"refreshToken": identities["an"]["refreshToken"]},
    )
    assert revoked_refresh.status_code == 401

    blocked_login = client.post(
        "/api/v1/auth/login",
        json={"email": ids["emails"]["an"], "password": PASSWORD},
    )
    assert blocked_login.status_code == 403
    assert blocked_login.json()["error"]["code"] == "ACCOUNT_LOCKED"

    unlocked = client.patch(
        f"/api/v1/admin/users/{student_id}/status",
        json={"isActive": True},
        headers=admin_headers,
    )
    assert unlocked.status_code == 200
    assert unlocked.json()["data"]["isActive"] is True

    with test_session() as db:
        logs = (
            db.query(AuditLog)
            .filter(AuditLog.target_user_id == student_id)
            .order_by(AuditLog.id)
            .all()
        )
        assert [log.action for log in logs] == ["USER_LOCKED", "USER_UNLOCKED"]
        assert logs[1].reason is None

    # Trạng thái không đổi thì không ghi thêm nhật ký.
    same_state = client.patch(
        f"/api/v1/admin/users/{student_id}/status",
        json={"isActive": True},
        headers=admin_headers,
    )
    assert same_state.status_code == 200
    with test_session() as db:
        assert db.query(AuditLog).count() == 2

    # Tài khoản mở khóa đăng nhập lại được.
    relogin = client.post(
        "/api/v1/auth/login",
        json={"email": ids["emails"]["an"], "password": PASSWORD},
    )
    assert relogin.status_code == 200

    missing_student = client.patch(
        "/api/v1/admin/users/999999/status",
        json={"isActive": False},
        headers=admin_headers,
    )
    assert missing_student.status_code == 404
    assert missing_student.json()["error"]["code"] == "NOT_FOUND"


def test_change_password_invalidates_old_sessions(admin_client):
    client, identities, ids, _ = admin_client
    headers = identities["an"]["headers"]

    wrong_current = client.post(
        "/api/v1/auth/change-password",
        json={"currentPassword": "wrong-password", "newPassword": NEW_PASSWORD},
        headers=headers,
    )
    assert wrong_current.status_code == 400
    assert wrong_current.json()["error"]["code"] == "INVALID_PASSWORD"

    same_password = client.post(
        "/api/v1/auth/change-password",
        json={"currentPassword": PASSWORD, "newPassword": PASSWORD},
        headers=headers,
    )
    assert same_password.status_code == 400
    assert same_password.json()["error"]["code"] == "PASSWORD_UNCHANGED"

    too_short = client.post(
        "/api/v1/auth/change-password",
        json={"currentPassword": PASSWORD, "newPassword": "short"},
        headers=headers,
    )
    assert too_short.status_code == 400
    assert too_short.json()["error"]["code"] == "VALIDATION_ERROR"

    changed = client.post(
        "/api/v1/auth/change-password",
        json={
            "currentPassword": PASSWORD,
            "newPassword": NEW_PASSWORD,
            # Trường lạ không được phép đổi mật khẩu của người khác.
            "user_id": identities["binh"]["id"],
        },
        headers=headers,
    )
    assert changed.status_code == 200
    new_tokens = changed.json()["data"]
    assert new_tokens["accessToken"]
    assert new_tokens["refreshToken"]

    old_access = client.get("/api/v1/auth/me", headers=headers)
    assert old_access.status_code == 401
    old_refresh = client.post(
        "/api/v1/auth/refresh",
        json={"refreshToken": identities["an"]["refreshToken"]},
    )
    assert old_refresh.status_code == 401

    new_headers = {"Authorization": f"Bearer {new_tokens['accessToken']}"}
    assert client.get("/api/v1/auth/me", headers=new_headers).status_code == 200

    old_password_login = client.post(
        "/api/v1/auth/login",
        json={"email": ids["emails"]["an"], "password": PASSWORD},
    )
    assert old_password_login.status_code == 401
    assert old_password_login.json()["error"]["code"] == "INVALID_CREDENTIALS"

    new_password_login = client.post(
        "/api/v1/auth/login",
        json={"email": ids["emails"]["an"], "password": NEW_PASSWORD},
    )
    assert new_password_login.status_code == 200

    # Tài khoản khác không bị ảnh hưởng bởi trường user_id gửi kèm.
    other_login = client.post(
        "/api/v1/auth/login",
        json={"email": ids["emails"]["binh"], "password": PASSWORD},
    )
    assert other_login.status_code == 200


def test_profile_update_only_changes_own_name(admin_client):
    """PATCH /auth/profile chỉ đổi họ tên của chính mình, không đổi email/role."""
    client, identities, ids, test_session = admin_client
    an_headers = identities["an"]["headers"]

    response = client.patch(
        "/api/v1/auth/profile",
        json={
            "fullName": "  Nguyễn Văn An Mới  ",
            # Các trường ngoài schema không được phép tác động tài khoản.
            "email": "hacker@example.com",
            "role": "ADMIN",
        },
        headers=an_headers,
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["fullName"] == "Nguyễn Văn An Mới"
    assert body["email"] == ids["emails"]["an"]

    me = client.get("/api/v1/auth/me", headers=an_headers).json()["data"]
    assert me["fullName"] == "Nguyễn Văn An Mới"
    assert me["email"] == ids["emails"]["an"]
    assert me["role"] == "STUDENT"

    with test_session() as db:
        an = db.get(User, identities["an"]["id"])
        binh = db.get(User, identities["binh"]["id"])
        assert an.full_name == "Nguyễn Văn An Mới"
        assert an.email == ids["emails"]["an"]
        assert an.role == "STUDENT"
        assert binh.full_name == "Trần Thị Bình"

    missing_name = client.patch(
        "/api/v1/auth/profile", json={"fullName": " A "}, headers=an_headers
    )
    assert missing_name.status_code == 400
    anonymous = client.patch(
        "/api/v1/auth/profile", json={"fullName": "Hợp lệ"}
    )
    assert anonymous.status_code == 401


def test_admin_endpoints_reject_non_admin_and_missing_token(admin_client):
    client, identities = admin_client[0], admin_client[1]
    student_headers = identities["an"]["headers"]

    assert client.get("/api/v1/admin/users").status_code == 401

    forbidden = client.get("/api/v1/admin/users", headers=student_headers)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "FORBIDDEN"

    forbidden_detail = client.get(
        f"/api/v1/admin/users/{identities['binh']['id']}", headers=student_headers
    )
    assert forbidden_detail.status_code == 403

    forbidden_status = client.patch(
        f"/api/v1/admin/users/{identities['binh']['id']}/status",
        json={"isActive": False},
        headers=student_headers,
    )
    assert forbidden_status.status_code == 403

    forbidden_scores = client.put(
        f"/api/v1/admin/users/{identities['an']['id']}/courses/1/scores",
        json={"scores": []},
        headers=student_headers,
    )
    assert forbidden_scores.status_code == 403
