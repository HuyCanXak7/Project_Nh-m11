"""Use an isolated migrated DB, never the developer's configured application DB."""

import os
from pathlib import Path
from secrets import token_urlsafe
from tempfile import TemporaryDirectory

import pytest

_directory = TemporaryDirectory()
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "sqlite:///" + (Path(_directory.name) / "tests.db").as_posix())
os.environ["SECRET_KEY"] = token_urlsafe(32)


@pytest.fixture(scope="session", autouse=True)
def migrated_database():
    from alembic import command
    from alembic.config import Config
    from app.db.database import engine

    command.upgrade(Config(str(Path(__file__).resolve().parents[1] / "alembic.ini")), "head")
    yield
    engine.dispose()
    _directory.cleanup()


@pytest.fixture(autouse=True)
def reset_login_rate_limit():
    from app.services.auth import login_attempts
    login_attempts.clear()
