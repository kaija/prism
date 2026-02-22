"""Job status router (Req 4.4, 13.2, 13.3)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.models.report import JobStatus
from app.services.job_service import JobService

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


def _get_job_service(request: Request) -> JobService:
    return request.app.state.job_service


@router.get("/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str, request: Request) -> JobStatus:
    """Get current status of an async job."""
    svc = _get_job_service(request)
    status = await svc.get_status(job_id)
    if status is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return status
