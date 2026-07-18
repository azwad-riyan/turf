"""Custom exception handler for consistent API error responses."""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Returns errors in a consistent envelope:
    {
        "error": {
            "code": "string",
            "message": "Human-readable message",
            "detail": <optional extra>
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "error": {
                "code": _get_error_code(response.status_code),
                "message": _extract_message(response.data),
                "detail": response.data,
            }
        }
        response.data = error_payload

    return response


def _get_error_code(status_code: int) -> str:
    codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        429: "RATE_LIMITED",
        500: "INTERNAL_SERVER_ERROR",
    }
    return codes.get(status_code, "ERROR")


def _extract_message(data) -> str:
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        if "non_field_errors" in data:
            return str(data["non_field_errors"][0])
        first_key = next(iter(data))
        return f"{first_key}: {data[first_key][0] if isinstance(data[first_key], list) else data[first_key]}"
    if isinstance(data, list) and data:
        return str(data[0])
    return str(data)


class AppError(Exception):
    """Base application error with status code and code string."""
    def __init__(self, message: str, code: str = "APP_ERROR", status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class SlotNotAvailableError(AppError):
    def __init__(self, message: str = "This slot is no longer available."):
        super().__init__(message, code="SLOT_NOT_AVAILABLE", status_code=409)


class SlotLockError(AppError):
    def __init__(self, message: str = "Another booking is in progress for this slot. Please wait and try again."):
        super().__init__(message, code="SLOT_LOCKED", status_code=409)
