"""Unit tests for the UDF generator."""

import pytest

from app.dsl.ast_nodes import FunctionCall, Literal, FieldRef
from app.dsl.udf_generator import UdfGenerator, UNSUPPORTED_IN_UDF


@pytest.fixture
def gen():
    return UdfGenerator()


# ── Literals ──────────────────────────────────────────────────────────


class TestLiterals:
    def test_string_literal(self, gen):
        result = gen.generate(Literal(value="hello", type="string"))
        assert result == "'hello'"

    def test_number_literal_int(self, gen):
        result = gen.generate(Literal(value=42, type="number"))
        assert result == "42"

    def test_number_literal_float(self, gen):
        result = gen.generate(Literal(value=3.14, type="number"))
        assert result == "3.14"

    def test_boolean_true(self, gen):
        result = gen.generate(Literal(value=True, type="boolean"))
        assert result == "True"

    def test_boolean_false(self, gen):
        result = gen.generate(Literal(value=False, type="boolean"))
        assert result == "False"


# ── Field References ──────────────────────────────────────────────────


class TestFieldRefs:
    def test_event_field(self, gen):
        result = gen.generate(FieldRef(source="EVENT", field="page_url"))
        assert result == 'row["props"]["page_url"]'

    def test_profile_field(self, gen):
        result = gen.generate(FieldRef(source="PROFILE", field="age"))
        assert result == 'profile["age"]'


# ── Aggregation Rejection ─────────────────────────────────────────────


class TestAggregationRejection:
    @pytest.mark.parametrize("func_name", sorted(UNSUPPORTED_IN_UDF))
    def test_unsupported_function_raises(self, gen, func_name):
        node = FunctionCall(func_name, (FieldRef("EVENT", "x"),))
        with pytest.raises(ValueError, match=f"Function {func_name} is not supported in UDF mode"):
            gen.generate(node)

    def test_nested_unsupported_raises(self, gen):
        """Aggregation nested inside a supported function should still raise."""
        inner = FunctionCall("COUNT", (FieldRef("EVENT", "id"),))
        node = FunctionCall("ADD", (inner, Literal(value=1, type="number")))
        with pytest.raises(ValueError, match="COUNT is not supported in UDF mode"):
            gen.generate(node)


# ── Math ──────────────────────────────────────────────────────────────


class TestMath:
    def test_add(self, gen):
        node = FunctionCall("ADD", (
            FieldRef("EVENT", "a"),
            Literal(value=5, type="number"),
        ))
        assert gen.generate(node) == '(row["props"]["a"] + 5)'

    def test_subtract(self, gen):
        node = FunctionCall("SUBTRACT", (
            FieldRef("EVENT", "a"),
            FieldRef("EVENT", "b"),
        ))
        assert gen.generate(node) == '(row["props"]["a"] - row["props"]["b"])'

    def test_multiply(self, gen):
        node = FunctionCall("MULTIPLY", (
            Literal(value=2, type="number"),
            Literal(value=3, type="number"),
        ))
        assert gen.generate(node) == "(2 * 3)"

    def test_divide(self, gen):
        node = FunctionCall("DIVIDE", (
            FieldRef("EVENT", "total"),
            Literal(value=30, type="number"),
        ))
        assert gen.generate(node) == '(row["props"]["total"] / 30 if 30 != 0 else None)'


# ── Comparison ────────────────────────────────────────────────────────


class TestComparison:
    def test_eq(self, gen):
        node = FunctionCall("EQ", (
            FieldRef("EVENT", "status"),
            Literal(value="active", type="string"),
        ))
        assert gen.generate(node) == "(row[\"props\"][\"status\"] == 'active')"


# ── Logical ───────────────────────────────────────────────────────────


class TestLogical:
    def test_and(self, gen):
        node = FunctionCall("AND", (
            Literal(value=True, type="boolean"),
            Literal(value=False, type="boolean"),
        ))
        assert gen.generate(node) == "(True and False)"

    def test_or(self, gen):
        node = FunctionCall("OR", (
            Literal(value=True, type="boolean"),
            Literal(value=False, type="boolean"),
        ))
        assert gen.generate(node) == "(True or False)"

    def test_not(self, gen):
        node = FunctionCall("NOT", (Literal(value=True, type="boolean"),))
        assert gen.generate(node) == "(not True)"

    def test_and_variadic(self, gen):
        node = FunctionCall("AND", (
            Literal(value=True, type="boolean"),
            Literal(value=True, type="boolean"),
            Literal(value=False, type="boolean"),
        ))
        assert gen.generate(node) == "(True and True and False)"


# ── Filtering ─────────────────────────────────────────────────────────


class TestFiltering:
    def test_if(self, gen):
        node = FunctionCall("IF", (
            FunctionCall("EQ", (
                FieldRef("EVENT", "type"),
                Literal(value="click", type="string"),
            )),
            Literal(value=1, type="number"),
            Literal(value=0, type="number"),
        ))
        result = gen.generate(node)
        assert result == "(1 if (row[\"props\"][\"type\"] == 'click') else 0)"


# ── String ────────────────────────────────────────────────────────────


class TestString:
    def test_upper(self, gen):
        node = FunctionCall("UPPER", (FieldRef("EVENT", "name"),))
        assert gen.generate(node) == 'str(row["props"]["name"]).upper()'

    def test_lower(self, gen):
        node = FunctionCall("LOWER", (FieldRef("EVENT", "name"),))
        assert gen.generate(node) == 'str(row["props"]["name"]).lower()'


# ── Conversion ────────────────────────────────────────────────────────


class TestConversion:
    def test_to_number(self, gen):
        node = FunctionCall("TO_NUMBER", (FieldRef("EVENT", "val"),))
        assert gen.generate(node) == 'float(row["props"]["val"])'

    def test_to_string(self, gen):
        node = FunctionCall("TO_STRING", (FieldRef("EVENT", "code"),))
        assert gen.generate(node) == 'str(row["props"]["code"])'


# ── Fallback ──────────────────────────────────────────────────────────


class TestFallback:
    def test_unknown_function_fallback(self, gen):
        node = FunctionCall("ABS", (FieldRef("EVENT", "x"),))
        assert gen.generate(node) == 'abs(row["props"]["x"])'


# ── Nested / Complex ─────────────────────────────────────────────────


class TestNested:
    def test_nested_math(self, gen):
        """ADD(MULTIPLY(EVENT("price"), EVENT("qty")), 10)"""
        node = FunctionCall("ADD", (
            FunctionCall("MULTIPLY", (
                FieldRef("EVENT", "price"),
                FieldRef("EVENT", "qty"),
            )),
            Literal(value=10, type="number"),
        ))
        result = gen.generate(node)
        assert result == '((row["props"]["price"] * row["props"]["qty"]) + 10)'

    def test_nested_if_with_comparison(self, gen):
        """IF(EQ(EVENT("status"), "active"), UPPER(EVENT("name")), "N/A")"""
        node = FunctionCall("IF", (
            FunctionCall("EQ", (
                FieldRef("EVENT", "status"),
                Literal(value="active", type="string"),
            )),
            FunctionCall("UPPER", (FieldRef("EVENT", "name"),)),
            Literal(value="N/A", type="string"),
        ))
        result = gen.generate(node)
        assert result == "(str(row[\"props\"][\"name\"]).upper() if (row[\"props\"][\"status\"] == 'active') else 'N/A')"

    def test_generated_expression_compiles(self, gen):
        """The generated Python expression should be compilable."""
        node = FunctionCall("ADD", (
            FunctionCall("MULTIPLY", (
                Literal(value=2, type="number"),
                Literal(value=3, type="number"),
            )),
            Literal(value=1, type="number"),
        ))
        expr = gen.generate(node)
        # Should not raise
        compile(expr, "<test>", "eval")

    def test_unknown_node_raises(self, gen):
        with pytest.raises(ValueError, match="Unknown node"):
            gen.generate("not_a_node")
