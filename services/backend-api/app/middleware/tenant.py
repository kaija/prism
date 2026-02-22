"""Tenant middleware — extracts project_id from the URL path (Req 15.4).

Sets ``request.state.project_id`` so downstream handlers can use it for
multi-tenant isolation.  Non-project-scoped routes (e.g. ``/health``,
``/jobs``) get ``project_id = None``.
"""

from __future__ import annotations

import re

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_PROJECT_RE = re.compile(r"/projects/([^/]+)")


class TenantMiddleware(BaseHTTPMiddleware):
    """Extract ``project_id`` from the URL path and store it in request state."""

    async def dispatch(self, request: Request, call_next) -> Response:
        match = _PROJECT_RE.search(request.url.path)
        request.state.project_id = match.group(1) if match else None
        return await call_next(request)
