"""Property-based test for UDF aggregation rejection.

# Feature: dsl-engine, Property 18: UDF Rejects Unsupported Aggregation Functions

*For any* DSL AST containing an aggregation function (COUNT, SUM, AVG, MIN,
MAX, UNIQUE, TOP, WHERE, BY), the UDF generator SHALL raise an error
indicating the function is not supported in UDF mode.

**Validates: Requirements 16.4**
"""

import string

from hypothesis import given, settings
from hypothesis import strategies as st

from app.dsl.ast_nodes import DslNode, FieldRef, FunctionCall, Literal
from app.dsl.function_registry import FUNCTION_REGISTRY
from app.dsl.udf_generator import UdfGenerator, UNSUPPORTED_IN_UDF

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SAFE_CHARS = string.ascii_letters + string.digits + "_"

# Aggregation functions that must be rejected
AGGREGATION_FUNCS = sorted(UNSUPPORTED_IN_UDF)

# Non-aggregation functions for wrapping (exclude data-access & aggregation)
_EXCLUDED = UNSUPPORTED_IN_UDF | {"EVENT", "PROFILE", "PARAM"}
_WRAPPER_FUNCS: list[tuple[str, int]] = []
for _name, _sig in FUNCTION_REGISTRY.items():
    if _name in _EXCLUDED:
        continue
    if _sig.min_args >= 1 and _sig.max_args is not None and _sig.max_args >= 1:
        _WRAPPER_FUNCS.append((_name, _sig.min_args))

# ---------------------------------------------------------------------------
# Leaf strategies
# ---------------------------------------------------------------------------


@st.composite
def literal_strategy(draw: st.DrawFn) -> Literal:
    """Generate a Literal node."""
    kind = draw(st.sampled_from(["number", "string", "boolean"]))
    if kind == "number":
        return Literal(value=draw(st.integers(-1000, 1000)), type="number")
    if kind == "string":
        return Literal(
            value=draw(st.text(alphabet=SAFE_CHARS, min_size=0, max_size=10)),
            type="string",
        )
    return Literal(value=draw(st.booleans()), type="boolean")


@st.composite
def field_ref_strategy(draw: st.DrawFn) -> FieldRef:
    """Generate a FieldRef node."""
    source = draw(st.sampled_from(["EVENT", "PROFILE"]))
    field = draw(st.text(alphabet=SAFE_CHARS, min_size=1, max_size=10))
    return FieldRef(source=source, field=field)


def leaf_strategy() -> st.SearchStrategy[DslNode]:
    return st.one_of(literal_strategy(), field_ref_strategy())


# ---------------------------------------------------------------------------
# Strategy: AST with an aggregation function at the top level
# ---------------------------------------------------------------------------


@st.composite
def aggregation_at_top(draw: st.DrawFn) -> FunctionCall:
    """Generate a FunctionCall whose root is an unsupported aggregation."""
    agg_name = draw(st.sampled_from(AGGREGATION_FUNCS))
    sig = FUNCTION_REGISTRY[agg_name]
    n_args = sig.min_args if sig.max_args is None else sig.min_args
    args = tuple(draw(leaf_strategy()) for _ in range(max(n_args, 1)))
    return FunctionCall(name=agg_name, args=args)


# ---------------------------------------------------------------------------
# Strategy: AST with an aggregation function nested inside a wrapper
# ---------------------------------------------------------------------------


@st.composite
def aggregation_nested(draw: st.DrawFn) -> FunctionCall:
    """Generate a FunctionCall that wraps an aggregation inside another func."""
    # Build the inner aggregation node
    agg_name = draw(st.sampled_from(AGGREGATION_FUNCS))
    sig = FUNCTION_REGISTRY[agg_name]
    n_args = sig.min_args if sig.max_args is None else sig.min_args
    inner_args = tuple(draw(leaf_strategy()) for _ in range(max(n_args, 1)))
    agg_node = FunctionCall(name=agg_name, args=inner_args)

    # Wrap in a non-aggregation function that takes at least 1 arg
    if _WRAPPER_FUNCS:
        wrapper_name, min_args = draw(st.sampled_from(_WRAPPER_FUNCS))
        # Place the aggregation node as the first argument
        extra_args = tuple(draw(leaf_strategy()) for _ in range(min_args - 1))
        return FunctionCall(name=wrapper_name, args=(agg_node,) + extra_args)

    # Fallback: wrap in ABS
    return FunctionCall(name="ABS", args=(agg_node,))


# ---------------------------------------------------------------------------
# Combined strategy
# ---------------------------------------------------------------------------


def ast_with_aggregation() -> st.SearchStrategy[DslNode]:
    """Generate ASTs that contain at least one aggregation function."""
    return st.one_of(aggregation_at_top(), aggregation_nested())


# ---------------------------------------------------------------------------
# Property test
# ---------------------------------------------------------------------------

_generator = UdfGenerator()


@given(ast=ast_with_aggregation())
@settings(max_examples=200)
def test_udf_rejects_unsupported_aggregation_functions(ast: DslNode):
    """Property 18: UDF Rejects Unsupported Aggregation Functions

    For any DSL AST containing an aggregation function (COUNT, SUM, AVG,
    MIN, MAX, UNIQUE, TOP, WHERE, BY), UdfGenerator.generate() SHALL raise
    a ValueError indicating the function is not supported in UDF mode.

    **Validates: Requirements 16.4**
    """
    try:
        _generator.generate(ast)
        raise AssertionError(
            f"Expected ValueError for aggregation AST but none was raised.\n"
            f"  AST: {ast!r}"
        )
    except ValueError as exc:
        error_msg = str(exc)
        assert "not supported in UDF mode" in error_msg, (
            f"ValueError message should mention 'not supported in UDF mode', "
            f"got: {error_msg!r}"
        )
