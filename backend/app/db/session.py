"""Đường import ngắn cho dependency Session trong các router FastAPI."""

from app.db.database import SessionLocal, get_db

__all__ = ["SessionLocal", "get_db"]
