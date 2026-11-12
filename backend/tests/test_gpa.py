import os
import unittest
from datetime import date
from decimal import Decimal
from pathlib import Path
from secrets import token_urlsafe
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.db.session import get_engine
from app.db.tables import courses, semesters, users
from app.services.gpa_service import summarize_gpa
from app.main import app
from app.core.security import hash_password


class GpaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        directory = cls.enterClassContext(TemporaryDirectory())
        sqlite_url = "sqlite:///" + (Path(directory) / "gpa.db").as_posix()
        cls.enterClassContext(patch.dict(os.environ, {
            "DATABASE_URL": os.environ.get("GPA_TEST_DATABASE_URL", sqlite_url),
            "JWT_SECRET": token_urlsafe(32),
        }))
        engine = get_engine()
        cls.addClassCleanup(get_engine.cache_clear)
        cls.addClassCleanup(engine.dispose)
        command.upgrade(Config(str(Path(__file__).resolve().parents[1] / "alembic.ini")), "head")
        password = token_urlsafe(16)
        empty_password = token_urlsafe(16)
        with engine.begin() as connection:
            connection.execute(users.insert(), [
                dict(id=1, email="student@example.com", full_name="Student", role="STUDENT",
                     password_hash=hash_password(password)),
                dict(id=2, email="other@example.com", full_name="Other", role="STUDENT",
                     password_hash=hash_password(token_urlsafe(16))),
                dict(id=3, email="empty@example.com", full_name="Empty", role="STUDENT",
                     password_hash=hash_password(empty_password)),
            ])
            for semester_id, user_id in [(1, 1), (2, 1), (3, 2), (4, 1), (5, 1), (6, 1), (7, 1)]:
                connection.execute(semesters.insert().values(
                    id=semester_id, user_id=user_id, name=f"Semester {semester_id}", academic_year="2026-2027",
                    start_date=date(2026, 9, 1), end_date=date(2027, 1, 1),
                ))
            connection.execute(courses.insert(), [
                dict(semester_id=1, code="CS1", name="Passed", credits=3, grade10=9, grade4=4),
                dict(semester_id=1, code="CS2", name="Failed", credits=2, grade10=3.9, grade4=0),
                dict(semester_id=1, code="PENDING", name="Not graded", credits=20, grade10=None, grade4=None),
                dict(semester_id=2, code="CS3", name="Incomplete", credits=9, grade10=None, grade4=None),
                dict(semester_id=3, code="CS1", name="Private", credits=8, grade10=10, grade4=4),
                dict(semester_id=4, code=" cs1 ", name="Lower score", credits=9, grade10=8.5, grade4=4),
                dict(semester_id=4, code="cs2", name="Passed retake", credits=4, grade10=7.5, grade4=3),
                dict(semester_id=4, code="CS4", name="Still failed", credits=2, grade10=3.9, grade4=0),
                dict(semester_id=4, code="CS1", name="Exact tie", credits=7, grade10=9, grade4=4),
                dict(semester_id=4, code="CS2", name="Incomplete retake", credits=12, grade10=None, grade4=None),
                dict(semester_id=6, code="F1", name="All failed", credits=3, grade10=0, grade4=0),
                dict(semester_id=7, code="ROUND1", name="Round A", credits=3, grade10=9, grade4=4),
                dict(semester_id=7, code="ROUND2", name="Round B", credits=5, grade10=8.2, grade4=3.5),
            ])
        cls.client = cls.enterClassContext(TestClient(app))
        cls.headers = cls.login("student@example.com", password)
        cls.empty_headers = cls.login("empty@example.com", empty_password)

    @classmethod
    def login(cls, email, password):
        result = cls.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        if result.status_code != 200:
            raise AssertionError(f"Login failed with HTTP {result.status_code}")
        return {"Authorization": f"Bearer {result.json()['data']['accessToken']}"}

    def test_semester_gpa_counts_failed_credits_and_weights_grades(self):
        response = self.client.get("/api/v1/semesters/1/gpa", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"], {
            "semesterId": 1, "gpa4": 2.4, "includedCredits": 5, "passedCredits": 3, "ranking": "Trung bình",
        })

    def test_semester_with_only_incomplete_courses(self):
        response = self.client.get("/api/v1/semesters/2/gpa", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"], {
            "semesterId": 2, "gpa4": None, "includedCredits": 0, "passedCredits": 0, "ranking": None,
        })

    def test_semester_is_private(self):
        self.assertEqual(self.client.get("/api/v1/semesters/1/gpa").status_code, 401)
        for semester_id in (3, 99):
            with self.subTest(semester_id=semester_id):
                response = self.client.get(f"/api/v1/semesters/{semester_id}/gpa", headers=self.headers)
                self.assertEqual(response.status_code, 404)

    def test_empty_semester_is_not_missing(self):
        result = self.client.get("/api/v1/semesters/5/gpa", headers=self.headers)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["data"], {
            "semesterId": 5, "gpa4": None, "includedCredits": 0, "passedCredits": 0, "ranking": None,
        })

    def test_all_failed_is_zero_not_empty(self):
        result = self.client.get("/api/v1/semesters/6/gpa", headers=self.headers)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["data"], {
            "semesterId": 6, "gpa4": 0.0, "includedCredits": 3, "passedCredits": 0, "ranking": "Yếu / Kém",
        })

    def test_round_half_up_on_api(self):
        result = self.client.get("/api/v1/semesters/7/gpa", headers=self.headers)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["data"]["gpa4"], 3.69)  # 29.5 / 8 = 3.6875

    def test_invalid_semester_ids(self):
        for semester_id in ("0", "-1", "2147483648", "abc"):
            with self.subTest(semester_id=semester_id):
                result = self.client.get(f"/api/v1/semesters/{semester_id}/gpa", headers=self.headers)
                self.assertEqual(result.status_code, 400)

    def test_swagger_describes_semester_response(self):
        schema = self.client.get("/openapi.json").json()
        operation = schema["paths"]["/api/v1/semesters/{semesterId}/gpa"]["get"]
        self.assertIn("SemesterGpaResponse", str(operation["responses"]["200"]))
        self.assertIn("401", operation["responses"])
        self.assertIn("404", operation["responses"])

    def test_rank_thresholds(self):
        for grade, ranking in [
            ("3.60", "Xuất sắc"), ("3.59", "Giỏi"), ("3.20", "Giỏi"), ("3.19", "Khá"),
            ("2.50", "Khá"), ("2.49", "Trung bình"), ("2.00", "Trung bình"), ("1.99", "Yếu / Kém"),
            ("3.595", "Xuất sắc"), ("3.594", "Giỏi"),
        ]:
            with self.subTest(grade=grade):
                course = SimpleNamespace(credits=1, grade4=Decimal(grade), grade10=Decimal("8.0"))
                self.assertEqual(summarize_gpa([course])["ranking"], ranking)

    def test_cumulative_gpa_keeps_best_attempt_for_each_code(self):
        response = self.client.get("/api/v1/gpa/cumulative", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"], {
            "gpa4": 2.68, "includedCredits": 20, "passedCredits": 15, "ranking": "Khá",
            "retakePolicy": "HIGHEST_GRADE_BY_COURSE_CODE",
        })

    def test_cumulative_gpa_without_completed_courses(self):
        self.assertEqual(self.client.get("/api/v1/gpa/cumulative").status_code, 401)
        response = self.client.get("/api/v1/gpa/cumulative", headers=self.empty_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"], {
            "gpa4": None, "includedCredits": 0, "passedCredits": 0, "ranking": None,
            "retakePolicy": "HIGHEST_GRADE_BY_COURSE_CODE",
        })
