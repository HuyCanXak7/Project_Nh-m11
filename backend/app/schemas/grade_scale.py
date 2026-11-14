"""Dữ liệu trả về của API đọc bảng quy đổi điểm."""

from pydantic import BaseModel, ConfigDict, Field


class GradeScaleResponse(BaseModel):
    id: int
    min_score: float = Field(serialization_alias="minScore")
    max_score: float = Field(serialization_alias="maxScore")
    letter: str
    gpa4: float

    model_config = ConfigDict(from_attributes=True)
