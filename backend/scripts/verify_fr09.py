"""Generate sanitized FR-09 API evidence on a temporary SQLite database.

Run from backend: python -m scripts.verify_fr09
Requires requirements-test.txt. Does not use the configured application database.
"""
import json
import os
from unittest.mock import patch

from tests.test_gpa import GpaTests


def main():
    with patch.dict(os.environ):
        os.environ.pop("GPA_TEST_DATABASE_URL", None)
        try:
            GpaTests.setUpClass()
            results = []
            for label, semester_id, authenticated in [
                ("Weighted: (4x3 + 0x2)/5; incomplete 20 credits excluded", 1, True),
                ("Only incomplete courses", 2, True),
                ("Empty semester", 5, True),
                ("All failed: real zero GPA", 6, True),
                ("Rounding: 29.5/8 = 3.6875 -> 3.69", 7, True),
                ("Other user's semester", 3, True),
                ("Missing semester", 99, True),
                ("No access token", 1, False),
            ]:
                result = GpaTests.client.get(
                    f"/api/v1/semesters/{semester_id}/gpa",
                    headers=GpaTests.headers if authenticated else {},
                )
                results.append({"case": label, "httpStatus": result.status_code, "response": result.json()})
            print(json.dumps({
                "task": "T0694D8", "requirement": "FR-09 / PB-18",
                "environment": "Temporary SQLite; real FastAPI TestClient; not production or browser E2E",
                "cases": results,
            }, ensure_ascii=True, indent=2))
        finally:
            GpaTests.doClassCleanups()


if __name__ == "__main__":
    main()
