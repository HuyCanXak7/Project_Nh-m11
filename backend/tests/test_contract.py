import json
import unittest
from pathlib import Path

from jsonschema import RefResolver
from openapi_schema_validator import OAS30Validator
from openapi_spec_validator import validate

from app.main import app
from app.routers import auth, gpa, statistics

SPEC_PATH = Path(__file__).resolve().parents[2] / "docs/api/openapi.json"


class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))

    def test_openapi_spec_and_examples_are_valid(self):
        validate(self.spec)
        resolver = RefResolver.from_schema(self.spec)

        def visit(node):
            if isinstance(node, dict):
                if "schema" in node and "example" in node:
                    OAS30Validator(node["schema"], resolver=resolver).validate(node["example"])
                for child in node.values():
                    visit(child)
            elif isinstance(node, list):
                for child in node:
                    visit(child)

        visit(self.spec)

    def test_implemented_contract_operations_have_real_routes(self):
        actual = {(route.path, method) for router in [app, auth.router, gpa.router, statistics.router]
                  for route in router.routes for method in getattr(route, "methods", [])}
        for path, item in self.spec["paths"].items():
            for method, operation in item.items():
                if isinstance(operation, dict) and operation.get("x-implementation") == "implemented":
                    self.assertIn(("/api/v1" + path, method.upper()), actual)

    def test_no_what_if_or_export_endpoints(self):
        for path in self.spec["paths"]:
            self.assertFalse(any(word in path.lower() for word in ["what-if", "whatif", "export"]))

    def test_v11_acceptance_scope(self):
        self.assertEqual(self.spec["info"]["version"], "1.1.0")
        required = {"/statistics/summary": "get", "/statistics/semesters": "get", "/statistics/distribution": "get",
                    "/goals/required-score": "get", "/grade-scale": "get", "/import/grades": "post",
                    "/admin/users": "get", "/admin/users/{userId}/status": "patch", "/admin/grade-scale": "put",
                    "/admin/statistics": "get", "/admin/audit-logs": "get"}
        for path, method in required.items():
            operation = self.spec["paths"][path][method]
            for status in ["200", "401", "403", "500"]:
                self.assertIn(status, operation["responses"])
