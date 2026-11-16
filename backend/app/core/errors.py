import logging

from fastapi import HTTPException

from app.core.responses import response

logger = logging.getLogger(__name__)


def auth_error(status, code, message, headers=None):
    return HTTPException(status, detail={"code": code, "message": message}, headers=headers)


def session_invalid():
    return auth_error(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ.")


async def handle_http_error(request, error):
    return response(
        request, error.status_code, error.detail["message"],
        error={"code": error.detail["code"], "details": []}, headers=error.headers,
    )


async def handle_invalid_request(request, error):
    details = [{"field": ".".join(map(str, item["loc"][1:])), "reason": item["msg"]} for item in error.errors()]
    return response(
        request, 400, "Dữ liệu không hợp lệ.",
        error={"code": "VALIDATION_ERROR", "details": details},
    )


async def handle_database_error(request, error):
    logger.error("Database error during %s", request.url.path, exc_info=error)
    return response(request, 500, "Đã xảy ra lỗi máy chủ.", error={"code": "INTERNAL_ERROR", "details": []})
