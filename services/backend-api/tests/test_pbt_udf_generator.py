"""Property-based test for UDF generation validity.

# Feature: dsl-engine, Property 17: UDF Generation Produces Valid Python Expressions

*For any* valid DSL AST that does not contain aggregation functions, the UDF
generator SHALL produce a syntactically valid Python expression string that
can be compiled without errors.

**Validates: Requirements 16.1, 16.2, 16.3**
"""

import string

from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.dsl.ast_nodes import DslNode, FieldRef, FunctionCall, Literal
from app.dsl.function_registry import FUNCTION_REGISTRY
from app.dsl.udf_generator import UdfGenerator, UNSUPPORTED_IN_UDF

# ---------------------------------------------------------------------------
# Safe alphabets
# ---------------------------------------------------------------------------

SAFE_CHARS = string.ascii_letters + string.digits + "_"

FIELD_SOURCES = ["EVENT", "PROFILE"]

# ---------------------------------------------------------------------------
# Build function lists excluding aggregation/unsupported functions and
# data-access functions (those are modelled as FieldRef nodes).
# ---------------------------------------------------------------------------

_EXCLUDED = UNSUPPORTED_IN_UDF | {"EVENT", "PROFILE", "PARAM"}

_FIXED_ARG_FUNCS: dict[int, list[str]] = {}
_VARIADIC_FUNCS: list[tuple[str, int]] = []  # (name, min_args)
_ZERO_ARG_FUNCS: list[str] = []

for _name, _sig in FUNCTION_REGISTRY.items():
    if _name in _EXCLUDED:
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
    return Literal(value=draw(st.booleans()), type="boolean")


@st.composite
def field_ref_strategy(draw: st.DrawFn) -> FieldRef:
    """Generate a FieldRef node with a safe field name."""
    source = draw(st.sampled_from(FIELD_SOURCES))
    field = draw(st.text(alphabet=SAFE_CHARS, min_size=1, max_size=20))
    return FieldRef(source=source, field=field)


# ---------------------------------------------------------------------------
# Recursive AST strategy (non-aggregation only)
# ---------------------------------------------------------------------------


def _leaf_strategy() -> st.SearchStrategy[DslNode]:
    return st.one_of(literal_strategy(), field_ref_strategy())


@st.composite
def _extend_with_function_call(
    draw: st.DrawFn, children: st.SearchStrategy[DslNode]
) -> DslNode:
    """Wrap child nodes into a non-aggregation FunctionCall."""
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

    # Fallback — single-arg function
    arg = draw(children)
    return FunctionCall(name="ABS", args=(arg,))


def non_aggregation_ast_strategy() -> st.SearchStrategy[DslNode]:
    """Generate arbitrary DSL AST nodes that contain NO aggregation functions."""
    return st.recursive(
        base=_leaf_strategy(),
        extend=lambda children: st.one_of(
            children, _extend_with_function_call(children)
        ),
        max_leaves=15,
    )


# ---------------------------------------------------------------------------
# Property test
# ---------------------------------------------------------------------------

_generator = UdfGenerator()


@given(ast=non_aggregation_ast_strategy())
@settings(max_examples=200)
def test_udf_generation_produces_valid_python_expressions(ast: DslNode):
    """Property 17: UDF Generation Produces Valid Python Expressions

    For any valid DSL AST that does not contain aggregation functions,
    UdfGenerator.generate() SHALL:
    1. Not raise any exceptions
    2. Produce a non-empty string
    3. The result compiles as a valid Python expression via compile()

    **Validates: Requirements 16.1, 16.2, 16.3**
    """
    result = _generator.generate(ast)

    # 1. Result is a non-empty string
    assert isinstance(result, str), f"Expected str, got {type(result)}"
    assert len(result) > 0, "UDF output must not be empty"

    # 2. The expression is valid Python that can be compiled
    try:
        compile(result, "<test>", "eval")
    except SyntaxError as exc:
        raise AssertionError(
            f"Generated Python expression is not valid!\n"
            f"  AST:  {ast!r}\n"
            f"  Expr: {result!r}\n"
            f"  Error: {exc}"
        ) from exc
