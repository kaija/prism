"""Unit tests for SegmentService — edge cases and error conditions.

Focuses on specific scenarios that property-based tests don't cover well:
- DSL exceeding max length
- Empty project list
- Get/update/delete non-existent segment
- Pydantic name validation

**Validates: Requirements 1.3, 1.4, 2.3, 3.2, 4.3, 5.2**
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.segment import SegmentCreate, SegmentTimeframe, SegmentUpdate
from app.services.segment_service import SegmentService

# Re-use the in-memory helpers from PBT tests
from tests.test_pbt_segment_service import make_in_memory_repo


def _make_service() -> tuple[SegmentService, object]:
    repo = make_in_memory_repo()
    service = SegmentService(repo=repo)
    return service, repo


_VALID_TIMEFRAME = SegmentTimeframe(type="relative", relative="last_7_days")


# ------------------------------------------------------------------
# Edge case: DSL exceeds max length (Req 1.4)
# ------------------------------------------------------------------


class TestDslMaxLength:
    """DSL expression exceeding MAX_DSL_LENGTH (10000) should be rejected."""

    async def test_create_with_dsl_exceeding_max_length_raises_value_error(self):
        """A DSL > 10000 chars should fail validation on create.

        **Validates: Requirements 1.4**
        """
        service, _ = _make_service()
        long_dsl = "A" * 10_001

        with pytest.raises(ValueError, match="maximum length"):
            await service.create(
                "proj1",
                SegmentCreate(
                    name="seg1",
                    dsl=long_dsl,
                    timeframe=_VALID_TIMEFRAME,
                ),
            )

    def test_validate_dsl_long_returns_error(self):
        """validate_dsl should return invalid for DSL > 10000 chars."""
        service, _ = _make_service()
        result = service.validate_dsl("X" * 10_001)

        assert result.valid is False
        assert any("maximum length" in e for e in result.errors)


# ------------------------------------------------------------------
# Edge case: empty project list (Req 2.3)
# ------------------------------------------------------------------


class TestEmptyProjectList:
    """Listing segments for a project with none should return empty results."""

    async def test_list_empty_project_returns_zero_total_and_empty_items(self):
        """An empty project should return items=[] and total=0.

        **Validates: Requirements 2.3**
        """
        service, _ = _make_service()

        result = await service.list("empty_project", page=1, page_size=10)

        assert result.items == []
        assert result.total == 0


# ------------------------------------------------------------------
# Error condition: non-existent segment (Req 3.2, 4.3, 5.2)
# ------------------------------------------------------------------


class TestNonExistentSegment:
    """Operations on non-existent segment IDs should signal appropriately."""

    async def test_get_returns_none_for_missing_segment(self):
        """get returns None when the segment ID doesn't exist.

        **Validates: Requirements 3.2**
        """
        service, _ = _make_service()

        result = await service.get("proj1", "nonexistent-id")

        assert result is None

    async def test_update_raises_lookup_error_for_missing_segment(self):
        """update raises LookupError for a non-existent segment ID.

        **Validates: Requirements 4.3**
        """
        service, _ = _make_service()

        with pytest.raises(LookupError, match="not found"):
            await service.update(
                "proj1",
                "nonexistent-id",
                SegmentUpdate(name="new_name"),
            )

    async def test_delete_returns_false_for_missing_segment(self):
        """delete returns False when the segment ID doesn't exist.

        **Validates: Requirements 5.2**
        """
        service, _ = _make_service()

        result = await service.delete("proj1", "nonexistent-id")

        assert result is False


# ------------------------------------------------------------------
# Edge case: Pydantic name validation (Req 1.3)
# ------------------------------------------------------------------


class TestPydanticNameValidation:
    """Pydantic model validation catches bad name input before it reaches the service."""

    def test_empty_name_rejected(self):
        """Empty string name should fail Pydantic min_length=1 validation.

        **Validates: Requirements 1.3**
        """
        with pytest.raises(ValidationError):
            SegmentCreate(
                name="",
                dsl='ABS(3)',
                timeframe=_VALID_TIMEFRAME,
            )

    def test_whitespace_only_name_accepted_by_pydantic(self):
        """Whitespace-only name passes Pydantic min_length but is still a string.

        Note: Pydantic min_length=1 counts whitespace characters, so ' ' passes.
        **Validates: Requirements 1.3**
        """
        # Pydantic allows whitespace-only strings with min_length=1
        model = SegmentCreate(
            name=" ",
            dsl='ABS(3)',
            timeframe=_VALID_TIMEFRAME,
        )
        assert model.name == " "
