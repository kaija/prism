"""Tests for the DSL pretty-printer."""

import pytest

from app.dsl.ast_nodes import FieldRef, FunctionCall, Literal
from app.dsl.parser import DslParser
from app.dsl.pretty_printer import pretty_print


@pytest.fixture
def parser():
    return DslParser()


# --- Literal pretty-printing ---


class TestLiterals:
    def test_integer(self):
        assert pretty_print(Literal(value=42, type="number")) == "42"

    def test_negative_integer(self):
        assert pretty_print(Literal(value=-5, type="number")) == "-5"

    def test_decimal(self):
        assert pretty_print(Literal(value=3.14, type="number")) == "3.14"

    def test_float_whole_number_collapses(self):
        assert pretty_print(Literal(value=5.0, type="number")) == "5"

    def test_negative_decimal(self):
        assert pretty_print(Literal(value=-0.5, type="number")) == "-0.5"

    def test_string(self):
        assert pretty_print(Literal(value="hello", type="string")) == '"hello"'

    def test_empty_string(self):
        assert pretty_print(Literal(value="", type="string")) == '""'

    def test_string_with_embedded_quote(self):
        assert pretty_print(Literal(value='say "hi"', type="string")) == r'"say \"hi\""'

    def test_boolean_true(self):
        assert pretty_print(Literal(value=True, type="boolean")) == "true"

    def test_boolean_false(self):
        assert pretty_print(Literal(value=False, type="boolean")) == "false"


# --- Field reference pretty-printing ---


class TestFieldRefs:
    def test_event_ref(self):
        assert pretty_print(FieldRef(source="EVENT", field="name")) == 'EVENT("name")'

    def test_profile_ref(self):
        assert pretty_print(FieldRef(source="PROFILE", field="age")) == 'PROFILE("age")'

    def test_param_ref(self):
        assert pretty_print(FieldRef(source="PARAM", field="threshold")) == 'PARAM("threshold")'

    def test_field_with_escaped_quote(self):
        assert pretty_print(FieldRef(source="EVENT", field='say "hi"')) == r'EVENT("say \"hi\"")'


# --- Function call pretty-printing ---


class TestFunctionCalls:
    def test_zero_args(self):
        assert pretty_print(FunctionCall(name="NOW", args=())) == "NOW()"

    def test_single_arg(self):
        node = FunctionCall(name="ABS", args=(Literal(value=5, type="number"),))
        assert pretty_print(node) == "ABS(5)"

    def test_two_args(self):
        node = FunctionCall(
            name="ADD",
            args=(Literal(value=1, type="number"), Literal(value=2, type="number")),
        )
        assert pretty_print(node) == "ADD(1, 2)"

    def test_nested_function_calls(self):
        node = FunctionCall(
            name="DIVIDE",
            args=(
                FunctionCall(
                    name="COUNT",
                    args=(
                        FunctionCall(
                            name="UNIQUE",
                            args=(FieldRef(source="EVENT", field="user_id"),),
                        ),
                    ),
                ),
                Literal(value=30, type="number"),
            ),
        )
        assert pretty_print(node) == 'DIVIDE(COUNT(UNIQUE(EVENT("user_id"))), 30)'


# --- Unknown node ---


class TestUnknownNode:
    def test_raises_on_unknown(self):
        with pytest.raises(ValueError, match="Unknown AST node"):
            pretty_print("not a node")


# --- Round-trip: parse -> pretty_print -> parse ---


class TestRoundTrip:
    """Verify that parse(pretty_print(ast)) == ast for various expressions."""

    EXPRESSIONS = [
        "42",
        "-5",
        "3.14",
        '"hello"',
        '""',
        r'"say \"hi\""',
        "true",
        "false",
        'EVENT("name")',
        'PROFILE("age")',
        'PARAM("threshold")',
        "NOW()",
        "ABS(5)",
        "ADD(1, 2)",
        'DIVIDE(COUNT(UNIQUE(EVENT("user_id"))), 30)',
        'AND(EQ(EVENT("event_name"), "action"), IN_RECENT_DAYS(30))',
        'CONCAT("a", "b", "c")',
    ]

    @pytest.mark.parametrize("expr", EXPRESSIONS)
    def test_round_trip(self, parser, expr):
        ast1 = parser.parse(expr)
        printed = pretty_print(ast1)
        ast2 = parser.parse(printed)
        assert ast1 == ast2
