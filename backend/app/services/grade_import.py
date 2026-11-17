"""Validate and save a user's grade import atomically (PB-26)."""

from collections import defaultdict
from decimal import Decimal

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Course, GradeComponent, Semester, User
from app.schemas.import_grade import ImportGradeRow
from app.services.grade_service import sync_course_result

MAX_IMPORT_ROWS = 1000


def _import_error(code: str, message: str, details: list[dict] | None = None):
    return HTTPException(
        status_code=400,
        detail={"code": code, "message": message, "details": details or []},
    )


def _validation_details(error: ValidationError, row_number: int) -> list[dict]:
    return [
        {
            "row": row_number,
            "field": str(issue["loc"][0]) if issue["loc"] else "row",
            "reason": issue["msg"],
        }
        for issue in error.errors()
    ]


def import_grades(db: Session, user: User, raw_rows: list[dict]) -> dict:
    """Validate all rows, enforce ownership and duplicates, then commit once."""
    if len(raw_rows) > MAX_IMPORT_ROWS:
        raise _import_error(
            "IMPORT_FILE_INVALID", "Tệp vượt quá giới hạn 1.000 dòng."
        )

    rows: list[ImportGradeRow] = []
    errors: list[dict] = []
    for index, raw in enumerate(raw_rows, start=2):
        source_row = raw.get("row", index) if isinstance(raw, dict) else index
        if not isinstance(raw, dict):
            errors.append(
                {"row": source_row, "field": "row", "reason": "Dòng dữ liệu không hợp lệ."}
            )
            continue
        try:
            rows.append(ImportGradeRow.model_validate({**raw, "row": source_row}))
        except ValidationError as exc:
            errors.extend(_validation_details(exc, source_row))

    # Group by semester identity and normalized course code. The lookup below
    # is scoped to the authenticated owner; names shared by other users are
    # independent records and are never read or modified.
    grouped: dict[tuple[str, str, str], list[ImportGradeRow]] = defaultdict(list)
    course_metadata: dict[tuple[str, str, str], tuple] = {}
    semester_metadata: dict[tuple[str, str], tuple] = {}
    seen_components: dict[tuple[str, str, str, str], int] = {}

    for row in rows:
        semester_key = (
            row.semester_name.casefold(),
            (row.semester_academic_year or "").casefold(),
        )
        course_key = (*semester_key, row.course_code.casefold())
        component_key = (*course_key, row.component_name.casefold())
        if component_key in seen_components:
            errors.append(
                {
                    "row": row.row,
                    "field": "component_name",
                    "reason": f"Thành phần trùng với dòng {seen_components[component_key]} trong tệp.",
                }
            )
        else:
            seen_components[component_key] = row.row

        metadata = (row.credits, row.course_name.casefold(), row.category)
        if course_key in course_metadata and course_metadata[course_key] != metadata:
            errors.append(
                {
                    "row": row.row,
                    "field": "course_code",
                    "reason": "Thông tin môn không thống nhất giữa các dòng.",
                }
            )
        course_metadata[course_key] = metadata

        semester_info = (
            row.semester_academic_year,
            row.semester_start_date,
            row.semester_end_date,
        )
        if semester_key in semester_metadata and semester_metadata[semester_key] != semester_info:
            errors.append(
                {
                    "row": row.row,
                    "field": "semester_name",
                    "reason": "Thông tin học kỳ không thống nhất giữa các dòng.",
                }
            )
        semester_metadata[semester_key] = semester_info
        grouped[course_key].append(row)

    # Resolve semester/course records using the authenticated user's id only.
    owned_semesters = db.query(Semester).filter(Semester.user_id == user.id).all()
    semesters_by_name: dict[str, list[Semester]] = defaultdict(list)
    for semester in owned_semesters:
        semesters_by_name[semester.name.casefold()].append(semester)

    resolved: dict[tuple[str, str, str], tuple[Semester | None, Course | None]] = {}
    for course_key, course_rows in grouped.items():
        semester_key = course_key[:2]
        first = course_rows[0]
        matches = semesters_by_name.get(first.semester_name.casefold(), [])
        if semester_key[1]:
            matches = [
                item
                for item in matches
                if item.academic_year.casefold() == semester_key[1]
            ]
        if len(matches) > 1:
            errors.append(
                {
                    "row": first.row,
                    "field": "semester_name",
                    "reason": "Tên học kỳ chưa đủ để xác định duy nhất; cần cung cấp năm học.",
                }
            )
            continue

        semester = matches[0] if matches else None
        metadata = semester_metadata[semester_key]
        if semester is None and not all(metadata):
            errors.append(
                {
                    "row": first.row,
                    "field": "semester_academic_year",
                    "reason": "Học kỳ mới cần năm học, ngày bắt đầu và ngày kết thúc.",
                }
            )
            continue
        if metadata[1] and metadata[2] and metadata[2] < metadata[1]:
            errors.append(
                {
                    "row": first.row,
                    "field": "semester_end_date",
                    "reason": "Ngày kết thúc không được trước ngày bắt đầu.",
                }
            )
            continue
        if semester is not None:
            if metadata[1] and metadata[1] != semester.start_date:
                errors.append(
                    {"row": first.row, "field": "semester_start_date", "reason": "Ngày bắt đầu không khớp học kỳ hiện có."}
                )
            if metadata[2] and metadata[2] != semester.end_date:
                errors.append(
                    {"row": first.row, "field": "semester_end_date", "reason": "Ngày kết thúc không khớp học kỳ hiện có."}
                )

        course = None
        if semester is not None:
            course_matches = [
                item
                for item in db.query(Course).filter(Course.semester_id == semester.id).all()
                if item.code.strip().casefold() == first.course_code.casefold()
            ]
            if len(course_matches) > 1:
                errors.append(
                    {"row": first.row, "field": "course_code", "reason": "Mã môn bị trùng trong học kỳ."}
                )
                continue
            course = course_matches[0] if course_matches else None

        if course is not None:
            existing_course_metadata = (
                course.credits,
                course.name.casefold(),
                course.category,
            )
            if existing_course_metadata != course_metadata[course_key]:
                errors.append(
                    {"row": first.row, "field": "course_code", "reason": "Mã môn đã tồn tại với thông tin khác."}
                )
            existing_components = (
                db.query(GradeComponent)
                .filter(GradeComponent.course_id == course.id)
                .all()
            )
            existing_names = {component.name.casefold() for component in existing_components}
            for row in course_rows:
                if row.component_name.casefold() in existing_names:
                    errors.append(
                        {
                            "row": row.row,
                            "field": "component_name",
                            "reason": "Thành phần đã tồn tại; import không ghi đè điểm hiện có.",
                        }
                    )
            combined_weight = sum(
                (Decimal(str(component.weight_percent)) for component in existing_components),
                Decimal("0.00"),
            ) + sum((row.weight_percent for row in course_rows), Decimal("0.00"))
            if combined_weight != Decimal("100.00"):
                errors.append(
                    {
                        "row": first.row,
                        "field": "weight_percent",
                        "reason": f"Tổng trọng số của môn sau import phải bằng 100% (hiện tại: {combined_weight}%).",
                    }
                )
        else:
            imported_weight = sum(
                (row.weight_percent for row in course_rows), Decimal("0.00")
            )
            if imported_weight != Decimal("100.00"):
                errors.extend(
                    {
                        "row": row.row,
                        "field": "weight_percent",
                        "reason": f"Tổng trọng số của môn phải bằng 100% (hiện tại: {imported_weight}%).",
                    }
                    for row in course_rows
                )
        resolved[course_key] = (semester, course)

    if errors:
        raise _import_error(
            "IMPORT_INVALID_ROWS",
            f"Tệp import có {len(errors)} lỗi, không có dữ liệu nào được lưu.",
            errors,
        )

    created_semesters: set[int] = set()
    created_courses: set[int] = set()
    imported_components = 0
    affected_courses: dict[int, Course] = {}
    imported_semesters: dict[tuple[str, str], Semester] = {}
    try:
        for course_key, course_rows in grouped.items():
            semester, course = resolved[course_key]
            first = course_rows[0]
            semester_key = course_key[:2]
            if semester is None:
                semester = imported_semesters.get(semester_key)
                if semester is None:
                    semester = Semester(
                        user_id=user.id,
                        name=first.semester_name,
                        academic_year=first.semester_academic_year,
                        start_date=first.semester_start_date,
                        end_date=first.semester_end_date,
                    )
                    db.add(semester)
                    db.flush()
                    imported_semesters[semester_key] = semester
                    created_semesters.add(semester.id)

            if course is None:
                course = Course(
                    semester_id=semester.id,
                    code=first.course_code,
                    name=first.course_name,
                    credits=first.credits,
                    category=first.category,
                )
                db.add(course)
                db.flush()
                created_courses.add(course.id)

            for row in course_rows:
                db.add(
                    GradeComponent(
                        course_id=course.id,
                        name=row.component_name,
                        weight_percent=row.weight_percent,
                        score=row.score,
                    )
                )
                imported_components += 1
            affected_courses[course.id] = course

        db.flush()
        for course in affected_courses.values():
            components = (
                db.query(GradeComponent)
                .filter(GradeComponent.course_id == course.id)
                .all()
            )
            sync_course_result(db, course, components)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise _import_error(
            "IMPORT_SAVE_FAILED",
            "Không thể lưu batch import; không có dữ liệu nào được lưu.",
            [
                {
                    "row": row.row,
                    "field": "row",
                    "reason": "Giao dịch lưu thất bại; vui lòng kiểm tra dữ liệu và thử lại.",
                }
                for row in rows[:1]
            ],
        ) from exc
    except Exception:
        db.rollback()
        raise

    return {
        "importedRows": len(rows),
        "createdSemesters": len(created_semesters),
        "createdCourses": len(created_courses),
        "createdGradeComponents": imported_components,
    }
