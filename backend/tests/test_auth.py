import os
import unittest
from pathlib import Path
from secrets import token_urlsafe
from tempfile import TemporaryDirectory
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.db.session import get_engine
from app.main import app
from app.services.auth_service import login_attempts
from scripts.seed_accounts import seed_accounts


class AuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        directory = cls.enterClassContext(TemporaryDirectory())
        cls.password = token_urlsafe(16)
        cls.enterClassContext(patch.dict(os.environ, {
            "DATABASE_URL": "sqlite:///" + (Path(directory) / "auth.db").as_posix(),
            "JWT_SECRET": token_urlsafe(32),
            "SEED_ADMIN_PASSWORD": token_urlsafe(16),
            "SEED_STUDENT_PASSWORD": cls.password,
        }))
        get_engine.cache_clear()
        engine = get_engine()
        cls.addClassCleanup(get_engine.cache_clear)
        cls.addClassCleanup(engine.dispose)
        command.upgrade(Config(str(Path(__file__).resolve().parents[1] / "alembic.ini")), "head")
        seed_accounts()
        cls.client = cls.enterClassContext(TestClient(app))

    def setUp(self):
        login_attempts.clear()

    def test_login_refresh_logout_lifecycle(self):
        login = self.client.post("/api/v1/auth/login", json={
            "email": "student@example.com", "password": self.password,
        })
        self.assertEqual(login.status_code, 200)
        tokens = login.json()["data"]
        headers = {"Authorization": "Bearer " + tokens["accessToken"]}
        me = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["data"]["role"], "STUDENT")

        refreshed = self.client.post("/api/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]})
        self.assertEqual(refreshed.status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/me", headers=headers).status_code, 401)
        self.assertEqual(self.client.post("/api/v1/auth/refresh", json={
            "refreshToken": tokens["refreshToken"],
        }).status_code, 401)

        new_tokens = refreshed.json()["data"]
        new_headers = {"Authorization": "Bearer " + new_tokens["accessToken"]}
        self.assertEqual(self.client.get("/api/v1/auth/me", headers=new_headers).status_code, 200)
        logout = self.client.post("/api/v1/auth/logout", json={"refreshToken": new_tokens["refreshToken"]})
        self.assertEqual(logout.status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/me", headers=new_headers).status_code, 401)

    def test_errors_keep_response_format(self):
        invalid = self.client.post("/api/v1/auth/login", json={"email": ""})
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(invalid.json()["error"]["code"], "VALIDATION_ERROR")
        failed = self.client.post("/api/v1/auth/login", json={
            "email": "student@example.com", "password": "wrong-password",
        })
        self.assertEqual(failed.status_code, 401)
        self.assertEqual(failed.json()["error"]["code"], "INVALID_CREDENTIALS")

    def test_seed_is_repeatable(self):
        self.assertEqual(seed_accounts(), [
            ("admin@example.com", "Đã tồn tại"),
            ("student@example.com", "Đã tồn tại"),
        ])
