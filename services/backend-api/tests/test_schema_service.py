"""Unit tests for SchemaService — edge cases and error conditions.

Focuses on specific scenarios that property-based tests don't cover well:
- Boundary values (empty name, very long formula)
- Error conditions (404, 409, 422)
- property_type conversion logic (static↔dynamic)

**Validates: Requirements 1.5, 2.6, 3.5, 4.2**
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.schema import PropertyCreate, PropertyUpdate
from app.services.schema_service import SchemaService

# Re-use the in-memory helpers from PBT tests
from tests.test_pbt_schema_service import make_in_memory_cache, make_in_memory_repo


def _make_service() -> tuple[SchemaService, object, object]:
    repo = make_in_memory_repo()
    cache = make_in_memory_cache()
    service = SchemaService(repo=repo, cache=cache)
    return service, repo, cache


# ------------------------------------------------------------------
# Edge cases: Pydantic validation
# ------------------------------------------------------------------


class TestPydanticValidation:
    """Pydantic model validation catches bad input before it reaches the service."""

    def test_empty_name_rejected(self):
        """Empty string name should fail Pydantic min_length=1 validation."""
        with pytest.raises(ValidationError):
            PropertyCreate(
                name="",
                data_type="string",
                property_type="static",
                formula=None,
            )

    def test_empty_data_type_rejected(self):
        """Empty string data_type should fail Pydantic min_length=1 validation."""
        with pytest.raises(ValidationError):
            PropertyCreate(
                name="valid_name",
                data_type="",
                property_type="static",
                formula=None,
            )

    def test_invalid_property_type_rejected(self):
        """property_type must be 'static' or 'dynamic'."""
        with pytest.raises(ValidationError):
            PropertyCreate(
                name="valid_name",
                data_type="string",
                property_type="invalid",  # type: ignore[arg-type]
                formula=None,
            )


# ------------------------------------------------------------------
# Edge case: very long formula
# ------------------------------------------------------------------


class TestLongFormula:
    """Formula exceeding MAX_FORMULA_LENGTH (10000) should be rejected."""

    async def test_formula_exceeding_max_length_rejected(self):
        """A formula > 10000 chars should fail DSL validation."""
        service, _, _ = _make_service()
        long_formula = "A" * 10_001

        with pytest.raises(ValueError, match="DSL validation failed"):
            await service.create_property(
                "proj1",
                "profile",
                PropertyCreate(
                    name="prop1",
                    data_type="string",
                    property_type="dynamic",
                    formula=long_formula,
                ),
            )

    def test_validate_formula_long_returns_error(self):
        """validate_formula should return error for formula > 10000 chars."""
        service, _, _ = _make_service()
        long_formula = "X" * 10_001

        valid, errors = service.validate_formula(long_formula)

        assert valid is False
        assert any("maximum length" in e for e in errors)


# ------------------------------------------------------------------
# Error condition: 404 — not found
# ------------------------------------------------------------------


class TestNotFound:
    """Operations on non-existent property IDs should signal 404."""

    async def test_get_property_returns_none_for_missing_id(self):
        """get_property returns None when the property ID doesn't exist.

        **Validates: Requirements 2.6**
        """
        service, _, _ = _make_service()

        result = await service.get_property("proj1", "profile", 9999)

        assert result is None

    async def test_update_property_raises_lookup_error_for_missing_id(self):
        """update_property raises LookupError for a non-existent ID.

        **Validates: Requirements 3.5**
        """
        service, _, _ = _make_service()

        with pytest.raises(LookupError, match="not found"):
            await service.update_property(
                "proj1",
                "profile",
                9999,
                PropertyUpdate(description="new desc"),
            )

    async def test_delete_property_returns_false_for_missing_id(self):
        """delete_property returns False when the property ID doesn't exist.

        **Validates: Requirements 4.2**
        """
        service, _, _ = _make_service()

        result = await service.delete_property("proj1", "profile", 9999)

        assert result is False


# ------------------------------------------------------------------
# Error condition: 409 — duplicate name
# ------------------------------------------------------------------


class TestDuplicateName:
    """Creating a property with a name that already exists should raise ValueError."""

    async def test_duplicate_name_raises_value_error(self):
        """Second create with same (project_id, schema_type, name) → ValueError.

        **Validates: Requirements 1.5** (mapped to 409 at router level)
        """
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name="birthday",
            data_type="string",
            property_type="static",
            formula=None,
        )
        await service.create_property("proj1", "profile", payload)

        with pytest.raises(ValueError, match="already exists"):
            await service.create_property("proj1", "profile", payload)

    async def test_same_name_different_schema_type_allowed(self):
        """Same name under different schema_type should succeed."""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name="birthday",
            data_type="string",
            property_type="static",
            formula=None,
        )
        await service.create_property("proj1", "profile", payload)

        # Same name but under "event" — should not conflict
        result = await service.create_property("proj1", "event", payload)
        assert result.name == "birthday"
        assert result.schema_type == "event"

    async def test_same_name_different_project_allowed(self):
        """Same name under different project_id should succeed."""
        service, _, _ = _make_service()
        payload = PropertyCreate(
            name="birthday",
            data_type="string",
            property_type="static",
            formula=None,
        )
        await service.create_property("proj1", "profile", payload)

        result = await service.create_property("proj2", "profile", payload)
        assert result.name == "birthday"
        assert result.project_id == "proj2"


# ------------------------------------------------------------------
# Error condition: 422 — invalid DSL formula
# ------------------------------------------------------------------


class TestInvalidDslFormula:
    """Invalid DSL formulas should raise ValueError (mapped to 422 at router)."""

    async def test_syntax_error_formula_rejected(self):
        """A formula with syntax errors should be rejected.

        **Validates: Requirements 1.5**
        """
        service, _, _ = _make_service()

        with pytest.raises(ValueError, match="DSL validation failed"):
            await service.create_property(
                "proj1",
                "profile",
                PropertyCreate(
                    name="bad_formula",
                    data_type="string",
                    property_type="dynamic",
                    formula="NOT_A_FUNCTION(",
                ),
            )

    async def test_empty_formula_for_dynamic_rejected(self):
        """Dynamic property with empty formula should be rejected."""
        service, _, _ = _make_service()

        with pytest.raises(ValueError, match="Formula is required"):
            await service.create_property(
                "proj1",
                "profile",
                PropertyCreate(
                    name="empty_formula",
                    data_type="string",
                    property_type="dynamic",
                    formula="",
                ),
            )

    async def test_whitespace_only_formula_for_dynamic_rejected(self):
        """Dynamic property with whitespace-only formula should be rejected."""
        service, _, _ = _make_service()

        with pytest.raises(ValueError, match="Formula is required"):
            await service.create_property(
                "proj1",
                "profile",
                PropertyCreate(
                    name="ws_formula",
                    data_type="string",
                    property_type="dynamic",
                    formula="   ",
                ),
            )


# ------------------------------------------------------------------
# Property_type conversion: static ↔ dynamic
# ------------------------------------------------------------------


class TestPropertyTypeConversion:
    """Tests for property_type transitions during update."""

    async def test_static_to_dynamic_requires_formula(self):
        """Switching from static to dynamic without formula should fail.

        **Validates: Requirements 3.2** (static→dynamic requires formula)
        """
        service, _, _ = _make_service()
        created = await service.create_property(
            "proj1",
            "profile",
            PropertyCreate(
                name="age",
                data_type="integer",
                property_type="static",
                formula=None,
            ),
        )

        with pytest.raises(ValueError, match="Formula is required"):
            await service.update_property(
                "proj1",
                "profile",
                created.id,
                PropertyUpdate(property_type="dynamic"),
            )

    async def test_static_to_dynamic_with_valid_formula_succeeds(self):
        """Switching from static to dynamic with a valid formula should succeed."""
        service, _, _ = _make_service()
        created = await service.create_property(
            "proj1",
            "profile",
            PropertyCreate(
                name="sign",
                data_type="string",
                property_type="static",
                formula=None,
            ),
        )

        updated = await service.update_property(
            "proj1",
            "profile",
            created.id,
            PropertyUpdate(
                property_type="dynamic",
                formula='UPPER(PROFILE("name"))',
            ),
        )

        assert updated.property_type == "dynamic"
        assert updated.formula == 'UPPER(PROFILE("name"))'

    async def test_dynamic_to_static_nullifies_formula(self):
        """Switching from dynamic to static should set formula to None.

        **Validates: Requirements 3.3** (dynamic→static nullifies formula)
        """
        service, _, _ = _make_service()
        created = await service.create_property(
            "proj1",
            "profile",
            PropertyCreate(
                name="computed_field",
                data_type="string",
                property_type="dynamic",
                formula='UPPER(PROFILE("name"))',
            ),
        )
        assert created.formula is not None

        updated = await service.update_property(
            "proj1",
            "profile",
            created.id,
            PropertyUpdate(property_type="static"),
        )

        assert updated.property_type == "static"
        assert updated.formula is None

        # Verify persistence via get
        fetched = await service.get_property("proj1", "profile", created.id)
        assert fetched is not None
        assert fetched.property_type == "static"
        assert fetched.formula is None

    async def test_update_formula_on_dynamic_with_invalid_dsl_rejected(self):
        """Updating a dynamic property's formula to invalid DSL should fail."""
        service, _, _ = _make_service()
        created = await service.create_property(
            "proj1",
            "profile",
            PropertyCreate(
                name="dyn_prop",
                data_type="string",
                property_type="dynamic",
                formula='ABS(3)',
            ),
        )

        with pytest.raises(ValueError, match="DSL validation failed"):
            await service.update_property(
                "proj1",
                "profile",
                created.id,
                PropertyUpdate(formula="INVALID_FUNC("),
            )

    async def test_static_property_with_formula_in_create_rejected(self):
        """Creating a static property with a non-null formula should fail."""
        service, _, _ = _make_service()

        with pytest.raises(ValueError, match="Formula must be null for static"):
            await service.create_property(
                "proj1",
                "profile",
                PropertyCreate(
                    name="bad_static",
                    data_type="string",
                    property_type="static",
                    formula='ABS(3)',
                ),
            )
