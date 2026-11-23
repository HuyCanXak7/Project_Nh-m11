"""Nghiệp vụ đọc, cập nhật và áp dụng bảng quy đổi điểm theo PB-17."""

from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Course, GradeScale
from app.schemas.grade_scale import GradeScaleUpdate


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

SCORE_STEP = Decimal("0.1")


def grade_scale_error(details: list[dict]) -> HTTPException:
    """Trả lỗi 400 kèm danh sách lỗi theo từng dòng để FE hiển thị cạnh bảng."""
    return HTTPException(
        status_code=400,
        detail={
            "code": "INVALID_GRADE_SCALE",
            "message": "Bảng quy đổi điểm không hợp lệ.",
            "details": details,
        },
    )


def validate_grade_scale(data: GradeScaleUpdate) -> list[dict]:
    """Kiểm tra thứ tự, tính liên tục và độ phủ kín 0.0–10.0 của bảng mới."""
    details: list[dict] = []
    normalized: list[dict] = []
    seen_letters: set[str] = set()

    for index, item in enumerate(data.items):
        prefix = f"items.{index}"
        letter = item.letter.strip().upper()
        if not letter:
            details.append(
                {"field": f"{prefix}.letter", "reason": "Điểm chữ không được để trống."}
            )
        elif letter in seen_letters:
            details.append(
                {
                    "field": f"{prefix}.letter",
                    "reason": f"Điểm chữ {letter} bị trùng trong bảng quy đổi.",
                }
            )
        else:
            seen_letters.add(letter)

        if item.min_score > item.max_score:
            details.append(
                {
                    "field": f"{prefix}.minScore",
                    "reason": "Điểm bắt đầu không được lớn hơn điểm kết thúc.",
                }
            )

        normalized.append(
            {
                "index": index,
                "letter": letter,
                "min_score": item.min_score,
                "max_score": item.max_score,
                "gpa4": item.gpa4,
            }
        )

    normalized.sort(key=lambda item: item["min_score"])
    first = normalized[0]
    last = normalized[-1]
    if first["min_score"] != Decimal("0.0"):
        details.append(
            {
                "field": f"items.{first['index']}.minScore",
                "reason": "Khoảng thấp nhất phải bắt đầu từ 0.0.",
            }
        )
    if last["max_score"] != Decimal("10.0"):
        details.append(
            {
                "field": f"items.{last['index']}.maxScore",
                "reason": "Khoảng cao nhất phải kết thúc tại 10.0.",
            }
        )

    for previous, current in zip(normalized, normalized[1:]):
        expected_min = previous["max_score"] + SCORE_STEP
        if current["min_score"] != expected_min:
            details.append(
                {
                    "field": f"items.{current['index']}.minScore",
                    "reason": (
                        f"Khoảng phải nối tiếp mốc {expected_min}; "
                        "không được chồng lấn hoặc để trống."
                    ),
                }
            )

    if details:
        raise grade_scale_error(details)
    return normalized


def replace_grade_scale(db: Session, data: GradeScaleUpdate) -> list[GradeScale]:
    """Thay toàn bộ bảng quy đổi và tính lại điểm hệ 4 đã lưu của mọi môn."""
    items = validate_grade_scale(data)

    for scale in db.query(GradeScale).all():
        db.delete(scale)
    db.flush()

    db.add_all(
        [
            GradeScale(
                min_score=item["min_score"],
                max_score=item["max_score"],
                letter=item["letter"],
                gpa4=item["gpa4"],
            )
            for item in items
        ]
    )
    db.flush()

    # Điểm hệ 10 không đổi, nhưng điểm hệ 4 phụ thuộc bảng mới nên phải đồng bộ
    # để GPA không tiếp tục dùng kết quả quy đổi của bảng cũ.
    for course in db.query(Course).filter(Course.grade10.is_not(None)).all():
        conversion = convert_grade(db, course.grade10)
        course.grade4 = Decimal(str(conversion["grade4"]))

    db.commit()
    return (
        db.query(GradeScale).order_by(GradeScale.min_score.desc()).all()
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
