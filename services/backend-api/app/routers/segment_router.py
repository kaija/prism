"""Segment CRUD router (Req 8.1, 1.1, 1.2, 2.1, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 5.2)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from app.models.common import PaginatedResult
from app.models.segment import SegmentCreate, SegmentResponse, SegmentUpdate
from app.services.segment_service import SegmentService

router = APIRouter(
    prefix="/api/v1/projects/{project_id}/segments",
    tags=["segments"],
)


def _get_segment_service(request: Request) -> SegmentService:
    return request.app.state.segment_service


@router.post("", response_model=SegmentResponse, status_code=status.HTTP_201_CREATED)
async def create_segment(
    project_id: str, body: SegmentCreate, request: Request
) -> SegmentResponse:
    """Create a new segment."""
    svc = _get_segment_service(request)
    try:
        return await svc.create(project_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("")
async def list_segments(
    project_id: str,
    request: Request,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResult[SegmentResponse]:
    """List segments with pagination."""
    svc = _get_segment_service(request)
    return await svc.list(project_id, page, page_size)


@router.get("/{segment_id}", response_model=SegmentResponse)
async def get_segment(
    project_id: str, segment_id: str, request: Request
) -> SegmentResponse:
    """Get a single segment by segment_id."""
    svc = _get_segment_service(request)
    segment = await svc.get(project_id, segment_id)
    if segment is None:
        raise HTTPException(status_code=404, detail=f"Segment {segment_id} not found")
    return segment


@router.put("/{segment_id}", response_model=SegmentResponse)
async def update_segment(
    project_id: str, segment_id: str, body: SegmentUpdate, request: Request
) -> SegmentResponse:
    """Update an existing segment."""
    svc = _get_segment_service(request)
    try:
        return await svc.update(project_id, segment_id, body)
    except LookupError:
        raise HTTPException(status_code=404, detail=f"Segment {segment_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.delete("/{segment_id}")
async def delete_segment(
    project_id: str, segment_id: str, request: Request
) -> dict:
    """Delete a segment."""
    svc = _get_segment_service(request)
    deleted = await svc.delete(project_id, segment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Segment {segment_id} not found")
    return {"deleted": True}
