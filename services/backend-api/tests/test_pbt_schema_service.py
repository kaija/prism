"""Property-based tests for SchemaService.

**Validates: Requirements 1.1-1.7, 2.1, 3.1-3.6, 4.1, 4.3, 6.5, 7.3, 7.4**
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.models.schema import PropertyCreate, PropertyUpdate
from app.services.schema_cache import SchemaCache
from app.services.schema_service import SchemaService

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

safe_text = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), blacklist_characters="\x00"),
    min_size=1,
    max_size=32,
)

property_names = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), blacklist_characters="\x00"),
    min_size=1,
    max_size=64,
)

data_types = st.sampled_from(["string", "integer", "boolean", "float", "date"])

schema_types = st.sampled_from(["profile", "event"])

project_ids = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), blacklist_characters="\x00"),
    min_size=1,
    max_size=32,
)

# Valid DSL formulas that pass parsing and validation.
# Only use functions that exist in the FUNCTION_REGISTRY.
valid_formulas = st.sampled_from([
    'UPPER(PROFILE("name"))',
    'ADD(1, 2)',
    'ABS(3)',
    'LOWER(PROFILE("email"))',
    'LENGTH(PROFILE("name"))',
    'NOW()',
    'NOT(true)',
    'EQ(1, 2)',
    'ROUND(3)',
    'FLOOR(5)',
])

# Invalid DSL strings that should fail parsing or validation
invalid_formulas = st.sampled_from([
    "",
    "   ",
    "NOT_A_FUNCTION(",
    "(((",
    "UNKNOWN_FUNC(1)",
    "ADD()",
    "ADD(1, 2, 3)",
    "UPPER(",
])


# ---------------------------------------------------------------------------
# In-memory repository mock
# ---------------------------------------------------------------------------


def make_in_memory_repo() -> MagicMock:
    """Build a mock PostgresRepository backed by an in-memory dict store.

    The store maps ``int`` id → ``dict`` row.  ``fetch_one``, ``fetch_all``,
    and ``execute`` are wired to behave like the real SQL queries used by
    SchemaService.
    """
    store: dict[int, dict[str, Any]] = {}
    id_counter = {"val": 0}

    def _next_id() -> int:
        id_counter["val"] += 1
        return id_counter["val"]

    async def _fetch_one(query: str, *args: Any) -> dict | None:
        q = query.strip().upper()

        # --- SELECT id FROM ... WHERE project_id=$1 AND entity_type=$2 AND attr_name=$3
        if q.startswith("SELECT ID FROM") and "ATTR_NAME" in q:
            project_id, entity_type, attr_name = args[0], args[1], args[2]
            for row in store.values():
                if (
                    row["project_id"] == project_id
                    and row["entity_type"] == entity_type
                    and row["attr_name"] == attr_name
                ):
                    return {"id": row["id"]}
            return None

        # --- INSERT INTO attribute_definitions ...
        if q.startswith("INSERT INTO"):
            new_id = _next_id()
            row = {
                "id": new_id,
                "project_id": args[0],
                "entity_type": args[1],
                "attr_name": args[2],
                "attr_type": args[3],
                "data_type": args[4],
                "description": args[5],
                "computed": args[6],
                "formula": args[7],
                "created_at": datetime.now(timezone.utc),
            }
            store[new_id] = row
            return dict(row)

        # --- SELECT ... WHERE project_id=$1 AND entity_type=$2 AND id=$3
        if q.startswith("SELECT") and "ID" in q and not q.startswith("SELECT ID FROM"):
            project_id, entity_type, prop_id = args[0], args[1], args[2]
            row = store.get(prop_id)
            if row and row["project_id"] == project_id and row["entity_type"] == entity_type:
                return dict(row)
            return None

        # --- UPDATE attribute_definitions SET ...
        if q.startswith("UPDATE"):
            # The last 3 args are always project_id, entity_type, property_id
            project_id = args[-3]
            entity_type = args[-2]
            prop_id = args[-1]
            row = store.get(prop_id)
            if row is None or row["project_id"] != project_id or row["entity_type"] != entity_type:
                return None
            # Parse SET clause to apply updates
            set_part = query.split("SET")[1].split("WHERE")[0].strip()
            assignments = [a.strip() for a in set_part.split(",")]
            param_values = list(args[:-3])
            param_idx = 0
            for assignment in assignments:
                col = assignment.split("=")[0].strip()
                row[col] = param_values[param_idx]
                param_idx += 1
            store[prop_id] = row
            return dict(row)

        return None

    async def _fetch_all(query: str, *args: Any) -> list[dict]:
        project_id, entity_type = args[0], args[1]
        return [
            dict(row)
            for row in sorted(store.values(), key=lambda r: r["id"])
            if row["project_id"] == project_id and row["entity_type"] == entity_type
        ]

    async def _execute(query: str, *args: Any) -> str:
        q = query.strip().upper()
        if q.startswith("DELETE"):
            project_id, entity_type, prop_id = args[0], args[1], args[2]
            row = store.get(prop_id)
            if row and row["project_id"] == project_id and row["entity_type"] == entity_type:
                del store[prop_id]
                return "DELETE 1"
            return "DELETE 0"
        return "OK"

    repo = MagicMock()
    repo.fetch_one = AsyncMock(side_effect=_fetch_one)
    repo.fetch_all = AsyncMock(side_effect=_fetch_all)
    repo.execute = AsyncMock(side_effect=_execute)
    repo._store = store
    repo._reset = lambda: (store.clear(), id_counter.update({"val": 0}))
    return repo


def make_in_memory_cache() -> SchemaCache:
    """Build a SchemaCache backed by an in-memory dict (no real Redis)."""
    mem: dict[str, str] = {}

    async def _get(key: str) -> bytes | None:
        raw = mem.get(key)
        return raw.encode() if raw is not None else None

    async def _set(key: str, value: str, *, ex: int | None = None) -> None:
        mem[key] = value

    async def _delete(key: str) -> None:
        mem.pop(key, None)

    client = MagicMock()
    client.get = AsyncMock(side_effect=_get)
    client.set = AsyncMock(side_effect=_set)
    client.delete = AsyncMock(side_effect=_delete)
    client._store = mem
    return SchemaCache(client, ttl=3600)


# ---------------------------------------------------------------------------
# Helper: build a fresh service per test invocation
# ---------------------------------------------------------------------------


def _make_service() -> tuple[SchemaService, MagicMock, SchemaCache]:
    repo = make_in_memory_repo()
    cache = make_in_memory_cache()
    service = SchemaService(repo=repo, cache=cache)
    return service, repo, cache


# ---------------------------------------------------------------------------
# Property 1: 建立-查詢往返一致性 (Round-trip)
# For any valid PropertyCreate, creating then querying by ID should return
# matching name, data_type, description, property_type, formula.
#
# **Validates: Requirements 1.1, 2.5**
# ---------------------------------------------------------------------------


class TestProperty1CreateQueryRoundTrip:
    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
        desc=st.one_of(st.none(), safe_text),
    )
    @settings(max_examples=100)
    async def test_static_roundtrip(
        self, pid: str, stype: str, name: str, dtype: str, desc: str | None
    ) -> None:
        """**Validates: Requirements 1.1, 1.2**"""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, description=desc,
            property_type="static", formula=None,
        )
        created = await service.create_property(pid, stype, payload)
        fetched = await service.get_property(pid, stype, created.id)

        assert fetched is not None
        assert fetched.name == name
        assert fetched.data_type == dtype
        assert fetched.description == desc
        assert fetched.property_type == "static"
        assert fetched.formula is None

    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
        desc=st.one_of(st.none(), safe_text),
        formula=valid_formulas,
    )
    @settings(max_examples=100)
    async def test_dynamic_roundtrip(
        self, pid: str, stype: str, name: str, dtype: str,
        desc: str | None, formula: str,
    ) -> None:
        """**Validates: Requirements 1.1, 1.3, 1.4**"""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, description=desc,
            property_type="dynamic", formula=formula,
        )
        created = await service.create_property(pid, stype, payload)
        fetched = await service.get_property(pid, stype, created.id)

        assert fetched is not None
        assert fetched.name == name
        assert fetched.data_type == dtype
        assert fetched.description == desc
        assert fetched.property_type == "dynamic"
        assert fetched.formula == formula


# ---------------------------------------------------------------------------
# Property 2: Property_type 與 Formula 一致性不變量
# For any property, static→formula is null, dynamic→formula is non-empty
# and DSL-valid. Must hold after create and update.
#
# **Validates: Requirements 1.2, 1.3, 3.2, 3.3, 6.5, 7.3**
# ---------------------------------------------------------------------------


class TestProperty2TypeFormulaConsistency:
    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
    )
    @settings(max_examples=100)
    async def test_static_formula_is_null(
        self, pid: str, stype: str, name: str, dtype: str,
    ) -> None:
        """**Validates: Requirements 1.2, 7.3**"""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="static", formula=None,
        )
        created = await service.create_property(pid, stype, payload)
        assert created.property_type == "static"
        assert created.formula is None

    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
        formula=valid_formulas,
    )
    @settings(max_examples=100)
    async def test_dynamic_formula_is_nonempty_and_valid(
        self, pid: str, stype: str, name: str, dtype: str, formula: str,
    ) -> None:
        """**Validates: Requirements 1.3, 6.5, 7.3**"""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="dynamic", formula=formula,
        )
        created = await service.create_property(pid, stype, payload)
        assert created.property_type == "dynamic"
        assert created.formula is not None
        assert len(created.formula.strip()) > 0
        # Validate the formula is DSL-valid
        valid, errors = service.validate_formula(created.formula)
        assert valid, f"Formula should be valid but got errors: {errors}"

    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
        formula=valid_formulas,
    )
    @settings(max_examples=100)
    async def test_static_rejects_non_null_formula(
        self, pid: str, stype: str, name: str, dtype: str, formula: str,
    ) -> None:
        """**Validates: Requirements 1.2, 7.3**"""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="static", formula=formula,
        )
        with pytest.raises(ValueError, match="Formula must be null for static"):
            await service.create_property(pid, stype, payload)

    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
        formula=valid_formulas,
    )
    @settings(max_examples=100)
    async def test_update_dynamic_to_static_nullifies_formula(
        self, pid: str, stype: str, name: str, dtype: str, formula: str,
    ) -> None:
        """**Validates: Requirements 3.3, 7.3**"""
        service, _, _ = _make_service()
        # Create dynamic property
        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="dynamic", formula=formula,
        )
        created = await service.create_property(pid, stype, payload)

        # Update to static
        updated = await service.update_property(
            pid, stype, created.id,
            PropertyUpdate(property_type="static"),
        )
        assert updated.property_type == "static"
        assert updated.formula is None


# ---------------------------------------------------------------------------
# Property 3: Dynamic Formula DSL 驗證
# Valid DSL expressions should succeed for dynamic properties; invalid DSL
# strings should be rejected with validation errors.
#
# **Validates: Requirements 1.4, 3.4**
# ---------------------------------------------------------------------------


class TestProperty3DslValidation:
    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
        formula=valid_formulas,
    )
    @settings(max_examples=100)
    async def test_valid_dsl_accepted(
        self, pid: str, stype: str, name: str, dtype: str, formula: str,
    ) -> None:
        """**Validates: Requirements 1.4**"""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="dynamic", formula=formula,
        )
        # Should not raise
        created = await service.create_property(pid, stype, payload)
        assert created.formula == formula

    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
        formula=invalid_formulas,
    )
    @settings(max_examples=100)
    async def test_invalid_dsl_rejected(
        self, pid: str, stype: str, name: str, dtype: str, formula: str,
    ) -> None:
        """**Validates: Requirements 1.4, 1.5**"""
        service, _, _ = _make_service()
        with pytest.raises(ValueError):
            await service.create_property(
                pid, stype,
                PropertyCreate(
                    name=name, data_type=dtype,
                    property_type="dynamic", formula=formula,
                ),
            )


# ---------------------------------------------------------------------------
# Property 4: 屬性名稱唯一性約束
# For any (project_id, schema_type), creating a duplicate name should raise
# ValueError (409).
#
# **Validates: Requirements 1.6, 7.4**
# ---------------------------------------------------------------------------


class TestProperty4NameUniqueness:
    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
    )
    @settings(max_examples=100)
    async def test_duplicate_name_raises(
        self, pid: str, stype: str, name: str, dtype: str,
    ) -> None:
        """**Validates: Requirements 1.6, 7.4**"""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="static", formula=None,
        )
        # First create succeeds
        first = await service.create_property(pid, stype, payload)

        # Second create with same name should fail
        with pytest.raises(ValueError, match="already exists"):
            await service.create_property(pid, stype, payload)

        # Original property should be unaffected
        original = await service.get_property(pid, stype, first.id)
        assert original is not None
        assert original.name == name


# ---------------------------------------------------------------------------
# Property 5: 寫入操作快取失效
# After any write operation (create/update/delete), the cache key for that
# project_id+schema_type should not exist.
#
# **Validates: Requirements 1.7, 3.6, 4.3, 5.4**
# ---------------------------------------------------------------------------


class TestProperty5CacheInvalidation:
    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
    )
    @settings(max_examples=100)
    async def test_create_invalidates_cache(
        self, pid: str, stype: str, name: str, dtype: str,
    ) -> None:
        """**Validates: Requirements 1.7**"""
        service, _, cache = _make_service()
        # Pre-populate cache
        await cache.set(pid, stype, [{"id": 999, "name": "old"}])

        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="static", formula=None,
        )
        await service.create_property(pid, stype, payload)

        # Cache should be invalidated
        cached = await cache.get(pid, stype)
        assert cached is None

    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
    )
    @settings(max_examples=100)
    async def test_update_invalidates_cache(
        self, pid: str, stype: str, name: str, dtype: str,
    ) -> None:
        """**Validates: Requirements 3.6**"""
        service, _, cache = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="static", formula=None,
        )
        created = await service.create_property(pid, stype, payload)

        # Re-populate cache
        await cache.set(pid, stype, [{"id": created.id, "name": name}])

        await service.update_property(
            pid, stype, created.id,
            PropertyUpdate(description="updated"),
        )

        cached = await cache.get(pid, stype)
        assert cached is None

    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
    )
    @settings(max_examples=100)
    async def test_delete_invalidates_cache(
        self, pid: str, stype: str, name: str, dtype: str,
    ) -> None:
        """**Validates: Requirements 4.3**"""
        service, _, cache = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="static", formula=None,
        )
        created = await service.create_property(pid, stype, payload)

        # Re-populate cache
        await cache.set(pid, stype, [{"id": created.id, "name": name}])

        await service.delete_property(pid, stype, created.id)

        cached = await cache.get(pid, stype)
        assert cached is None


# ---------------------------------------------------------------------------
# Property 6: 列表查詢完整性
# If N properties exist for a (project_id, schema_type), list should return
# exactly N items with all names present.
#
# **Validates: Requirements 2.1**
# ---------------------------------------------------------------------------


class TestProperty6ListCompleteness:
    @given(
        pid=project_ids,
        stype=schema_types,
        names=st.lists(property_names, min_size=1, max_size=10, unique=True),
        dtype=data_types,
    )
    @settings(max_examples=100)
    async def test_list_returns_all_created(
        self, pid: str, stype: str, names: list[str], dtype: str,
    ) -> None:
        """**Validates: Requirements 2.1**"""
        service, _, _ = _make_service()

        for name in names:
            await service.create_property(
                pid, stype,
                PropertyCreate(
                    name=name, data_type=dtype,
                    property_type="static", formula=None,
                ),
            )

        result = await service.list_properties(pid, stype)
        assert len(result) == len(names)
        returned_names = {p.name for p in result}
        assert returned_names == set(names)


# ---------------------------------------------------------------------------
# Property 11: 刪除移除屬性
# After deleting a property, get by ID returns None and list count decreases
# by 1.
#
# **Validates: Requirements 4.1**
# ---------------------------------------------------------------------------


class TestProperty11DeleteRemovesProperty:
    @given(
        pid=project_ids,
        stype=schema_types,
        names=st.lists(property_names, min_size=2, max_size=8, unique=True),
        dtype=data_types,
    )
    @settings(max_examples=100)
    async def test_delete_removes_and_decreases_count(
        self, pid: str, stype: str, names: list[str], dtype: str,
    ) -> None:
        """**Validates: Requirements 4.1**"""
        service, _, _ = _make_service()

        created_ids = []
        for name in names:
            prop = await service.create_property(
                pid, stype,
                PropertyCreate(
                    name=name, data_type=dtype,
                    property_type="static", formula=None,
                ),
            )
            created_ids.append(prop.id)

        # Delete the first property
        target_id = created_ids[0]
        deleted = await service.delete_property(pid, stype, target_id)
        assert deleted is True

        # get by ID returns None
        fetched = await service.get_property(pid, stype, target_id)
        assert fetched is None

        # list count decreased by 1
        remaining = await service.list_properties(pid, stype)
        assert len(remaining) == len(names) - 1


# ---------------------------------------------------------------------------
# Property 12: 更新持久化變更
# After updating a property, get by ID returns the updated values.
#
# **Validates: Requirements 3.1**
# ---------------------------------------------------------------------------


class TestProperty12UpdatePersistsChanges:
    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
        new_desc=safe_text,
        new_dtype=data_types,
    )
    @settings(max_examples=100)
    async def test_update_description_and_data_type(
        self, pid: str, stype: str, name: str, dtype: str,
        new_desc: str, new_dtype: str,
    ) -> None:
        """**Validates: Requirements 3.1**"""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="static", formula=None,
        )
        created = await service.create_property(pid, stype, payload)

        updated = await service.update_property(
            pid, stype, created.id,
            PropertyUpdate(description=new_desc, data_type=new_dtype),
        )
        assert updated.description == new_desc
        assert updated.data_type == new_dtype

        # Verify via get
        fetched = await service.get_property(pid, stype, created.id)
        assert fetched is not None
        assert fetched.description == new_desc
        assert fetched.data_type == new_dtype

    @given(
        pid=project_ids,
        stype=schema_types,
        name=property_names,
        dtype=data_types,
        formula=valid_formulas,
        new_formula=valid_formulas,
    )
    @settings(max_examples=100)
    async def test_update_formula_for_dynamic(
        self, pid: str, stype: str, name: str, dtype: str,
        formula: str, new_formula: str,
    ) -> None:
        """**Validates: Requirements 3.1, 3.4**"""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name=name, data_type=dtype, property_type="dynamic", formula=formula,
        )
        created = await service.create_property(pid, stype, payload)

        updated = await service.update_property(
            pid, stype, created.id,
            PropertyUpdate(formula=new_formula),
        )
        assert updated.formula == new_formula

        fetched = await service.get_property(pid, stype, created.id)
        assert fetched is not None
        assert fetched.formula == new_formula
