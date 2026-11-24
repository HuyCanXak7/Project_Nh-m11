"""PB-39: benchmark Dashboard với 40 môn và in p50/p95/p99.

Script chỉ dùng thư viện chuẩn + API HTTP, nên có thể chạy với backend local
hoặc Docker. Dữ liệu được tạo qua chính các API nghiệp vụ (không INSERT trực
tiếp) để phép đo phản ánh đúng luồng thật.

Ví dụ (backend đang chạy ở cổng 8000):
    python backend/scripts/benchmark_dashboard.py --iterations 30

Lần đầu script tự đăng ký tài khoản perf và in mật khẩu ngẫu nhiên. Các lần
sau truyền lại:
    set PERF_USER_EMAIL=perf.student@example.com
    set PERF_USER_PASSWORD=<mật khẩu đã in>
"""

from __future__ import annotations

import argparse
import json
import math
import os
import secrets
import statistics
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

PASSWORD_ENV = "PERF_USER_PASSWORD"
EMAIL_ENV = "PERF_USER_EMAIL"
DEFAULT_EMAIL = "perf.student@example.com"
COMPONENTS = (("Chuyên cần", 10), ("Giữa kỳ", 30), ("Cuối kỳ", 60))
SCORES = (8.0, 8.0, 8.0)


class ApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.token: str | None = None

    def call(self, method: str, path: str, body: dict | None = None):
        data = None if body is None else json.dumps(body).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        request = urllib.request.Request(
            f"{self.base_url}{path}", data=data, headers=headers, method=method
        )
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {path} -> {error.code}: {detail}") from None
        elapsed_ms = (time.perf_counter() - started) * 1000
        return payload.get("data", payload), elapsed_ms

    def login(self, email: str, password: str) -> None:
        data, _ = self.call(
            "POST", "/auth/login", {"email": email, "password": password}
        )
        self.token = data["accessToken"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.getenv("PERF_BASE_URL", "http://127.0.0.1:8000/api/v1"),
    )
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--semesters", type=int, default=8)
    parser.add_argument("--courses-per-semester", type=int, default=5)
    parser.add_argument("--email", default=os.getenv(EMAIL_ENV, DEFAULT_EMAIL))
    parser.add_argument("--password", default=os.getenv(PASSWORD_ENV))
    parser.add_argument("--skip-seed", action="store_true")
    parser.add_argument("--keep-data", action="store_true")
    parser.add_argument("--json-out", default=None)
    return parser.parse_args()


def prepare_user(client: ApiClient, args: argparse.Namespace) -> str:
    """Đăng nhập tài khoản perf; nếu chưa có thì đăng ký với mật khẩu ngẫu nhiên."""
    password = args.password or f"perf-{secrets.token_urlsafe(12)}"
    try:
        client.login(args.email, password)
        return password
    except RuntimeError as error:
        if "INVALID_CREDENTIALS" not in str(error):
            raise

    try:
        client.call(
            "POST",
            "/auth/register",
            {
                "email": args.email,
                "full_name": "Tài khoản đo hiệu năng",
                "password": password,
            },
        )
    except RuntimeError as error:
        if "EMAIL_EXISTS" not in str(error):
            raise
        raise SystemExit(
            f"Tài khoản {args.email} đã tồn tại. Hãy đặt {PASSWORD_ENV} "
            "hoặc truyền --password đúng để đăng nhập."
        ) from None
    print(f"Đã tạo tài khoản đo: {args.email} / mật khẩu: {password}")
    client.login(args.email, password)
    return password


def reset_seeded_data(client: ApiClient) -> None:
    """Xóa các học kỳ cũ của tài khoản perf để phép đo bắt đầu từ dữ liệu sạch."""
    semesters, _ = client.call("GET", "/semesters")
    for semester in semesters:
        client.call("DELETE", f"/semesters/{semester['id']}")


def seed_dataset(client: ApiClient, args: argparse.Namespace) -> tuple[int, int]:
    """Tạo dữ liệu 40 môn/120 thành phần qua API và trả số bản ghi."""
    semester_count = args.semesters
    per_semester = args.courses_per_semester
    total_courses = total_components = 0

    for semester_index in range(1, semester_count + 1):
        semester, _ = client.call(
            "POST",
            "/semesters",
            {
                "name": f"Học kỳ {semester_index}",
                "academic_year": "2026-2027",
                "start_date": f"2026-{semester_index:02d}-01",
                "end_date": f"2026-{semester_index:02d}-28",
            },
        )
        for course_index in range(1, per_semester + 1):
            code = f"PERF{semester_index:02d}{course_index:02d}"
            course, _ = client.call(
                "POST",
                f"/semesters/{semester['id']}/courses",
                {
                    "code": code,
                    "name": f"Môn hiệu năng {semester_index}-{course_index}",
                    "credits": 3,
                    "category": "GENERAL",
                    "is_retake": False,
                },
            )
            component_ids = []
            for component_name, weight in COMPONENTS:
                configuration, _ = client.call(
                    "POST",
                    f"/courses/{course['id']}/grade-components",
                    {"name": component_name, "weight_percent": weight},
                )
                component = next(
                    item
                    for item in configuration["components"]
                    if item["name"] == component_name
                )
                component_ids.append(component["id"])
                total_components += 1
            client.call(
                "PUT",
                f"/courses/{course['id']}/scores",
                {
                    "scores": [
                        {"component_id": component_id, "score": score}
                        for component_id, score in zip(component_ids, SCORES)
                    ]
                },
            )
            total_courses += 1
        print(
            f"  đã tạo học kỳ {semester_index}/{semester_count} "
            f"({total_courses} môn, {total_components} thành phần)",
            flush=True,
        )
    return total_courses, total_components


def timed_call(client: ApiClient, category: str, method: str, path: str, timings: dict):
    data, elapsed_ms = client.call(method, path)
    timings.setdefault(category, []).append(elapsed_ms)
    return data


def legacy_dashboard_load(client: ApiClient, timings: dict) -> float:
    """Mô phỏng luồng StorageService cũ: 1 + số học kỳ + số môn request."""
    started = time.perf_counter()
    semesters = timed_call(client, "GET /semesters", "GET", "/semesters", timings)
    timed_call(client, "GET /grade-scale", "GET", "/grade-scale", timings)

    with ThreadPoolExecutor(max_workers=6) as pool:
        course_lists = list(
            pool.map(
                lambda semester: timed_call(
                    client,
                    "GET /semesters/{id}/courses",
                    "GET",
                    f"/semesters/{semester['id']}/courses",
                    timings,
                ),
                semesters,
            )
        )
    courses = [course for course_list in course_lists for course in course_list]

    with ThreadPoolExecutor(max_workers=6) as pool:
        list(
            pool.map(
                lambda course: timed_call(
                    client,
                    "GET /courses/{id}/grade-components",
                    "GET",
                    f"/courses/{course['id']}/grade-components",
                    timings,
                ),
                courses,
            )
        )
    timed_call(client, "GET /gpa/cumulative", "GET", "/gpa/cumulative", timings)
    return (time.perf_counter() - started) * 1000


def optimized_dashboard_load(client: ApiClient, timings: dict) -> float:
    """Một request PB-39 đã bao gồm học kỳ, môn, thành phần, scale và GPA."""
    started = time.perf_counter()
    timed_call(client, "GET /learning-data", "GET", "/learning-data", timings)
    return (time.perf_counter() - started) * 1000


def percentile(values: list[float], point: int) -> float:
    ordered = sorted(values)
    rank = max(1, math.ceil(point / 100 * len(ordered)))
    return ordered[min(rank - 1, len(ordered) - 1)]


def summarize(values: list[float]) -> dict:
    return {
        "count": len(values),
        "p50_ms": round(percentile(values, 50), 2),
        "p95_ms": round(percentile(values, 95), 2),
        "p99_ms": round(percentile(values, 99), 2),
        "max_ms": round(max(values), 2),
        "mean_ms": round(statistics.fmean(values), 2),
    }


def run(args: argparse.Namespace) -> dict:
    client = ApiClient(args.base_url)
    prepare_user(client, args)

    try:
        if not args.skip_seed:
            print("Đang tạo dữ liệu đo 40 môn/120 thành phần...", flush=True)
            reset_seeded_data(client)
            courses, components = seed_dataset(client, args)
        else:
            courses = components = 0
            print("Bỏ qua bước tạo dữ liệu (--skip-seed).")

        semesters, _ = client.call("GET", "/semesters")
        courses = [
            course
            for semester in semesters
            for course in client.call(
                "GET", f"/semesters/{semester['id']}/courses"
            )[0]
        ]
        actual_courses = len(courses)
        if actual_courses == 0:
            raise SystemExit("Tài khoản perf chưa có môn học; bỏ --skip-seed để tạo dữ liệu.")
        if not components:
            components = sum(
                len(
                    client.call(
                        "GET", f"/courses/{course['id']}/grade-components"
                    )[0]["components"]
                )
                for course in courses
            )

        print("Warm-up 3 lượt...", flush=True)
        for _ in range(3):
            legacy_dashboard_load(client, {})
            optimized_dashboard_load(client, {})

        legacy_wall_ms: list[float] = []
        optimized_wall_ms: list[float] = []
        timings: dict[str, list[float]] = {}
        print(f"Đo {args.iterations} lượt...", flush=True)
        for _ in range(args.iterations):
            legacy_wall_ms.append(legacy_dashboard_load(client, timings))
            optimized_wall_ms.append(optimized_dashboard_load(client, timings))

        request_count = 3 + len(semesters) + actual_courses
        legacy_latencies = [
            value
            for category, values in timings.items()
            if category != "GET /learning-data"
            for value in values
        ]
        result = {
            "baseUrl": args.base_url,
            "dataset": {
                "semesters": len(semesters),
                "courses": actual_courses,
                "gradeComponents": components,
            },
            "iterations": args.iterations,
            "requestsPerDashboard": {
                "legacy": request_count,
                "optimized": 1,
            },
            "apiLatency": {
                "allLegacyRequests": summarize(legacy_latencies),
                "byEndpoint": {
                    category: summarize(values)
                    for category, values in sorted(timings.items())
                },
                "learningData": summarize(timings["GET /learning-data"]),
            },
            "dashboardDataLoad": {
                "legacy": summarize(legacy_wall_ms),
                "optimized": summarize(optimized_wall_ms),
            },
        }
        result["acceptance"] = {
            "apiP95Under500ms": result["apiLatency"]["allLegacyRequests"]["p95_ms"] < 500,
            "learningDataP95Under500ms": result["apiLatency"]["learningData"]["p95_ms"] < 500,
            "dashboardUnder2s": result["dashboardDataLoad"]["optimized"]["p95_ms"] < 2000,
        }
        result["performanceUserEmail"] = args.email
        return result
    finally:
        if not args.keep_data:
            try:
                reset_seeded_data(client)
                print("Đã xóa dữ liệu đo (dùng --keep-data để giữ lại).")
            except Exception as error:  # noqa: BLE001 - cleanup không được che lỗi đo
                print(f"Cảnh báo: không dọn được dữ liệu đo: {error}", file=sys.stderr)


def print_report(result: dict) -> None:
    print("\n=== PB-39 Dashboard benchmark ===")
    print(
        f"Dữ liệu: {result['dataset']['semesters']} học kỳ, "
        f"{result['dataset']['courses']} môn, "
        f"{result['dataset']['gradeComponents']} thành phần điểm"
    )
    print(
        f"Request/dashboard: cũ = {result['requestsPerDashboard']['legacy']}, "
        f"mới = {result['requestsPerDashboard']['optimized']}"
    )
    print("\nAPI latency (ms):")
    print(f"{'Endpoint':<38}{'p50':>9}{'p95':>9}{'p99':>9}{'max':>9}")
    for name, values in result["apiLatency"]["byEndpoint"].items():
        print(
            f"{name:<38}{values['p50_ms']:>9.2f}{values['p95_ms']:>9.2f}"
            f"{values['p99_ms']:>9.2f}{values['max_ms']:>9.2f}"
        )
    print("\nDashboard data load (ms):")
    for name, values in result["dashboardDataLoad"].items():
        print(
            f"{name:<12}p50={values['p50_ms']:.2f}  p95={values['p95_ms']:.2f}  "
            f"p99={values['p99_ms']:.2f}  max={values['max_ms']:.2f}"
        )
    print("\nĐạt NFR:", result["acceptance"])


def main() -> None:
    # Windows có thể mặc định cp1252 khi redirect log; tiếng Việt vẫn phải ghi được.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    args = parse_args()
    if args.iterations < 1:
        raise SystemExit("--iterations phải >= 1")
    result = run(args)
    print_report(result)
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as output:
            json.dump(result, output, ensure_ascii=False, indent=2)
        print(f"Đã ghi JSON: {args.json_out}")


if __name__ == "__main__":
    main()


