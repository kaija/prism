"""Property-based tests for SegmentService.

Feature: segment-api

**Validates: Requirements 1.1, 3.1, 7.1, 7.2, 8.3**
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.models.segment import SegmentCreate, SegmentTimeframe, SegmentUpdate
from app.services.segment_service import SegmentService

# ---------------------------------------------------------------------------
# Strategies (from design document)
# ---------------------------------------------------------------------------

segment_names = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), blacklist_characters="\x00"),
    min_size=1,
    max_size=64,
)

safe_text = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), blacklist_characters="\x00"),
    min_size=1,
    max_size=32,
)

project_ids = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), blacklist_characters="\x00"),
    min_size=1,
    max_size=32,
)

valid_dsls = st.sampled_from([
    'UPPER(PROFILE("name"))',
    'ADD(1, 2)',
    'ABS(3)',
    'LOWER(PROFILE("email"))',
    'LENGTH(PROFILE("name"))',
])

timeframes = st.one_of(
    st.builds(
        dict,
        type=st.just("absolute"),
        start=st.integers(min_value=0, max_value=2**40),
        end=st.integers(min_value=0, max_value=2**40),
    ),
    st.builds(
        dict,
        type=st.just("relative"),
        relative=st.sampled_from(["last_7_days", "last_30_days", "last_90_days"]),
    ),
)


# ---------------------------------------------------------------------------
# In-memory repository mock (follows test_pbt_schema_service.py pattern)
# ---------------------------------------------------------------------------


def make_in_memory_repo() -> MagicMock:
    """Build a mock PostgresRepository backed by an in-memory dict store.

    The store maps ``segment_id`` → ``dict`` row. ``fetch_one``, ``fetch_all``,
    ``fetch_count``, and ``execute`` are wired to behave like the real SQL
    queries used by SegmentService.
    """
    store: dict[str, dict[str, Any]] = {}

    async def _fetch_one(query: str, *args: Any) -> dict | None:
        q = query.strip().upper()

        # --- INSERT INTO segments ...
        if q.startswith("INSERT INTO"):
            now = datetime.now(timezone.utc)
            segment_id = args[0]
            timeframe_raw = args[5]
            timeframe_data = json.loads(timeframe_raw) if isinstance(timeframe_raw, str) else timeframe_raw
            row = {
                "segment_id": segment_id,
                "project_id": args[1],
                "name": args[2],
                "description": args[3],
                "dsl": args[4],
                "timeframe": timeframe_data,
                "created_at": now,
                "updated_at": now,
            }
            store[segment_id] = row
            return dict(row)

        # --- SELECT ... WHERE project_id=$1 AND segment_id=$2
        if q.startswith("SELECT") and "SEGMENT_ID" in q and "WHERE" in q:
            project_id, segment_id = args[0], args[1]
            row = store.get(segment_id)
            if row and row["project_id"] == project_id:
                return dict(row)
            return None

        # --- UPDATE segments SET ...
        if q.startswith("UPDATE"):
            # Last two args are always project_id, segment_id
            project_id = args[-2]
            segment_id = args[-1]
            row = store.get(segment_id)
            if row is None or row["project_id"] != project_id:
                return None
            # Parse SET clause to apply updates
            set_part = query.split("SET")[1].split("WHERE")[0].strip()
            assignments = [a.strip() for a in set_part.split(",")]
            param_values = list(args[:-2])
            param_idx = 0
            now = datetime.now(timezone.utc)
            for assignment in assignments:
                col = assignment.split("=")[0].strip()
                if col == "updated_at":
                    row["updated_at"] = now
                    continue
                val = param_values[param_idx]
                if col == "timeframe":
                    val = json.loads(val) if isinstance(val, str) else val
                row[col] = val
                param_idx += 1
            store[segment_id] = row
            return dict(row)

        return None

    async def _fetch_all(query: str, *args: Any) -> list[dict]:
        project_id = args[0]
        rows = [
            dict(row)
            for row in sorted(store.values(), key=lambda r: r["segment_id"])
            if row["project_id"] == project_id
        ]
        # Handle LIMIT/OFFSET when present (used by SegmentService.list)
        q = query.strip().upper()
        if "LIMIT" in q and len(args) >= 3:
            limit = args[1]
            offset = args[2]
            rows = rows[offset : offset + limit]
        return rows

    async def _fetch_count(query: str, *args: Any) -> int:
        project_id = args[0]
        return sum(1 for row in store.values() if row["project_id"] == project_id)

    async def _execute(query: str, *args: Any) -> str:
        q = query.strip().upper()
        if q.startswith("DELETE"):
            project_id, segment_id = args[0], args[1]
            row = store.get(segment_id)
            if row and row["project_id"] == project_id:
                del store[segment_id]
                return "DELETE 1"
            return "DELETE 0"
        return "OK"

    repo = MagicMock()
    repo.fetch_one = AsyncMock(side_effect=_fetch_one)
    repo.fetch_all = AsyncMock(side_effect=_fetch_all)
    repo.fetch_count = AsyncMock(side_effect=_fetch_count)
    repo.execute = AsyncMock(side_effect=_execute)
    repo._store = store
    return repo


# ---------------------------------------------------------------------------
# Helper: build a fresh service per test invocation
# ---------------------------------------------------------------------------


def _make_service() -> tuple[SegmentService, MagicMock]:
    repo = make_in_memory_repo()
    service = SegmentService(repo=repo)
    return service, repo


# ---------------------------------------------------------------------------
# Property 1: 建立-查詢往返一致性 (Create-Query Round-trip Consistency)
#
# For any valid segment creation payload (with valid DSL and any timeframe
# type), creating the segment and then querying by the returned segment_id
# should yield matching name, description, dsl, timeframe fields, and
# created_at / updated_at timestamps should exist and be valid datetimes.
#
# Feature: segment-api, Property 1: 建立-查詢往返一致性
# **Validates: Requirements 1.1, 3.1, 7.1, 7.2, 8.3**
# ---------------------------------------------------------------------------


class TestProperty1CreateQueryRoundTrip:
    @given(
        pid=project_ids,
        name=segment_names,
        desc=st.one_of(st.none(), safe_text),
        dsl=valid_dsls,
        tf=timeframes,
    )
    @settings(max_examples=100)
    async def test_create_then_get_returns_consistent_fields(
        self,
        pid: str,
        name: str,
        desc: str | None,
        dsl: str,
        tf: dict,
    ) -> None:
        """Property 1: 建立-查詢往返一致性

        Create a segment with random valid payload, then query by segment_id.
        All fields must match the input and timestamps must be present.

        **Validates: Requirements 1.1, 3.1, 7.1, 7.2, 8.3**
        """
        service, _ = _make_service()

        timeframe = SegmentTimeframe(**tf)
        payload = SegmentCreate(
            name=name,
            description=desc,
            dsl=dsl,
            timeframe=timeframe,
        )

        created = await service.create(pid, payload)

        # Query back by segment_id
        fetched = await service.get(pid, created.segment_id)

        # Must be found
        assert fetched is not None

        # All input fields must match
        assert fetched.name == name
        assert fetched.description == desc
        assert fetched.dsl == dsl
        assert fetched.project_id == pid

        # Timeframe round-trip consistency
        assert fetched.timeframe.type == tf["type"]
        if tf["type"] == "absolute":
            assert fetched.timeframe.start == tf["start"]
            assert fetched.timeframe.end == tf["end"]
        else:
            assert fetched.timeframe.relative == tf["relative"]

        # Timestamps must exist and be valid datetimes (Requirement 8.3)
        assert isinstance(fetched.created_at, datetime)
        assert isinstance(fetched.updated_at, datetime)


# ---------------------------------------------------------------------------
# Strategy: invalid DSL strings (from design document)
# ---------------------------------------------------------------------------

# DSL strings that pass Pydantic min_length=1 but fail DSL parsing/validation
invalid_dsls = st.sampled_from([
    "   ",
    "NOT_A_FUNCTION(",
    "(((",
    "UNKNOWN_FUNC(1)",
    "ADD()",
    "ADD(1, 2, 3)",
])


# ---------------------------------------------------------------------------
# Property 2: 無效 DSL 拒絕 (Invalid DSL Rejection)
#
# For any invalid DSL string (syntax error or semantic error), whether
# submitted in a create or update operation, Segment_Service should reject
# the request and raise ValueError.
#
# Feature: segment-api, Property 2: 無效 DSL 拒絕
# **Validates: Requirements 1.2, 4.2**
# ---------------------------------------------------------------------------


class TestProperty2InvalidDslRejection:
    @given(
        pid=project_ids,
        name=segment_names,
        bad_dsl=invalid_dsls,
        tf=timeframes,
    )
    @settings(max_examples=100)
    async def test_create_rejects_invalid_dsl(
        self,
        pid: str,
        name: str,
        bad_dsl: str,
        tf: dict,
    ) -> None:
        """Property 2: 無效 DSL 拒絕 — create path

        Creating a segment with an invalid DSL expression must raise ValueError.

        **Validates: Requirements 1.2, 4.2**
        """
        service, _ = _make_service()

        timeframe = SegmentTimeframe(**tf)
        payload = SegmentCreate.model_construct(
            name=name,
            description=None,
            dsl=bad_dsl,
            timeframe=timeframe,
        )

        with pytest.raises(ValueError):
            await service.create(pid, payload)

    @given(
        pid=project_ids,
        name=segment_names,
        desc=st.one_of(st.none(), safe_text),
        good_dsl=valid_dsls,
        bad_dsl=invalid_dsls,
        tf=timeframes,
    )
    @settings(max_examples=100)
    async def test_update_rejects_invalid_dsl(
        self,
        pid: str,
        name: str,
        desc: str | None,
        good_dsl: str,
        bad_dsl: str,
        tf: dict,
    ) -> None:
        """Property 2: 無效 DSL 拒絕 — update path

        Updating an existing segment with an invalid DSL expression must
        raise ValueError. The segment is first created with a valid DSL.

        **Validates: Requirements 1.2, 4.2**
        """
        service, _ = _make_service()

        timeframe = SegmentTimeframe(**tf)
        create_payload = SegmentCreate(
            name=name,
            description=desc,
            dsl=good_dsl,
            timeframe=timeframe,
        )

        created = await service.create(pid, create_payload)

        update_payload = SegmentUpdate.model_construct(dsl=bad_dsl)

        with pytest.raises(ValueError):
            await service.update(pid, created.segment_id, update_payload)

    async def test_pydantic_rejects_empty_dsl_on_create(self) -> None:
        """Property 2: 無效 DSL 拒絕 — Pydantic validation path

        Empty DSL string is rejected at the Pydantic model level before
        reaching the service.

        **Validates: Requirements 1.2, 4.2**
        """
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            SegmentCreate(
                name="test",
                description=None,
                dsl="",
                timeframe=SegmentTimeframe(type="relative", relative="last_7_days"),
            )


# ---------------------------------------------------------------------------
# Property 3: 列表完整性與分頁 (List Completeness & Pagination)
#
# For any N segments created in a project, the list query should return
# total == N, and iterating through all pages should collect exactly N items.
#
# Feature: segment-api, Property 3: 列表完整性與分頁
# **Validates: Requirements 2.1, 2.2**
# ---------------------------------------------------------------------------


class TestProperty3ListCompletenessAndPagination:
    @given(
        pid=project_ids,
        n_segments=st.integers(min_value=0, max_value=10),
        page_size=st.integers(min_value=1, max_value=5),
        names=st.lists(segment_names, min_size=10, max_size=10),
        dsls=st.lists(valid_dsls, min_size=10, max_size=10),
        tfs=st.lists(timeframes, min_size=10, max_size=10),
    )
    @settings(max_examples=100)
    async def test_list_total_and_pagination_collect_all(
        self,
        pid: str,
        n_segments: int,
        page_size: int,
        names: list[str],
        dsls: list[str],
        tfs: list[dict],
    ) -> None:
        """Property 3: 列表完整性與分頁

        Create N segments, verify list total == N, then iterate through
        all pages collecting items and verify the collected count == N.

        **Validates: Requirements 2.1, 2.2**
        """
        service, _ = _make_service()

        # Create N segments
        for i in range(n_segments):
            payload = SegmentCreate(
                name=names[i],
                description=None,
                dsl=dsls[i],
                timeframe=SegmentTimeframe(**tfs[i]),
            )
            await service.create(pid, payload)

        # First page query — check total
        first_page = await service.list(pid, page=1, page_size=page_size)
        assert first_page.total == n_segments

        # Iterate through all pages and collect items
        collected: list = []
        page = 1
        while True:
            result = await service.list(pid, page=page, page_size=page_size)
            assert result.total == n_segments
            if not result.items:
                break
            collected.extend(result.items)
            # If we got fewer items than page_size, this is the last page
            if len(result.items) < page_size:
                break
            page += 1

        assert len(collected) == n_segments


# ---------------------------------------------------------------------------
# Property 4: 更新持久化 (Update Persistence)
#
# For any existing segment and a valid update payload (with valid DSL),
# after updating and then querying the segment, changed fields should
# reflect the new values and unchanged fields should keep their original
# values.
#
# Feature: segment-api, Property 4: 更新持久化
# **Validates: Requirements 4.1**
# ---------------------------------------------------------------------------


class TestProperty4UpdatePersistence:
    @given(
        pid=project_ids,
        # --- original segment fields ---
        orig_name=segment_names,
        orig_desc=st.one_of(st.none(), safe_text),
        orig_dsl=valid_dsls,
        orig_tf=timeframes,
        # --- update fields (None means "not included in update") ---
        new_name=st.one_of(st.none(), segment_names),
        new_desc=st.one_of(st.none(), safe_text),
        new_dsl=st.one_of(st.none(), valid_dsls),
        new_tf=st.one_of(st.none(), timeframes),
    )
    @settings(max_examples=100)
    async def test_update_persists_changed_fields_and_preserves_unchanged(
        self,
        pid: str,
        orig_name: str,
        orig_desc: str | None,
        orig_dsl: str,
        orig_tf: dict,
        new_name: str | None,
        new_desc: str | None,
        new_dsl: str | None,
        new_tf: dict | None,
    ) -> None:
        """Property 4: 更新持久化

        Create a segment, then update with a random subset of fields.
        After querying, changed fields should reflect the update values
        and unchanged fields should keep their original values.

        **Validates: Requirements 4.1**
        """
        service, _ = _make_service()

        # Create the original segment
        orig_timeframe = SegmentTimeframe(**orig_tf)
        create_payload = SegmentCreate(
            name=orig_name,
            description=orig_desc,
            dsl=orig_dsl,
            timeframe=orig_timeframe,
        )
        created = await service.create(pid, create_payload)

        # Build update payload with randomly included/excluded fields
        update_kwargs: dict[str, Any] = {}
        if new_name is not None:
            update_kwargs["name"] = new_name
        if new_desc is not None:
            update_kwargs["description"] = new_desc
        if new_dsl is not None:
            update_kwargs["dsl"] = new_dsl
        if new_tf is not None:
            update_kwargs["timeframe"] = SegmentTimeframe(**new_tf)

        update_payload = SegmentUpdate(**update_kwargs)

        # Perform the update
        await service.update(pid, created.segment_id, update_payload)

        # Query the segment after update
        fetched = await service.get(pid, created.segment_id)
        assert fetched is not None

        # Verify changed fields reflect new values
        if new_name is not None:
            assert fetched.name == new_name
        else:
            assert fetched.name == orig_name

        if new_desc is not None:
            assert fetched.description == new_desc
        else:
            assert fetched.description == orig_desc

        if new_dsl is not None:
            assert fetched.dsl == new_dsl
        else:
            assert fetched.dsl == orig_dsl

        if new_tf is not None:
            assert fetched.timeframe.type == new_tf["type"]
            if new_tf["type"] == "absolute":
                assert fetched.timeframe.start == new_tf["start"]
                assert fetched.timeframe.end == new_tf["end"]
            else:
                assert fetched.timeframe.relative == new_tf["relative"]
        else:
            assert fetched.timeframe.type == orig_tf["type"]
            if orig_tf["type"] == "absolute":
                assert fetched.timeframe.start == orig_tf["start"]
                assert fetched.timeframe.end == orig_tf["end"]
            else:
                assert fetched.timeframe.relative == orig_tf["relative"]

        # segment_id and project_id must never change
        assert fetched.segment_id == created.segment_id
        assert fetched.project_id == pid


# ---------------------------------------------------------------------------
# Property 5: 空更新冪等性 (Empty Update Idempotency)
#
# For any existing segment, submitting an update request with no field
# changes should return segment data identical to the original — all fields
# including timestamps must remain unchanged.
#
# Feature: segment-api, Property 5: 空更新冪等性
# **Validates: Requirements 4.4**
# ---------------------------------------------------------------------------


class TestProperty5EmptyUpdateIdempotency:
    @given(
        pid=project_ids,
        name=segment_names,
        desc=st.one_of(st.none(), safe_text),
        dsl=valid_dsls,
        tf=timeframes,
    )
    @settings(max_examples=100)
    async def test_empty_update_returns_identical_segment(
        self,
        pid: str,
        name: str,
        desc: str | None,
        dsl: str,
        tf: dict,
    ) -> None:
        """Property 5: 空更新冪等性

        Create a segment, then submit an empty SegmentUpdate() with no fields
        set. The returned segment data must be identical to the original,
        including all fields and timestamps.

        **Validates: Requirements 4.4**
        """
        service, _ = _make_service()

        # Create a segment with random valid payload
        timeframe = SegmentTimeframe(**tf)
        create_payload = SegmentCreate(
            name=name,
            description=desc,
            dsl=dsl,
            timeframe=timeframe,
        )
        created = await service.create(pid, create_payload)

        # Submit an empty update (no fields set)
        empty_update = SegmentUpdate()
        updated = await service.update(pid, created.segment_id, empty_update)

        # All fields must be identical to the original
        assert updated.segment_id == created.segment_id
        assert updated.project_id == created.project_id
        assert updated.name == created.name
        assert updated.description == created.description
        assert updated.dsl == created.dsl
        assert updated.timeframe == created.timeframe
        assert updated.created_at == created.created_at
        assert updated.updated_at == created.updated_at


# ---------------------------------------------------------------------------
# Property 6: 刪除移除 Segment (Delete Removes Segment)
#
# For any created segment, after deletion, querying by the same segment_id
# should return None, and the segment should not appear in the list results.
#
# Feature: segment-api, Property 6: 刪除移除 Segment
# **Validates: Requirements 5.1**
# ---------------------------------------------------------------------------


class TestProperty6DeleteRemovesSegment:
    @given(
        pid=project_ids,
        name=segment_names,
        desc=st.one_of(st.none(), safe_text),
        dsl=valid_dsls,
        tf=timeframes,
    )
    @settings(max_examples=100)
    async def test_delete_then_get_returns_none_and_list_excludes(
        self,
        pid: str,
        name: str,
        desc: str | None,
        dsl: str,
        tf: dict,
    ) -> None:
        """Property 6: 刪除移除 Segment

        Create a segment, delete it, then verify:
        1. delete returns True
        2. get returns None
        3. list does not contain the deleted segment

        **Validates: Requirements 5.1**
        """
        service, _ = _make_service()

        # Create a segment
        timeframe = SegmentTimeframe(**tf)
        payload = SegmentCreate(
            name=name,
            description=desc,
            dsl=dsl,
            timeframe=timeframe,
        )
        created = await service.create(pid, payload)
        segment_id = created.segment_id

        # Delete the segment — should return True
        deleted = await service.delete(pid, segment_id)
        assert deleted is True

        # get should return None
        fetched = await service.get(pid, segment_id)
        assert fetched is None

        # list should not contain the deleted segment
        result = await service.list(pid, page=1, page_size=100)
        listed_ids = [s.segment_id for s in result.items]
        assert segment_id not in listed_ids
