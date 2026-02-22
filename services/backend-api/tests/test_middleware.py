"""Unit tests for middleware: RequestLogMiddleware, TenantMiddleware, error handlers."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel

from app.middleware.error_handler import (
    global_exception_handler,
    validation_exception_handler,
)
from app.middleware.request_log import RequestLogMiddleware
from app.middleware.tenant import TenantMiddleware


# ── Helpers ────────────────────────────────────────────────────────────────


def _build_app(
    *,
    include_request_log: bool = False,
    include_tenant: bool = False,
    install_error_handlers: bool = False,
    pg_repo: object | None = None,
) -> FastAPI:
    """Build a minimal FastAPI app with selected middleware."""
    app = FastAPI()

    if install_error_handlers:
        app.add_exception_handler(Exception, global_exception_handler)
        app.add_exception_handler(
            RequestValidationError, validation_exception_handler
        )

    if include_tenant:
        app.add_middleware(TenantMiddleware)

    if include_request_log:
        app.add_middleware(RequestLogMiddleware)

    if pg_repo is not None:
        app.state.pg_repo = pg_repo

    return app


def _mock_pg_repo(*, execute_side_effect=None) -> MagicMock:
    repo = MagicMock()
    repo.execute = AsyncMock(side_effect=execute_side_effect)
    return repo


# ── TenantMiddleware ───────────────────────────────────────────────────────


class TestTenantMiddleware:
    """Tests for TenantMiddleware project_id extraction."""

    @pytest.fixture
    def app(self):
        app = _build_app(include_tenant=True)

        @app.get("/api/v1/projects/{project_id}/config")
        async def _config(request: Request, project_id: str):
            return {"project_id": request.state.project_id}

        @app.get("/health")
        async def _health(request: Request):
            return {"project_id": request.state.project_id}

        return app

    @pytest.fixture
    async def client(self, app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c

    async def test_extracts_project_id_from_path(self, client):
        resp = await client.get("/api/v1/projects/proj-123/config")
        assert resp.status_code == 200
        assert resp.json()["project_id"] == "proj-123"

    async def test_sets_none_for_non_project_route(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["project_id"] is None

    async def test_extracts_uuid_style_project_id(self):
        app = _build_app(include_tenant=True)

        @app.get("/api/v1/projects/{project_id}/triggers")
        async def _triggers(request: Request, project_id: str):
            return {"project_id": request.state.project_id}

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            resp = await c.get(
                "/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/triggers"
            )
        assert resp.json()["project_id"] == "550e8400-e29b-41d4-a716-446655440000"


# ── RequestLogMiddleware ───────────────────────────────────────────────────


class TestRequestLogMiddleware:
    """Tests for fire-and-forget request logging."""

    @pytest.fixture
    def pg_repo(self):
        return _mock_pg_repo()

    @pytest.fixture
    def app(self, pg_repo):
        app = _build_app(include_request_log=True, pg_repo=pg_repo)

        @app.get("/api/v1/projects/{project_id}/config")
        async def _config(project_id: str):
            return {"ok": True}

        @app.get("/health")
        async def _health():
            return {"status": "ok"}

        return app

    @pytest.fixture
    async def client(self, app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c

    async def test_logs_request_with_project_id(self, client, pg_repo):
        await client.get("/api/v1/projects/proj-1/config")
        # Give the fire-and-forget task a moment to complete
        await asyncio.sleep(0.05)

        pg_repo.execute.assert_called_once()
        args = pg_repo.execute.call_args
        assert args[0][0].startswith("INSERT INTO request_logs")
        assert args[0][1] == "proj-1"  # project_id
        assert args[0][2] == "GET"  # method
        assert "/projects/proj-1/config" in args[0][3]  # path
        assert args[0][4] == 200  # status_code
        assert isinstance(args[0][5], float)  # duration_ms

    async def test_logs_request_without_project_id(self, client, pg_repo):
        await client.get("/health")
        await asyncio.sleep(0.05)

        pg_repo.execute.assert_called_once()
        args = pg_repo.execute.call_args
        assert args[0][1] is None  # project_id

    async def test_persist_failure_does_not_affect_response(self):
        """Req 12.2 — persist failure must not affect the response."""
        failing_repo = _mock_pg_repo(execute_side_effect=RuntimeError("DB down"))
        app = _build_app(include_request_log=True, pg_repo=failing_repo)

        @app.get("/health")
        async def _health():
            return {"status": "ok"}

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            resp = await c.get("/health")
        assert resp.status_code == 200
        # Give the fire-and-forget task time to fail silently
        await asyncio.sleep(0.05)


# ── Error Handlers ─────────────────────────────────────────────────────────


class TestErrorHandlers:
    """Tests for global_exception_handler and validation_exception_handler."""

    @pytest.fixture
    def app(self):
        app = _build_app(install_error_handlers=True)

        @app.get("/raise-value-error")
        async def _value_error():
            raise ValueError("bad input")

        @app.get("/raise-lookup-error")
        async def _lookup_error():
            raise LookupError("not found")

        @app.get("/raise-runtime-error")
        async def _runtime_error():
            raise RuntimeError("boom")

        class Body(BaseModel):
            name: str
            count: int

        @app.post("/validate")
        async def _validate(body: Body):
            return {"ok": True}

        return app

    @pytest.fixture
    async def client(self, app):
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c

    async def test_value_error_returns_422(self, client):
        resp = await client.get("/raise-value-error")
        assert resp.status_code == 422
        body = resp.json()
        assert body["error"] == "VALIDATION_ERROR"
        assert "bad input" in body["detail"]

    async def test_lookup_error_returns_404(self, client):
        resp = await client.get("/raise-lookup-error")
        assert resp.status_code == 404
        body = resp.json()
        assert body["error"] == "NOT_FOUND"
        assert "not found" in body["detail"]

    async def test_runtime_error_returns_500(self, client):
        resp = await client.get("/raise-runtime-error")
        assert resp.status_code == 500
        body = resp.json()
        assert body["error"] == "INTERNAL_ERROR"
        # Must not leak internal details
        assert "boom" not in body.get("detail", "")

    async def test_validation_error_returns_422_with_field_errors(self, client):
        resp = await client.post("/validate", json={"name": 123})
        assert resp.status_code == 422
        body = resp.json()
        assert body["error"] == "VALIDATION_ERROR"
        assert body["field_errors"] is not None
        assert len(body["field_errors"]) > 0

    async def test_error_response_excludes_none_fields(self, client):
        resp = await client.get("/raise-lookup-error")
        body = resp.json()
        # field_errors should not be present when None
        assert "field_errors" not in body
