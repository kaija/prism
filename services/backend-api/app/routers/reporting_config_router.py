"""Project reporting configuration router (Req 2.1-2.3)."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.models.config import ReportingConfig
from app.services.config_service import ConfigService

router = APIRouter(
    prefix="/api/v1/projects/{project_id}/reporting",
    tags=["reporting-config"],
)


def _get_config_service(request: Request) -> ConfigService:
    return request.app.state.config_service


@router.put("", response_model=ReportingConfig)
async def set_reporting_config(
    project_id: str, body: ReportingConfig, request: Request
) -> ReportingConfig:
    """Set reporting configuration for a project."""
    svc = _get_config_service(request)
    await svc.set_reporting_config(project_id, body)
    return body


@router.get("", response_model=ReportingConfig)
async def get_reporting_config(
    project_id: str, request: Request
) -> ReportingConfig:
    """Get reporting configuration for a project."""
    svc = _get_config_service(request)
    return await svc.get_reporting_config(project_id)
