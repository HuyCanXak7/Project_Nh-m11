"""PB-53: E2E luồng chính trên trình duyệt thật.

Đăng nhập → tạo học kỳ → thêm môn → cấu hình thành phần → nhập điểm → thấy GPA trên Dashboard.
Tự khởi động backend (SQLite tạm, cổng ngẫu nhiên) và server tĩnh cho frontend,
nên không đụng tới DB hay backend dev đang chạy ở cổng 8000.
"""

import json
import os
import re
import secrets
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pytest
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RESULTS = Path(__file__).parent / "results"
PASSWORD = "e2e-password-123"


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def wait_until_up(url: str, process: subprocess.Popen) -> None:
    for _ in range(60):
        if process.poll() is not None:
            raise RuntimeError(f"Server dừng sớm: {url}")
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except OSError:
            time.sleep(0.5)
    raise RuntimeError(f"Server không lên: {url}")


@pytest.fixture(scope="module")
def servers(tmp_path_factory):
    api_port, web_port = free_port(), free_port()
    web = f"http://127.0.0.1:{web_port}"
    env = {
        **os.environ,
        "DATABASE_URL": f"sqlite:///{tmp_path_factory.mktemp('db') / 'e2e.db'}",
        "SECRET_KEY": secrets.token_urlsafe(48),
        "FRONTEND_ORIGIN": web,
    }
    api_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(api_port)],
        cwd=ROOT / "backend", env=env, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
    )
    web_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(web_port), "--bind", "127.0.0.1", "--directory", str(ROOT / "frontend")],
        stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
    )
    try:
        api = f"http://127.0.0.1:{api_port}"
        wait_until_up(f"{api}/openapi.json", api_proc)
        wait_until_up(f"{web}/index.html", web_proc)
        yield api, web
    finally:
        api_proc.terminate()
        web_proc.terminate()


@pytest.fixture
def page(servers):
    RESULTS.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=os.getenv("HEADED") != "1")
        page = browser.new_page()
        # FE gọi API ở cổng 8000 cùng host với trang → chuyển sang backend của test
        page.route(
            "http://127.0.0.1:8000/**",
            lambda route: route.continue_(url=route.request.url.replace("http://127.0.0.1:8000", servers[0])),
        )
        yield page
        page.screenshot(path=RESULTS / "last_page.png", full_page=True)
        browser.close()


def register(api: str) -> str:
    email = f"e2e.{secrets.token_hex(4)}@example.com"
    request = urllib.request.Request(
        f"{api}/api/v1/auth/register",
        data=json.dumps({"email": email, "full_name": "Sinh viên E2E", "password": PASSWORD}).encode(),
        headers={"Content-Type": "application/json"},
    )
    assert urllib.request.urlopen(request).status == 201
    return email


def step(message: str) -> None:
    print(f"  ✔ {message}", flush=True)


def test_main_flow_shows_gpa_on_dashboard(servers, page):
    api, web = servers
    email = register(api)

    page.goto(f"{web}/index.html")
    page.fill("#loginEmail", email)
    page.fill("#loginPassword", PASSWORD)
    page.click("#loginForm button[type=submit]")
    page.click(".modal__btn")  # "Tiếp tục" trên hộp thoại đăng nhập thành công
    expect(page).to_have_url(re.compile(r"/pages/dashboard\.html$"))
    step(f"Đăng nhập: {email}")

    page.goto(f"{web}/pages/semesters.html")
    page.locator('[onclick="openCreateSemesterModal()"]').first.click()
    page.fill("#semNameInput", "Học kỳ E2E")
    page.fill("#semYearInput", "2025-2026")
    page.fill("#semStartInput", "2025-09-01")
    page.fill("#semEndInput", "2026-01-15")
    page.click("#semesterModal button[type=submit]")
    expect(page.locator("#semesterGrid")).to_contain_text("Học kỳ E2E")
    step("Tạo học kỳ: Học kỳ E2E (2025-2026)")

    page.goto(f"{web}/pages/courses.html")
    page.locator('[onclick="openCreateCourseModal()"]').first.click()
    page.fill("#courseCodeInput", "E2E101")
    page.fill("#courseNameInput", "Kiểm thử tự động")
    page.select_option("#courseSemSelect", label="Học kỳ E2E (2025-2026)")
    page.fill("#courseCreditsInput", "3")
    page.click("#courseModal button[type=submit]")
    expect(page.locator("#courseTableBody")).to_contain_text("E2E101")
    step("Thêm môn: E2E101 - Kiểm thử tự động (3 TC)")

    # Môn mới có sẵn Chuyên cần 10 / Giữa kỳ 30 / Cuối kỳ 60 → đổi thành Giữa kỳ 40 / Cuối kỳ 60
    page.locator('button[onclick^="openComponentsModal"]').first.click()
    page.locator("#componentsModal .component-row").first.locator("button").click()
    page.locator("#componentsModal .comp-weight").first.fill("40")
    page.click("#btnSaveComponents")
    expect(page.locator("#componentsModal")).to_be_hidden()
    step("Cấu hình thành phần: Giữa kỳ 40% + Cuối kỳ 60%")

    page.locator('button[onclick^="openScoreModal"]').first.click()
    page.locator("#scoreModal .score-input-val").nth(0).fill("7")
    page.locator("#scoreModal .score-input-val").nth(1).fill("7.5")
    page.click('#scoreModal button[onclick="handleSaveScores()"]')
    expect(page.locator("#scoreModal")).to_be_hidden()
    step("Nhập điểm: Giữa kỳ 7.0, Cuối kỳ 7.5 → điểm môn 7.3 (B)")

    page.goto(f"{web}/pages/dashboard.html")
    expect(page.locator("#statGpa")).to_have_text("3.00")  # B = 3.0 hệ 4
    page.screenshot(path=RESULTS / "dashboard.png", full_page=True)
    step("Dashboard hiển thị GPA tích lũy 3.00")
