"""Dữ liệu vào của API cấu hình thành phần điểm (PB-14)."""

from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class GradeComponentCreate(BaseModel):
    """Sinh viên chỉ cấu hình tên và trọng số; nhập điểm thuộc PB-15."""

    name: str = Field(min_length=1, max_length=100)
    weight_percent: Decimal = Field(gt=0, le=100, max_digits=5, decimal_places=2)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        """Không chấp nhận tên chỉ chứa khoảng trắng."""
        cleaned_value = value.strip()
        if not cleaned_value:
            raise ValueError("Tên thành phần không được để trống.")
        return cleaned_value


class GradeComponentUpdate(GradeComponentCreate):
    """PB-14 cho phép sửa cả tên và trọng số của thành phần."""

    pass
