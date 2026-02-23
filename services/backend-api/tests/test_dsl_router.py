"""Unit tests for the DSL validation endpoint."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.routers import dsl_router


@pytest.fixture
def app():
    test_app = FastAPI()
    test_app.include_router(dsl_router.router)
    return test_app


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestDslValidateEndpoint:
    """Tests for POST /api/v1/dsl/validate."""

    async def test_valid_simple_expression(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={"expression": "ADD(1, 2)"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["valid"] is True
        assert body["return_type"] == "number"

    async def test_valid_nested_expression(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={"expression": 'DIVIDE(COUNT(EVENT("clicks")), 30)'},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["valid"] is True
        assert body["return_type"] == "number"

    async def test_valid_boolean_expression(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={"expression": 'AND(GT(EVENT("age"), 18), EQ(EVENT("status"), "active"))'},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["valid"] is True
        assert body["return_type"] == "boolean"

    async def test_valid_string_expression(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={"expression": 'UPPER(EVENT("name"))'},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["valid"] is True
        assert body["return_type"] == "string"

    async def test_syntax_error_returns_422(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={"expression": "ADD(1,"},
        )
        assert resp.status_code == 422
        body = resp.json()
        assert "errors" in body["detail"]
        assert len(body["detail"]["errors"]) > 0

    async def test_unknown_function_returns_422(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={"expression": "FOOBAR(1, 2)"},
        )
        assert resp.status_code == 422
        body = resp.json()
        assert "errors" in body["detail"]
        assert any("Unknown function" in e for e in body["detail"]["errors"])

    async def test_wrong_arg_count_returns_422(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={"expression": "NOT(true, false)"},
        )
        assert resp.status_code == 422
        body = resp.json()
        assert "errors" in body["detail"]
        assert any("at most" in e for e in body["detail"]["errors"])

    async def test_type_mismatch_returns_422(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={"expression": 'ADD("hello", 2)'},
        )
        assert resp.status_code == 422
        body = resp.json()
        assert "errors" in body["detail"]
        assert any("expected number" in e for e in body["detail"]["errors"])

    async def test_missing_expression_field(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={},
        )
        assert resp.status_code == 422

    async def test_valid_literal_expression(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={"expression": "42"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["valid"] is True
        assert body["return_type"] == "number"

    async def test_case_insensitive_function(self, client):
        resp = await client.post(
            "/api/v1/dsl/validate",
            json={"expression": "add(1, 2)"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["valid"] is True
        assert body["return_type"] == "number"
