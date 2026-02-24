"""Property-based tests for SchemaCache.

**Validates: Requirements 5.1, 5.2, 2.4**
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.services.schema_cache import SchemaCache

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# project_id: non-empty printable strings without colons (colons are the
# delimiter in the key format, so we exclude them to keep IDs realistic).
project_ids = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N", "P"), blacklist_characters=":"),
    min_size=1,
    max_size=64,
)

schema_types = st.sampled_from(["profile", "event"])

# A single property dict that mirrors the PropertyResponse shape.
property_dict = st.fixed_dictionaries(
    {
        "id": st.integers(min_value=1, max_value=2**31),
        "project_id": st.text(min_size=1, max_size=32),
        "schema_type": schema_types,
        "name": st.text(min_size=1, max_size=128),
        "data_type": st.sampled_from(["string", "integer", "boolean", "float", "date"]),
        "property_type": st.sampled_from(["static", "dynamic"]),
    },
    optional={
        "description": st.one_of(st.none(), st.text(max_size=256)),
        "formula": st.one_of(st.none(), st.text(min_size=1, max_size=256)),
        "created_at": st.one_of(st.none(), st.text(min_size=1, max_size=32)),
    },
)

property_lists = st.lists(property_dict, min_size=0, max_size=20)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_redis():
    """Mocked async Redis client that stores values in a plain dict."""
    store: dict[str, str] = {}
    client = MagicMock()

    async def _get(key: str) -> bytes | None:
        raw = store.get(key)
        return raw.encode() if raw is not None else None

    async def _set(key: str, value: str, *, ex: int | None = None) -> None:
        store[key] = value

    async def _delete(key: str) -> None:
        store.pop(key, None)

    client.get = AsyncMock(side_effect=_get)
    client.set = AsyncMock(side_effect=_set)
    client.delete = AsyncMock(side_effect=_delete)
    client._store = store  # expose for assertions if needed
    return client


@pytest.fixture
def cache(mock_redis):
    return SchemaCache(mock_redis, ttl=3600)


# ---------------------------------------------------------------------------
# Property 8: 快取鍵格式正確性
# For any project_id and schema_type, the cache key must strictly follow
# ``schema:{project_id}:{schema_type}`` format.
#
# **Validates: Requirements 5.1, 2.4**
# ---------------------------------------------------------------------------


class TestProperty8CacheKeyFormat:
    @given(pid=project_ids, stype=schema_types)
    @settings(max_examples=100)
    def test_key_follows_format(self, pid: str, stype: str) -> None:
        """**Validates: Requirements 5.1, 2.4**"""
        key = SchemaCache._build_key(pid, stype)

        # Must start with the literal prefix "schema:"
        assert key.startswith("schema:"), f"Key does not start with 'schema:': {key!r}"

        # Must have exactly three colon-separated segments
        parts = key.split(":")
        assert len(parts) == 3, f"Expected 3 colon-separated parts, got {len(parts)}: {key!r}"

        # Segments must match the inputs exactly
        assert parts[0] == "schema"
        assert parts[1] == pid
        assert parts[2] == stype

    @given(pid=project_ids, stype=schema_types)
    @settings(max_examples=100)
    def test_key_equals_f_string(self, pid: str, stype: str) -> None:
        """**Validates: Requirements 5.1, 2.4**"""
        key = SchemaCache._build_key(pid, stype)
        assert key == f"schema:{pid}:{stype}"


# ---------------------------------------------------------------------------
# Property 9: 快取序列化往返一致性
# For any property list, serializing to JSON and storing in Redis then
# deserializing should produce equivalent data.
#
# **Validates: Requirements 5.2**
# ---------------------------------------------------------------------------


class TestProperty9SerializationRoundTrip:
    @given(data=property_lists)
    @settings(max_examples=100)
    async def test_set_then_get_roundtrip(self, data: list[dict]) -> None:
        """**Validates: Requirements 5.1, 5.2**"""
        # Build a fresh mock Redis per invocation so state doesn't leak.
        store: dict[str, str] = {}

        async def _get(key: str) -> bytes | None:
            raw = store.get(key)
            return raw.encode() if raw is not None else None

        async def _set(key: str, value: str, *, ex: int | None = None) -> None:
            store[key] = value

        mock = MagicMock()
        mock.get = AsyncMock(side_effect=_get)
        mock.set = AsyncMock(side_effect=_set)
        cache = SchemaCache(mock, ttl=3600)

        pid = "test_project"
        stype = "profile"

        await cache.set(pid, stype, data)
        result = await cache.get(pid, stype)

        assert result == data, "Deserialized data does not match original"

    @given(data=property_lists)
    @settings(max_examples=100)
    def test_json_roundtrip_equivalence(self, data: list[dict]) -> None:
        """**Validates: Requirements 5.2**

        Pure serialization round-trip without Redis involvement.
        """
        serialized = json.dumps(data)
        deserialized = json.loads(serialized)
        assert deserialized == data
