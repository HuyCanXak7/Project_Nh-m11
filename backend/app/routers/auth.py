"""Các endpoint đăng ký, đăng nhập, refresh, logout và xem tài khoản."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    ProfileUpdateRequest,
    RefreshRequest,
    RegisterRequest,
)
from app.services.auth import (
    change_password,
    login_user,
    logout_user,
    refresh_tokens,
    register_user,
)
from app.utils.responses import api_response

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    user = register_user(db, data)
    return api_response(
        request,
        201,
        "Đăng ký tài khoản thành công.",
        {"id": user.id, "email": user.email, "fullName": user.full_name},
    )


@router.post("/login")
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    return api_response(request, 200, "Đăng nhập thành công.", login_user(db, data, request))


@router.post("/refresh")
def refresh(data: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    tokens = refresh_tokens(db, data.refreshToken.get_secret_value())
    return api_response(request, 200, "Đã làm mới phiên đăng nhập.", tokens)


@router.post("/logout")
def logout(data: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    logout_user(db, data.refreshToken.get_secret_value())
    return api_response(request, 200, "Đăng xuất thành công.")


@router.post("/change-password")
def update_password(
    data: ChangePasswordRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB-05: xác thực mật khẩu hiện tại rồi đổi sang mật khẩu mới."""
    tokens = change_password(db, user, data)
    return api_response(
        request,
        200,
        "Đổi mật khẩu thành công. Các phiên đăng nhập cũ đã được thu hồi.",
        tokens,
    )


@router.get("/me")
def me(request: Request, user: User = Depends(get_current_user)):
    return api_response(
        request,
        200,
        "Thông tin tài khoản.",
        {"id": user.id, "email": user.email, "fullName": user.full_name,
         "role": user.role, "isActive": user.is_active},
    )


@router.patch("/profile")
def update_profile(
    data: ProfileUpdateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PB-04: người dùng đang đăng nhập tự sửa họ tên của mình."""
    user.full_name = data.full_name
    db.commit()
    return api_response(
        request,
        200,
        "Cập nhật hồ sơ thành công.",
        {"id": user.id, "email": user.email, "fullName": user.full_name},
    )
