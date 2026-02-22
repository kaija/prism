"""Trigger settings CRUD router (Req 3.1-3.6)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from app.models.common import PaginatedResult
from app.models.trigger import TriggerCreate, TriggerSetting, TriggerUpdate
from app.services.trigger_service import TriggerService

router = APIRouter(
    prefix="/api/v1/projects/{project_id}/triggers",
    tags=["triggers"],
)


def _get_trigger_service(request: Request) -> TriggerService:
    return request.app.state.trigger_service


@router.post("", response_model=TriggerSetting, status_code=status.HTTP_201_CREATED)
async def create_trigger(
    project_id: str, body: TriggerCreate, request: Request
) -> TriggerSetting:
    """Create a new trigger setting."""
    svc = _get_trigger_service(request)
    try:
        return await svc.create(project_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("")
async def list_triggers(
    project_id: str,
    request: Request,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResult[TriggerSetting]:
    """List triggers with pagination."""
    svc = _get_trigger_service(request)
    return await svc.list(project_id, page, page_size)


@router.get("/{rule_id}", response_model=TriggerSetting)
async def get_trigger(
    project_id: str, rule_id: str, request: Request
) -> TriggerSetting:
    """Get a single trigger by rule_id."""
    svc = _get_trigger_service(request)
    trigger = await svc.get(project_id, rule_id)
    if trigger is None:
        raise HTTPException(status_code=404, detail=f"Trigger {rule_id} not found")
    return trigger


@router.put("/{rule_id}", response_model=TriggerSetting)
async def update_trigger(
    project_id: str, rule_id: str, body: TriggerUpdate, request: Request
) -> TriggerSetting:
    """Update an existing trigger setting."""
    svc = _get_trigger_service(request)
    try:
        return await svc.update(project_id, rule_id, body)
    except LookupError:
        raise HTTPException(status_code=404, detail=f"Trigger {rule_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.delete("/{rule_id}")
async def delete_trigger(
    project_id: str, rule_id: str, request: Request
) -> dict:
    """Delete a trigger setting."""
    svc = _get_trigger_service(request)
    deleted = await svc.delete(project_id, rule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Trigger {rule_id} not found")
    return {"deleted": True}
