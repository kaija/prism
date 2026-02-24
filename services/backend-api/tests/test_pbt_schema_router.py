"""Property-based tests for Schema Router.

Feature: profile-event-schema, Property 10: Redis 故障降級

When Redis connection fails, Schema_API should still query from DB and
return correct results without error responses.

**Validates: Requirements 2.2, 2.3, 5.5**
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from hypothesis import given, settings
from hypothesis import strategies as st

from app.routers import schema_router
from app.services.schema_cache import SchemaCache
from app.services.schema_service import SchemaService

# Re-use the in-memory repo from PBT service tests
from tests.test_pbt_schema_service import (
    data_types,
    make_in_memory_repo,
    property_names,
    valid_formulas,
)

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

schema_types = st.sampled_from(["profile", "event"])

project_ids = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), blacklist_characters="\x00"),
    min_size=1,
    max_size=16,
)


# ---------------------------------------------------------------------------
# Helpers: build a broken-Redis cache and a real SchemaService
# ---------------------------------------------------------------------------


def _make_broken_redis_cache() -> SchemaCache:
    """Build a SchemaCache whose Redis client always raises ConnectionError."""
    client = MagicMock()
    client.get = AsyncMock(side_effect=ConnectionError("Redis is down"))
    client.set = AsyncMock(side_effect=ConnectionError("Redis is down"))
    client.delete = AsyncMock(side_effect=ConnectionError("Redis is down"))
    return SchemaCache(client, ttl=3600)


def _make_app_with_broken_redis() -> tuple[FastAPI, SchemaService, MagicMock]:
    """Create a FastAPI app with schema_router, using a real SchemaService
    backed by an in-memory repo and a broken Redis cache."""
    repo = make_in_memory_repo()
    cache = _make_broken_redis_cache()
    service = SchemaService(repo=repo, cache=cache)

    app = FastAPI()
    app.include_router(schema_router.router)
    app.state.schema_service = service
    return app, service, repo


# ---------------------------------------------------------------------------
# Property 10: Redis 故障降級
#
# For any API query request, when Redis connection fails, Schema_API should
# still query from DB and return correct results without error responses.
#
# **Validates: Requirements 2.2, 2.3, 5.5**
# ---------------------------------------------------------------------------


class TestProperty10RedisDegradation:
    """Feature: profile-event-schema, Property 10: Redis 故障降級"""

    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
    )
    @settings(max_examples=100)
    async def test_list_works_when_redis_down(
        self, pid: str, stype: str, name: str, dtype: str,
    ) -> None:
        """list_properties returns correct results even when Redis is down.

        **Validates: Requirements 2.2, 2.3, 5.5**
        """
        app, service, repo = _make_app_with_broken_redis()

        # Create a property (cache invalidation failure is swallowed)
        from app.models.schema import PropertyCreate

        await service.create_property(
            pid,
            stype,
            PropertyCreate(
                name=name, data_type=dtype, property_type="static", formula=None,
            ),
        )

        # Query via HTTP — should succeed despite Redis being down
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                f"/api/v1/projects/{pid}/schemas/{stype}"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        names_returned = {item["name"] for item in data}
        assert name in names_returned

    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
    )
    @settings(max_examples=100)
    async def test_create_works_when_redis_down(
        self, pid: str, stype: str, name: str, dtype: str,
    ) -> None:
        """create_property succeeds even when Redis cache invalidation fails.

        **Validates: Requirements 5.5**
        """
        app, _, repo = _make_app_with_broken_redis()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/v1/projects/{pid}/schemas/{stype}",
                json={
                    "name": name,
                    "data_type": dtype,
                    "property_type": "static",
                    "formula": None,
                },
            )

        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == name
        assert data["data_type"] == dtype
        assert data["project_id"] == pid
        assert data["schema_type"] == stype
