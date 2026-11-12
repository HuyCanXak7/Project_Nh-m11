from pydantic import BaseModel, Field, SecretStr


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    password: SecretStr = Field(min_length=1, max_length=72)


class RefreshRequest(BaseModel):
    refreshToken: SecretStr = Field(min_length=1, max_length=4096)
