"""Kiểm thử công thức GPA độc lập với database."""

from decimal import Decimal
from types import SimpleNamespace

from app.services.gpa import summarize_gpa


def course(grade4: str, grade10: str = "8.0", credits: int = 1):
    return SimpleNamespace(
        credits=credits,
        grade4=Decimal(grade4),
        grade10=Decimal(grade10),
    )


def test_gpa_counts_failed_course_but_not_passed_credits():
    result = summarize_gpa([
        course("4.0", "9.0", 3),
        course("0.0", "3.9", 2),
    ])
    assert result == {
        "gpa4": 2.4,
        "includedCredits": 5,
        "passedCredits": 3,
        "ranking": "Trung bình",
    }


def test_empty_completed_courses():
    assert summarize_gpa([]) == {
        "gpa4": None,
        "includedCredits": 0,
        "passedCredits": 0,
        "ranking": None,
    }


def test_rank_thresholds():
    cases = [
        ("3.60", "Xuất sắc"),
        ("3.59", "Giỏi"),
        ("3.20", "Giỏi"),
        ("3.19", "Khá"),
        ("2.50", "Khá"),
        ("2.49", "Trung bình"),
        ("2.00", "Trung bình"),
        ("1.99", "Yếu / Kém"),
    ]
    for grade, expected_ranking in cases:
        assert summarize_gpa([course(grade)])["ranking"] == expected_ranking
