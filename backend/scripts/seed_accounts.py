"""Tạo tài khoản demo bằng ORM Session thay vì thao tác SQL trực tiếp."""

import os

from sqlalchemy.exc import SQLAlchemyError

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models import User

DEMO_ACCOUNTS = (
    ("admin@example.com", "Quản trị viên mẫu", "ADMIN", "SEED_ADMIN_PASSWORD"),
    ("student@example.com", "Sinh viên mẫu", "STUDENT", "SEED_STUDENT_PASSWORD"),
)


def seed_accounts():
    db = SessionLocal()
    results = []
    try:
        for email, full_name, role, password_variable in DEMO_ACCOUNTS:
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                if existing_user.role != role:
                    raise ValueError(f"Email {email} đã được dùng cho vai trò khác.")
                results.append((email, "Đã tồn tại"))
                continue

            password = os.getenv(password_variable, "")
            user = User(
                email=email,
                full_name=full_name,
                role=role,
                password_hash=hash_password(password),
            )
            db.add(user)
            results.append((email, "Đã tạo"))

        db.commit()
        return results
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    try:
        seed_results = seed_accounts()
    except ValueError as error:
        raise SystemExit(str(error)) from None
    except SQLAlchemyError:
        raise SystemExit(
            "Không thể seed. Hãy kiểm tra DATABASE_URL và chạy migration trước."
        ) from None

    for account_email, message in seed_results:
        print(f"{message}: {account_email}")
