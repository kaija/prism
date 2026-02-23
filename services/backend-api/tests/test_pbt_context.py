"""Property-based test for data access function resolution.

# Feature: dsl-engine, Property 9: Data Access Function Resolution

For any evaluation context with event props, profile props, and params,
EVENT(field) SHALL return the value from event props, PROFILE(field) SHALL
return the value from profile props, PARAM(field) SHALL return the value
from params, and referencing a non-existent field SHALL return null.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**
"""

import string

from hypothesis import given, settings
from hypothesis import strategies as st

from app.dsl.context import EvaluationContext

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

SAFE_CHARS = string.ascii_letters + string.digits + "_"

# Strategy for field names
field_names = st.text(alphabet=SAFE_CHARS, min_size=1, max_size=20)

# Strategy for property values — covers the types the DSL engine handles
prop_values = st.one_of(
    st.integers(-10_000, 10_000),
    st.floats(allow_nan=False, allow_infinity=False, min_value=-1e6, max_value=1e6),
    st.text(alphabet=SAFE_CHARS, min_size=0, max_size=20),
    st.booleans(),
    st.none(),
    st.lists(st.integers(-100, 100), max_size=5),
)

# Strategy for property dicts (field_name -> value)
prop_dicts = st.dictionaries(keys=field_names, values=prop_values, max_size=10)


# ---------------------------------------------------------------------------
# Property tests
# ---------------------------------------------------------------------------


@given(
    event_props=prop_dicts,
    profile_props=prop_dicts,
    params=prop_dicts,
)
@settings(max_examples=100)
def test_event_field_resolution(
    event_props: dict,
    profile_props: dict,
    params: dict,
):
    """Property 9 (part 1): EVENT(field) resolves from event props.

    For each key in event_props, resolve_field_ref("EVENT", key) returns
    the correct value.

    **Validates: Requirements 9.1**
    """
    ctx = EvaluationContext(
        event_props=event_props,
        profile_props=profile_props,
        params=params,
    )
    for key, expected in event_props.items():
        actual = ctx.resolve_field_ref("EVENT", key)
        assert actual == expected, (
            f'EVENT("{key}") returned {actual!r}, expected {expected!r}'
        )


@given(
    event_props=prop_dicts,
    profile_props=prop_dicts,
    params=prop_dicts,
)
@settings(max_examples=100)
def test_profile_field_resolution(
    event_props: dict,
    profile_props: dict,
    params: dict,
):
    """Property 9 (part 2): PROFILE(field) resolves from profile props.

    For each key in profile_props, resolve_field_ref("PROFILE", key) returns
    the correct value.

    **Validates: Requirements 9.2**
    """
    ctx = EvaluationContext(
        event_props=event_props,
        profile_props=profile_props,
        params=params,
    )
    for key, expected in profile_props.items():
        actual = ctx.resolve_field_ref("PROFILE", key)
        assert actual == expected, (
            f'PROFILE("{key}") returned {actual!r}, expected {expected!r}'
        )


@given(
    event_props=prop_dicts,
    profile_props=prop_dicts,
    params=prop_dicts,
)
@settings(max_examples=100)
def test_param_field_resolution(
    event_props: dict,
    profile_props: dict,
    params: dict,
):
    """Property 9 (part 3): PARAM(field) resolves from params.

    For each key in params, resolve_field_ref("PARAM", key) returns
    the correct value.

    **Validates: Requirements 9.3**
    """
    ctx = EvaluationContext(
        event_props=event_props,
        profile_props=profile_props,
        params=params,
    )
    for key, expected in params.items():
        actual = ctx.resolve_field_ref("PARAM", key)
        assert actual == expected, (
            f'PARAM("{key}") returned {actual!r}, expected {expected!r}'
        )


@given(
    event_props=prop_dicts,
    profile_props=prop_dicts,
    params=prop_dicts,
    missing_field=field_names,
)
@settings(max_examples=100)
def test_nonexistent_field_returns_none(
    event_props: dict,
    profile_props: dict,
    params: dict,
    missing_field: str,
):
    """Property 9 (part 4): Non-existent fields return None.

    For a key NOT in any dict, resolve_field_ref returns None for all
    sources, including unknown sources.

    **Validates: Requirements 9.4**
    """
    # Remove the field from all dicts to guarantee it's missing
    event_props = {k: v for k, v in event_props.items() if k != missing_field}
    profile_props = {k: v for k, v in profile_props.items() if k != missing_field}
    params = {k: v for k, v in params.items() if k != missing_field}

    ctx = EvaluationContext(
        event_props=event_props,
        profile_props=profile_props,
        params=params,
    )

    assert ctx.resolve_field_ref("EVENT", missing_field) is None, (
        f'EVENT("{missing_field}") should be None for missing field'
    )
    assert ctx.resolve_field_ref("PROFILE", missing_field) is None, (
        f'PROFILE("{missing_field}") should be None for missing field'
    )
    assert ctx.resolve_field_ref("PARAM", missing_field) is None, (
        f'PARAM("{missing_field}") should be None for missing field'
    )
    assert ctx.resolve_field_ref("UNKNOWN", missing_field) is None, (
        f'UNKNOWN("{missing_field}") should be None for unknown source'
    )
