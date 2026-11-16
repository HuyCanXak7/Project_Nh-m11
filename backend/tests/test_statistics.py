"""PB-20/PB-21: owner isolation, retakes, null/zero, DB scale and actual API payloads."""

import json
import unittest
from datetime import date
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

import sqlalchemy as sa
from jsonschema import RefResolver
from openapi_schema_validator import OAS30Validator

from app.db.session import get_engine
from app.db.tables import courses, grade_scale, semesters, users
from tests import test_gpa as fixtures


class StatisticsTests(unittest.TestCase):
    login = classmethod(fixtures.GpaTests.login.__func__)

    @classmethod
    def setUpClass(cls):
        fixtures.GpaTests.setUpClass.__func__(cls)
        cls.spec = json.loads((Path(__file__).resolve().parents[2] / "docs/api/openapi.json").read_text(encoding="utf-8"))

    def get(self, path, headers=None):
        result = self.client.get("/api/v1" + path, headers=headers or self.headers)
        self.assertEqual(result.status_code, 200, result.text)
        schema = self.spec["paths"][path]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
        OAS30Validator(schema, resolver=RefResolver.from_schema(self.spec)).validate(result.json())
        return result.json()["data"]

    def test_summary_equals_cumulative_gpa_and_never_counts_other_owner(self):
        data = self.get("/statistics/summary")
        cumulative = self.client.get("/api/v1/gpa/cumulative", headers=self.headers).json()["data"]
        for key, value in cumulative.items():
            self.assertEqual(data[key], value)
        self.assertEqual(data["totalCourses"], 12)
        self.assertEqual(data["completedCourses"], 6)
        self.assertEqual(data["passedCourses"], 4)
        # Best attempts: CS1=9*3, CS2=7.5*4, CS4=3.9*2, F1=0*3,
        # ROUND1=9*3, ROUND2=8.2*5. Six distinct complete codes.
        self.assertEqual(data["average10"], 6.64)

    def test_semester_trend_matches_each_gpa_endpoint(self):
        items = self.get("/statistics/semesters")["items"]
        self.assertEqual([item["semesterId"] for item in items], [1, 2, 4, 5, 6, 7])
        for item in items:
            gpa = self.client.get(f"/api/v1/semesters/{item['semesterId']}/gpa", headers=self.headers).json()["data"]
            for key, value in gpa.items():
                self.assertEqual(item[key], value)
        self.assertEqual(items[0]["cumulativeGpa4"], 2.4)
        self.assertEqual(items[1]["gpa4"], None)
        self.assertEqual(items[4]["gpa4"], 0)
        cumulative = self.client.get("/api/v1/gpa/cumulative", headers=self.headers).json()["data"]
        self.assertEqual(items[-1]["cumulativeGpa4"], cumulative["gpa4"])

    def test_distribution_counts_attempts_not_deduplicated_codes(self):
        data = self.get("/statistics/distribution")
        self.assertEqual(data["totalCourses"], 9)
        counts = {item["grade"]: item["count"] for item in data["items"]}
        self.assertEqual(counts, {"A": 4, "B+": 1, "B": 1, "C+": 0, "C": 0, "D+": 0, "D": 0, "F": 3})
        self.assertEqual(sum(counts.values()), data["totalCourses"])

    def test_empty_dashboard_has_null_gpa_and_zero_counts(self):
        data = self.get("/statistics/dashboard", self.empty_headers)
        self.assertIsNone(data["summary"]["gpa4"])
        self.assertIsNone(data["summary"]["ranking"])
        self.assertIsNone(data["summary"]["average10"])
        self.assertEqual(data["summary"]["passedCredits"], 0)
        self.assertEqual(data["semesters"]["items"], [])
        self.assertEqual(data["distribution"]["totalCourses"], 0)

    def test_dashboard_matches_individual_endpoints(self):
        data = self.get("/statistics/dashboard")
        self.assertEqual(data["summary"], self.get("/statistics/summary"))
        self.assertEqual(data["semesters"], self.get("/statistics/semesters"))
        self.assertEqual(data["distribution"], self.get("/statistics/distribution"))

    def test_all_private_endpoints_require_auth_and_ignore_user_id_query(self):
        for path in ["/statistics/summary", "/statistics/semesters", "/statistics/distribution", "/statistics/dashboard", "/grade-scale"]:
            with self.subTest(path=path):
                self.assertEqual(self.client.get("/api/v1" + path).status_code, 401)
                own = self.client.get("/api/v1" + path, headers=self.headers).json()["data"]
                spoofed = self.client.get("/api/v1" + path + "?userId=2", headers=self.headers).json()["data"]
                self.assertEqual(own, spoofed)

    def test_scale_comes_from_database(self):
        data = self.get("/grade-scale")
        self.assertEqual(len(data["items"]), 8)
        self.assertEqual(data["items"][0], {"letter": "A", "min10": 8.5, "max10": 10, "grade4": 4})
        try:
            with get_engine().begin() as connection:
                connection.execute(grade_scale.update().where(grade_scale.c.letter == "A").values(letter="A1"))
            self.assertEqual(self.get("/grade-scale")["items"][0]["letter"], "A1")
            self.assertEqual(self.get("/statistics/distribution")["items"][0]["grade"], "A1")
        finally:
            with get_engine().begin() as connection:
                connection.execute(grade_scale.update().where(grade_scale.c.letter == "A1").values(letter="A"))

    def test_health_is_public_and_checks_database(self):
        self.get("/health")
        with patch("app.main.get_engine") as engine:
            engine.return_value.connect.side_effect = sa.exc.OperationalError("SELECT 1", {}, Exception("private detail"))
            result = self.client.get("/api/v1/health")
        self.assertEqual(result.status_code, 503)
        self.assertEqual(result.json()["error"]["code"], "SERVICE_UNAVAILABLE")
        self.assertNotIn("private detail", result.text)

    def test_openapi_is_versioned_contract_served_by_swagger(self):
        document = self.client.get("/openapi.json").json()
        self.assertEqual(document["info"]["version"], "1.1.0")
        self.assertIn("/api/v1/goals/required-score", document["paths"])
        self.assertEqual(document["paths"]["/api/v1/statistics/summary"]["get"]["x-implementation"], "implemented")

    def test_distribution_grade_boundaries(self):
        before = {item["grade"]: item["count"] for item in self.get("/statistics/distribution")["items"]}
        values = ["3.9", "4.0", "4.9", "5.0", "8.4", "8.5", "10.0"]
        try:
            with get_engine().begin() as connection:
                connection.execute(semesters.insert().values(
                    id=90, user_id=1, name="Boundaries", academic_year="2026-2027",
                    start_date=date(2026, 1, 1), end_date=date(2026, 2, 1),
                ))
                connection.execute(courses.insert(), [
                    dict(semester_id=90, code="EDGE" + value, name=value, credits=1, grade10=Decimal(value), grade4=0)
                    for value in values
                ])
            after = {item["grade"]: item["count"] for item in self.get("/statistics/distribution")["items"]}
            delta = {grade: after[grade] - before[grade] for grade in before}
            self.assertEqual(delta, {"A": 2, "B+": 1, "B": 0, "C+": 0, "C": 0, "D+": 1, "D": 2, "F": 1})
        finally:
            with get_engine().begin() as connection:
                connection.execute(courses.delete().where(courses.c.semester_id == 90))
                connection.execute(semesters.delete().where(semesters.c.id == 90))

    def test_locked_account_cannot_read_statistics(self):
        try:
            with get_engine().begin() as connection:
                connection.execute(users.update().where(users.c.id == 1).values(is_active=False))
            result = self.client.get("/api/v1/statistics/dashboard", headers=self.headers)
            self.assertEqual(result.status_code, 403)
            self.assertEqual(result.json()["error"]["code"], "ACCOUNT_LOCKED")
        finally:
            with get_engine().begin() as connection:
                connection.execute(users.update().where(users.c.id == 1).values(is_active=True))

    def test_database_error_keeps_error_envelope(self):
        with self.assertLogs("app.core.errors", level="ERROR"), patch("app.services.statistics_service.get_engine") as engine:
            engine.return_value.begin.side_effect = sa.exc.OperationalError("private-sql", {}, Exception("private-detail"))
            result = self.client.get("/api/v1/statistics/dashboard", headers=self.headers)
        self.assertEqual(result.status_code, 500)
        self.assertEqual(result.json()["error"], {"code": "INTERNAL_ERROR", "details": []})
        self.assertIsNone(result.json()["data"])
        self.assertNotIn("private-detail", result.text)
