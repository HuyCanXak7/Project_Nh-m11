"""Dữ liệu vào/ra của API xác thực."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=150)
    password: SecretStr = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: SecretStr = Field(min_length=1, max_length=72)


class RefreshRequest(BaseModel):
    refreshToken: SecretStr = Field(min_length=1, max_length=4096)


class ProfileUpdateRequest(BaseModel):
    """FE gửi {fullName}; chỉ cho sửa họ tên của chính mình."""

    full_name: str = Field(alias="fullName", max_length=150)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Họ và tên phải có ít nhất 2 ký tự.")
        return value


class ChangePasswordRequest(BaseModel):
    """Đổi mật khẩu: phải xác thực mật khẩu hiện tại trước khi nhận mật khẩu mới."""

    currentPassword: SecretStr = Field(min_length=1, max_length=72)
    newPassword: SecretStr = Field(min_length=8, max_length=72)
