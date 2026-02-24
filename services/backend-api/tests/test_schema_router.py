"""Unit tests for Schema Router endpoints using httpx AsyncClient.

Tests HTTP status codes, response formats, and schema_type path parameter
validation by mounting the schema_router on a minimal FastAPI app with a
mocked SchemaService injected via app.state.

**Validates: Requirements 2.2, 2.3, 5.5**
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.models.schema import PropertyResponse
from app.routers import schema_router

_NOW = datetime(2025, 1, 1, tzinfo=timezone.utc)
_BASE = "/api/v1/projects/proj1/schemas"


def _make_property_response(**overrides) -> PropertyResponse:
    defaults = dict(
        id=1,
        project_id="proj1",
        schema_type="profile",
        name="birthday",
        data_type="string",
        description="user birthday",
        property_type="static",
        formula=None,
        created_at=_NOW,
    )
    defaults.update(overrides)
    return PropertyResponse(**defaults)


def _make_schema_service() -> MagicMock:
    svc = MagicMock()
    svc.create_property = AsyncMock()
    svc.list_properties = AsyncMock()
    svc.get_property = AsyncMock()
    svc.update_property = AsyncMock()
    svc.delete_property = AsyncMock()
    return svc


@pytest.fixture
def app():
    test_app = FastAPI()
    test_app.include_router(schema_router.router)
    test_app.state.schema_service = _make_schema_service()
    return test_app


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ── POST create property ───────────────────────────────────────────────────


class TestCreateProperty:
    async def test_create_returns_201(self, client, app):
        prop = _make_property_response()
        app.state.schema_service.create_property.return_value = prop

        resp = await client.post(
            f"{_BASE}/profile",
            json={
                "name": "birthday",
                "data_type": "string",
                "description": "user birthday",
                "property_type": "static",
                "formula": None,
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] == 1
        assert data["name"] == "birthday"
        assert data["schema_type"] == "profile"

    async def test_create_duplicate_name_returns_409(self, client, app):
        app.state.schema_service.create_property.side_effect = ValueError(
            "Property name 'birthday' already exists"
        )

        resp = await client.post(
            f"{_BASE}/profile",
            json={
                "name": "birthday",
                "data_type": "string",
                "property_type": "static",
            },
        )
        assert resp.status_code == 409
        detail = resp.json()["detail"]
        assert detail["error"] == "Conflict"

    async def test_create_invalid_dsl_returns_422(self, client, app):
        app.state.schema_service.create_property.side_effect = ValueError(
            "DSL validation failed: DSL syntax error: unexpected token"
        )

        resp = await client.post(
            f"{_BASE}/profile",
            json={
                "name": "bad",
                "data_type": "string",
                "property_type": "dynamic",
                "formula": "INVALID(",
            },
        )
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert detail["error"] == "Validation error"
        assert "field_errors" in detail

    async def test_create_dynamic_without_formula_returns_422(self, client, app):
        app.state.schema_service.create_property.side_effect = ValueError(
            "Formula is required for dynamic properties"
        )

        resp = await client.post(
            f"{_BASE}/profile",
            json={
                "name": "computed",
                "data_type": "string",
                "property_type": "dynamic",
            },
        )
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert detail["error"] == "Validation error"


# ── GET list properties ────────────────────────────────────────────────────


class TestListProperties:
    async def test_list_returns_200(self, client, app):
        props = [
            _make_property_response(id=1, name="birthday"),
            _make_property_response(id=2, name="email", data_type="string"),
        ]
        app.state.schema_service.list_properties.return_value = props

        resp = await client.get(f"{_BASE}/profile")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["name"] == "birthday"
        assert data[1]["name"] == "email"


# ── GET single property ───────────────────────────────────────────────────


class TestGetProperty:
    async def test_get_returns_200(self, client, app):
        prop = _make_property_response()
        app.state.schema_service.get_property.return_value = prop

        resp = await client.get(f"{_BASE}/profile/1")
        assert resp.status_code == 200
        assert resp.json()["id"] == 1

    async def test_get_not_found_returns_404(self, client, app):
        app.state.schema_service.get_property.return_value = None

        resp = await client.get(f"{_BASE}/profile/9999")
        assert resp.status_code == 404
        detail = resp.json()["detail"]
        assert detail["error"] == "Property not found"


# ── PUT update property ───────────────────────────────────────────────────


class TestUpdateProperty:
    async def test_update_returns_200(self, client, app):
        updated = _make_property_response(description="updated desc")
        app.state.schema_service.update_property.return_value = updated

        resp = await client.put(
            f"{_BASE}/profile/1",
            json={"description": "updated desc"},
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "updated desc"

    async def test_update_not_found_returns_404(self, client, app):
        app.state.schema_service.update_property.side_effect = LookupError(
            "Property 9999 not found"
        )

        resp = await client.put(
            f"{_BASE}/profile/9999",
            json={"description": "new"},
        )
        assert resp.status_code == 404
        detail = resp.json()["detail"]
        assert detail["error"] == "Property not found"


# ── DELETE property ────────────────────────────────────────────────────────


class TestDeleteProperty:
    async def test_delete_returns_200(self, client, app):
        app.state.schema_service.delete_property.return_value = True

        resp = await client.delete(f"{_BASE}/profile/1")
        assert resp.status_code == 200
        assert resp.json() == {"deleted": True}

    async def test_delete_not_found_returns_404(self, client, app):
        app.state.schema_service.delete_property.return_value = False

        resp = await client.delete(f"{_BASE}/profile/9999")
        assert resp.status_code == 404
        detail = resp.json()["detail"]
        assert detail["error"] == "Property not found"


# ── schema_type validation ─────────────────────────────────────────────────


class TestSchemaTypeValidation:
    async def test_invalid_schema_type_on_post_returns_422(self, client, app):
        resp = await client.post(
            f"{_BASE}/invalid_type",
            json={
                "name": "test",
                "data_type": "string",
                "property_type": "static",
            },
        )
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert "schema_type" in detail["detail"]

    async def test_invalid_schema_type_on_get_list_returns_422(self, client, app):
        resp = await client.get(f"{_BASE}/bad")
        assert resp.status_code == 422

    async def test_invalid_schema_type_on_get_single_returns_422(self, client, app):
        resp = await client.get(f"{_BASE}/bad/1")
        assert resp.status_code == 422

    async def test_invalid_schema_type_on_put_returns_422(self, client, app):
        resp = await client.put(
            f"{_BASE}/bad/1",
            json={"description": "x"},
        )
        assert resp.status_code == 422

    async def test_invalid_schema_type_on_delete_returns_422(self, client, app):
        resp = await client.delete(f"{_BASE}/bad/1")
        assert resp.status_code == 422

    async def test_event_schema_type_accepted(self, client, app):
        app.state.schema_service.list_properties.return_value = []
        resp = await client.get(f"{_BASE}/event")
        assert resp.status_code == 200
