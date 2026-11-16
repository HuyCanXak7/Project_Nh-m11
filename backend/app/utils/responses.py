"""Chuẩn hóa response của toàn bộ API."""

from datetime import datetime, timezone

from fastapi.responses import JSONResponse


def api_response(request, status, message, data=None, error=None, headers=None):
    return JSONResponse(
        status_code=status,
        headers=headers,
        content={
            "success": status < 400,
            "statusCode": status,
            "message": message,
            "data": data,
            "error": error,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": request.url.path,
        },
    )
