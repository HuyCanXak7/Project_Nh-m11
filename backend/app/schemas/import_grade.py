"""Request row schema for PB-26 batch grade import."""

from datetime import date
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ImportGradeRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    row: int = Field(ge=2)
    semester_name: str = Field(min_length=1, max_length=150)
    course_code: str = Field(min_length=1, max_length=50)
    course_name: str = Field(min_length=1, max_length=150)
    credits: int = Field(gt=0, le=100)
    category: str
    component_name: str = Field(min_length=1, max_length=100)
    weight_percent: Decimal = Field(gt=0, le=100, max_digits=5, decimal_places=2)
    score: Decimal = Field(ge=0, le=10, max_digits=4, decimal_places=2)
    semester_academic_year: str | None = Field(default=None, min_length=1, max_length=20)
    semester_start_date: date | None = None
    semester_end_date: date | None = None

    @field_validator("semester_name", "course_code", "course_name", "component_name")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Trường không được để trống.")
        return value

    @field_validator("course_code")
    @classmethod
    def normalize_course_code(cls, value: str) -> str:
        return value.upper()

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str) -> str:
        normalized = value.strip().casefold()
        categories = {
            "general": "GENERAL",
            "đại cương": "GENERAL",
            "foundation": "FOUNDATION",
            "cơ sở ngành": "FOUNDATION",
            "specialized": "SPECIALIZED",
            "chuyên ngành": "SPECIALIZED",
        }
        if normalized not in categories:
            raise ValueError("Loại môn không hợp lệ.")
        return categories[normalized]


class ImportGradesRequest(BaseModel):
    rows: list[Any] = Field(min_length=1)
