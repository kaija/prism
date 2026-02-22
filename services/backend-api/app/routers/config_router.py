"""Project configuration key-value store router (Req 1.1-1.5)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.models.config import ConfigValue
from app.services.config_service import ConfigService

router = APIRouter(
    prefix="/api/v1/projects/{project_id}/config",
    tags=["config"],
)


def _get_config_service(request: Request) -> ConfigService:
    return request.app.state.config_service


@router.put("/{key}")
async def set_config_value(
    project_id: str, key: str, body: ConfigValue, request: Request
) -> dict:
    """Set a config key-value pair for a project."""
    svc = _get_config_service(request)
    await svc.set_value(project_id, key, body.value)
    return {"key": key, "value": body.value}


@router.get("")
async def get_all_config(project_id: str, request: Request) -> dict:
    """Get all config key-value pairs for a project."""
    svc = _get_config_service(request)
    values = await svc.get_all(project_id)
    return {"items": values}


@router.get("/{key}")
async def get_config_value(project_id: str, key: str, request: Request) -> dict:
    """Get a single config value by key."""
    svc = _get_config_service(request)
    value = await svc.get_value(project_id, key)
    if value is None:
        raise HTTPException(status_code=404, detail=f"Config key '{key}' not found")
    return {"key": key, "value": value}


@router.delete("/{key}")
async def delete_config_value(project_id: str, key: str, request: Request) -> dict:
    """Delete a config key-value pair."""
    svc = _get_config_service(request)
    deleted = await svc.delete_value(project_id, key)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Config key '{key}' not found")
    return {"deleted": True}
