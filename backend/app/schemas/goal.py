"""PB-22 request matches the camelCase Goal contract already handed to FE."""

import re
from datetime import date, datetime, timedelta, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


def today_in_vietnam() -> date:
    return datetime.now(timezone(timedelta(hours=7))).date()


class GoalWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    targetGpa: float = Field(ge=0, le=4, strict=True, allow_inf_nan=False)
    targetDate: date
    remainingCredits: int = Field(gt=0, le=2_147_483_647, strict=True)

    @field_validator("targetDate", mode="before")
    @classmethod
    def iso_date_only(cls, value):
        if not isinstance(value, str) or re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value) is None:
            raise ValueError("Ngày mục tiêu phải có định dạng YYYY-MM-DD.")
        return value

    @field_validator("targetDate")
    @classmethod
    def not_in_past(cls, value):
        if value < today_in_vietnam():
            raise ValueError("Ngày mục tiêu không được ở quá khứ (giờ Việt Nam UTC+7).")
        return value
