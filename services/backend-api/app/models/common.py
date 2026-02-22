"""Common shared models used across the Backend API."""

from __future__ import annotations

from typing import Generic, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResult(BaseModel, Generic[T]):
    """Paginated list response wrapper."""

    items: list[T]
    total: int
    page: int
    page_size: int


class ErrorResponse(BaseModel):
    """Consistent error response format."""

    error: str
    detail: Optional[str] = None
    field_errors: Optional[list[dict]] = None
