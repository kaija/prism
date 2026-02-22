"""JobService for async job lifecycle management in PostgreSQL.

Manages creation, status retrieval, and status updates for async report
generation jobs tracked in the jobs table.
"""

from __future__ import annotations

import json
from typing import Optional
from uuid import uuid4

import structlog

from app.models.report import JobStatus
from app.repositories.postgres_repo import PostgresRepository

logger = structlog.get_logger()


class JobService:
    """Manages async job lifecycle in PostgreSQL (Req 4, 13)."""

    def __init__(self, repo: PostgresRepository) -> None:
        self._repo = repo

    async def create_job(self, project_id: str, job_type: str, params: dict) -> str:
        """Create a job record with status 'queued'. Returns job_id."""
        job_id = str(uuid4())
        params_json = json.dumps(params)
        await self._repo.execute(
            """
            INSERT INTO jobs (job_id, project_id, job_type, status, params, created_at)
            VALUES ($1, $2, $3, 'queued', $4::jsonb, NOW())
            """,
            job_id,
            project_id,
            job_type,
            params_json,
        )
        logger.info("job_created", job_id=job_id, project_id=project_id, job_type=job_type)
        return job_id

    async def get_status(self, job_id: str) -> Optional[JobStatus]:
        """Get current job status and result if completed. Returns None if not found."""
        row = await self._repo.fetch_one(
            """
            SELECT job_id, status, result, error, created_at, started_at, completed_at
            FROM jobs WHERE job_id = $1
            """,
            job_id,
        )
        if row is None:
            return None
        result_data = row["result"]
        if isinstance(result_data, str):
            result_data = json.loads(result_data)
        return JobStatus(
            job_id=row["job_id"],
            status=row["status"],
            result=result_data,
            error=row["error"],
            created_at=row["created_at"],
            started_at=row["started_at"],
            completed_at=row["completed_at"],
        )

    async def update_status(
        self,
        job_id: str,
        status: str,
        result: Optional[dict] = None,
        error: Optional[str] = None,
    ) -> None:
        """Update job status, result, or error.

        Automatically sets started_at when status='running' and
        completed_at when status is 'completed' or 'failed'.
        """
        result_json = json.dumps(result) if result is not None else None

        if status == "running":
            await self._repo.execute(
                """
                UPDATE jobs SET status = $1, started_at = NOW()
                WHERE job_id = $2
                """,
                status,
                job_id,
            )
        elif status in ("completed", "failed"):
            await self._repo.execute(
                """
                UPDATE jobs SET status = $1, result = $2::jsonb, error = $3, completed_at = NOW()
                WHERE job_id = $4
                """,
                status,
                result_json,
                error,
                job_id,
            )
        else:
            await self._repo.execute(
                """
                UPDATE jobs SET status = $1
                WHERE job_id = $2
                """,
                status,
                job_id,
            )
        logger.info("job_status_updated", job_id=job_id, status=status)
