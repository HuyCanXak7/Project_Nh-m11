"""Kết nối database và cung cấp Session cho FastAPI."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy_utils import create_database, database_exists

from app.core.config import setting


DATABASE_URL = setting.DATABASE_URL

# Tiện cho môi trường học tập/local: tự tạo database nếu database chưa tồn tại.
if not database_exists(DATABASE_URL):
    create_database(DATABASE_URL)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Mỗi request sẽ lấy một Session từ SessionLocal.
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    """Mở Session cho request và luôn đóng Session khi request kết thúc."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Base(DeclarativeBase):
    """Lớp cha của tất cả ORM model."""


metadata = Base.metadata
