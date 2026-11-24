"""Nghiệp vụ tải một lần dữ liệu học tập cần cho Dashboard và các trang FE."""

from sqlalchemy.orm import Session, selectinload

from app.models import Course, Semester
from app.schemas.semester import SemesterResponse
from app.services.gpa import summarize_cumulative_gpa
from app.services.grade_scale import get_grade_scale, serialize_grade_scale


def _serialize_component(component) -> dict:
    """Giữ đúng camelCase mà API thành phần điểm đang trả cho frontend."""
    return {
        "id": component.id,
        "courseId": component.course_id,
        "name": component.name,
        "weightPercent": float(component.weight_percent),
        "score": float(component.score) if component.score is not None else None,
    }


def get_learning_data(db: Session, user_id: int) -> dict:
    """Trả học kỳ, môn, thành phần điểm, bảng quy đổi và GPA trong một lượt.

    Dùng ``selectinload`` để số truy vấn không tăng theo số học kỳ/môn học:
    trước đây frontend gọi 1 request học kỳ + 1 request/môn + 1 request/môn
    cho thành phần điểm, tức 51 request với 40 môn.
    """
    # Bảng quy đổi là cấu hình dùng chung và có thể tự tạo mặc định.
    grade_scale = serialize_grade_scale(get_grade_scale(db))

    semesters = (
        db.query(Semester)
        .options(
            selectinload(Semester.courses).selectinload(Course.grade_components)
        )
        .filter(Semester.user_id == user_id)
        .order_by(Semester.start_date.desc(), Semester.id.desc())
        .all()
    )

    courses: list[dict] = []
    for semester in semesters:
        # Giữ thứ tự mã môn như GET /semesters/{id}/courses.
        for course in sorted(semester.courses, key=lambda item: (item.code, item.id)):
            components = sorted(course.grade_components, key=lambda item: item.id)
            courses.append(
                {
                    "id": course.id,
                    "semester_id": course.semester_id,
                    "code": course.code,
                    "name": course.name,
                    "credits": course.credits,
                    "category": course.category,
                    "is_retake": course.is_retake,
                    "components": [
                        _serialize_component(component) for component in components
                    ],
                }
            )

    # Eager-load đã lấy đủ grade10/grade4; tính GPA tại chỗ thay vì query lại.
    all_courses = [course for semester in semesters for course in semester.courses]
    return {
        "semesters": [
            SemesterResponse.model_validate(semester).model_dump(mode="json")
            for semester in semesters
        ],
        "courses": courses,
        "gradeScale": grade_scale,
        "cumulativeGpa": summarize_cumulative_gpa(all_courses),
    }
