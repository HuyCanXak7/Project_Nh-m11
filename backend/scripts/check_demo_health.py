"""Kiểm tra nhanh healthcheck và luồng chính trước buổi bảo vệ (PB-45, PB-62).

Ví dụ:
    python backend/scripts/check_demo_health.py --base-url http://localhost:8000 --frontend-url http://localhost:8080
    python backend/scripts/check_demo_health.py --base-url https://your-production-domain --demo-email demo.student01@example.com --demo-password DemoNhom11@2026 --retry 12 --interval 5
"""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass
class CheckResult:
    name: str
    passed: bool
    status_code: int | None
    latency_ms: float
    detail: str


def _http_request(
    url: str,
    method: str = "GET",
    payload: dict | None = None,
    token: str | None = None,
    timeout: float = 10.0,
) -> tuple[int, bytes, float]:
    headers = {"Accept": "application/json"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = Request(url, data=data, headers=headers, method=method)
    start = time.perf_counter()
    try:
        with urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            elapsed = (time.perf_counter() - start) * 1000
            return resp.status, body, elapsed
    except HTTPError as err:
        body = err.read()
        elapsed = (time.perf_counter() - start) * 1000
        return err.code, body, elapsed


def check_health_with_retry(base_url: str, retries: int, interval: float, timeout: float) -> CheckResult:
    health_url = f"{base_url.rstrip('/')}/api/v1/health"
    last_error = "Không nhận được phản hồi."
    last_code: int | None = None
    last_ms = 0.0

    for attempt in range(1, max(1, retries) + 1):
        try:
            code, body, ms = _http_request(health_url, timeout=timeout)
            last_code, last_ms = code, ms
            if code == 200:
                parsed = json.loads(body.decode("utf-8"))
                data = parsed.get("data") or {}
                if parsed.get("success") is True and data.get("status") == "ok" and data.get("database") == "ok":
                    slo_note = "đạt <500ms" if ms < 500 else "chậm (>500ms)"
                    return CheckResult(
                        name="Backend Healthcheck (/api/v1/health)",
                        passed=True,
                        status_code=code,
                        latency_ms=round(ms, 1),
                        detail=f"DB=ok, version={data.get('version', 'n/a')}, {ms:.1f}ms ({slo_note})",
                    )
                last_error = f"Payload không hợp lệ: {parsed}"
            else:
                last_error = f"HTTP {code}: {body.decode('utf-8', errors='replace')[:180]}"
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = str(exc)

        if attempt < retries:
            time.sleep(interval)

    return CheckResult(
        name="Backend Healthcheck (/api/v1/health)",
        passed=False,
        status_code=last_code,
        latency_ms=round(last_ms, 1),
        detail=last_error,
    )


def check_openapi(base_url: str, timeout: float) -> CheckResult:
    url = f"{base_url.rstrip('/')}/openapi.json"
    try:
        code, body, ms = _http_request(url, timeout=timeout)
        if code != 200:
            return CheckResult("Swagger OpenAPI (/openapi.json)", False, code, round(ms, 1), f"HTTP {code}")
        doc = json.loads(body.decode("utf-8"))
        paths = doc.get("paths") or {}
        required = ("/api/v1/health", "/api/v1/auth/login", "/api/v1/semesters", "/api/v1/gpa/cumulative", "/api/v1/grade-scale")
        missing = [p for p in required if p not in paths]
        if missing:
            return CheckResult("Swagger OpenAPI (/openapi.json)", False, code, round(ms, 1), f"Thiếu route: {missing}")
        return CheckResult("Swagger OpenAPI (/openapi.json)", True, code, round(ms, 1), f"{len(paths)} routes sẵn sàng")
    except Exception as exc:
        return CheckResult("Swagger OpenAPI (/openapi.json)", False, None, 0.0, str(exc))


def check_grade_scale(base_url: str, timeout: float) -> CheckResult:
    url = f"{base_url.rstrip('/')}/api/v1/grade-scale"
    try:
        code, body, ms = _http_request(url, timeout=timeout)
        if code != 200:
            return CheckResult("Thang điểm (/api/v1/grade-scale)", False, code, round(ms, 1), f"HTTP {code}")
        parsed = json.loads(body.decode("utf-8"))
        items = parsed.get("data") or []
        passed = parsed.get("success") is True and len(items) >= 8
        return CheckResult(
            "Thang điểm (/api/v1/grade-scale)",
            passed,
            code,
            round(ms, 1),
            f"{len(items)} bậc quy đổi (Thông tư 08)",
        )
    except Exception as exc:
        return CheckResult("Thang điểm (/api/v1/grade-scale)", False, None, 0.0, str(exc))


def check_frontend(frontend_url: str, timeout: float) -> list[CheckResult]:
    results: list[CheckResult] = []
    base = frontend_url.rstrip("/")
    for label, path in (("Frontend Login", "/"), ("Frontend Dashboard", "/pages/dashboard.html")):
        try:
            code, body, ms = _http_request(f"{base}{path}", timeout=timeout)
            ok = code == 200 and len(body) > 200
            results.append(CheckResult(label, ok, code, round(ms, 1), f"{len(body)} bytes, {ms:.1f}ms"))
        except Exception as exc:
            results.append(CheckResult(label, False, None, 0.0, str(exc)))
    return results


def check_demo_account_flow(base_url: str, email: str, password: str, timeout: float) -> list[CheckResult]:
    results: list[CheckResult] = []
    api = f"{base_url.rstrip('/')}/api/v1"

    try:
        code, body, ms = _http_request(
            f"{api}/auth/login",
            method="POST",
            payload={"email": email, "password": password},
            timeout=timeout,
        )
        if code != 200:
            results.append(CheckResult("Demo Login", False, code, round(ms, 1), f"Đăng nhập thất bại HTTP {code}"))
            return results
        tokens = json.loads(body.decode("utf-8"))["data"]
        access = tokens["accessToken"]
        refresh = tokens["refreshToken"]
        results.append(CheckResult("Demo Login", True, code, round(ms, 1), f"Đăng nhập thành công ({email})"))
    except Exception as exc:
        results.append(CheckResult("Demo Login", False, None, 0.0, str(exc)))
        return results

    try:
        code, body, ms = _http_request(f"{api}/auth/me", token=access, timeout=timeout)
        ok = code == 200 and json.loads(body.decode("utf-8"))["data"]["email"] == email
        results.append(CheckResult("Demo /auth/me", ok, code, round(ms, 1), f"Xác thực phiên cho {email}"))

        code, body, ms = _http_request(f"{api}/semesters", token=access, timeout=timeout)
        sems = json.loads(body.decode("utf-8")).get("data") or [] if code == 200 else []
        results.append(CheckResult("Demo /semesters", code == 200 and len(sems) > 0, code, round(ms, 1), f"{len(sems)} học kỳ"))

        code, body, ms = _http_request(f"{api}/gpa/cumulative", token=access, timeout=timeout)
        gpa_data = json.loads(body.decode("utf-8")).get("data") or {} if code == 200 else {}
        results.append(
            CheckResult(
                "Demo /gpa/cumulative",
                code == 200 and gpa_data.get("gpa4") is not None,
                code,
                round(ms, 1),
                f"GPA={gpa_data.get('gpa4')}, TC đạt={gpa_data.get('passedCredits')}, Xếp loại={gpa_data.get('ranking')}",
            )
        )
    finally:
        # Thu hồi phiên ngay sau kiểm tra để giữ DB sạch.
        try:
            code, _, ms = _http_request(
                f"{api}/auth/logout",
                method="POST",
                payload={"refreshToken": refresh},
                token=access,
                timeout=timeout,
            )
            results.append(CheckResult("Demo Logout (dọn phiên)", code == 200, code, round(ms, 1), "Đã thu hồi refreshToken"))
        except Exception as exc:
            results.append(CheckResult("Demo Logout (dọn phiên)", False, None, 0.0, str(exc)))

    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Healthcheck và smoke test trước giờ bảo vệ (PB-45, PB-62).")
    parser.add_argument("--base-url", required=True, help="URL gốc Backend (vd: http://localhost:8000 hoặc https://domain)")
    parser.add_argument("--frontend-url", default=None, help="URL gốc Frontend (nếu tách riêng cổng, vd: http://localhost:8080)")
    parser.add_argument("--demo-email", default=None, help="Email tài khoản demo cần smoke test đăng nhập")
    parser.add_argument("--demo-password", default=None, help="Mật khẩu tài khoản demo")
    parser.add_argument("--retry", type=int, default=1, help="Số lần thử healthcheck (dùng 12-18 nếu server có cold-start)")
    parser.add_argument("--interval", type=float, default=5.0, help="Thời gian chờ giữa mỗi lần thử (giây)")
    parser.add_argument("--timeout", type=float, default=10.0, help="Timeout mỗi request (giây)")
    parser.add_argument("--json", action="store_true", dest="as_json", help="Xuất kết quả dạng JSON")
    args = parser.parse_args()

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    results: list[CheckResult] = [
        check_health_with_retry(args.base_url, args.retry, args.interval, args.timeout),
        check_openapi(args.base_url, args.timeout),
        check_grade_scale(args.base_url, args.timeout),
    ]
    if args.frontend_url:
        results.extend(check_frontend(args.frontend_url, args.timeout))
    if args.demo_email and args.demo_password:
        results.extend(check_demo_account_flow(args.base_url, args.demo_email, args.demo_password, args.timeout))

    all_passed = all(r.passed for r in results)

    if args.as_json:
        print(json.dumps({"allPassed": all_passed, "checks": [asdict(r) for r in results]}, ensure_ascii=False, indent=2))
    else:
        print("=== KẾT QUẢ KIỂM TRA SỨC KHỎE HỆ THỐNG (PB-45 / PB-62) ===")
        for r in results:
            tag = "[PASS]" if r.passed else "[FAIL]"
            print(f"{tag} {r.name} | HTTP {r.status_code} | {r.latency_ms:.1f}ms | {r.detail}")
        print(f"=== TỔNG KẾT: {sum(r.passed for r in results)}/{len(results)} ĐẠT ===")

    return 0 if all_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
