import os

import sqlalchemy as sa

from app.db.session import get_engine
from app.db.tables import users
from app.core.security import hash_password

DEMO_ACCOUNTS = (
    ("admin@example.com", "Quản trị viên mẫu", "ADMIN", "SEED_ADMIN_PASSWORD"),
    ("student@example.com", "Sinh viên mẫu", "STUDENT", "SEED_STUDENT_PASSWORD"),
)


def seed_accounts():
    accounts = []
    for email, full_name, role, variable in DEMO_ACCOUNTS:
        try:
            password_hash = hash_password(os.environ.get(variable, ""))
        except ValueError as error:
            raise ValueError(f"{variable}: {error}") from None
        accounts.append(dict(email=email, full_name=full_name, role=role, password_hash=password_hash))

    results = []
    with get_engine().begin() as connection:
        if connection.dialect.name == "sqlite":
            # Start the outer transaction before opening the first savepoint.
            connection.exec_driver_sql("BEGIN IMMEDIATE")
        for account in accounts:
            try:
                with connection.begin_nested():
                    connection.execute(users.insert().values(**account))
                results.append((account["email"], "Đã tạo"))
            except sa.exc.IntegrityError:
                existing_role = connection.scalar(
                    sa.select(users.c.role).where(users.c.email == account["email"]).with_for_update(read=True)
                )
                if existing_role is None:
                    raise
                if existing_role != account["role"]:
                    raise ValueError(f"Email {account['email']} đã được dùng cho vai trò khác.") from None
                results.append((account["email"], "Đã tồn tại"))
    return results


if __name__ == "__main__":
    try:
        results = seed_accounts()
    except ValueError as error:
        raise SystemExit(str(error)) from None
    except (KeyError, sa.exc.SQLAlchemyError):
        raise SystemExit("Không thể seed. Hãy kiểm tra DATABASE_URL và chạy migration trước.") from None
    for email, message in results:
        print(f"{message}: {email}")
