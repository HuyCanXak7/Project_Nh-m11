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
        other_headers = register_and_login(client)
        course_id = create_course(client, headers, "14")

        empty = client.get(
            f"/api/v1/courses/{course_id}/grade-components", headers=headers
        )
        assert empty.status_code == 200
        assert empty.json()["data"]["components"] == []

        # Tên và trọng số phải hợp lệ ngay từ backend.
        for invalid_data in (
            {"name": "   ", "weight_percent": 10},
            {"name": "Sai trọng số 0", "weight_percent": 0},
            {"name": "Sai trọng số âm", "weight_percent": -1},
            {"name": "Sai trọng số lớn", "weight_percent": 100.01},
        ):
            assert client.post(
                f"/api/v1/courses/{course_id}/grade-components",
                headers=headers,
                json=invalid_data,
            ).status_code == 400

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

        # Sửa hợp lệ phải cập nhật đúng thành phần và tính lại tổng hiện tại.
        updated_midterm = client.put(
            f"/api/v1/grade-components/{midterm['id']}",
            headers=headers,
            json={"name": "Thi giữa kỳ", "weight_percent": 25},
        )
        assert updated_midterm.status_code == 200
        assert updated_midterm.json()["data"]["totalWeightPercent"] == 95
        assert updated_midterm.json()["data"]["isComplete"] is False
        updated_final = client.put(
            f"/api/v1/grade-components/{final['id']}",
            headers=headers,
            json={"name": "Thi cuối kỳ", "weight_percent": 65},
        )
        assert updated_final.status_code == 200
        assert updated_final.json()["data"]["totalWeightPercent"] == 100

        # Không cho sửa làm tổng vượt 100%, sửa/xóa bằng tài khoản khác.
        assert client.put(
            f"/api/v1/grade-components/{final['id']}",
            headers=headers,
            json={"name": "Thi cuối kỳ", "weight_percent": 66},
        ).status_code == 400
        assert client.put(
            f"/api/v1/grade-components/{midterm['id']}",
            headers=other_headers,
            json={"name": "Không được sửa", "weight_percent": 25},
        ).status_code == 404
        assert client.delete(
            f"/api/v1/grade-components/{attendance['id']}",
            headers=other_headers,
        ).status_code == 404

        # Không cho tổng vượt 100% hoặc trùng tên thành phần.
        assert client.post(
            f"/api/v1/courses/{course_id}/grade-components",
            headers=headers,
            json={"name": "Bài tập", "weight_percent": 1},
        ).status_code == 400
        assert client.put(
            f"/api/v1/grade-components/{midterm['id']}",
            headers=headers,
            json={"name": "Chuyên cần", "weight_percent": 25},
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
        other_course_id = create_course(client, owner_headers, "15OTHER")
        other_course_component = add_component(
            client, owner_headers, other_course_id, "Bài tập", 100
        )

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
        assert saved.json()["data"]["temporaryCourseScore"] == 7.6
        assert saved.json()["data"]["hasAllScores"] is True

        # Cùng endpoint được dùng để sửa một điểm đã nhập trước đó.
        edited = client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=owner_headers,
            json={"scores": [{"component_id": first["id"], "score": 10}]},
        )
        assert edited.status_code == 200
        assert edited.json()["data"]["temporaryCourseScore"] == 9.6

        # Component tồn tại nhưng thuộc môn khác vẫn phải bị từ chối.
        assert client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=owner_headers,
            json={
                "scores": [
                    {"component_id": other_course_component["id"], "score": 8}
                ]
            },
        ).status_code == 404

        # ID trùng không rõ thứ tự ghi đè nên backend phải từ chối.
        duplicate_response = client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=owner_headers,
            json={
                "scores": [
                    {"component_id": first["id"], "score": 5},
                    {"component_id": first["id"], "score": 6},
                ]
            },
        )
        assert duplicate_response.status_code == 400
        assert duplicate_response.json()["error"]["code"] == "DUPLICATE_COMPONENT"

        # Nếu một phần request sai, điểm hợp lệ đi kèm cũng không được lưu dở dang.
        atomic_response = client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=owner_headers,
            json={
                "scores": [
                    {"component_id": first["id"], "score": 5},
                    {"component_id": 999999999, "score": 8},
                ]
            },
        )
        assert atomic_response.status_code == 404
        after_atomic_error = client.get(
            f"/api/v1/courses/{course_id}/grade-components",
            headers=owner_headers,
        )
        first_after_error = next(
            item
            for item in after_atomic_error.json()["data"]["components"]
            if item["id"] == first["id"]
        )
        assert first_after_error["score"] == 10

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


def test_calculate_course_grade_only_when_configuration_is_complete():
    """PB-16: đủ điểm mới tính, làm tròn 1 số và báo lý do khi chưa thể tính."""
    with TestClient(app) as client:
        headers = register_and_login(client)
        course_id = create_course(client, headers, "16")
        first = add_component(client, headers, course_id, "Giữa kỳ", 50)
        second = add_component(client, headers, course_id, "Cuối kỳ", 50)

        # Mới có một điểm thì không được coi thành phần còn thiếu là điểm 0.
        incomplete_scores = client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=headers,
            json={"scores": [{"component_id": first["id"], "score": 8.4}]},
        )
        assert incomplete_scores.status_code == 200
        incomplete_data = incomplete_scores.json()["data"]
        assert incomplete_data["canCalculateCourseGrade"] is False
        assert incomplete_data["courseGrade10"] is None
        assert incomplete_data["calculationMessage"] == (
            "Chưa thể tính điểm môn vì chưa nhập đủ điểm thành phần."
        )

        # (8.4 x 50% + 8.5 x 50%) = 8.45, làm tròn HALF_UP thành 8.5.
        completed_scores = client.put(
            f"/api/v1/courses/{course_id}/scores",
            headers=headers,
            json={"scores": [{"component_id": second["id"], "score": 8.5}]},
        )
        assert completed_scores.status_code == 200
        completed_data = completed_scores.json()["data"]
        assert completed_data["canCalculateCourseGrade"] is True
        assert completed_data["courseGrade10"] == 8.5
        assert completed_data["temporaryCourseScore"] == 8.5
        assert completed_data["calculationMessage"] is None

        # GET tính lại từ dữ liệu đã lưu và phải cho cùng kết quả.
        viewed = client.get(
            f"/api/v1/courses/{course_id}/grade-components", headers=headers
        )
        assert viewed.status_code == 200
        assert viewed.json()["data"]["courseGrade10"] == 8.5

        # Dù mọi thành phần hiện có đã có điểm, tổng 90% vẫn chưa được tính.
        invalid_weight_course = create_course(client, headers, "16WEIGHT")
        component_40 = add_component(
            client, headers, invalid_weight_course, "Giữa kỳ", 40
        )
        component_50 = add_component(
            client, headers, invalid_weight_course, "Cuối kỳ", 50
        )
        invalid_weight_result = client.put(
            f"/api/v1/courses/{invalid_weight_course}/scores",
            headers=headers,
            json={
                "scores": [
                    {"component_id": component_40["id"], "score": 8},
                    {"component_id": component_50["id"], "score": 9},
                ]
            },
        )
        assert invalid_weight_result.status_code == 200
        invalid_weight_data = invalid_weight_result.json()["data"]
        assert invalid_weight_data["canCalculateCourseGrade"] is False
        assert invalid_weight_data["courseGrade10"] is None
        assert invalid_weight_data["calculationMessage"] == (
            "Chưa thể tính điểm môn vì tổng trọng số chưa bằng 100%."
        )
