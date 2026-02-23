"""Property-based test for AST validation.

# Feature: dsl-engine, Property 14: AST Validation Catches Invalid Expressions

For any AST containing an unknown function name, the validator SHALL report
an error. For any AST with incorrect argument count for a known function,
the validator SHALL report an error. For any AST with incompatible argument
types, the validator SHALL report a type mismatch error.

**Validates: Requirements 14.2, 14.3, 14.4**
"""

import string

from hypothesis import assume, given, settings
from hypothesis import strategies as st

from app.dsl.ast_nodes import DslNode, FieldRef, FunctionCall, Literal
from app.dsl.function_registry import FUNCTION_REGISTRY
from app.dsl.validator import validate

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

KNOWN_FUNC_NAMES = set(FUNCTION_REGISTRY.keys())
FIELD_SOURCES = ["EVENT", "PROFILE", "PARAM"]
SAFE_CHARS = string.ascii_letters + string.digits + "_"

# Functions that are NOT data-access (those become FieldRef in the parser)
_NON_ACCESS_FUNCS = [
    name for name in FUNCTION_REGISTRY if name not in ("EVENT", "PROFILE", "PARAM")
]

# Functions with fixed arg counts (min == max, both > 0)
_FIXED_ARG_FUNCS = [
    (name, sig)
    for name, sig in FUNCTION_REGISTRY.items()
    if name not in ("EVENT", "PROFILE", "PARAM")
    and sig.max_args is not None
    and sig.min_args == sig.max_args
    and sig.min_args > 0
]

# Variadic functions (max_args is None)
_VARIADIC_FUNCS = [
    (name, sig)
    for name, sig in FUNCTION_REGISTRY.items()
    if name not in ("EVENT", "PROFILE", "PARAM") and sig.max_args is None
]

# Zero-arg functions
_ZERO_ARG_FUNCS = [
    (name, sig)
    for name, sig in FUNCTION_REGISTRY.items()
    if sig.min_args == 0 and sig.max_args == 0
]

# Functions with specific (non-"any") type requirements
_TYPED_FUNCS = [
    (name, sig)
    for name, sig in FUNCTION_REGISTRY.items()
    if name not in ("EVENT", "PROFILE", "PARAM")
    and sig.min_args > 0
    and any(t != "any" for t in sig.arg_types)
]

# Type mapping for generating wrong-type literals
_TYPE_TO_WRONG: dict[str, list[tuple[object, str]]] = {
    "number": [("hello", "string"), (True, "boolean")],
    "string": [(42, "number"), (False, "boolean")],
    "boolean": [(42, "number"), ("hello", "string")],
}

# ---------------------------------------------------------------------------
# Leaf strategies
# ---------------------------------------------------------------------------


@st.composite
def valid_leaf(draw: st.DrawFn) -> DslNode:
    """Generate a valid leaf node (Literal or FieldRef)."""
    kind = draw(st.sampled_from(["number", "string", "boolean", "field_ref"]))
    if kind == "number":
        return Literal(value=draw(st.integers(-1000, 1000)), type="number")
    if kind == "string":
        return Literal(
            value=draw(st.text(alphabet=SAFE_CHARS, min_size=0, max_size=10)),
            type="string",
        )
    if kind == "boolean":
        return Literal(value=draw(st.booleans()), type="boolean")
    return FieldRef(
        source=draw(st.sampled_from(FIELD_SOURCES)),
        field=draw(st.text(alphabet=SAFE_CHARS, min_size=1, max_size=10)),
    )


# ---------------------------------------------------------------------------
# Strategy: unknown function names
# ---------------------------------------------------------------------------


@st.composite
def unknown_function_name(draw: st.DrawFn) -> str:
    """Generate a function name that is NOT in the registry."""
    name = draw(
        st.text(
            alphabet=string.ascii_uppercase + "_",
            min_size=2,
            max_size=15,
        ).filter(lambda n: n[0].isalpha())
    )
    name = name.upper()
    assume(name not in KNOWN_FUNC_NAMES)
    return name


@st.composite
def ast_with_unknown_function(draw: st.DrawFn) -> FunctionCall:
    """Generate a FunctionCall with a name NOT in FUNCTION_REGISTRY."""
    name = draw(unknown_function_name())
    n_args = draw(st.integers(min_value=0, max_value=3))
    args = tuple(draw(valid_leaf()) for _ in range(n_args))
    return FunctionCall(name=name, args=args)


# ---------------------------------------------------------------------------
# Strategy: wrong argument count
# ---------------------------------------------------------------------------


@st.composite
def ast_with_wrong_arg_count(draw: st.DrawFn) -> FunctionCall:
    """Generate a FunctionCall with the wrong number of arguments for a known function."""
    choice = draw(st.sampled_from(["fixed_too_few", "fixed_too_many", "variadic_too_few", "zero_too_many"]))

    if choice == "fixed_too_few" and _FIXED_ARG_FUNCS:
        name, sig = draw(st.sampled_from(_FIXED_ARG_FUNCS))
        # Generate fewer args than min_args (at least 0, strictly less than min)
        n_args = draw(st.integers(min_value=0, max_value=sig.min_args - 1))
        args = tuple(draw(valid_leaf()) for _ in range(n_args))
        return FunctionCall(name=name, args=args)

    if choice == "fixed_too_many" and _FIXED_ARG_FUNCS:
        name, sig = draw(st.sampled_from(_FIXED_ARG_FUNCS))
        # Generate more args than max_args
        n_args = draw(st.integers(min_value=sig.max_args + 1, max_value=sig.max_args + 3))
        args = tuple(draw(valid_leaf()) for _ in range(n_args))
        return FunctionCall(name=name, args=args)

    if choice == "variadic_too_few" and _VARIADIC_FUNCS:
        name, sig = draw(st.sampled_from(_VARIADIC_FUNCS))
        # Variadic functions have min_args >= 2, so generate fewer
        assume(sig.min_args > 0)
        n_args = draw(st.integers(min_value=0, max_value=sig.min_args - 1))
        args = tuple(draw(valid_leaf()) for _ in range(n_args))
        return FunctionCall(name=name, args=args)

    if choice == "zero_too_many" and _ZERO_ARG_FUNCS:
        name, sig = draw(st.sampled_from(_ZERO_ARG_FUNCS))
        n_args = draw(st.integers(min_value=1, max_value=3))
        args = tuple(draw(valid_leaf()) for _ in range(n_args))
        return FunctionCall(name=name, args=args)

    # Fallback: use a fixed-arg function with too few args
    assume(_FIXED_ARG_FUNCS)
    name, sig = draw(st.sampled_from(_FIXED_ARG_FUNCS))
    n_args = draw(st.integers(min_value=0, max_value=max(0, sig.min_args - 1)))
    args = tuple(draw(valid_leaf()) for _ in range(n_args))
    return FunctionCall(name=name, args=args)


# ---------------------------------------------------------------------------
# Strategy: wrong argument types
# ---------------------------------------------------------------------------


@st.composite
def ast_with_wrong_arg_types(draw: st.DrawFn) -> FunctionCall:
    """Generate a FunctionCall with at least one argument of incompatible type."""
    assume(_TYPED_FUNCS)
    name, sig = draw(st.sampled_from(_TYPED_FUNCS))

    # Build args with the correct count but at least one wrong type
    n_args = sig.min_args
    args = []
    made_wrong = False

    for i in range(n_args):
        expected_type = sig.arg_types[min(i, len(sig.arg_types) - 1)]
        if expected_type == "any":
            # "any" accepts everything — just provide a valid leaf
            args.append(draw(valid_leaf()))
            continue

        # Decide whether to make this arg wrong
        if not made_wrong or draw(st.booleans()):
            # Provide a wrong-type literal
            wrong_options = _TYPE_TO_WRONG.get(expected_type)
            if wrong_options:
                value, wrong_type = draw(st.sampled_from(wrong_options))
                args.append(Literal(value=value, type=wrong_type))
                made_wrong = True
                continue

        # Provide a correct-type literal
        if expected_type == "number":
            args.append(Literal(value=draw(st.integers(-100, 100)), type="number"))
        elif expected_type == "string":
            args.append(
                Literal(
                    value=draw(st.text(alphabet=SAFE_CHARS, min_size=1, max_size=5)),
                    type="string",
                )
            )
        elif expected_type == "boolean":
            args.append(Literal(value=draw(st.booleans()), type="boolean"))
        else:
            args.append(draw(valid_leaf()))

    # Ensure at least one arg was made wrong
    assume(made_wrong)
    return FunctionCall(name=name, args=tuple(args))


# ---------------------------------------------------------------------------
# Property tests
# ---------------------------------------------------------------------------


@given(node=ast_with_unknown_function())
@settings(max_examples=100)
def test_unknown_function_reports_error(node: FunctionCall):
    """Property 14 (part 1): Unknown function names are caught by the validator.

    For any AST containing an unknown function name, the validator SHALL
    report an error.

    **Validates: Requirements 14.2**
    """
    result = validate(node)
    assert not result.valid, (
        f"Validator should reject unknown function '{node.name}' but reported valid"
    )
    assert any("Unknown function" in e.message for e in result.errors), (
        f"Expected 'Unknown function' error for '{node.name}', "
        f"got: {[e.message for e in result.errors]}"
    )


@given(node=ast_with_wrong_arg_count())
@settings(max_examples=100)
def test_wrong_arg_count_reports_error(node: FunctionCall):
    """Property 14 (part 2): Wrong argument counts are caught by the validator.

    For any AST with incorrect argument count for a known function, the
    validator SHALL report an error.

    **Validates: Requirements 14.3**
    """
    result = validate(node)
    assert not result.valid, (
        f"Validator should reject {node.name}() with {len(node.args)} args but reported valid"
    )
    assert any(
        "at least" in e.message or "at most" in e.message for e in result.errors
    ), (
        f"Expected arg count error for {node.name}() with {len(node.args)} args, "
        f"got: {[e.message for e in result.errors]}"
    )


@given(node=ast_with_wrong_arg_types())
@settings(max_examples=100)
def test_wrong_arg_types_reports_error(node: FunctionCall):
    """Property 14 (part 3): Incompatible argument types are caught by the validator.

    For any AST with incompatible argument types, the validator SHALL report
    a type mismatch error.

    **Validates: Requirements 14.4**
    """
    result = validate(node)
    assert not result.valid, (
        f"Validator should reject {node.name}() with wrong arg types but reported valid"
    )
    assert any("expected" in e.message and "got" in e.message for e in result.errors), (
        f"Expected type mismatch error for {node.name}(), "
        f"got: {[e.message for e in result.errors]}"
    )
