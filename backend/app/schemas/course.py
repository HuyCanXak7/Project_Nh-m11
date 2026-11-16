"""Dữ liệu vào/ra của API môn học."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# Ba loại môn theo SRS: đại cương, cơ sở ngành và chuyên ngành.
CourseCategory = Literal["GENERAL", "FOUNDATION", "SPECIALIZED"]


class CourseCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=150)
    credits: int = Field(gt=0, le=100)
    category: CourseCategory
    is_retake: bool = False

    @field_validator("code", "name")
    @classmethod
    def validate_not_blank(cls, value: str) -> str:
        """Không chấp nhận chuỗi chỉ gồm khoảng trắng."""
        cleaned_value = value.strip()
        if not cleaned_value:
            raise ValueError("Trường này không được để trống.")
        return cleaned_value

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        """Chuẩn hóa mã môn thành chữ in hoa để dễ tìm kiếm và tính học lại."""
        return value.upper()


class CourseUpdate(CourseCreate):
    """Dữ liệu hợp lệ được phép cập nhật cho môn học."""

    pass


class CourseResponse(BaseModel):
    id: int
    semester_id: int
    code: str
    name: str
    credits: int
    category: CourseCategory
    is_retake: bool

    model_config = ConfigDict(from_attributes=True)
