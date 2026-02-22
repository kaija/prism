"""ReportService for orchestrating async report generation.

Handles report submission (creating jobs and firing async tasks),
concurrency control, SQL generation via QueryBuilderService, and
execution against DuckDB. Supports trend, attribution, and cohort
report types (Req 4, 5, 13).
"""

from __future__ import annotations

import asyncio
from typing import Any

import structlog

from app.infra.concurrency_limiter import ConcurrencyLimiter
from app.models.report import (
    Aggregation,
    EventSelection,
    JobResponse,
    ReportRequest,
    Timeframe,
)
from app.repositories.duckdb_repo import DuckDBRepository
from app.services.job_service import JobService
from app.services.query_builder import QueryBuilderService

logger = structlog.get_logger()


class ReportService:
    """Orchestrates async report generation (Req 4, 5, 13)."""

    def __init__(
        self,
        job_service: JobService,
        query_builder: QueryBuilderService,
        duckdb_repo: DuckDBRepository,
        concurrency_limiter: ConcurrencyLimiter,
    ) -> None:
        self._job_service = job_service
        self._query_builder = query_builder
        self._duckdb_repo = duckdb_repo
        self._limiter = concurrency_limiter

    async def submit_report(
        self, project_id: str, request: ReportRequest
    ) -> JobResponse:
        """Submit a report request. Returns job_id (202 Accepted).

        Creates a job record via JobService, then fires off _execute_report
        as an asyncio background task (fire-and-forget).
        """
        job_id = await self._job_service.create_job(
            project_id=project_id,
            job_type=request.report_type,
            params=request.model_dump(),
        )
        logger.info(
            "report_submitted",
            job_id=job_id,
            project_id=project_id,
            report_type=request.report_type,
        )

        # Fire-and-forget: schedule execution as a background task
        asyncio.create_task(
            self._execute_report(job_id, project_id, request)
        )

        return JobResponse(job_id=job_id, status="queued")

    async def _execute_report(
        self, job_id: str, project_id: str, request: ReportRequest
    ) -> None:
        """Internal: acquire concurrency slot, build SQL, execute, store result.

        Updates job status through its lifecycle:
        - queued → running (after acquiring concurrency slot)
        - running → completed (on success, with result)
        - running → failed (on error, with error details)

        Always releases the concurrency slot in the finally block.
        """
        acquired = False
        try:
            # Update to running and acquire concurrency slot
            await self._job_service.update_status(job_id, "running")
            await self._limiter.acquire(project_id)
            acquired = True

            logger.info(
                "report_execution_started",
                job_id=job_id,
                project_id=project_id,
                report_type=request.report_type,
            )

            # Dispatch to the appropriate report generator
            if request.report_type == "trend":
                result = await self.generate_trend(project_id, request)
            elif request.report_type == "attribution":
                result = await self.generate_attribution(project_id, request)
            elif request.report_type == "cohort":
                result = await self.generate_cohort(project_id, request)
            else:
                raise ValueError(f"Unsupported report type: {request.report_type}")

            # Store result
            await self._job_service.update_status(
                job_id, "completed", result=result
            )
            logger.info("report_execution_completed", job_id=job_id)

        except Exception as exc:
            logger.error(
                "report_execution_failed",
                job_id=job_id,
                error=str(exc),
            )
            await self._job_service.update_status(
                job_id, "failed", error=str(exc)
            )
        finally:
            if acquired:
                self._limiter.release(project_id)

    async def generate_trend(
        self, project_id: str, request: ReportRequest
    ) -> dict[str, Any]:
        """Build and execute trend report SQL against DuckDB.

        Trend reports produce time-series data showing event counts or
        aggregated values over the specified period (Req 5.1).
        """
        sql, params = self._query_builder.build_query(request)
        rows = self._duckdb_repo.execute_query(sql, params)
        return {
            "report_type": "trend",
            "project_id": project_id,
            "data": rows,
        }

    async def generate_attribution(
        self, project_id: str, request: ReportRequest
    ) -> dict[str, Any]:
        """Build and execute attribution report SQL against DuckDB.

        Attribution reports show which source events contributed to
        conversions (Req 5.2).
        """
        sql, params = self._query_builder.build_query(request)
        rows = self._duckdb_repo.execute_query(sql, params)
        return {
            "report_type": "attribution",
            "project_id": project_id,
            "data": rows,
        }

    async def generate_cohort(
        self, project_id: str, request: ReportRequest
    ) -> dict[str, Any]:
        """Build and execute cohort report SQL against DuckDB.

        Cohort reports return retention data grouped by cohort
        periods (Req 5.3).
        """
        sql, params = self._query_builder.build_query(request)
        rows = self._duckdb_repo.execute_query(sql, params)
        return {
            "report_type": "cohort",
            "project_id": project_id,
            "data": rows,
        }
