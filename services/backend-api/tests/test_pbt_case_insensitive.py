"""Property-based test for case-insensitive function names.

# Feature: dsl-engine, Property 3: Case-Insensitive Function Names

For any valid DSL expression, changing the case of function names
(e.g., `count` vs `COUNT` vs `Count`) SHALL produce the same normalized
AST with uppercase function names.

**Validates: Requirements 1.7**
"""

import string

from hypothesis import given, settings
from hypothesis import strategies as st

from app.dsl.ast_nodes import DslNode, FieldRef, FunctionCall, Literal
from app.dsl.function_registry import FUNCTION_REGISTRY
from app.dsl.parser import DslParser
from app.dsl.pretty_printer import pretty_print

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FIELD_SOURCES = ["EVENT", "PROFILE", "PARAM"]

# Functions that are NOT data-access (those become FieldRef, not FunctionCall)
_NON_ACCESS_FUNCS = [
    name for name in FUNCTION_REGISTRY if name not in ("EVENT", "PROFILE", "PARAM")
]


def _randomize_case(name: str, draw: st.DrawFn) -> str:
    """Randomly change the case of each character in a function name."""
    chars = []
    for ch in name:
        if ch.isalpha():
            upper = draw(st.booleans())
            chars.append(ch.upper() if upper else ch.lower())
        else:
            chars.append(ch)
    return "".join(chars)


def _randomize_ast_case(node: DslNode, draw: st.DrawFn) -> str:
    """Pretty-print an AST but with randomly-cased function/source names."""
    match node:
        case FunctionCall(name=name, args=args):
            cased_name = _randomize_case(name, draw)
            arg_strs = ", ".join(_randomize_ast_case(a, draw) for a in args)
            return f"{cased_name}({arg_strs})"
        case FieldRef(source=source, field=field):
            cased_source = _randomize_case(source, draw)
            escaped = field.replace('"', '\\"')
            return f'{cased_source}("{escaped}")'
        case Literal(value=value, type="string"):
            escaped = str(value).replace('"', '\\"')
            return f'"{escaped}"'
        case Literal(value=value, type="boolean"):
            return "true" if value else "false"
        case Literal(value=value, type="number"):
            if isinstance(value, float) and value == int(value):
                return str(int(value))
            return str(value)
    raise ValueError(f"Unknown AST node: {node}")


# ---------------------------------------------------------------------------
# Strategies — reuse patterns from the round-trip test
# ---------------------------------------------------------------------------

SAFE_CHARS = string.ascii_letters + string.digits + " _-"

# Classify registry functions by arity (exclude data-access)
_FIXED_ARG_FUNCS: dict[int, list[str]] = {}
_VARIADIC_FUNCS: list[tuple[str, int]] = []
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


@st.composite
def literal_strategy(draw: st.DrawFn) -> Literal:
    kind = draw(st.sampled_from(["int", "string", "boolean"]))
    if kind == "int":
        value = draw(st.integers(min_value=-999_999, max_value=999_999))
        return Literal(value=value, type="number")
    if kind == "string":
        value = draw(st.text(alphabet=SAFE_CHARS, min_size=0, max_size=20))
        return Literal(value=value, type="string")
    return Literal(value=draw(st.booleans()), type="boolean")


@st.composite
def field_ref_strategy(draw: st.DrawFn) -> FieldRef:
    source = draw(st.sampled_from(FIELD_SOURCES))
    field = draw(st.text(alphabet=SAFE_CHARS, min_size=1, max_size=20))
    return FieldRef(source=source, field=field)


def _leaf_strategy() -> st.SearchStrategy[DslNode]:
    return st.one_of(literal_strategy(), field_ref_strategy())


@st.composite
def _extend_with_function_call(
    draw: st.DrawFn, children: st.SearchStrategy[DslNode]
) -> DslNode:
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
    arg = draw(children)
    return FunctionCall(name="ABS", args=(arg,))


def dsl_node_strategy() -> st.SearchStrategy[DslNode]:
    return st.recursive(
        base=_leaf_strategy(),
        extend=lambda children: st.one_of(children, _extend_with_function_call(children)),
        max_leaves=10,
    )


# ---------------------------------------------------------------------------
# Property test
# ---------------------------------------------------------------------------

_parser = DslParser()


@given(ast=dsl_node_strategy(), data=st.data())
@settings(max_examples=100)
def test_case_insensitive_function_names(ast: DslNode, data):
    """Property 3: Case-Insensitive Function Names

    Parsing an expression with randomly-cased function names SHALL produce
    the same normalized AST (with uppercase function names) as parsing the
    canonical uppercase version.

    **Validates: Requirements 1.7**
    """
    # Canonical (uppercase) expression
    canonical_expr = pretty_print(ast)
    canonical_ast = _parser.parse(canonical_expr)

    # Same expression but with randomly-cased function/source names
    cased_expr = data.draw(_randomize_case_expression(ast), label="cased_expr")
    cased_ast = _parser.parse(cased_expr)

    assert cased_ast == canonical_ast, (
        f"Case-insensitive parsing failed!\n"
        f"  Canonical expr: {canonical_expr!r}\n"
        f"  Cased expr:     {cased_expr!r}\n"
        f"  Canonical AST:  {canonical_ast!r}\n"
        f"  Cased AST:      {cased_ast!r}"
    )


@st.composite
def _randomize_case_expression(draw: st.DrawFn, ast: DslNode) -> str:
    """Build an expression string from an AST with randomly-cased identifiers."""
    return _randomize_ast_case(ast, draw)
