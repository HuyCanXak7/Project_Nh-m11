from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SemesterGpaData(BaseModel):
    semesterId: int = Field(gt=0)
    gpa4: float | None = Field(ge=0, le=4)
    includedCredits: int = Field(ge=0)
    passedCredits: int = Field(ge=0)
    ranking: Literal["Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu / Kém"] | None


class SemesterGpaResponse(BaseModel):
    success: Literal[True]
    statusCode: Literal[200]
    message: str
    data: SemesterGpaData
    error: None
    timestamp: datetime
    path: str
