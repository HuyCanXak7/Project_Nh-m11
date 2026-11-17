"""PB-37: kiểm tra phân quyền owner và vai trò trên các API backend hiện có."""

from datetime import date, timedelta
import time
from uuid import uuid4
from collections.abc import Generator

import pytest
from fastapi import FastAPI
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_token, hash_password
from app.db.database import Base, get_db
from app.dependencies import get_current_admin
from app.models import AuthSession, Course, GradeComponent, GradeScale, Semester, User
from app.routers.auth import router as auth_router
from app.routers.courses import router as courses_router
from app.routers.gpa import router as gpa_router
from app.routers.grade_import import router as grade_import_router
from app.routers.grades import router as grades_router
from app.routers.semesters import router as semesters_router
from app.services.grade_scale import DEFAULT_GRADE_SCALE


@pytest.fixture
def client_and_users() -> Generator[
    tuple[TestClient, dict[str, dict], sessionmaker], None, None
]:
    """Dùng SQLite memory riêng cho test, không kết nối database trong .env."""
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
            "owner": User(
                email=f"pb37.owner.{uuid4().hex}@example.com",
                full_name="PB-37 Owner",
                password_hash=hash_password("pb37-test-password"),
                role="STUDENT",
            ),
            "other": User(
                email=f"pb37.other.{uuid4().hex}@example.com",
                full_name="PB-37 Other",
                password_hash=hash_password("pb37-test-password"),
                role="STUDENT",
            ),
            "admin": User(
                email=f"pb37.admin.{uuid4().hex}@example.com",
                full_name="PB-37 Admin",
                password_hash=hash_password("pb37-test-password"),
                role="ADMIN",
            ),
        }
        db.add_all(users.values())
        db.flush()

        tokens: dict[str, dict] = {}
        for key, user in users.items():
            session_id = uuid4().hex
            db.add(
                AuthSession(
                    id=session_id,
                    user_id=user.id,
                    expires_at=int(time.time()) + 3600,
                )
            )
            tokens[key] = {
                "user_id": user.id,
                "headers": {
                    "Authorization": "Bearer "
                    + create_token(
                        {
                            "sub": str(user.id),
                            "sid": session_id,
                            "type": "access",
                        },
                        timedelta(minutes=15),
                    )
                },
            }
        db.commit()

    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(semesters_router)
    app.include_router(courses_router)
    app.include_router(grades_router)
    app.include_router(gpa_router)
    app.include_router(grade_import_router)

    # PB-37 kiểm tra role gate; endpoint quản trị nghiệp vụ được bổ sung theo
    # các task Admin riêng, hiện router admin chưa có chức năng production.
    @app.get("/__pb37_test/admin-only", dependencies=[Depends(get_current_admin)])
    def admin_role_gate_probe():
        return {"allowed": True}

    def override_get_db() -> Generator[Session, None, None]:
        with test_session() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client, tokens, test_session
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_account_cannot_read_or_change_another_accounts_records(client_and_users):
    client, identities, test_session = client_and_users
    other_id = identities["other"]["user_id"]

    # Chuẩn bị dữ liệu B trực tiếp trong DB test, không qua quyền của A.
    with test_session() as db:
        semester = Semester(
            user_id=other_id,
            name="Học kỳ riêng của B",
            academic_year="2026-2027",
            start_date=date(2026, 9, 1),
            end_date=date(2027, 1, 15),
        )
        db.add(semester)
        db.flush()
        course = Course(
            semester_id=semester.id,
            code="PB37-PRIVATE",
            name="Môn riêng của B",
            credits=3,
            category="GENERAL",
        )
        db.add(course)
        db.flush()
        component = GradeComponent(
            course_id=course.id,
            name="Thi cuối kỳ",
            weight_percent=100,
            score=8,
        )
        db.add(component)
        db.commit()
        semester_id, course_id, component_id = semester.id, course.id, component.id

    owner_headers = identities["owner"]["headers"]
    other_headers = identities["other"]["headers"]
    semester_body = {
        "name": "Học kỳ bị sửa trái phép",
        "academic_year": "2026-2027",
        "start_date": "2026-09-01",
        "end_date": "2027-01-15",
    }
    course_body = {
        "code": "TAKEOVER",
        "name": "Không được sửa",
        "credits": 3,
        "category": "GENERAL",
    }

    checks = [
        client.get(f"/api/v1/semesters/{semester_id}", headers=owner_headers),
        client.put(
            f"/api/v1/semesters/{semester_id}",
            headers=owner_headers,
            json=semester_body,
        ),
        client.delete(f"/api/v1/semesters/{semester_id}", headers=owner_headers),
        client.post(
            f"/api/v1/semesters/{semester_id}/courses",
            headers=owner_headers,
            json=course_body,
        ),
        client.get(
            f"/api/v1/semesters/{semester_id}/courses", headers=owner_headers
        ),
        client.put(
            f"/api/v1/courses/{course_id}",
            headers=owner_headers,
            json=course_body,
        ),
        client.delete(f"/api/v1/courses/{course_id}", headers=owner_headers),
        client.get(
            f"/api/v1/courses/{course_id}/deletion-preview", headers=owner_headers
        ),
        client.get(
            f"/api/v1/courses/{course_id}/grade-components", headers=owner_headers
        ),
        client.post(
            f"/api/v1/courses/{course_id}/grade-components",
            headers=owner_headers,
            json={"name": "Thành phần A", "weight_percent": 10},
        ),
        client.put(
            f"/api/v1/grade-components/{component_id}",
            headers=owner_headers,
            json={"name": "Thành phần bị sửa", "weight_percent": 100},
        ),
        client.delete(
            f"/api/v1/grade-components/{component_id}", headers=owner_headers
        ),
        client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=owner_headers,
            json={"scores": [{"component_id": component_id, "score": 1}]},
        ),
        client.post(
            f"/api/v1/courses/{course_id}/grade-components/complete",
            headers=owner_headers,
        ),
        client.get(f"/api/v1/semesters/{semester_id}/gpa", headers=owner_headers),
    ]
    assert [response.status_code for response in checks] == [404] * len(checks)

    # Chủ sở hữu B vẫn đọc và cập nhật được đúng dữ liệu của mình.
    assert client.get(
        f"/api/v1/semesters/{semester_id}", headers=other_headers
    ).status_code == 200
    assert client.get(
        f"/api/v1/courses/{course_id}/grade-components", headers=other_headers
    ).status_code == 200
    owner_score_update = client.put(
        f"/api/v1/courses/{course_id}/scores",
        headers=other_headers,
        json={"scores": [{"component_id": component_id, "score": 9}]},
    )
    assert owner_score_update.status_code == 200
    assert client.get(
        f"/api/v1/semesters/{semester_id}/gpa", headers=other_headers
    ).status_code == 200

    # Các bản ghi của B vẫn giữ nguyên sau mọi request bị từ chối.
    with test_session() as db:
        assert db.get(Semester, semester_id).name == "Học kỳ riêng của B"
        assert db.get(Course, course_id).code == "PB37-PRIVATE"
        assert db.get(GradeComponent, component_id).score == 9


def test_import_cannot_read_or_write_another_users_semester(client_and_users):
    client, identities, test_session = client_and_users
    with test_session() as db:
        semester = Semester(
            user_id=identities["other"]["user_id"],
            name="Kỳ riêng B",
            academic_year="2026-2027",
            start_date=date(2026, 9, 1),
            end_date=date(2027, 1, 15),
        )
        db.add(semester)
        db.flush()
        course = Course(
            semester_id=semester.id,
            code="B-PRIVATE",
            name="Môn riêng B",
            credits=3,
            category="GENERAL",
        )
        db.add(course)
        db.commit()
        semester_id, course_id = semester.id, course.id

    rows = [{
        "row": 2,
        "semester_name": "Kỳ riêng B",
        "semester_academic_year": "2026-2027",
        "semester_start_date": "2026-09-01",
        "semester_end_date": "2027-01-15",
        "course_code": "B-PRIVATE",
        "course_name": "Môn riêng B",
        "credits": 3,
        "category": "GENERAL",
        "component_name": "Cuối kỳ",
        "weight_percent": 100,
        "score": 9,
    }]
    assert client.post("/api/v1/import/grades", json={"rows": rows}).status_code == 401
    response = client.post(
        "/api/v1/import/grades",
        headers=identities["owner"]["headers"],
        json={"rows": rows},
    )
    assert response.status_code == 200
    assert response.json()["data"]["createdSemesters"] == 1
    with test_session() as db:
        assert db.get(Semester, semester_id) is not None
        assert db.get(Course, course_id).code == "B-PRIVATE"
        assert db.query(GradeComponent).filter_by(course_id=course_id).count() == 0
        owner_semester = db.query(Semester).filter_by(
            user_id=identities["owner"]["user_id"], name="Kỳ riêng B"
        ).one()
        assert db.query(Course).filter_by(
            semester_id=owner_semester.id, code="B-PRIVATE"
        ).count() == 1
        assert db.query(GradeComponent).filter(
            GradeComponent.course_id == course_id
        ).count() == 0


def test_import_rejects_invalid_batch_without_partial_writes(client_and_users):
    client, identities, test_session = client_and_users
    rows = [
        {
            "row": 2,
            "semester_name": "Kỳ mới",
            "semester_academic_year": "2026-2027",
            "semester_start_date": "2026-09-01",
            "semester_end_date": "2027-01-15",
            "course_code": "IMPORT01",
            "course_name": "Môn import",
            "credits": 3,
            "category": "GENERAL",
            "component_name": "Giữa kỳ",
            "weight_percent": 40,
            "score": 8,
        },
        {
            "row": 3,
            "semester_name": "Kỳ mới",
            "semester_academic_year": "2026-2027",
            "semester_start_date": "2026-09-01",
            "semester_end_date": "2027-01-15",
            "course_code": "IMPORT01",
            "course_name": "Môn import",
            "credits": 3,
            "category": "GENERAL",
            "component_name": "Cuối kỳ",
            "weight_percent": 50,
            "score": 8,
        },
    ]
    response = client.post(
        "/api/v1/import/grades",
        headers=identities["owner"]["headers"],
        json={"rows": rows},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "IMPORT_INVALID_ROWS"
    assert {issue["row"] for issue in response.json()["detail"]["details"]} == {2, 3}
    with test_session() as db:
        assert db.query(Semester).filter_by(user_id=identities["owner"]["user_id"]).count() == 0


def test_import_saves_valid_batch_and_creates_related_records(client_and_users):
    client, identities, test_session = client_and_users
    rows = [
        {
            "row": row_number,
            "semester_name": "Kỳ mới",
            "semester_academic_year": "2026-2027",
            "semester_start_date": "2026-09-01",
            "semester_end_date": "2027-01-15",
            "course_code": "IMPORT01",
            "course_name": "Môn import",
            "credits": 3,
            "category": "GENERAL",
            "component_name": component,
            "weight_percent": weight,
            "score": score,
        }
        for row_number, component, weight, score in [
            (2, "Giữa kỳ", 40, 8),
            (3, "Cuối kỳ", 60, 9),
        ]
    ]
    response = client.post(
        "/api/v1/import/grades",
        headers=identities["owner"]["headers"],
        json={"rows": rows},
    )
    assert response.status_code == 200
    assert response.json()["data"] == {
        "importedRows": 2,
        "createdSemesters": 1,
        "createdCourses": 1,
        "createdGradeComponents": 2,
    }
    with test_session() as db:
        semester = db.query(Semester).filter_by(user_id=identities["owner"]["user_id"]).one()
        course = db.query(Course).filter_by(semester_id=semester.id).one()
        assert course.grade10 is not None
        assert db.query(GradeComponent).filter_by(course_id=course.id).count() == 2


def test_admin_role_gate_rejects_student_and_allows_admin(client_and_users):
    client, identities, _test_session = client_and_users
    student = client.get(
        "/__pb37_test/admin-only", headers=identities["owner"]["headers"]
    )
    admin = client.get(
        "/__pb37_test/admin-only", headers=identities["admin"]["headers"]
    )
    assert student.status_code == 403
    assert student.json()["detail"]["code"] == "FORBIDDEN"
    assert admin.status_code == 200


def test_import_rejects_duplicate_existing_component_without_overwrite(
    client_and_users,
):
    client, identities, test_session = client_and_users
    with test_session() as db:
        semester = Semester(
            user_id=identities["owner"]["user_id"],
            name="Kỳ hiện hữu",
            academic_year="2026-2027",
            start_date=date(2026, 9, 1),
            end_date=date(2027, 1, 15),
        )
        db.add(semester)
        db.flush()
        course = Course(
            semester_id=semester.id,
            code="EXIST01",
            name="Môn đã có",
            credits=3,
            category="GENERAL",
        )
        db.add(course)
        db.flush()
        component = GradeComponent(
            course_id=course.id,
            name="Giữa kỳ",
            weight_percent=40,
            score=7,
        )
        db.add(component)
        db.commit()
        semester_id, course_id, component_id = semester.id, course.id, component.id

    rows = [
        {
            "row": 2,
            "semester_name": "Kỳ hiện hữu",
            "semester_academic_year": "2026-2027",
            "course_code": "EXIST01",
            "course_name": "Môn đã có",
            "credits": 3,
            "category": "GENERAL",
            "component_name": "Giữa kỳ",
            "weight_percent": 40,
            "score": 10,
        },
        {
            "row": 3,
            "semester_name": "Kỳ hiện hữu",
            "semester_academic_year": "2026-2027",
            "course_code": "EXIST01",
            "course_name": "Môn đã có",
            "credits": 3,
            "category": "GENERAL",
            "component_name": "Cuối kỳ",
            "weight_percent": 60,
            "score": 8,
        },
    ]
    response = client.post(
        "/api/v1/import/grades",
        headers=identities["owner"]["headers"],
        json={"rows": rows},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "IMPORT_INVALID_ROWS"
    with test_session() as db:
        assert db.get(GradeComponent, component_id).score == 7
        assert db.query(GradeComponent).filter_by(course_id=course_id).count() == 1
        assert db.query(Semester).filter_by(user_id=identities["owner"]["user_id"]).count() == 1
        assert db.get(Semester, semester_id) is not None


def test_import_rejects_over_1000_rows(client_and_users):
    client, identities, _test_session = client_and_users
    response = client.post(
        "/api/v1/import/grades",
        headers=identities["owner"]["headers"],
        json={"rows": [{}] * 1001},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "IMPORT_FILE_INVALID"
