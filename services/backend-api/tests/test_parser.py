"""Tests for the DSL parser (Lark LALR)."""

import pytest
from lark.exceptions import UnexpectedToken

from app.dsl.ast_nodes import FieldRef, FunctionCall, Literal
from app.dsl.parser import DslParser


@pytest.fixture
def parser():
    return DslParser()


# --- Literal parsing ---


class TestLiterals:
    def test_integer(self, parser):
        assert parser.parse("42") == Literal(value=42, type="number")

    def test_negative_integer(self, parser):
        assert parser.parse("-5") == Literal(value=-5, type="number")

    def test_decimal(self, parser):
        assert parser.parse("3.14") == Literal(value=3.14, type="number")

    def test_negative_decimal(self, parser):
        assert parser.parse("-0.5") == Literal(value=-0.5, type="number")

    def test_string(self, parser):
        assert parser.parse('"hello"') == Literal(value="hello", type="string")

    def test_string_with_escaped_quote(self, parser):
        assert parser.parse(r'"say \"hi\""') == Literal(value='say "hi"', type="string")

    def test_empty_string(self, parser):
        assert parser.parse('""') == Literal(value="", type="string")

    def test_boolean_true(self, parser):
        assert parser.parse("true") == Literal(value=True, type="boolean")

    def test_boolean_false(self, parser):
        assert parser.parse("false") == Literal(value=False, type="boolean")

    def test_boolean_case_insensitive(self, parser):
        assert parser.parse("TRUE") == Literal(value=True, type="boolean")
        assert parser.parse("False") == Literal(value=False, type="boolean")


# --- Field reference parsing ---


class TestFieldRefs:
    def test_event_ref(self, parser):
        assert parser.parse('EVENT("name")') == FieldRef(source="EVENT", field="name")

    def test_profile_ref(self, parser):
        assert parser.parse('PROFILE("age")') == FieldRef(source="PROFILE", field="age")

    def test_param_ref(self, parser):
        assert parser.parse('PARAM("threshold")') == FieldRef(source="PARAM", field="threshold")

    def test_field_ref_case_insensitive(self, parser):
        assert parser.parse('event("x")') == FieldRef(source="EVENT", field="x")
        assert parser.parse('Profile("y")') == FieldRef(source="PROFILE", field="y")
        assert parser.parse('param("z")') == FieldRef(source="PARAM", field="z")

    def test_field_ref_with_escaped_quote(self, parser):
        assert parser.parse(r'EVENT("say \"hi\"")') == FieldRef(
            source="EVENT", field='say "hi"'
        )


# --- Function call parsing ---


class TestFunctionCalls:
    def test_zero_args(self, parser):
        assert parser.parse("NOW()") == FunctionCall(name="NOW", args=())

    def test_single_arg(self, parser):
        assert parser.parse("ABS(5)") == FunctionCall(
            name="ABS", args=(Literal(value=5, type="number"),)
        )

    def test_two_args(self, parser):
        assert parser.parse("ADD(1, 2)") == FunctionCall(
            name="ADD",
            args=(Literal(value=1, type="number"), Literal(value=2, type="number")),
        )

    def test_variadic_args(self, parser):
        result = parser.parse('CONCAT("a", "b", "c")')
        assert result.name == "CONCAT"
        assert len(result.args) == 3

    def test_nested_function_calls(self, parser):
        result = parser.parse("DIVIDE(COUNT(UNIQUE(EVENT(\"user_id\"))), 30)")
        assert result == FunctionCall(
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

    def test_deeply_nested(self, parser):
        result = parser.parse(
            'AND(EQ(EVENT("event_name"), "action"), IN_RECENT_DAYS(30))'
        )
        assert result.name == "AND"
        assert len(result.args) == 2
        assert result.args[0].name == "EQ"
        assert result.args[1].name == "IN_RECENT_DAYS"


# --- Case insensitivity (Requirement 1.7) ---


class TestCaseInsensitivity:
    def test_function_name_lowercase(self, parser):
        assert parser.parse("add(1, 2)").name == "ADD"

    def test_function_name_mixed_case(self, parser):
        assert parser.parse("Add(1, 2)").name == "ADD"

    def test_function_name_uppercase(self, parser):
        assert parser.parse("ADD(1, 2)").name == "ADD"

    def test_all_cases_produce_same_ast(self, parser):
        lower = parser.parse("add(1, 2)")
        mixed = parser.parse("Add(1, 2)")
        upper = parser.parse("ADD(1, 2)")
        assert lower == mixed == upper


# --- Whitespace handling ---


class TestWhitespace:
    def test_leading_trailing_whitespace(self, parser):
        assert parser.parse("  42  ") == Literal(value=42, type="number")

    def test_whitespace_in_function_call(self, parser):
        assert parser.parse("ADD( 1 , 2 )") == parser.parse("ADD(1,2)")


# --- Error handling (Requirement 3.2) ---


class TestErrorHandling:
    def test_empty_string(self, parser):
        with pytest.raises(Exception):
            parser.parse("")

    def test_unclosed_paren(self, parser):
        with pytest.raises(Exception):
            parser.parse("ADD(1,")

    def test_missing_arg(self, parser):
        with pytest.raises(Exception):
            parser.parse("ADD(,)")

    def test_bare_parens(self, parser):
        with pytest.raises(Exception):
            parser.parse("()")
