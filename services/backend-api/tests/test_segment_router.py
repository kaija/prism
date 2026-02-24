"""Unit tests for Segment Router endpoints using httpx AsyncClient.

Tests HTTP status codes, response formats, and error mapping (404, 422)
by mounting the segment_router on a minimal FastAPI app with a mocked
SegmentService injected via app.state.

**Validates: Requirements 3.2, 4.3, 5.2**
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.models.common import PaginatedResult
from app.models.segment import SegmentResponse, SegmentTimeframe
from app.routers import segment_router

_NOW = datetime(2025, 1, 1, tzinfo=timezone.utc)
_BASE = "/api/v1/projects/proj1/segments"

_VALID_PAYLOAD = {
    "name": "active users",
    "description": "Users active in last 7 days",
    "dsl": 'UPPER(PROFILE("name"))',
    "timeframe": {"type": "relative", "relative": "last_7_days"},
}


def _make_segment_response(**overrides) -> SegmentResponse:
    defaults = dict(
        segment_id="seg-001",
        project_id="proj1",
        name="active users",
        description="Users active in last 7 days",
        dsl='UPPER(PROFILE("name"))',
        timeframe=SegmentTimeframe(type="relative", relative="last_7_days"),
        created_at=_NOW,
        updated_at=_NOW,
    )
    defaults.update(overrides)
    return SegmentResponse(**defaults)


def _make_segment_service() -> MagicMock:
    svc = MagicMock()
    svc.create = AsyncMock()
    svc.list = AsyncMock()
    svc.get = AsyncMock()
    svc.update = AsyncMock()
    svc.delete = AsyncMock()
    return svc


@pytest.fixture
def app():
    test_app = FastAPI()
    test_app.include_router(segment_router.router)
    test_app.state.segment_service = _make_segment_service()
    return test_app


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ── POST create segment ───────────────────────────────────────────────────


class TestCreateSegment:
    async def test_create_returns_201(self, client, app):
        seg = _make_segment_response()
        app.state.segment_service.create.return_value = seg

        resp = await client.post(f"{_BASE}", json=_VALID_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["segment_id"] == "seg-001"
        assert data["name"] == "active users"

    async def test_create_invalid_dsl_returns_422(self, client, app):
        app.state.segment_service.create.side_effect = ValueError(
            "DSL validation failed: syntax error"
        )

        resp = await client.post(f"{_BASE}", json=_VALID_PAYLOAD)
        assert resp.status_code == 422


# ── GET list segments ──────────────────────────────────────────────────────


class TestListSegments:
    async def test_list_returns_200(self, client, app):
        result = PaginatedResult(
            items=[_make_segment_response()],
            total=1,
            page=1,
            page_size=20,
        )
        app.state.segment_service.list.return_value = result

        resp = await client.get(f"{_BASE}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["segment_id"] == "seg-001"


# ── GET single segment ────────────────────────────────────────────────────


class TestGetSegment:
    async def test_get_returns_200(self, client, app):
        seg = _make_segment_response()
        app.state.segment_service.get.return_value = seg

        resp = await client.get(f"{_BASE}/seg-001")
        assert resp.status_code == 200
        assert resp.json()["segment_id"] == "seg-001"

    async def test_get_not_found_returns_404(self, client, app):
        app.state.segment_service.get.return_value = None

        resp = await client.get(f"{_BASE}/nonexistent")
        assert resp.status_code == 404


# ── PUT update segment ────────────────────────────────────────────────────


class TestUpdateSegment:
    async def test_update_returns_200(self, client, app):
        updated = _make_segment_response(name="renamed segment")
        app.state.segment_service.update.return_value = updated

        resp = await client.put(
            f"{_BASE}/seg-001",
            json={"name": "renamed segment"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "renamed segment"

    async def test_update_not_found_returns_404(self, client, app):
        app.state.segment_service.update.side_effect = LookupError(
            "Segment not found"
        )

        resp = await client.put(
            f"{_BASE}/nonexistent",
            json={"name": "new name"},
        )
        assert resp.status_code == 404

    async def test_update_invalid_dsl_returns_422(self, client, app):
        app.state.segment_service.update.side_effect = ValueError(
            "DSL validation failed: syntax error"
        )

        resp = await client.put(
            f"{_BASE}/seg-001",
            json={"dsl": "INVALID("},
        )
        assert resp.status_code == 422


# ── DELETE segment ─────────────────────────────────────────────────────────


class TestDeleteSegment:
    async def test_delete_returns_200(self, client, app):
        app.state.segment_service.delete.return_value = True

        resp = await client.delete(f"{_BASE}/seg-001")
        assert resp.status_code == 200
        assert resp.json() == {"deleted": True}

    async def test_delete_not_found_returns_404(self, client, app):
        app.state.segment_service.delete.return_value = False

        resp = await client.delete(f"{_BASE}/nonexistent")
        assert resp.status_code == 404
