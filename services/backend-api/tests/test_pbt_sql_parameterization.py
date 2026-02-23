"""Property-based test for SQL parameterization.

# Feature: dsl-engine, Property 16: SQL Generation Uses Parameterized Values

*For any* DSL AST containing string or numeric literals, the SQL generator
SHALL place all user-supplied literal values in the params list and use `?`
placeholders in the SQL string, never interpolating values directly.

**Validates: Requirements 15.4, 15.6**
"""

import string
from typing import Union

from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.dsl.ast_nodes import DslNode, FieldRef, FunctionCall, Literal
from app.dsl.function_registry import FUNCTION_REGISTRY
from app.dsl.sql_generator import SqlGenerator

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SAFE_CHARS = string.ascii_letters + string.digits + " _-"
FIELD_SOURCES = ["EVENT", "PROFILE", "PARAM"]

# Classify registry functions by arity (exclude data-access handled as FieldRef)
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
# Leaf strategies
# ---------------------------------------------------------------------------


@st.composite
def string_literal_strategy(draw: st.DrawFn) -> Literal:
    """Generate a string Literal node."""
    value = draw(st.text(alphabet=SAFE_CHARS, min_size=1, max_size=20))
    return Literal(value=value, type="string")


@st.composite
def numeric_literal_strategy(draw: st.DrawFn) -> Literal:
    """Generate a numeric (int or float) Literal node."""
    kind = draw(st.sampled_from(["int", "float"]))
    if kind == "int":
        value = draw(st.integers(min_value=-999_999, max_value=999_999))
        return Literal(value=value, type="number")
    value = draw(
        st.floats(
            min_value=-999_999,
            max_value=999_999,
            allow_nan=False,
            allow_infinity=False,
            allow_subnormal=False,
        )
    )
    assume(value != int(value))
    assume("e" not in str(value) and "E" not in str(value))
    return Literal(value=value, type="number")


@st.composite
def boolean_literal_strategy(draw: st.DrawFn) -> Literal:
    """Generate a boolean Literal node."""
    return Literal(value=draw(st.booleans()), type="boolean")


@st.composite
def field_ref_strategy(draw: st.DrawFn) -> FieldRef:
    """Generate a FieldRef node."""
    source = draw(st.sampled_from(FIELD_SOURCES))
    field = draw(st.text(alphabet=SAFE_CHARS, min_size=1, max_size=20))
    return FieldRef(source=source, field=field)


def any_leaf() -> st.SearchStrategy[DslNode]:
    return st.one_of(
        string_literal_strategy(),
        numeric_literal_strategy(),
        boolean_literal_strategy(),
        field_ref_strategy(),
    )


# ---------------------------------------------------------------------------
# Recursive AST strategy (ensures at least one string or numeric literal)
# ---------------------------------------------------------------------------


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
        base=any_leaf(),
        extend=lambda children: st.one_of(children, _extend_with_function_call(children)),
        max_leaves=15,
    )


@st.composite
def ast_with_parameterizable_literal(draw: st.DrawFn) -> DslNode:
    """Generate an AST guaranteed to contain at least one string or numeric literal.

    Wraps a generated AST inside a function call that also takes a forced
    string or numeric literal, ensuring the property is always exercisable.
    """
    inner = draw(dsl_node_strategy())
    forced = draw(st.one_of(string_literal_strategy(), numeric_literal_strategy()))

    # Wrap both in a 2-arg function so the forced literal is always present
    name = draw(st.sampled_from(["EQ", "NEQ", "ADD", "CONTAINS"]))
    return FunctionCall(name=name, args=(inner, forced))


# ---------------------------------------------------------------------------
# Helpers — collect all string/numeric literals from an AST
# ---------------------------------------------------------------------------


def _collect_parameterizable_values(node: DslNode) -> list[Union[int, float, str]]:
    """Walk the AST and collect all string and numeric literal values."""
    result: list[Union[int, float, str]] = []
    match node:
        case Literal(value=v, type="string"):
            result.append(v)
        case Literal(value=v, type="number"):
            result.append(v)
        case Literal(type="boolean"):
            pass  # booleans are inlined as TRUE/FALSE, not parameterized
        case FieldRef(source="PARAM", field=f):
            result.append(f)  # PARAM field names are also parameterized
        case FieldRef():
            pass
        case FunctionCall(args=args):
            for arg in args:
                result.extend(_collect_parameterizable_values(arg))
    return result


def _count_placeholders(sql: str) -> int:
    """Count the number of ? placeholders in the SQL string."""
    return sql.count("?")


# ---------------------------------------------------------------------------
# Property test
# ---------------------------------------------------------------------------


@given(ast=ast_with_parameterizable_literal())
@settings(max_examples=200)
def test_sql_parameterization(ast: DslNode):
    """Property 16: SQL Generation Uses Parameterized Values

    For any DSL AST containing string or numeric literals, the SQL generator
    SHALL:
    1. Place all user-supplied literal values in the params list
    2. Use ? placeholders in the SQL string (count matches params length)
    3. Never interpolate string literal values directly in the SQL string

    **Validates: Requirements 15.4, 15.6**
    """
    gen = SqlGenerator()
    sql = gen.generate(ast)

    expected_values = _collect_parameterizable_values(ast)

    # 1. The number of ? placeholders equals the number of params
    placeholder_count = _count_placeholders(sql)
    assert placeholder_count == len(gen.params), (
        f"Placeholder count mismatch!\n"
        f"  ? count: {placeholder_count}\n"
        f"  params length: {len(gen.params)}\n"
        f"  params: {gen.params!r}\n"
        f"  SQL: {sql!r}"
    )

    # 2. All string and numeric literal values from the AST appear in params
    for val in expected_values:
        assert val in gen.params, (
            f"Expected value {val!r} not found in params!\n"
            f"  params: {gen.params!r}\n"
            f"  SQL: {sql!r}"
        )

    # 3. No string literal values appear directly in the SQL string
    #    (they should be replaced with ? placeholders)
    for val in expected_values:
        if isinstance(val, str) and len(val) > 0:
            # String values must not appear unquoted or quoted in the SQL
            # They should only be in the params list, represented as ? in SQL
            assert f"'{val}'" not in sql, (
                f"String literal {val!r} found directly in SQL (single-quoted)!\n"
                f"  SQL: {sql!r}"
            )
            assert f'"{val}"' not in sql or _is_column_reference(sql, val), (
                f"String literal {val!r} found directly in SQL (double-quoted)!\n"
                f"  SQL: {sql!r}"
            )


def _is_column_reference(sql: str, val: str) -> bool:
    """Check if a double-quoted value in SQL is a column reference (from FieldRef),
    not an interpolated string literal.

    Column references look like "props"."field" or "profile_props"."field".
    """
    return f'"props"."{val}"' in sql or f'"profile_props"."{val}"' in sql
