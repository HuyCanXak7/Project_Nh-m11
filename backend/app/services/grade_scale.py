"""Nghiệp vụ đọc và áp dụng bảng quy đổi điểm theo PB-17."""

from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import GradeScale


# Bảng mặc định được chốt trong SRS; chỉ dùng khi database chưa có dữ liệu.
DEFAULT_GRADE_SCALE = (
    (Decimal("8.5"), Decimal("10.0"), "A", Decimal("4.0")),
    (Decimal("8.0"), Decimal("8.4"), "B+", Decimal("3.5")),
    (Decimal("7.0"), Decimal("7.9"), "B", Decimal("3.0")),
    (Decimal("6.5"), Decimal("6.9"), "C+", Decimal("2.5")),
    (Decimal("5.5"), Decimal("6.4"), "C", Decimal("2.0")),
    (Decimal("5.0"), Decimal("5.4"), "D+", Decimal("1.5")),
    (Decimal("4.0"), Decimal("4.9"), "D", Decimal("1.0")),
    (Decimal("0.0"), Decimal("3.9"), "F", Decimal("0.0")),
)


def ensure_default_grade_scale(db: Session) -> None:
    """Tạo bảng quy đổi mặc định khi chạy database local chưa qua migration."""
    if db.query(GradeScale).count() > 0:
        return

    db.add_all(
        [
            GradeScale(
                min_score=min_score,
                max_score=max_score,
                letter=letter,
                gpa4=gpa4,
            )
            for min_score, max_score, letter, gpa4 in DEFAULT_GRADE_SCALE
        ]
    )
    # SessionLocal tắt autoflush nên cần flush trước khi truy vấn quy đổi.
    db.flush()


def get_grade_scale(db: Session) -> list[GradeScale]:
    """Trả bảng quy đổi theo thứ tự điểm cao xuống thấp cho frontend."""
    ensure_default_grade_scale(db)
    db.commit()
    return db.query(GradeScale).order_by(GradeScale.min_score.desc()).all()


def convert_grade(db: Session, grade10: Decimal) -> dict:
    """Đọc database để quy đổi một điểm hệ 10 sang chữ, hệ 4 và trạng thái."""
    ensure_default_grade_scale(db)
    scale = (
        db.query(GradeScale)
        .filter(
            GradeScale.min_score <= grade10,
            GradeScale.max_score >= grade10,
        )
        .first()
    )
    if scale is None:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "GRADE_SCALE_NOT_CONFIGURED",
                "message": "Bảng quy đổi điểm chưa bao phủ điểm cần tính.",
            },
        )

    return {
        "letterGrade": scale.letter,
        "grade4": float(scale.gpa4),
        "isPassed": grade10 >= Decimal("4.0"),
    }
