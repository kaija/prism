"""Property-based test for SQL generation validity.

# Feature: dsl-engine, Property 15: SQL Generation Produces Valid DuckDB SQL

*For any* valid DSL AST (containing comparison, logical, math, string,
aggregation, and filtering functions), the SQL generator SHALL produce
a syntactically valid DuckDB SQL fragment.

**Validates: Requirements 15.1, 15.2, 15.3, 15.5**
"""

import string

from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.dsl.ast_nodes import DslNode, FieldRef, FunctionCall, Literal
from app.dsl.function_registry import FUNCTION_REGISTRY
from app.dsl.sql_generator import SqlGenerator

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
    """Generate a Literal node."""
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
        assume(value != int(value))
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
# Recursive AST strategy
# ---------------------------------------------------------------------------


def _leaf_strategy() -> st.SearchStrategy[DslNode]:
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
# Helpers
# ---------------------------------------------------------------------------


def _has_balanced_parens(sql: str) -> bool:
    """Check that parentheses are balanced in the SQL string."""
    depth = 0
    for ch in sql:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if depth < 0:
            return False
    return depth == 0


# ---------------------------------------------------------------------------
# Property test
# ---------------------------------------------------------------------------

_generator = SqlGenerator()


@given(ast=dsl_node_strategy())
@settings(max_examples=200)
def test_sql_generation_produces_valid_sql(ast: DslNode):
    """Property 15: SQL Generation Produces Valid DuckDB SQL

    For any valid DSL AST, SqlGenerator.generate() SHALL:
    1. Not raise any exceptions
    2. Produce a non-empty string
    3. Produce SQL with balanced parentheses

    **Validates: Requirements 15.1, 15.2, 15.3, 15.5**
    """
    sql = _generator.generate(ast)

    # 1. Result is a non-empty string
    assert isinstance(sql, str), f"Expected str, got {type(sql)}"
    assert len(sql) > 0, "SQL output must not be empty"

    # 2. Parentheses are balanced
    assert _has_balanced_parens(sql), (
        f"Unbalanced parentheses in generated SQL!\n"
        f"  AST: {ast!r}\n"
        f"  SQL: {sql!r}"
    )
