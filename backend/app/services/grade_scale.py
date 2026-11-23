"""Nghiệp vụ đọc và áp dụng bảng quy đổi điểm theo PB-17."""

from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Course, GradeScale
from app.schemas.grade_scale import GradeScaleItem


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


STEP = Decimal("0.1")  # điểm môn được làm tròn 1 chữ số thập phân


def scale_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=400, detail={"code": "INVALID_GRADE_SCALE", "message": message}
    )


def replace_grade_scale(db: Session, items: list[GradeScaleItem]) -> list[GradeScale]:
    """PB-32: kiểm tra bảng mới phủ kín 0.0–10.0, không chồng lấn rồi thay bảng cũ."""
    rows = sorted(items, key=lambda item: item.min_score)
    letters = [row.letter for row in rows]
    if len(set(letters)) != len(letters):
        raise scale_error("Điểm chữ bị trùng.")
    if rows[0].min_score != 0 or rows[-1].max_score != 10:
        raise scale_error("Bảng quy đổi phải bao phủ từ 0.0 đến 10.0.")
    for prev, cur in zip(rows, rows[1:]):
        if cur.min_score <= prev.max_score:
            raise scale_error(f"Khoảng {prev.letter} và {cur.letter} bị chồng lấn.")
        if cur.min_score != prev.max_score + STEP:
            raise scale_error(f"Có khoảng trống giữa {prev.letter} và {cur.letter}.")

    db.query(GradeScale).delete()
    db.flush()  # xóa trước để không vướng unique(letter) khi thêm lại
    db.add_all(
        GradeScale(min_score=r.min_score, max_score=r.max_score, letter=r.letter, gpa4=r.gpa4)
        for r in rows
    )
    # GPA đọc grade4 đã lưu ở môn → quy đổi lại để lần tính tiếp theo dùng bảng mới
    for course in db.query(Course).filter(Course.grade10.is_not(None)):
        course.grade4 = max(
            (r for r in rows if r.min_score <= course.grade10), key=lambda r: r.min_score
        ).gpa4
    db.commit()
    return get_grade_scale(db)
