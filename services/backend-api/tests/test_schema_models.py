"""Unit tests for Schema Pydantic models (PropertyCreate, PropertyUpdate, PropertyResponse)."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.models.schema import PropertyCreate, PropertyResponse, PropertyUpdate


# --- PropertyCreate ---


class TestPropertyCreate:
    def test_valid_static(self):
        p = PropertyCreate(
            name="birthday",
            data_type="string",
            description="User birthday",
            property_type="static",
            formula=None,
        )
        assert p.name == "birthday"
        assert p.data_type == "string"
        assert p.property_type == "static"
        assert p.formula is None

    def test_valid_dynamic(self):
        p = PropertyCreate(
            name="sign",
            data_type="string",
            property_type="dynamic",
            formula='SIGN(PROFILE("birthday"))',
        )
        assert p.property_type == "dynamic"
        assert p.formula == 'SIGN(PROFILE("birthday"))'

    def test_description_optional(self):
        p = PropertyCreate(
            name="age", data_type="integer", property_type="static"
        )
        assert p.description is None

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            PropertyCreate(name="", data_type="string", property_type="static")

    def test_name_max_length(self):
        p = PropertyCreate(name="n" * 128, data_type="string", property_type="static")
        assert len(p.name) == 128

    def test_name_exceeds_max_length(self):
        with pytest.raises(ValidationError):
            PropertyCreate(name="n" * 129, data_type="string", property_type="static")

    def test_empty_data_type_rejected(self):
        with pytest.raises(ValidationError):
            PropertyCreate(name="age", data_type="", property_type="static")

    def test_data_type_max_length(self):
        p = PropertyCreate(name="age", data_type="d" * 50, property_type="static")
        assert len(p.data_type) == 50

    def test_data_type_exceeds_max_length(self):
        with pytest.raises(ValidationError):
            PropertyCreate(name="age", data_type="d" * 51, property_type="static")

    def test_invalid_property_type_rejected(self):
        with pytest.raises(ValidationError):
            PropertyCreate(
                name="age", data_type="string", property_type="unknown"
            )


# --- PropertyUpdate ---


class TestPropertyUpdate:
    def test_all_none(self):
        p = PropertyUpdate()
        assert p.name is None
        assert p.data_type is None
        assert p.description is None
        assert p.property_type is None
        assert p.formula is None

    def test_partial_update_name(self):
        p = PropertyUpdate(name="new_name")
        assert p.name == "new_name"
        assert p.data_type is None

    def test_partial_update_property_type(self):
        p = PropertyUpdate(property_type="dynamic", formula='SIGN(PROFILE("birthday"))')
        assert p.property_type == "dynamic"

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            PropertyUpdate(name="")

    def test_name_exceeds_max_length(self):
        with pytest.raises(ValidationError):
            PropertyUpdate(name="n" * 129)

    def test_empty_data_type_rejected(self):
        with pytest.raises(ValidationError):
            PropertyUpdate(data_type="")

    def test_invalid_property_type_rejected(self):
        with pytest.raises(ValidationError):
            PropertyUpdate(property_type="invalid")


# --- PropertyResponse ---


class TestPropertyResponse:
    def test_full_response(self):
        now = datetime.now(timezone.utc)
        p = PropertyResponse(
            id=1,
            project_id="proj_001",
            schema_type="profile",
            name="birthday",
            data_type="string",
            description="User birthday",
            property_type="static",
            formula=None,
            created_at=now,
        )
        assert p.id == 1
        assert p.project_id == "proj_001"
        assert p.schema_type == "profile"
        assert p.created_at == now

    def test_dynamic_response(self):
        now = datetime.now(timezone.utc)
        p = PropertyResponse(
            id=2,
            project_id="proj_001",
            schema_type="profile",
            name="sign",
            data_type="string",
            property_type="dynamic",
            formula='SIGN(PROFILE("birthday"))',
            created_at=now,
        )
        assert p.property_type == "dynamic"
        assert p.formula is not None

    def test_missing_required_field_rejected(self):
        with pytest.raises(ValidationError):
            PropertyResponse(
                project_id="proj_001",
                schema_type="profile",
                name="age",
                data_type="integer",
                property_type="static",
                created_at=datetime.now(timezone.utc),
            )  # missing id
