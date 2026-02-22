"""Report generation router (Req 5.1-5.4, 13.1)."""

from __future__ import annotations

from fastapi import APIRouter, Request, status

from app.models.report import JobResponse, ReportRequest
from app.services.report_service import ReportService

router = APIRouter(
    prefix="/api/v1/projects/{project_id}/reports",
    tags=["reports"],
)


def _get_report_service(request: Request) -> ReportService:
    return request.app.state.report_service


@router.post("", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def submit_report(
    project_id: str, body: ReportRequest, request: Request
) -> JobResponse:
    """Submit a report generation request. Returns 202 with job_id."""
    svc = _get_report_service(request)
    return await svc.submit_report(project_id, body)
