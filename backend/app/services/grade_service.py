"""Nghiệp vụ cấu hình thành phần và trọng số điểm theo PB-14."""

from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Course, GradeComponent, Semester
from app.schemas.grade import (
    CourseScoresUpdate,
    GradeComponentCreate,
    GradeComponentUpdate,
)
from app.services.course import get_owned_course


MAX_TOTAL_WEIGHT = Decimal("100.00")


def grade_error(code: str, message: str) -> HTTPException:
    """Tạo lỗi nghiệp vụ có cùng định dạng với các API hiện tại."""
    return HTTPException(status_code=400, detail={"code": code, "message": message})


def get_owned_component(
    db: Session, component_id: int, user_id: int
) -> GradeComponent:
    """Kiểm tra quyền sở hữu qua Thành phần -> Môn -> Học kỳ -> Sinh viên."""
    component = (
        db.query(GradeComponent)
        .join(Course, GradeComponent.course_id == Course.id)
        .join(Semester, Course.semester_id == Semester.id)
        .filter(GradeComponent.id == component_id, Semester.user_id == user_id)
        .first()
    )
    if component is None:
        # Dùng 404 để không tiết lộ thành phần của tài khoản khác có tồn tại.
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": "Không tìm thấy thành phần điểm.",
            },
        )
    return component


def get_components(db: Session, course_id: int) -> list[GradeComponent]:
    """Lấy danh sách thành phần ổn định theo id để FE dễ hiển thị."""
    return (
        db.query(GradeComponent)
        .filter(GradeComponent.course_id == course_id)
        .order_by(GradeComponent.id.asc())
        .all()
    )


def calculate_total(components: list[GradeComponent]) -> Decimal:
    """Backend tự tính tổng, không tin giá trị tổng do frontend gửi lên."""
    return sum(
        (Decimal(str(component.weight_percent)) for component in components),
        Decimal("0.00"),
    )


def calculate_course_grade(components: list[GradeComponent]) -> dict:
    """Tính điểm hệ 10 khi đủ điểm và tổng trọng số bằng đúng 100%."""
    total = calculate_total(components)
    if total != MAX_TOTAL_WEIGHT:
        return {
            "canCalculateCourseGrade": False,
            "courseGrade10": None,
            "calculationMessage": (
                "Chưa thể tính điểm môn vì tổng trọng số chưa bằng 100%."
            ),
        }

    if not components or any(component.score is None for component in components):
        return {
            "canCalculateCourseGrade": False,
            "courseGrade10": None,
            "calculationMessage": (
                "Chưa thể tính điểm môn vì chưa nhập đủ điểm thành phần."
            ),
        }

    # Công thức PB-16: tổng điểm thành phần nhân trọng số phần trăm.
    weighted_grade = sum(
        (
            Decimal(str(component.score))
            * Decimal(str(component.weight_percent))
            / MAX_TOTAL_WEIGHT
            for component in components
        ),
        Decimal("0.00"),
    )
    rounded_grade = weighted_grade.quantize(
        Decimal("0.1"), rounding=ROUND_HALF_UP
    )
    return {
        "canCalculateCourseGrade": True,
        "courseGrade10": float(rounded_grade),
        "calculationMessage": None,
    }


def serialize_configuration(components: list[GradeComponent]) -> dict:
    """Trả danh sách cùng tổng hiện tại và trạng thái hoàn tất cho frontend."""
    total = calculate_total(components)
    grade_result = calculate_course_grade(components)

    return {
        "components": [
            {
                "id": component.id,
                "courseId": component.course_id,
                "name": component.name,
                "weightPercent": float(component.weight_percent),
                "score": float(component.score) if component.score is not None else None,
            }
            for component in components
        ],
        "totalWeightPercent": float(total),
        "isComplete": total == MAX_TOTAL_WEIGHT,
        # Giữ tên cũ để FE của PB-15 không bị hỏng khi nối sang PB-16.
        "temporaryCourseScore": grade_result["courseGrade10"],
        "hasAllScores": bool(components)
        and all(component.score is not None for component in components),
        **grade_result,
    }


def ensure_unique_name(
    components: list[GradeComponent], name: str, ignored_id: int | None = None
) -> None:
    """Một môn không nên có hai thành phần cùng tên, kể cả khác hoa thường."""
    normalized_name = name.casefold()
    for component in components:
        if component.id != ignored_id and component.name.casefold() == normalized_name:
            raise grade_error(
                "COMPONENT_NAME_EXISTS", "Tên thành phần điểm đã tồn tại trong môn."
            )


def ensure_total_not_exceeded(total: Decimal) -> None:
    """Cho phép lưu bản nháp dưới 100%, nhưng không cho tổng vượt 100%."""
    if total > MAX_TOTAL_WEIGHT:
        raise grade_error(
            "WEIGHT_TOTAL_EXCEEDED", "Tổng trọng số không được vượt quá 100%."
        )


def list_grade_components(db: Session, course_id: int, user_id: int) -> dict:
    """Xem cấu hình của môn thuộc người dùng; chưa có thì trả danh sách rỗng."""
    get_owned_course(db, course_id, user_id)
    return serialize_configuration(get_components(db, course_id))


def create_grade_component(
    db: Session, course_id: int, user_id: int, data: GradeComponentCreate
) -> dict:
    """Thêm thành phần và bảo đảm tổng mới không vượt quá 100%."""
    get_owned_course(db, course_id, user_id)
    components = get_components(db, course_id)
    ensure_unique_name(components, data.name)
    ensure_total_not_exceeded(calculate_total(components) + data.weight_percent)

    component = GradeComponent(
        course_id=course_id,
        name=data.name,
        weight_percent=data.weight_percent,
        score=None,
    )
    db.add(component)
    db.commit()
    return serialize_configuration(get_components(db, course_id))


def update_grade_component(
    db: Session, component_id: int, user_id: int, data: GradeComponentUpdate
) -> dict:
    """Sửa thành phần và tính lại tổng trước khi ghi xuống database."""
    component = get_owned_component(db, component_id, user_id)
    components = get_components(db, component.course_id)
    ensure_unique_name(components, data.name, ignored_id=component.id)

    total_without_current = calculate_total(components) - Decimal(
        str(component.weight_percent)
    )
    ensure_total_not_exceeded(total_without_current + data.weight_percent)

    component.name = data.name
    component.weight_percent = data.weight_percent
    db.commit()
    return serialize_configuration(get_components(db, component.course_id))


def delete_grade_component(
    db: Session, component_id: int, user_id: int
) -> dict:
    """Xóa thành phần thuộc người dùng và trả cấu hình còn lại."""
    component = get_owned_component(db, component_id, user_id)
    course_id = component.course_id
    db.delete(component)
    db.commit()
    return serialize_configuration(get_components(db, course_id))


def complete_grade_configuration(db: Session, course_id: int, user_id: int) -> dict:
    """Chỉ xác nhận cấu hình hợp lệ khi tổng trọng số bằng đúng 100%."""
    get_owned_course(db, course_id, user_id)
    components = get_components(db, course_id)
    result = serialize_configuration(components)
    if not result["isComplete"]:
        raise grade_error(
            "WEIGHT_TOTAL_NOT_100",
            "Chỉ có thể hoàn tất khi tổng trọng số bằng đúng 100%.",
        )
    return result


def update_course_scores(
    db: Session, course_id: int, user_id: int, data: CourseScoresUpdate
) -> dict:
    """Nhập/sửa điểm thành phần và chỉ commit khi toàn bộ request hợp lệ."""
    get_owned_course(db, course_id, user_id)
    components = get_components(db, course_id)
    components_by_id = {component.id: component for component in components}

    # Không cho cùng một thành phần xuất hiện hai lần vì kết quả sẽ không rõ ràng.
    requested_ids = [item.component_id for item in data.scores]
    if len(requested_ids) != len(set(requested_ids)):
        raise grade_error(
            "DUPLICATE_COMPONENT", "Mỗi thành phần chỉ được gửi một lần."
        )

    # Tất cả component_id phải thuộc đúng course_id trên URL.
    if any(component_id not in components_by_id for component_id in requested_ids):
        raise HTTPException(
            status_code=404,
            detail={
                "code": "COMPONENT_NOT_FOUND",
                "message": "Không tìm thấy thành phần điểm trong môn học này.",
            },
        )

    # Pydantic đã kiểm tra điểm từ 0 đến 10 trước khi service được gọi.
    for item in data.scores:
        components_by_id[item.component_id].score = item.score

    db.commit()
    return serialize_configuration(get_components(db, course_id))
