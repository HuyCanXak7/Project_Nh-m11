"""Nghiệp vụ quản trị tài khoản sinh viên (US-01 → US-06)."""

from datetime import timezone
from math import ceil

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import AuditLog, AuthSession, Course, Semester, User
from app.schemas.grade import CourseScoresUpdate
from app.services.gpa import cumulative_gpa, semester_gpa
from app.services.grade_scale import ensure_default_grade_scale
from app.services.grade_service import calculate_course_result, update_course_scores


# Cột được phép sắp xếp, tránh đưa tên cột từ client thẳng vào câu SQL.
STUDENT_SORT_COLUMNS = {
    "createdAt": User.created_at,
    "fullName": User.full_name,
    "email": User.email,
    "studentCode": User.student_code,
}


def admin_error(status: int, code: str, message: str) -> HTTPException:
    """Lỗi nghiệp vụ quản trị dùng chung định dạng {code, message} của BE."""
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def iso_datetime(value) -> str | None:
    """Chuẩn hóa datetime còn naive trong database thành ISO có múi giờ UTC."""
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc).isoformat()


def get_student(db: Session, student_id: int) -> User:
    """Chỉ thao tác trên tài khoản STUDENT; ADMIN không nằm trong phạm vi quản trị."""
    student = (
        db.query(User)
        .filter(User.id == student_id, User.role == "STUDENT")
        .first()
    )
    if student is None:
        raise admin_error(404, "NOT_FOUND", "Không tìm thấy sinh viên.")
    return student


def serialize_student(user: User) -> dict:
    """Hồ sơ tối giản của sinh viên dùng cho danh sách và trang chi tiết."""
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "studentCode": user.student_code,
        "major": user.major,
        "role": user.role,
        "isActive": user.is_active,
        "createdAt": iso_datetime(user.created_at),
    }


def summary_gpa(values: dict) -> dict:
    """Chỉ giữ các trường GPA cần hiển thị, bỏ retakePolicy nội bộ."""
    return {
        "gpa4": values.get("gpa4"),
        "includedCredits": values.get("includedCredits", 0),
        "passedCredits": values.get("passedCredits", 0),
        "ranking": values.get("ranking"),
    }


def list_students(
    db: Session,
    keyword: str | None,
    page: int,
    page_size: int,
    sort_by: str,
    sort_order: str,
) -> dict:
    """Danh sách sinh viên có tìm kiếm, sắp xếp và phân trang phía server."""
    filters = [User.role == "STUDENT"]
    if keyword and keyword.strip():
        # Tìm đồng thời theo email, họ tên và mã sinh viên (US-01).
        pattern = f"%{keyword.strip()}%"
        filters.append(
            or_(
                User.email.ilike(pattern),
                User.full_name.ilike(pattern),
                User.student_code.ilike(pattern),
            )
        )

    total_items = db.query(func.count(User.id)).filter(*filters).scalar() or 0
    sort_column = STUDENT_SORT_COLUMNS[sort_by]
    ordering = sort_column.asc() if sort_order == "asc" else sort_column.desc()
    users = (
        db.query(User)
        .filter(*filters)
        .order_by(ordering, User.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": [serialize_student(user) for user in users],
        "meta": {
            "page": page,
            "pageSize": page_size,
            "totalItems": total_items,
            "totalPages": ceil(total_items / page_size) if total_items else 0,
        },
    }


def student_semesters(db: Session, student_id: int) -> list[Semester]:
    """Học kỳ gần nhất trước để ADMIN thấy tiến độ mới nhất ở đầu trang."""
    return (
        db.query(Semester)
        .filter(Semester.user_id == student_id)
        .order_by(Semester.start_date.desc(), Semester.id.desc())
        .all()
    )


def get_student_detail(db: Session, student_id: int) -> dict:
    """Hồ sơ sinh viên kèm thống kê số học kỳ, số môn và GPA tích lũy (US-02)."""
    student = get_student(db, student_id)
    semesters = student_semesters(db, student.id)

    semester_items = []
    for semester in semesters:
        course_count = len(semester.courses)
        gpa = semester_gpa(db, student.id, semester.id) or {}
        semester_items.append(
            {
                "id": semester.id,
                "name": semester.name,
                "academicYear": semester.academic_year,
                "startDate": semester.start_date.isoformat(),
                "endDate": semester.end_date.isoformat(),
                "courseCount": course_count,
                **summary_gpa(gpa),
            }
        )

    return {
        "student": serialize_student(student),
        "summary": {
            "semesterCount": len(semesters),
            "courseCount": sum(item["courseCount"] for item in semester_items),
            **summary_gpa(cumulative_gpa(db, student.id)),
        },
        "semesters": semester_items,
    }


def serialize_course(db: Session, course: Course) -> dict:
    """Một môn kèm thành phần điểm và kết quả quy đổi hiện tại."""
    components = sorted(course.grade_components, key=lambda item: item.id)
    result = calculate_course_result(db, components)
    return {
        "id": course.id,
        "code": course.code,
        "name": course.name,
        "credits": course.credits,
        "category": course.category,
        "isRetake": course.is_retake,
        "components": [
            {
                "id": component.id,
                "name": component.name,
                "weightPercent": float(component.weight_percent),
                "score": float(component.score) if component.score is not None else None,
            }
            for component in components
        ],
        "canCalculateCourseGrade": result["canCalculateCourseGrade"],
        "courseGrade10": result["courseGrade10"],
        "letterGrade": result["letterGrade"],
        "grade4": result["grade4"],
        "isPassed": result["isPassed"],
        "calculationMessage": result["calculationMessage"],
    }


def get_student_grades(db: Session, student_id: int) -> dict:
    """Toàn bộ bảng điểm của sinh viên cho ADMIN xem (US-05)."""
    student = get_student(db, student_id)
    # Bảng quy đổi có thể chưa được seed trên database mới; tạo trước khi tính điểm.
    ensure_default_grade_scale(db)
    db.commit()

    semesters = student_semesters(db, student.id)
    semester_items = []
    for semester in semesters:
        courses = sorted(
            semester.courses, key=lambda item: (item.code.casefold(), item.id)
        )
        gpa = semester_gpa(db, student.id, semester.id) or {}
        semester_items.append(
            {
                "id": semester.id,
                "name": semester.name,
                "academicYear": semester.academic_year,
                "startDate": semester.start_date.isoformat(),
                "endDate": semester.end_date.isoformat(),
                **summary_gpa(gpa),
                "courses": [serialize_course(db, course) for course in courses],
            }
        )

    return {
        "student": serialize_student(student),
        "cumulative": summary_gpa(cumulative_gpa(db, student.id)),
        "semesters": semester_items,
    }


def set_student_active(
    db: Session, student_id: int, is_active: bool, admin: User, reason: str | None = None
) -> dict:
    """Khóa/mở khóa tài khoản; khóa thì thu hồi toàn bộ phiên đăng nhập (US-03)."""
    student = get_student(db, student_id)

    if student.is_active == is_active:
        return serialize_student(student)

    student.is_active = is_active
    if not is_active:
        # Access/refresh token cũ đều vô hiệu vì dependency kiểm tra AuthSession còn tồn tại.
        db.query(AuthSession).filter(AuthSession.user_id == student.id).delete(
            synchronize_session=False
        )

    db.add(
        AuditLog(
            user_id=admin.id,
            action="USER_UNLOCKED" if is_active else "USER_LOCKED",
            target_user_id=student.id,
            reason=(reason or "").strip() or None,
        )
    )
    db.commit()
    db.refresh(student)
    return serialize_student(student)


def update_student_scores(
    db: Session, student_id: int, course_id: int, data: CourseScoresUpdate
) -> dict:
    """ADMIN sửa điểm thành phần của sinh viên; tính lại điểm môn và GPA (US-06)."""
    student = get_student(db, student_id)
    # Tận dụng nguyên nghiệp vụ PB-15 nhưng thay người sở hữu bằng sinh viên được chọn.
    result = update_course_scores(db, course_id, student.id, data)
    return {"courseId": course_id, **result}
