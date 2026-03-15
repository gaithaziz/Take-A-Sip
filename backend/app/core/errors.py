import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import log_structured

logger = logging.getLogger(__name__)

_ERROR_BY_STATUS: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: 'BAD_REQUEST',
    status.HTTP_401_UNAUTHORIZED: 'UNAUTHORIZED',
    status.HTTP_403_FORBIDDEN: 'FORBIDDEN',
    status.HTTP_404_NOT_FOUND: 'NOT_FOUND',
    status.HTTP_409_CONFLICT: 'CONFLICT',
    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
    status.HTTP_422_UNPROCESSABLE_ENTITY: 'VALIDATION_ERROR',
    status.HTTP_500_INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    status.HTTP_503_SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
}


def _message_from_detail(detail: Any) -> str:
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list):
        return 'Validation failed'
    return 'Request failed'


def _error_payload(
    *,
    request: Request,
    status_code: int,
    message: str,
    details: Any = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        'error': _ERROR_BY_STATUS.get(status_code, 'REQUEST_ERROR'),
        'message': message,
        'detail': message,
        'request_id': getattr(request.state, 'request_id', None),
    }
    if details:
        payload['details'] = details
    return payload


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        message = _message_from_detail(exc.detail)
        details = exc.detail if isinstance(exc.detail, list) else None
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(request=request, status_code=exc.status_code, message=message, details=details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {
                'field': '.'.join(str(part) for part in error.get('loc', []) if part != 'body'),
                'message': error.get('msg', 'Invalid value'),
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_payload(
                request=request,
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                message='Validation failed',
                details=details,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        log_structured(
            logger,
            logging.ERROR,
            'request.unhandled_exception',
            {
                'path': request.url.path,
                'method': request.method,
                'request_id': getattr(request.state, 'request_id', None),
                'error_type': exc.__class__.__name__,
            },
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_payload(
                request=request,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message='Internal server error',
            ),
        )
