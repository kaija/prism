"""Schema property CRUD router (Req 1.1-1.7, 2.1-2.6, 3.1-3.6, 4.1-4.3)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from app.models.common import ErrorResponse
from app.models.schema import PropertyCreate, PropertyResponse, PropertyUpdate
from app.services.schema_service import SchemaService

router = APIRouter(
    prefix="/api/v1/projects/{project_id}/schemas/{schema_type}",
    tags=["schemas"],
)

_VALID_SCHEMA_TYPES = {"profile", "event"}


def _get_schema_service(request: Request) -> SchemaService:
    return request.app.state.schema_service


def _validate_schema_type(schema_type: str) -> None:
    """Raise 422 if schema_type is not 'profile' or 'event'."""
    if schema_type not in _VALID_SCHEMA_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "Validation error",
                "detail": "schema_type must be 'profile' or 'event'",
            },
        )


def _handle_value_error(exc: ValueError) -> HTTPException:
    """Map a ValueError to the appropriate HTTP error response.

    Duplicate-name errors → 409; all other validation errors → 422.
    """
    msg = str(exc)
    if "already exists" in msg:
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "Conflict", "detail": msg},
        )

    # DSL validation errors include field_errors
    field_errors: list[dict] | None = None
    if "DSL validation failed" in msg or "DSL syntax error" in msg:
        field_errors = [{"message": msg}]

    detail: dict = {"error": "Validation error", "detail": msg}
    if field_errors is not None:
        detail["field_errors"] = field_errors

    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=detail,
    )


@router.post(
    "",
    response_model=PropertyResponse,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
)
async def create_property(
    project_id: str,
    schema_type: str,
    body: PropertyCreate,
    request: Request,
) -> PropertyResponse:
    """Create a new schema property definition."""
    _validate_schema_type(schema_type)
    svc = _get_schema_service(request)
    try:
        return await svc.create_property(project_id, schema_type, body)
    except ValueError as exc:
        raise _handle_value_error(exc)


@router.get("", response_model=list[PropertyResponse])
async def list_properties(
    project_id: str,
    schema_type: str,
    request: Request,
) -> list[PropertyResponse]:
    """List all properties for a project and schema type."""
    _validate_schema_type(schema_type)
    svc = _get_schema_service(request)
    return await svc.list_properties(project_id, schema_type)


@router.get(
    "/{property_id}",
    response_model=PropertyResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_property(
    project_id: str,
    schema_type: str,
    property_id: int,
    request: Request,
) -> PropertyResponse:
    """Get a single property by ID."""
    _validate_schema_type(schema_type)
    svc = _get_schema_service(request)
    prop = await svc.get_property(project_id, schema_type, property_id)
    if prop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Property not found",
                "detail": f"Property {property_id} not found",
            },
        )
    return prop


@router.put(
    "/{property_id}",
    response_model=PropertyResponse,
    responses={404: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
)
async def update_property(
    project_id: str,
    schema_type: str,
    property_id: int,
    body: PropertyUpdate,
    request: Request,
) -> PropertyResponse:
    """Update an existing schema property."""
    _validate_schema_type(schema_type)
    svc = _get_schema_service(request)
    try:
        return await svc.update_property(project_id, schema_type, property_id, body)
    except LookupError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Property not found",
                "detail": f"Property {property_id} not found",
            },
        )
    except ValueError as exc:
        raise _handle_value_error(exc)


@router.delete(
    "/{property_id}",
    responses={404: {"model": ErrorResponse}},
)
async def delete_property(
    project_id: str,
    schema_type: str,
    property_id: int,
    request: Request,
) -> dict:
    """Delete a schema property definition."""
    _validate_schema_type(schema_type)
    svc = _get_schema_service(request)
    deleted = await svc.delete_property(project_id, schema_type, property_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Property not found",
                "detail": f"Property {property_id} not found",
            },
        )
    return {"deleted": True}
