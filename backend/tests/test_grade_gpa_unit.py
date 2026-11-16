"""Unit test nhanh cho biên tính điểm, quy đổi và tổng hợp GPA (PB-38)."""

from decimal import Decimal
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Course, GradeScale
from app.services.grade_scale import convert_grade
from app.services.grade_service import calculate_course_grade
from app.services.gpa import cumulative_gpa, summarize_gpa


def component(score: str | None, weight: str) -> SimpleNamespace:
    """Tạo thành phần điểm đơn giản, không cần API hay database thật."""
    return SimpleNamespace(
        score=Decimal(score) if score is not None else None,
        weight_percent=Decimal(weight),
    )


def course(grade10: str, grade4: str, credits: int, code: str = "CS101"):
    """Tạo môn hoàn chỉnh để kiểm thử riêng phép tính GPA."""
    return SimpleNamespace(
        code=code,
        grade10=Decimal(grade10),
        grade4=Decimal(grade4),
        credits=credits,
    )


@pytest.fixture
def grade_scale_db():
    """Dùng SQLite trong bộ nhớ để test quy đổi nhanh, độc lập MySQL local."""
    engine = create_engine("sqlite:///:memory:")
    GradeScale.__table__.create(engine)
    session_factory = sessionmaker(bind=engine)
    with session_factory() as db:
        yield db
    engine.dispose()


@pytest.mark.parametrize(
    ("score", "letter", "grade4", "passed"),
    [
        ("0.0", "F", 0.0, False),
        ("3.9", "F", 0.0, False),
        ("4.0", "D", 1.0, True),
        ("4.9", "D", 1.0, True),
        ("5.0", "D+", 1.5, True),
        ("5.4", "D+", 1.5, True),
        ("5.5", "C", 2.0, True),
        ("6.4", "C", 2.0, True),
        ("6.5", "C+", 2.5, True),
        ("6.9", "C+", 2.5, True),
        ("7.0", "B", 3.0, True),
        ("7.9", "B", 3.0, True),
        ("8.0", "B+", 3.5, True),
        ("8.4", "B+", 3.5, True),
        ("8.5", "A", 4.0, True),
        ("10.0", "A", 4.0, True),
    ],
)
def test_grade_scale_boundaries(grade_scale_db, score, letter, grade4, passed):
    result = convert_grade(grade_scale_db, Decimal(score))
    assert result == {
        "letterGrade": letter,
        "grade4": grade4,
        "isPassed": passed,
    }


@pytest.mark.parametrize(
    ("components", "expected_grade"),
    [
        ([component("8.0", "100")], 8.0),
        ([component("0", "100")], 0.0),
        ([component("10", "100")], 10.0),
        ([component("8.4", "50"), component("8.5", "50")], 8.5),
        ([component("8.2", "25"), component("7.2", "75")], 7.5),
        ([component("1.0", "20"), component("9.0", "80")], 7.4),
        ([component("8.25", "100")], 8.3),
        ([component("8.24", "100")], 8.2),
    ],
)
def test_weighted_course_grade_and_half_up_rounding(components, expected_grade):
    result = calculate_course_grade(components)
    assert result["canCalculateCourseGrade"] is True
    assert result["courseGrade10"] == expected_grade


@pytest.mark.parametrize(
    "components",
    [
        [],
        [component("8.0", "0")],
        [component("8.0", "90")],
        [component("8.0", "99.99")],
        [component("8.0", "100.01")],
        [component(None, "100")],
        [component("8.0", "50"), component(None, "50")],
        [component("8.0", "0"), component("9.0", "0")],
    ],
)
def test_course_grade_is_unavailable_for_zero_or_invalid_total_or_missing_score(
    components,
):
    result = calculate_course_grade(components)
    assert result["canCalculateCourseGrade"] is False
    assert result["courseGrade10"] is None


def test_gpa_includes_f_grade_but_excludes_its_credits_from_passed_total():
    result = summarize_gpa([course("9.0", "4.0", 3), course("3.9", "0.0", 2)])
    assert result["gpa4"] == 2.4
    assert result["includedCredits"] == 5
    assert result["passedCredits"] == 3


def test_gpa_is_weighted_by_credits():
    result = summarize_gpa([course("8.0", "3.0", 3), course("8.0", "4.0", 1)])
    assert result["gpa4"] == 3.25
    assert result["includedCredits"] == 4


def test_gpa_rounds_half_up_to_two_decimal_places():
    result = summarize_gpa([course("8.0", "1.00", 2), course("8.0", "1.01", 3)])
    assert result["gpa4"] == 1.01


def test_gpa_for_no_completed_courses_is_empty():
    assert summarize_gpa([]) == {
        "gpa4": None,
        "includedCredits": 0,
        "passedCredits": 0,
        "ranking": None,
    }


@pytest.mark.parametrize(
    ("grade4", "ranking"),
    [
        ("3.60", "Xuất sắc"),
        ("3.59", "Giỏi"),
        ("3.20", "Giỏi"),
        ("3.19", "Khá"),
        ("2.50", "Khá"),
        ("2.49", "Trung bình"),
        ("2.00", "Trung bình"),
        ("1.99", "Yếu / Kém"),
    ],
)
def test_gpa_ranking_boundaries(grade4, ranking):
    assert summarize_gpa([course("8.0", grade4, 1)])["ranking"] == ranking


class CourseQuery:
    """Query giả tối thiểu để kiểm thử chính sách học lại không cần database."""

    def __init__(self, courses):
        self.courses = courses

    def join(self, *_args):
        return self

    def filter(self, *_args):
        return self

    def order_by(self, *_args):
        return self

    def all(self):
        return self.courses


class CourseDatabase:
    def __init__(self, courses):
        self.courses = courses

    def query(self, model):
        assert model is Course
        return CourseQuery(self.courses)


def test_cumulative_gpa_uses_best_attempt_and_normalizes_course_code():
    attempts = [
        course("5.0", "2.0", 3, " cs101 "),
        course("8.0", "3.5", 3, "CS101"),
        course("9.0", "4.0", 2, "MA101"),
    ]
    result = cumulative_gpa(CourseDatabase(attempts), user_id=1)
    assert result["gpa4"] == 3.7
    assert result["includedCredits"] == 5
    assert result["passedCredits"] == 5
    assert result["retakePolicy"] == "HIGHEST_GRADE_BY_COURSE_CODE"


def test_cumulative_gpa_tie_uses_higher_grade10():
    attempts = [
        course("7.0", "3.0", 3, "CS101"),
        course("8.0", "3.0", 3, "cs101"),
    ]
    result = cumulative_gpa(CourseDatabase(attempts), user_id=1)
    assert result["includedCredits"] == 3
    assert result["gpa4"] == 3.0
