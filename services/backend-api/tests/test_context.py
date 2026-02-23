"""Unit tests for EvaluationContext."""

import pytest
from app.dsl.context import EvaluationContext


class TestEvaluationContextDefaults:
    """Test that EvaluationContext initializes with correct defaults."""

    def test_default_event_props(self):
        ctx = EvaluationContext()
        assert ctx.event_props == {}

    def test_default_profile_props(self):
        ctx = EvaluationContext()
        assert ctx.profile_props == {}

    def test_default_params(self):
        ctx = EvaluationContext()
        assert ctx.params == {}

    def test_default_event_history(self):
        ctx = EvaluationContext()
        assert ctx.event_history == []

    def test_default_event_timestamp(self):
        ctx = EvaluationContext()
        assert ctx.event_timestamp == 0

    def test_default_processing_time(self):
        ctx = EvaluationContext()
        assert ctx.processing_time == 0

    def test_separate_instances_have_independent_dicts(self):
        ctx1 = EvaluationContext()
        ctx2 = EvaluationContext()
        ctx1.event_props["x"] = 1
        assert "x" not in ctx2.event_props


class TestResolveFieldRefEvent:
    """Test EVENT source resolution (Requirement 9.1)."""

    def test_resolve_existing_event_field(self):
        ctx = EvaluationContext(event_props={"action": "click", "value": 42})
        assert ctx.resolve_field_ref("EVENT", "action") == "click"
        assert ctx.resolve_field_ref("EVENT", "value") == 42

    def test_resolve_missing_event_field_returns_none(self):
        ctx = EvaluationContext(event_props={"action": "click"})
        assert ctx.resolve_field_ref("EVENT", "missing") is None


class TestResolveFieldRefProfile:
    """Test PROFILE source resolution (Requirement 9.2)."""

    def test_resolve_existing_profile_field(self):
        ctx = EvaluationContext(profile_props={"name": "Alice", "age": 30})
        assert ctx.resolve_field_ref("PROFILE", "name") == "Alice"
        assert ctx.resolve_field_ref("PROFILE", "age") == 30

    def test_resolve_missing_profile_field_returns_none(self):
        ctx = EvaluationContext(profile_props={"name": "Alice"})
        assert ctx.resolve_field_ref("PROFILE", "missing") is None


class TestResolveFieldRefParam:
    """Test PARAM source resolution (Requirement 9.3)."""

    def test_resolve_existing_param_field(self):
        ctx = EvaluationContext(params={"threshold": 100, "mode": "strict"})
        assert ctx.resolve_field_ref("PARAM", "threshold") == 100
        assert ctx.resolve_field_ref("PARAM", "mode") == "strict"

    def test_resolve_missing_param_field_returns_none(self):
        ctx = EvaluationContext(params={"threshold": 100})
        assert ctx.resolve_field_ref("PARAM", "missing") is None


class TestResolveFieldRefUnknownSource:
    """Test unknown source returns None (Requirement 9.4)."""

    def test_unknown_source_returns_none(self):
        ctx = EvaluationContext(
            event_props={"x": 1},
            profile_props={"y": 2},
            params={"z": 3},
        )
        assert ctx.resolve_field_ref("UNKNOWN", "x") is None

    def test_empty_source_returns_none(self):
        ctx = EvaluationContext(event_props={"x": 1})
        assert ctx.resolve_field_ref("", "x") is None


class TestResolveFieldRefValueTypes:
    """Test that various value types are resolved correctly."""

    def test_resolve_none_value(self):
        ctx = EvaluationContext(event_props={"nullable": None})
        assert ctx.resolve_field_ref("EVENT", "nullable") is None

    def test_resolve_boolean_value(self):
        ctx = EvaluationContext(event_props={"active": True})
        assert ctx.resolve_field_ref("EVENT", "active") is True

    def test_resolve_float_value(self):
        ctx = EvaluationContext(event_props={"score": 3.14})
        assert ctx.resolve_field_ref("EVENT", "score") == 3.14

    def test_resolve_list_value(self):
        ctx = EvaluationContext(event_props={"tags": ["a", "b"]})
        assert ctx.resolve_field_ref("EVENT", "tags") == ["a", "b"]

    def test_resolve_dict_value(self):
        ctx = EvaluationContext(event_props={"meta": {"k": "v"}})
        assert ctx.resolve_field_ref("EVENT", "meta") == {"k": "v"}


class TestEvaluationContextCustomInit:
    """Test initialization with custom values."""

    def test_custom_event_history(self):
        history = [{"event": "a"}, {"event": "b"}]
        ctx = EvaluationContext(event_history=history)
        assert ctx.event_history == history
        assert len(ctx.event_history) == 2

    def test_custom_timestamps(self):
        ctx = EvaluationContext(event_timestamp=1000, processing_time=2000)
        assert ctx.event_timestamp == 1000
        assert ctx.processing_time == 2000
