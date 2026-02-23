"""Tests for the DSL AST validator."""

import pytest

from app.dsl.ast_nodes import FieldRef, FunctionCall, Literal
from app.dsl.validator import ValidationError, ValidationResult, validate


# --- Valid expressions ---


class TestValidExpressions:
    def test_literal_number(self):
        result = validate(Literal(value=42, type="number"))
        assert result.valid is True
        assert result.errors == []
        assert result.return_type == "number"

    def test_literal_string(self):
        result = validate(Literal(value="hello", type="string"))
        assert result.valid is True
        assert result.return_type == "string"

    def test_literal_boolean(self):
        result = validate(Literal(value=True, type="boolean"))
        assert result.valid is True
        assert result.return_type == "boolean"

    def test_field_ref(self):
        result = validate(FieldRef(source="EVENT", field="name"))
        assert result.valid is True
        assert result.return_type == "any"

    def test_simple_function_call(self):
        node = FunctionCall(
            name="ADD",
            args=(Literal(value=1, type="number"), Literal(value=2, type="number")),
        )
        result = validate(node)
        assert result.valid is True
        assert result.return_type == "number"

    def test_zero_arg_function(self):
        result = validate(FunctionCall(name="NOW", args=()))
        assert result.valid is True
        assert result.return_type == "number"

    def test_nested_function_call(self):
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
        result = validate(node)
        assert result.valid is True
        assert result.return_type == "number"

    def test_variadic_and(self):
        node = FunctionCall(
            name="AND",
            args=(
                Literal(value=True, type="boolean"),
                Literal(value=False, type="boolean"),
                Literal(value=True, type="boolean"),
            ),
        )
        result = validate(node)
        assert result.valid is True
        assert result.return_type == "boolean"

    def test_variadic_concat(self):
        node = FunctionCall(
            name="CONCAT",
            args=(
                Literal(value="a", type="string"),
                Literal(value="b", type="string"),
                Literal(value="c", type="string"),
            ),
        )
        result = validate(node)
        assert result.valid is True
        assert result.return_type == "string"

    def test_any_type_accepts_all(self):
        """EQ accepts 'any' for both args — should accept number, string, etc."""
        node = FunctionCall(
            name="EQ",
            args=(
                Literal(value=1, type="number"),
                Literal(value="hello", type="string"),
            ),
        )
        result = validate(node)
        assert result.valid is True
        assert result.return_type == "boolean"

    def test_field_ref_compatible_with_any(self):
        """FieldRef returns 'any', which should be compatible with any expected type."""
        node = FunctionCall(
            name="ABS",
            args=(FieldRef(source="EVENT", field="value"),),
        )
        result = validate(node)
        assert result.valid is True
        assert result.return_type == "number"


# --- Unknown function (Requirement 14.2) ---


class TestUnknownFunction:
    def test_unknown_function(self):
        node = FunctionCall(name="FOOBAR", args=())
        result = validate(node)
        assert result.valid is False
        assert len(result.errors) == 1
        assert "Unknown function: FOOBAR" in result.errors[0].message
        assert result.return_type is None

    def test_unknown_nested_function(self):
        node = FunctionCall(
            name="ABS",
            args=(FunctionCall(name="NOPE", args=(Literal(value=1, type="number"),)),),
        )
        result = validate(node)
        assert result.valid is False
        assert any("Unknown function: NOPE" in e.message for e in result.errors)


# --- Argument count errors (Requirement 14.3) ---


class TestArgumentCount:
    def test_too_few_args(self):
        node = FunctionCall(name="ADD", args=(Literal(value=1, type="number"),))
        result = validate(node)
        assert result.valid is False
        assert any("at least 2" in e.message for e in result.errors)

    def test_too_many_args(self):
        node = FunctionCall(
            name="NOT",
            args=(
                Literal(value=True, type="boolean"),
                Literal(value=False, type="boolean"),
            ),
        )
        result = validate(node)
        assert result.valid is False
        assert any("at most 1" in e.message for e in result.errors)

    def test_zero_args_when_min_is_one(self):
        node = FunctionCall(name="ABS", args=())
        result = validate(node)
        assert result.valid is False
        assert any("at least 1" in e.message for e in result.errors)

    def test_variadic_allows_many(self):
        """AND is variadic (min=2, max=None) — 5 args should be fine."""
        node = FunctionCall(
            name="AND",
            args=tuple(Literal(value=True, type="boolean") for _ in range(5)),
        )
        result = validate(node)
        assert result.valid is True

    def test_args_to_zero_arg_function(self):
        node = FunctionCall(name="NOW", args=(Literal(value=1, type="number"),))
        result = validate(node)
        assert result.valid is False
        assert any("at most 0" in e.message for e in result.errors)


# --- Type compatibility errors (Requirement 14.4) ---


class TestTypeCompatibility:
    def test_number_expected_got_string(self):
        node = FunctionCall(
            name="ADD",
            args=(
                Literal(value="hello", type="string"),
                Literal(value=2, type="number"),
            ),
        )
        result = validate(node)
        assert result.valid is False
        assert any("expected number, got string" in e.message for e in result.errors)

    def test_boolean_expected_got_number(self):
        node = FunctionCall(
            name="NOT",
            args=(Literal(value=42, type="number"),),
        )
        result = validate(node)
        assert result.valid is False
        assert any("expected boolean, got number" in e.message for e in result.errors)

    def test_string_expected_got_number(self):
        node = FunctionCall(
            name="UPPER",
            args=(Literal(value=42, type="number"),),
        )
        result = validate(node)
        assert result.valid is False
        assert any("expected string, got number" in e.message for e in result.errors)

    def test_multiple_type_errors(self):
        """Both args to GT are wrong type."""
        node = FunctionCall(
            name="GT",
            args=(
                Literal(value="a", type="string"),
                Literal(value="b", type="string"),
            ),
        )
        result = validate(node)
        assert result.valid is False
        assert len(result.errors) == 2

    def test_nested_type_error_propagates(self):
        """Type error deep in the tree should still be reported."""
        inner = FunctionCall(
            name="ADD",
            args=(
                Literal(value="bad", type="string"),
                Literal(value=1, type="number"),
            ),
        )
        outer = FunctionCall(name="ABS", args=(inner,))
        result = validate(outer)
        assert result.valid is False
        assert any("expected number, got string" in e.message for e in result.errors)


# --- Return type inference ---


class TestReturnTypeInference:
    def test_count_returns_number(self):
        node = FunctionCall(
            name="COUNT",
            args=(FieldRef(source="EVENT", field="id"),),
        )
        result = validate(node)
        assert result.return_type == "number"

    def test_contains_returns_boolean(self):
        node = FunctionCall(
            name="CONTAINS",
            args=(
                Literal(value="hello world", type="string"),
                Literal(value="world", type="string"),
            ),
        )
        result = validate(node)
        assert result.return_type == "boolean"

    def test_unique_returns_array(self):
        node = FunctionCall(
            name="UNIQUE",
            args=(FieldRef(source="EVENT", field="category"),),
        )
        result = validate(node)
        assert result.return_type == "array"

    def test_if_returns_any(self):
        node = FunctionCall(
            name="IF",
            args=(
                Literal(value=True, type="boolean"),
                Literal(value=1, type="number"),
                Literal(value=0, type="number"),
            ),
        )
        result = validate(node)
        assert result.return_type == "any"

    def test_to_string_returns_string(self):
        node = FunctionCall(
            name="TO_STRING",
            args=(Literal(value=42, type="number"),),
        )
        result = validate(node)
        assert result.return_type == "string"


# --- Multiple errors collected ---


class TestMultipleErrors:
    def test_collects_all_errors(self):
        """An expression with multiple issues should report all of them."""
        node = FunctionCall(
            name="AND",
            args=(
                FunctionCall(name="UNKNOWN_FUNC", args=()),
                FunctionCall(
                    name="NOT",
                    args=(Literal(value=42, type="number"),),
                ),
            ),
        )
        result = validate(node)
        assert result.valid is False
        assert len(result.errors) >= 2
        messages = [e.message for e in result.errors]
        assert any("Unknown function" in m for m in messages)
        assert any("expected boolean" in m for m in messages)
