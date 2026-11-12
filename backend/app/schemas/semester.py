"""Dữ liệu vào/ra của API quản lý học kỳ."""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SemesterData(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    academic_year: str = Field(min_length=1, max_length=20)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.end_date < self.start_date:
            raise ValueError("Ngày kết thúc không được trước ngày bắt đầu.")
        return self


class SemesterCreate(SemesterData):
    pass


class SemesterUpdate(SemesterData):
    pass


class SemesterResponse(SemesterData):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)
