"""Dữ liệu vào/ra của API xác thực."""

from pydantic import BaseModel, EmailStr, Field, SecretStr


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=150)
    password: SecretStr = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: SecretStr = Field(min_length=1, max_length=72)


class RefreshRequest(BaseModel):
    refreshToken: SecretStr = Field(min_length=1, max_length=4096)
