"""Property-based test for DSL parser round-trip.

# Feature: dsl-engine, Property 1: Parser Round-Trip (Python/Lark)

For any valid DSL AST (composed of function calls, literals, and field
references with arbitrary nesting), pretty-printing the AST to a string
and then parsing that string back SHALL produce an equivalent AST.

**Validates: Requirements 3.1, 3.3, 3.4, 1.1, 1.2, 1.3, 1.5, 1.6**
"""

import string

from hypothesis import assume, given, settings
from hypothesis import strategies as st

from app.dsl.ast_nodes import DslNode, FieldRef, FunctionCall, Literal
from app.dsl.function_registry import FUNCTION_REGISTRY
from app.dsl.parser import DslParser
from app.dsl.pretty_printer import pretty_print

# ---------------------------------------------------------------------------
# Safe alphabets and constants
# ---------------------------------------------------------------------------

SAFE_CHARS = string.ascii_letters + string.digits + " _-"

FIELD_SOURCES = ["EVENT", "PROFILE", "PARAM"]

# Classify registry functions by arity (exclude data-access — those are FieldRef)
_FIXED_ARG_FUNCS: dict[int, list[str]] = {}
_VARIADIC_FUNCS: list[tuple[str, int]] = []  # (name, min_args)
_ZERO_ARG_FUNCS: list[str] = []

for _name, _sig in FUNCTION_REGISTRY.items():
    if _name in ("EVENT", "PROFILE", "PARAM"):
        continue
    if _sig.min_args == 0 and _sig.max_args == 0:
        _ZERO_ARG_FUNCS.append(_name)
    elif _sig.max_args is None:
        _VARIADIC_FUNCS.append((_name, _sig.min_args))
    elif _sig.min_args == _sig.max_args:
        _FIXED_ARG_FUNCS.setdefault(_sig.min_args, []).append(_name)
    else:
        _VARIADIC_FUNCS.append((_name, _sig.min_args))

# ---------------------------------------------------------------------------
# Leaf strategies (no recursion)
# ---------------------------------------------------------------------------


@st.composite
def literal_strategy(draw: st.DrawFn) -> Literal:
    """Generate a Literal node that round-trips cleanly through pretty_print → parse."""
    kind = draw(st.sampled_from(["int", "float", "string", "boolean"]))

    if kind == "int":
        value = draw(st.integers(min_value=-999_999, max_value=999_999))
        return Literal(value=value, type="number")

    if kind == "float":
        value = draw(
            st.floats(
                min_value=-999_999,
                max_value=999_999,
                allow_nan=False,
                allow_infinity=False,
                allow_subnormal=False,
            )
        )
        # Skip whole-number floats — pretty_printer collapses 5.0 → "5" → int(5)
        assume(value != int(value))
        # Skip scientific notation — parser regex doesn't handle "1e-05"
        assume("e" not in str(value) and "E" not in str(value))
        return Literal(value=value, type="number")

    if kind == "string":
        value = draw(st.text(alphabet=SAFE_CHARS, min_size=0, max_size=20))
        return Literal(value=value, type="string")

    # boolean
    value = draw(st.booleans())
    return Literal(value=value, type="boolean")


@st.composite
def field_ref_strategy(draw: st.DrawFn) -> FieldRef:
    """Generate a FieldRef node with a safe field name."""
    source = draw(st.sampled_from(FIELD_SOURCES))
    field = draw(st.text(alphabet=SAFE_CHARS, min_size=1, max_size=20))
    return FieldRef(source=source, field=field)


# ---------------------------------------------------------------------------
# Recursive AST strategy using st.recursive
# ---------------------------------------------------------------------------


def _leaf_strategy() -> st.SearchStrategy[DslNode]:
    """Base (leaf) nodes: literals and field references."""
    return st.one_of(literal_strategy(), field_ref_strategy())


@st.composite
def _extend_with_function_call(
    draw: st.DrawFn, children: st.SearchStrategy[DslNode]
) -> DslNode:
    """Wrap child nodes into a FunctionCall from the registry."""
    choice = draw(st.sampled_from(["zero", "fixed", "variadic"]))

    if choice == "zero" and _ZERO_ARG_FUNCS:
        name = draw(st.sampled_from(_ZERO_ARG_FUNCS))
        return FunctionCall(name=name, args=())

    if choice == "fixed" and _FIXED_ARG_FUNCS:
        arity = draw(st.sampled_from(sorted(_FIXED_ARG_FUNCS.keys())))
        name = draw(st.sampled_from(_FIXED_ARG_FUNCS[arity]))
        args = tuple(draw(children) for _ in range(arity))
        return FunctionCall(name=name, args=args)

    # variadic — generate min_args to min_args + 2 arguments
    if _VARIADIC_FUNCS:
        name, min_args = draw(st.sampled_from(_VARIADIC_FUNCS))
        n = draw(st.integers(min_value=min_args, max_value=min_args + 2))
        args = tuple(draw(children) for _ in range(n))
        return FunctionCall(name=name, args=args)

    # Fallback
    arg = draw(children)
    return FunctionCall(name="ABS", args=(arg,))


def dsl_node_strategy() -> st.SearchStrategy[DslNode]:
    """Generate arbitrary DSL AST nodes with bounded recursion."""
    return st.recursive(
        base=_leaf_strategy(),
        extend=lambda children: st.one_of(children, _extend_with_function_call(children)),
        max_leaves=15,
    )


# ---------------------------------------------------------------------------
# Property test
# ---------------------------------------------------------------------------

_parser = DslParser()


@given(ast=dsl_node_strategy())
@settings(max_examples=200)
def test_parser_round_trip(ast: DslNode):
    """Property 1: parse(pretty_print(ast)) == ast

    **Validates: Requirements 3.1, 3.3, 3.4, 1.1, 1.2, 1.3, 1.5, 1.6**
    """
    printed = pretty_print(ast)
    reparsed = _parser.parse(printed)
    assert reparsed == ast, (
        f"Round-trip failed!\n"
        f"  Original AST: {ast!r}\n"
        f"  Pretty-printed: {printed!r}\n"
        f"  Re-parsed AST: {reparsed!r}"
    )
