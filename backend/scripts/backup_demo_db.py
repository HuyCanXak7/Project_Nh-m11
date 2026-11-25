"""Sao lưu và khôi phục dữ liệu DB demo (PB-45, PB-59).

Hỗ trợ hai chế độ:
1. `--mode live`: xuất dữ liệu hiện có từ DATABASE_URL (MySQL 8 hoặc SQLite) ra file SQL.
2. `--mode clean-demo`: dựng DB tạm sạch qua Alembic + seed_accounts + reset_demo_data
   rồi xuất bản snapshot SQL chuẩn dùng làm backup dự phòng v1.0.0.
3. `--restore <file.sql>`: khôi phục file SQL vào DATABASE_URL (dùng khi máy không có mysql CLI).
"""

from __future__ import annotations

import argparse
from datetime import date, datetime
from decimal import Decimal
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from sqlalchemy import create_engine, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
DEFAULT_BACKUP_PATH = REPO_ROOT / "backups" / "demo_db_backup_v1.0.0.sql"

# Thứ tự bảng theo quan hệ khóa ngoại (cha -> con khi INSERT, con -> cha khi DELETE).
TABLES_IN_ORDER = (
    (
        "grade_scale",
        ("id", "min_score", "max_score", "letter", "gpa4"),
    ),
    (
        "users",
        (
            "id",
            "email",
            "full_name",
            "password_hash",
            "student_code",
            "major",
            "role",
            "is_active",
            "created_at",
        ),
    ),
    (
        "semesters",
        ("id", "user_id", "name", "academic_year", "start_date", "end_date"),
    ),
    (
        "courses",
        (
            "id",
            "semester_id",
            "code",
            "name",
            "credits",
            "category",
            "is_retake",
            "grade10",
            "grade4",
        ),
    ),
    (
        "grade_components",
        ("id", "course_id", "name", "weight_percent", "score"),
    ),
    (
        "goals",
        ("id", "user_id", "target_gpa", "target_date", "remaining_credits"),
    ),
)


def _sql_literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, Decimal)):
        return str(value)
    if isinstance(value, float):
        return f"{value:.4f}".rstrip("0").rstrip(".") or "0"
    if isinstance(value, datetime):
        return "'" + value.strftime("%Y-%m-%d %H:%M:%S") + "'"
    if isinstance(value, date):
        return "'" + value.isoformat() + "'"
    escaped = str(value).replace("\\", "\\\\").replace("'", "''")
    return f"'{escaped}'"


def export_database_to_sql(database_url: str, output_path: Path, label: str) -> dict[str, int]:
    """Xuất toàn bộ bảng nghiệp vụ (trừ auth_sessions) ra file SQL tương thích MySQL 8."""
    engine = create_engine(database_url, pool_pre_ping=True)
    counts: dict[str, int] = {}
    lines: list[str] = [
        "-- =============================================================================",
        "-- Bản sao lưu CSDL Demo — Hệ thống Quản lý Chỉ số Học tập (Nhóm 11 - StudyLIMS)",
        f"-- Nhãn snapshot : {label}",
        f"-- Thời điểm xuất: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "-- Phiên bản     : v1.0.0 (tương thích MySQL 8.0 & Alembic head 0007_audit_logs)",
        "-- Lưu ý         : Không chứa auth_sessions/audit_logs; mật khẩu đã được băm bcrypt.",
        "-- =============================================================================",
        "",
        "SET NAMES utf8mb4;",
        "SET FOREIGN_KEY_CHECKS = 0;",
        "START TRANSACTION;",
        "",
        "-- Dọn dữ liệu cũ theo thứ tự khóa ngoại (bảng con -> bảng cha)",
        "DELETE FROM audit_logs;",
        "DELETE FROM auth_sessions;",
    ]

    for table_name, _ in reversed(TABLES_IN_ORDER):
        lines.append(f"DELETE FROM {table_name};")
    lines.append("")

    with engine.connect() as conn:
        for table_name, columns in TABLES_IN_ORDER:
            cols_sql = ", ".join(columns)
            rows = conn.execute(text(f"SELECT {cols_sql} FROM {table_name} ORDER BY id")).fetchall()
            counts[table_name] = len(rows)
            lines.append(f"-- Bảng {table_name} ({len(rows)} bản ghi)")
            for row in rows:
                values_sql = ", ".join(_sql_literal(v) for v in row)
                lines.append(f"INSERT INTO {table_name} ({cols_sql}) VALUES ({values_sql});")
            lines.append("")

    lines.extend(
        [
            "COMMIT;",
            "SET FOREIGN_KEY_CHECKS = 1;",
            "",
        ]
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")
    engine.dispose()
    return counts


def _parse_sql_statements(sql_text: str, dialect: str) -> list[str]:
    statements: list[str] = []
    for raw_line in sql_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("--"):
            continue
        upper = line.upper()
        if dialect == "sqlite":
            if upper.startswith(("SET ", "START TRANSACTION", "COMMIT")):
                continue
        statements.append(line.rstrip(";"))
    return statements


def restore_sql_to_database(sql_path: Path, database_url: str) -> dict[str, int]:
    """Khôi phục file SQL vào database mục tiêu và trả về số lượng bản ghi từng bảng."""
    sql_text = sql_path.read_text(encoding="utf-8")
    engine = create_engine(database_url, pool_pre_ping=True)
    dialect = engine.dialect.name
    statements = _parse_sql_statements(sql_text, dialect)

    with engine.begin() as conn:
        if dialect == "sqlite":
            conn.execute(text("PRAGMA foreign_keys = OFF"))
        for stmt in statements:
            conn.execute(text(stmt))
        if dialect == "sqlite":
            conn.execute(text("PRAGMA foreign_keys = ON"))

        counts: dict[str, int] = {}
        for table_name, _ in TABLES_IN_ORDER:
            counts[table_name] = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar_one()

    engine.dispose()
    return counts


def generate_clean_demo_backup(output_path: Path) -> tuple[dict[str, int], dict[str, int]]:
    """Tạo DB tạm sạch bằng Alembic + seed_accounts + reset_demo_data, xuất SQL và kiểm chứng restore."""
    demo_admin_pw = os.getenv("SEED_ADMIN_PASSWORD") or "AdminNhom11@2026"
    demo_student_pw = os.getenv("SEED_STUDENT_PASSWORD") or "StudentNhom11@2026"
    demo_reset_pw = os.getenv("SEED_DEMO_PASSWORD") or "DemoNhom11@2026"

    with tempfile.TemporaryDirectory(prefix="studylims_backup_") as tmp_dir:
        source_db = Path(tmp_dir) / "source_demo.db"
        verify_db = Path(tmp_dir) / "verify_restore.db"
        source_url = f"sqlite:///{source_db.as_posix()}"
        verify_url = f"sqlite:///{verify_db.as_posix()}"

        env = os.environ.copy()
        env.update(
            {
                "PYTHONPATH": str(BACKEND_DIR),
                "DATABASE_URL": source_url,
                "SECRET_KEY": "clean-demo-backup-temporary-signing-key-32b",
                "SEED_ADMIN_PASSWORD": demo_admin_pw,
                "SEED_STUDENT_PASSWORD": demo_student_pw,
                "SEED_DEMO_PASSWORD": demo_reset_pw,
            }
        )

        # 1. Chạy Alembic migration lên head + seed tài khoản + reset dữ liệu demo PB-59
        for cmd in (
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            [sys.executable, "-m", "scripts.seed_accounts"],
            [sys.executable, "-m", "scripts.reset_demo_data"],
        ):
            subprocess.run(cmd, cwd=BACKEND_DIR, env=env, check=True)

        # 2. Xuất file SQL backup
        exported_counts = export_database_to_sql(
            source_url, output_path, label="PB-45 + PB-48 + PB-59 Clean Demo Snapshot"
        )

        # 3. Kiểm chứng restore vào một DB hoàn toàn mới sau Alembic upgrade head
        verify_env = env.copy()
        verify_env["DATABASE_URL"] = verify_url
        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=BACKEND_DIR,
            env=verify_env,
            check=True,
        )
        restored_counts = restore_sql_to_database(output_path, verify_url)

    if exported_counts != restored_counts:
        raise RuntimeError(
            f"Kiểm chứng restore không khớp! Export={exported_counts}, Restore={restored_counts}"
        )
    return exported_counts, restored_counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Sao lưu / khôi phục CSDL demo StudyLIMS (PB-45).")
    parser.add_argument(
        "--mode",
        choices=("clean-demo", "live", "restore"),
        default="clean-demo",
        help="clean-demo: tạo snapshot demo sạch | live: xuất từ DATABASE_URL | restore: nạp file SQL vào DATABASE_URL",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_BACKUP_PATH,
        help=f"Đường dẫn file SQL backup (mặc định: {DEFAULT_BACKUP_PATH})",
    )
    parser.add_argument(
        "--database-url",
        default=None,
        help="Ghi đè DATABASE_URL khi chạy --mode live hoặc --mode restore",
    )
    args = parser.parse_args()

    if args.mode == "clean-demo":
        exported, restored = generate_clean_demo_backup(args.output)
        print(f"Đã tạo và kiểm chứng bản backup DB demo tại: {args.output}")
        print(json.dumps({"exported": exported, "verifiedRestore": restored}, ensure_ascii=False, indent=2))
        return 0

    database_url = args.database_url or os.getenv("DATABASE_URL")
    if not database_url:
        from app.core.config import setting

        database_url = setting.DATABASE_URL

    if args.mode == "live":
        counts = export_database_to_sql(database_url, args.output, label="Live Database Backup")
        print(f"Đã xuất backup từ CSDL hiện tại ra: {args.output}")
        print(json.dumps(counts, ensure_ascii=False, indent=2))
        return 0

    counts = restore_sql_to_database(args.output, database_url)
    print(f"Đã khôi phục dữ liệu từ {args.output} thành công.")
    print(json.dumps(counts, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
