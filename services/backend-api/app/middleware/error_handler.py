"""Global exception handler returning a consistent ErrorResponse JSON body.

Maps well-known exception types to appropriate HTTP status codes and
ensures that unexpected errors never leak internal details to the client.
"""

from __future__ import annotations

import structlog
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.models.common import ErrorResponse

logger = structlog.get_logger()


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""

    if isinstance(exc, ValueError):
        status_code = 422
        body = ErrorResponse(
            error="VALIDATION_ERROR",
            detail=str(exc),
        )
    elif isinstance(exc, LookupError):
        status_code = 404
        body = ErrorResponse(
            error="NOT_FOUND",
            detail=str(exc),
        )
    else:
        status_code = 500
        body = ErrorResponse(
            error="INTERNAL_ERROR",
            detail="An unexpected error occurred.",
        )
        logger.exception(
            "unhandled_exception",
            path=request.url.path,
            method=request.method,
        )

    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(exclude_none=True),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Override FastAPI's default 422 handler to use ErrorResponse format."""

    field_errors = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err.get("loc", []))
        field_errors.append({"field": loc, "message": err.get("msg", "")})

    body = ErrorResponse(
        error="VALIDATION_ERROR",
        detail="Request validation failed.",
        field_errors=field_errors,
    )
    return JSONResponse(
        status_code=422,
        content=body.model_dump(exclude_none=True),
    )
