"""Unit tests for all API routers using httpx AsyncClient.

Tests use mocked services injected via app.state to verify
routing, status codes, and request/response handling.
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.models.common import PaginatedResult
from app.models.config import ReportingConfig
from app.models.report import JobResponse, JobStatus
from app.models.trigger import TriggerAction, TriggerSetting
from app.routers import (
    config_router,
    health_router,
    job_router,
    profile_router,
    report_router,
    reporting_config_router,
    trigger_router,
)


def _make_async_service_mock(**methods: dict) -> MagicMock:
    """Create a MagicMock where specified methods are AsyncMock."""
    svc = MagicMock()
    for name in methods:
        setattr(svc, name, AsyncMock())
    return svc


@pytest.fixture
def app():
    """Create a FastAPI app with all routers and mocked services."""
    test_app = FastAPI()
    test_app.include_router(config_router.router)
    test_app.include_router(reporting_config_router.router)
    test_app.include_router(trigger_router.router)
    test_app.include_router(report_router.router)
    test_app.include_router(profile_router.router)
    test_app.include_router(job_router.router)
    test_app.include_router(health_router.router)

    test_app.state.config_service = _make_async_service_mock(
        get_value=1, get_all=1, set_value=1, delete_value=1,
        get_reporting_config=1, set_reporting_config=1,
    )
    test_app.state.trigger_service = _make_async_service_mock(
        create=1, get=1, list=1, update=1, delete=1,
    )
    test_app.state.report_service = _make_async_service_mock(
        submit_report=1,
    )
    test_app.state.profile_summary_service = _make_async_service_mock(
        query_profiles=1, get_event_summary=1, get_timeline=1,
    )
    test_app.state.job_service = _make_async_service_mock(
        get_status=1,
    )

    return test_app


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ── Health Router ──────────────────────────────────────────────────────────


class TestHealthRouter:
    async def test_health_returns_ok(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


# ── Config Router ──────────────────────────────────────────────────────────


class TestConfigRouter:
    async def test_set_config_value(self, client, app):
        app.state.config_service.set_value.return_value = None

        resp = await client.put(
            "/api/v1/projects/proj1/config/my_key",
            json={"key": "my_key", "value": "my_val"},
        )
        assert resp.status_code == 200
        assert resp.json() == {"key": "my_key", "value": "my_val"}
        app.state.config_service.set_value.assert_called_once_with(
            "proj1", "my_key", "my_val"
        )

    async def test_get_config_value_found(self, client, app):
        app.state.config_service.get_value.return_value = "found_val"

        resp = await client.get("/api/v1/projects/proj1/config/my_key")
        assert resp.status_code == 200
        assert resp.json() == {"key": "my_key", "value": "found_val"}

    async def test_get_config_value_not_found(self, client, app):
        app.state.config_service.get_value.return_value = None

        resp = await client.get("/api/v1/projects/proj1/config/missing")
        assert resp.status_code == 404

    async def test_get_all_config(self, client, app):
        app.state.config_service.get_all.return_value = {"k1": "v1", "k2": "v2"}

        resp = await client.get("/api/v1/projects/proj1/config")
        assert resp.status_code == 200
        assert resp.json() == {"items": {"k1": "v1", "k2": "v2"}}

    async def test_delete_config_value_found(self, client, app):
        app.state.config_service.delete_value.return_value = True

        resp = await client.delete("/api/v1/projects/proj1/config/my_key")
        assert resp.status_code == 200
        assert resp.json() == {"deleted": True}

    async def test_delete_config_value_not_found(self, client, app):
        app.state.config_service.delete_value.return_value = False

        resp = await client.delete("/api/v1/projects/proj1/config/missing")
        assert resp.status_code == 404


# ── Reporting Config Router ────────────────────────────────────────────────


class TestReportingConfigRouter:
    async def test_set_reporting_config(self, client, app):
        app.state.config_service.set_reporting_config.return_value = None

        body = {
            "default_timeframe": "last_7_days",
            "max_concurrent_reports": 5,
            "default_report_type": "cohort",
        }
        resp = await client.put("/api/v1/projects/proj1/reporting", json=body)
        assert resp.status_code == 200
        data = resp.json()
        assert data["default_timeframe"] == "last_7_days"
        assert data["max_concurrent_reports"] == 5

    async def test_get_reporting_config(self, client, app):
        app.state.config_service.get_reporting_config.return_value = ReportingConfig(
            default_timeframe="last_30_days",
            max_concurrent_reports=3,
            default_report_type="trend",
        )

        resp = await client.get("/api/v1/projects/proj1/reporting")
        assert resp.status_code == 200
        data = resp.json()
        assert data["default_timeframe"] == "last_30_days"
        assert data["max_concurrent_reports"] == 3

    async def test_set_reporting_config_validation_error(self, client, app):
        body = {
            "default_timeframe": "last_7_days",
            "max_concurrent_reports": 0,  # below ge=1
            "default_report_type": "trend",
        }
        resp = await client.put("/api/v1/projects/proj1/reporting", json=body)
        assert resp.status_code == 422


# ── Trigger Router ─────────────────────────────────────────────────────────

_NOW = datetime(2024, 1, 1, tzinfo=timezone.utc)
_TRIGGER_ACTION = TriggerAction(type="webhook", enabled=True, url="https://example.com/hook")
_TRIGGER = TriggerSetting(
    rule_id="rule-1",
    project_id="proj1",
    name="My Trigger",
    description="desc",
    dsl="event.name == 'click'",
    status="active",
    actions=[_TRIGGER_ACTION],
    created_at=_NOW,
    updated_at=_NOW,
)


class TestTriggerRouter:
    async def test_create_trigger(self, client, app):
        app.state.trigger_service.create.return_value = _TRIGGER

        body = {
            "name": "My Trigger",
            "dsl": "event.name == 'click'",
            "actions": [{"type": "webhook", "url": "https://example.com/hook"}],
        }
        resp = await client.post("/api/v1/projects/proj1/triggers", json=body)
        assert resp.status_code == 201
        assert resp.json()["rule_id"] == "rule-1"

    async def test_create_trigger_invalid_dsl(self, client, app):
        app.state.trigger_service.create.side_effect = ValueError("Invalid DSL")

        body = {
            "name": "Bad Trigger",
            "dsl": "(((",
            "actions": [{"type": "webhook", "url": "https://example.com/hook"}],
        }
        resp = await client.post("/api/v1/projects/proj1/triggers", json=body)
        assert resp.status_code == 422

    async def test_list_triggers(self, client, app):
        app.state.trigger_service.list.return_value = PaginatedResult(
            items=[_TRIGGER], total=1, page=1, page_size=20
        )

        resp = await client.get("/api/v1/projects/proj1/triggers?page=1&page_size=20")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    async def test_get_trigger_found(self, client, app):
        app.state.trigger_service.get.return_value = _TRIGGER

        resp = await client.get("/api/v1/projects/proj1/triggers/rule-1")
        assert resp.status_code == 200
        assert resp.json()["rule_id"] == "rule-1"

    async def test_get_trigger_not_found(self, client, app):
        app.state.trigger_service.get.return_value = None

        resp = await client.get("/api/v1/projects/proj1/triggers/missing")
        assert resp.status_code == 404

    async def test_update_trigger(self, client, app):
        updated = _TRIGGER.model_copy(update={"name": "Updated"})
        app.state.trigger_service.update.return_value = updated

        resp = await client.put(
            "/api/v1/projects/proj1/triggers/rule-1",
            json={"name": "Updated"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated"

    async def test_update_trigger_not_found(self, client, app):
        app.state.trigger_service.update.side_effect = LookupError("not found")

        resp = await client.put(
            "/api/v1/projects/proj1/triggers/missing",
            json={"name": "Updated"},
        )
        assert resp.status_code == 404

    async def test_delete_trigger_found(self, client, app):
        app.state.trigger_service.delete.return_value = True

        resp = await client.delete("/api/v1/projects/proj1/triggers/rule-1")
        assert resp.status_code == 200
        assert resp.json() == {"deleted": True}

    async def test_delete_trigger_not_found(self, client, app):
        app.state.trigger_service.delete.return_value = False

        resp = await client.delete("/api/v1/projects/proj1/triggers/missing")
        assert resp.status_code == 404


# ── Report Router ──────────────────────────────────────────────────────────


class TestReportRouter:
    async def test_submit_report_returns_202(self, client, app):
        app.state.report_service.submit_report.return_value = JobResponse(
            job_id="job-123", status="queued"
        )

        body = {
            "report_type": "trend",
            "timeframe": {"type": "relative", "relative": "last_7_days"},
            "event_selection": {"type": "all"},
            "aggregation": {"function": "count"},
        }
        resp = await client.post("/api/v1/projects/proj1/reports", json=body)
        assert resp.status_code == 202
        data = resp.json()
        assert data["job_id"] == "job-123"
        assert data["status"] == "queued"

    async def test_submit_report_validation_error(self, client, app):
        body = {
            "report_type": "invalid_type",
            "timeframe": {"type": "relative"},
            "event_selection": {"type": "all"},
            "aggregation": {"function": "count"},
        }
        resp = await client.post("/api/v1/projects/proj1/reports", json=body)
        assert resp.status_code == 422


# ── Job Router ─────────────────────────────────────────────────────────────


class TestJobRouter:
    async def test_get_job_found(self, client, app):
        app.state.job_service.get_status.return_value = JobStatus(
            job_id="job-123",
            status="completed",
            result={"data": []},
            created_at=_NOW,
            completed_at=_NOW,
        )

        resp = await client.get("/api/v1/jobs/job-123")
        assert resp.status_code == 200
        data = resp.json()
        assert data["job_id"] == "job-123"
        assert data["status"] == "completed"

    async def test_get_job_not_found(self, client, app):
        app.state.job_service.get_status.return_value = None

        resp = await client.get("/api/v1/jobs/missing")
        assert resp.status_code == 404


# ── Profile Router ─────────────────────────────────────────────────────────


class TestProfileRouter:
    async def test_profile_summary(self, client, app):
        app.state.profile_summary_service.query_profiles.return_value = PaginatedResult(
            items=[{"user_id": "u1", "name": "Alice"}],
            total=1,
            page=1,
            page_size=20,
        )

        body = {
            "columns": ["user_id", "name"],
            "page": 1,
            "page_size": 20,
        }
        resp = await client.post("/api/v1/projects/proj1/profiles/summary", json=body)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    async def test_profile_timeline(self, client, app):
        app.state.profile_summary_service.get_timeline.return_value = [
            {"bucket": "2024-01-01", "count": 10}
        ]

        body = {
            "profile_ids": ["u1", "u2"],
            "timeframe": {"type": "relative", "relative": "last_7_days"},
            "bucket_size": "day",
        }
        resp = await client.post("/api/v1/projects/proj1/profiles/timeline", json=body)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["count"] == 10

    async def test_profile_event_summary(self, client, app):
        app.state.profile_summary_service.get_event_summary.return_value = [
            {"event_name": "page_view", "count": 100},
            {"event_name": "click", "count": 50},
        ]

        body = {"profile_ids": ["u1", "u2"]}
        resp = await client.post(
            "/api/v1/projects/proj1/profiles/event-summary", json=body
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["event_name"] == "page_view"

    async def test_profile_summary_validation_error(self, client, app):
        """columns is required and must have at least 1 item."""
        body = {"columns": []}
        resp = await client.post("/api/v1/projects/proj1/profiles/summary", json=body)
        assert resp.status_code == 422
