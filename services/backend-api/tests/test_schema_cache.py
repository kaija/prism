"""Unit tests for SchemaCache with mocked Redis client."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.schema_cache import SchemaCache


@pytest.fixture
def mock_redis():
    """Create a mocked async Redis client."""
    client = MagicMock()
    client.get = AsyncMock(return_value=None)
    client.set = AsyncMock()
    client.delete = AsyncMock()
    return client


@pytest.fixture
def cache(mock_redis):
    return SchemaCache(mock_redis, ttl=3600)


# ------------------------------------------------------------------
# _build_key
# ------------------------------------------------------------------


class TestBuildKey:
    def test_format(self):
        assert SchemaCache._build_key("proj1", "profile") == "schema:proj1:profile"

    def test_event_type(self):
        assert SchemaCache._build_key("abc", "event") == "schema:abc:event"


# ------------------------------------------------------------------
# get
# ------------------------------------------------------------------


class TestGet:
    async def test_returns_none_on_cache_miss(self, cache, mock_redis):
        mock_redis.get.return_value = None

        result = await cache.get("proj1", "profile")

        assert result is None
        mock_redis.get.assert_called_once_with("schema:proj1:profile")

    async def test_returns_deserialized_data_on_hit(self, cache, mock_redis):
        data = [{"id": 1, "name": "age"}]
        mock_redis.get.return_value = json.dumps(data).encode()

        result = await cache.get("proj1", "profile")

        assert result == data

    async def test_returns_none_on_redis_error(self, cache, mock_redis):
        mock_redis.get.side_effect = ConnectionError("Redis down")

        result = await cache.get("proj1", "profile")

        assert result is None


# ------------------------------------------------------------------
# set
# ------------------------------------------------------------------


class TestSet:
    async def test_stores_json_with_ttl(self, cache, mock_redis):
        data = [{"id": 1, "name": "birthday"}]

        await cache.set("proj1", "profile", data)

        mock_redis.set.assert_called_once_with(
            "schema:proj1:profile",
            json.dumps(data),
            ex=3600,
        )

    async def test_custom_ttl(self, mock_redis):
        cache = SchemaCache(mock_redis, ttl=600)
        await cache.set("p", "event", [])

        _, kwargs = mock_redis.set.call_args
        assert kwargs["ex"] == 600

    async def test_swallows_redis_error(self, cache, mock_redis):
        mock_redis.set.side_effect = ConnectionError("Redis down")

        # Should not raise
        await cache.set("proj1", "profile", [{"id": 1}])


# ------------------------------------------------------------------
# invalidate
# ------------------------------------------------------------------


class TestInvalidate:
    async def test_deletes_correct_key(self, cache, mock_redis):
        await cache.invalidate("proj1", "event")

        mock_redis.delete.assert_called_once_with("schema:proj1:event")

    async def test_swallows_redis_error(self, cache, mock_redis):
        mock_redis.delete.side_effect = ConnectionError("Redis down")

        # Should not raise
        await cache.invalidate("proj1", "profile")
