"""Dữ liệu vào/ra của API bảng quy đổi điểm."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class GradeScaleResponse(BaseModel):
    id: int
    min_score: float = Field(serialization_alias="minScore")
    max_score: float = Field(serialization_alias="maxScore")
    letter: str
    gpa4: float

    model_config = ConfigDict(from_attributes=True)


class GradeScaleItem(BaseModel):
    """Một dòng quy đổi admin gửi lên; nhận cả minScore/maxScore như response."""

    min_score: Decimal = Field(ge=0, le=10, max_digits=3, decimal_places=1, alias="minScore")
    max_score: Decimal = Field(ge=0, le=10, max_digits=3, decimal_places=1, alias="maxScore")
    letter: str = Field(min_length=1, max_length=2)
    gpa4: Decimal = Field(ge=0, le=4, max_digits=2, decimal_places=1)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("letter")
    @classmethod
    def clean_letter(cls, value: str) -> str:
        value = value.strip().upper()
        if not value:
            raise ValueError("Điểm chữ không được để trống.")
        return value

    @model_validator(mode="after")
    def validate_range(self):
        if self.min_score > self.max_score:
            raise ValueError("Điểm thấp nhất không được lớn hơn điểm cao nhất.")
        return self


class GradeScaleUpdate(BaseModel):
    """PB-32: admin gửi toàn bộ bảng mới, BE thay thế bảng cũ."""

    items: list[GradeScaleItem] = Field(min_length=1, max_length=20)
