"""Profile summary, timeline, and event-summary router (Req 10.1-10.3, 11.1-11.3)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.models.common import PaginatedResult
from app.models.profile import ProfileSummaryRequest, TimelineRequest
from app.services.profile_summary_service import ProfileSummaryService

router = APIRouter(
    prefix="/api/v1/projects/{project_id}/profiles",
    tags=["profiles"],
)


class EventSummaryRequest(BaseModel):
    """Request body for event summary endpoint."""

    profile_ids: list[str]


def _get_profile_service(request: Request) -> ProfileSummaryService:
    return request.app.state.profile_summary_service


@router.post("/summary")
async def profile_summary(
    project_id: str, body: ProfileSummaryRequest, request: Request
) -> PaginatedResult[dict]:
    """Query profiles with filters and custom column selection."""
    svc = _get_profile_service(request)
    return await svc.query_profiles(
        project_id=project_id,
        filters=body.filters,
        columns=body.columns,
        page=body.page,
        page_size=body.page_size,
    )


@router.post("/timeline")
async def profile_timeline(
    project_id: str, body: TimelineRequest, request: Request
) -> list[dict[str, Any]]:
    """Get time-bucketed event data for a profile group."""
    svc = _get_profile_service(request)
    return await svc.get_timeline(
        project_id=project_id,
        profile_ids=body.profile_ids,
        timeframe=body.timeframe,
        filters=body.filters,
        bucket_size=body.bucket_size,
    )


@router.post("/event-summary")
async def profile_event_summary(
    project_id: str, body: EventSummaryRequest, request: Request
) -> list[dict[str, Any]]:
    """Get aggregated event counts by event_name for a profile group."""
    svc = _get_profile_service(request)
    return await svc.get_event_summary(
        project_id=project_id,
        profile_ids=body.profile_ids,
    )
