"""Request logging middleware — persists request metadata to PostgreSQL (Req 12).

Fire-and-forget: the response is returned immediately and the log record
is written asynchronously.  If the write fails the error is logged and
the original response is unaffected (Req 12.2).
"""

from __future__ import annotations

import asyncio
import re
import time
from typing import TYPE_CHECKING

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

if TYPE_CHECKING:
    from app.repositories.postgres_repo import PostgresRepository

logger = structlog.get_logger()

_PROJECT_RE = re.compile(r"/projects/([^/]+)")

INSERT_LOG_SQL = (
    "INSERT INTO request_logs (project_id, method, path, status_code, duration_ms) "
    "VALUES ($1, $2, $3, $4, $5)"
)


class RequestLogMiddleware(BaseHTTPMiddleware):
    """Persist every request's metadata to the ``request_logs`` table."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        duration_ms = (time.monotonic() - start) * 1000

        # Fire-and-forget — never block the response
        asyncio.create_task(
            self._persist(request, response, duration_ms)
        )
        return response

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_project_id(path: str) -> str | None:
        m = _PROJECT_RE.search(path)
        return m.group(1) if m else None

    async def _persist(
        self,
        request: Request,
        response: Response,
        duration_ms: float,
    ) -> None:
        try:
            pg_repo: PostgresRepository = request.app.state.pg_repo
            project_id = self._extract_project_id(request.url.path)
            await pg_repo.execute(
                INSERT_LOG_SQL,
                project_id,
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )
        except Exception:
            # Req 12.2 — log the failure, never propagate
            logger.exception("request_log_persist_failed")
