"""Unit tests for the SQL generator."""

import pytest

from app.dsl.ast_nodes import FunctionCall, Literal, FieldRef
from app.dsl.sql_generator import SqlGenerator


@pytest.fixture
def gen():
    return SqlGenerator()


# ── Literals ──────────────────────────────────────────────────────────

class TestLiterals:
    def test_string_literal(self, gen):
        sql = gen.generate(Literal(value="hello", type="string"))
        assert sql == "?"
        assert gen.params == ["hello"]

    def test_number_literal_int(self, gen):
        sql = gen.generate(Literal(value=42, type="number"))
        assert sql == "?"
        assert gen.params == [42]

    def test_number_literal_float(self, gen):
        sql = gen.generate(Literal(value=3.14, type="number"))
        assert sql == "?"
        assert gen.params == [3.14]

    def test_boolean_true(self, gen):
        sql = gen.generate(Literal(value=True, type="boolean"))
        assert sql == "TRUE"
        assert gen.params == []

    def test_boolean_false(self, gen):
        sql = gen.generate(Literal(value=False, type="boolean"))
        assert sql == "FALSE"
        assert gen.params == []


# ── Field References ──────────────────────────────────────────────────

class TestFieldRefs:
    def test_event_field(self, gen):
        sql = gen.generate(FieldRef(source="EVENT", field="page_url"))
        assert sql == '"props"."page_url"'
        assert gen.params == []

    def test_profile_field(self, gen):
        sql = gen.generate(FieldRef(source="PROFILE", field="age"))
        assert sql == '"profile_props"."age"'
        assert gen.params == []

    def test_param_field(self, gen):
        sql = gen.generate(FieldRef(source="PARAM", field="threshold"))
        assert sql == "?"
        assert gen.params == ["threshold"]


# ── Aggregation ───────────────────────────────────────────────────────

class TestAggregation:
    def test_count(self, gen):
        node = FunctionCall("COUNT", (FieldRef("EVENT", "id"),))
        assert gen.generate(node) == 'COUNT("props"."id")'

    def test_sum(self, gen):
        node = FunctionCall("SUM", (FieldRef("EVENT", "amount"),))
        assert gen.generate(node) == 'SUM("props"."amount")'

    def test_avg(self, gen):
        node = FunctionCall("AVG", (FieldRef("EVENT", "score"),))
        assert gen.generate(node) == 'AVG("props"."score")'

    def test_min(self, gen):
        node = FunctionCall("MIN", (FieldRef("EVENT", "ts"),))
        assert gen.generate(node) == 'MIN("props"."ts")'

    def test_max(self, gen):
        node = FunctionCall("MAX", (FieldRef("EVENT", "ts"),))
        assert gen.generate(node) == 'MAX("props"."ts")'

    def test_unique(self, gen):
        node = FunctionCall("UNIQUE", (FieldRef("EVENT", "user_id"),))
        assert gen.generate(node) == 'DISTINCT "props"."user_id"'

    def test_count_unique(self, gen):
        inner = FunctionCall("UNIQUE", (FieldRef("EVENT", "user_id"),))
        node = FunctionCall("COUNT", (inner,))
        assert gen.generate(node) == 'COUNT(DISTINCT "props"."user_id")'


# ── Comparison ────────────────────────────────────────────────────────

class TestComparison:
    @pytest.mark.parametrize("func,op", [
        ("EQ", "="), ("NEQ", "!="), ("GT", ">"),
        ("LT", "<"), ("GTE", ">="), ("LTE", "<="),
    ])
    def test_comparison_operators(self, gen, func, op):
        node = FunctionCall(func, (
            FieldRef("EVENT", "x"),
            Literal(value=10, type="number"),
        ))
        sql = gen.generate(node)
        assert sql == f'("props"."x" {op} ?)'
        assert gen.params == [10]


# ── Logical ───────────────────────────────────────────────────────────

class TestLogical:
    def test_and(self, gen):
        node = FunctionCall("AND", (
            Literal(value=True, type="boolean"),
            Literal(value=False, type="boolean"),
        ))
        assert gen.generate(node) == "(TRUE AND FALSE)"

    def test_or(self, gen):
        node = FunctionCall("OR", (
            Literal(value=True, type="boolean"),
            Literal(value=False, type="boolean"),
        ))
        assert gen.generate(node) == "(TRUE OR FALSE)"

    def test_not(self, gen):
        node = FunctionCall("NOT", (Literal(value=True, type="boolean"),))
        assert gen.generate(node) == "(NOT TRUE)"

    def test_and_variadic(self, gen):
        node = FunctionCall("AND", (
            Literal(value=True, type="boolean"),
            Literal(value=True, type="boolean"),
            Literal(value=False, type="boolean"),
        ))
        assert gen.generate(node) == "(TRUE AND TRUE AND FALSE)"


# ── Math ──────────────────────────────────────────────────────────────

class TestMath:
    def test_add(self, gen):
        node = FunctionCall("ADD", (
            FieldRef("EVENT", "a"),
            Literal(value=5, type="number"),
        ))
        assert gen.generate(node) == '("props"."a" + ?)'
        assert gen.params == [5]

    def test_subtract(self, gen):
        node = FunctionCall("SUBTRACT", (
            FieldRef("EVENT", "a"),
            FieldRef("EVENT", "b"),
        ))
        assert gen.generate(node) == '("props"."a" - "props"."b")'

    def test_multiply(self, gen):
        node = FunctionCall("MULTIPLY", (
            Literal(value=2, type="number"),
            Literal(value=3, type="number"),
        ))
        assert gen.generate(node) == "(? * ?)"
        assert gen.params == [2, 3]

    def test_divide_nullif(self, gen):
        node = FunctionCall("DIVIDE", (
            FieldRef("EVENT", "total"),
            Literal(value=30, type="number"),
        ))
        assert gen.generate(node) == '("props"."total" / NULLIF(?, 0))'
        assert gen.params == [30]

    def test_mod(self, gen):
        node = FunctionCall("MOD", (
            FieldRef("EVENT", "x"),
            Literal(value=2, type="number"),
        ))
        assert gen.generate(node) == '("props"."x" % ?)'
        assert gen.params == [2]


# ── String ────────────────────────────────────────────────────────────

class TestString:
    def test_contains(self, gen):
        node = FunctionCall("CONTAINS", (
            FieldRef("EVENT", "name"),
            Literal(value="test", type="string"),
        ))
        assert gen.generate(node) == 'contains("props"."name", ?)'
        assert gen.params == ["test"]

    def test_starts_with(self, gen):
        node = FunctionCall("STARTS_WITH", (
            FieldRef("EVENT", "url"),
            Literal(value="https", type="string"),
        ))
        assert gen.generate(node) == 'starts_with("props"."url", ?)'

    def test_ends_with(self, gen):
        node = FunctionCall("ENDS_WITH", (
            FieldRef("EVENT", "file"),
            Literal(value=".csv", type="string"),
        ))
        assert gen.generate(node) == 'ends_with("props"."file", ?)'

    def test_upper(self, gen):
        node = FunctionCall("UPPER", (FieldRef("EVENT", "name"),))
        assert gen.generate(node) == 'upper("props"."name")'

    def test_lower(self, gen):
        node = FunctionCall("LOWER", (FieldRef("EVENT", "name"),))
        assert gen.generate(node) == 'lower("props"."name")'

    def test_length(self, gen):
        node = FunctionCall("LENGTH", (FieldRef("EVENT", "name"),))
        assert gen.generate(node) == 'length("props"."name")'

    def test_concat(self, gen):
        node = FunctionCall("CONCAT", (
            FieldRef("EVENT", "first"),
            Literal(value=" ", type="string"),
            FieldRef("EVENT", "last"),
        ))
        assert gen.generate(node) == 'concat("props"."first", ?, "props"."last")'
        assert gen.params == [" "]


# ── Filtering ─────────────────────────────────────────────────────────

class TestFiltering:
    def test_if_case_when(self, gen):
        node = FunctionCall("IF", (
            FunctionCall("GT", (FieldRef("EVENT", "age"), Literal(value=18, type="number"))),
            Literal(value="adult", type="string"),
            Literal(value="minor", type="string"),
        ))
        sql = gen.generate(node)
        assert sql == 'CASE WHEN ("props"."age" > ?) THEN ? ELSE ? END'
        assert gen.params == [18, "adult", "minor"]

    def test_where_filter(self, gen):
        node = FunctionCall("WHERE", (
            FunctionCall("COUNT", (FieldRef("EVENT", "id"),)),
            FunctionCall("EQ", (
                FieldRef("EVENT", "type"),
                Literal(value="click", type="string"),
            )),
        ))
        sql = gen.generate(node)
        assert sql == 'COUNT("props"."id") FILTER (WHERE ("props"."type" = ?))'
        assert gen.params == ["click"]


# ── Conversion ────────────────────────────────────────────────────────

class TestConversion:
    def test_to_number(self, gen):
        node = FunctionCall("TO_NUMBER", (FieldRef("EVENT", "val"),))
        assert gen.generate(node) == 'CAST("props"."val" AS DOUBLE)'

    def test_to_string(self, gen):
        node = FunctionCall("TO_STRING", (FieldRef("EVENT", "code"),))
        assert gen.generate(node) == 'CAST("props"."code" AS VARCHAR)'

    def test_to_boolean(self, gen):
        node = FunctionCall("TO_BOOLEAN", (FieldRef("EVENT", "flag"),))
        assert gen.generate(node) == 'CAST("props"."flag" AS BOOLEAN)'


# ── Fallback ──────────────────────────────────────────────────────────

class TestFallback:
    def test_unknown_function_fallback(self, gen):
        node = FunctionCall("WEEKDAY", (FieldRef("EVENT", "ts"),))
        assert gen.generate(node) == 'WEEKDAY("props"."ts")'


# ── Nested / Complex ─────────────────────────────────────────────────

class TestNested:
    def test_divide_count_unique(self, gen):
        """DIVIDE(COUNT(UNIQUE(EVENT("user_id"))), 30)"""
        node = FunctionCall("DIVIDE", (
            FunctionCall("COUNT", (
                FunctionCall("UNIQUE", (FieldRef("EVENT", "user_id"),)),
            )),
            Literal(value=30, type="number"),
        ))
        sql = gen.generate(node)
        assert sql == '(COUNT(DISTINCT "props"."user_id") / NULLIF(?, 0))'
        assert gen.params == [30]

    def test_params_reset_on_generate(self, gen):
        """Calling generate() twice should reset params each time."""
        gen.generate(Literal(value="a", type="string"))
        assert gen.params == ["a"]
        gen.generate(Literal(value="b", type="string"))
        assert gen.params == ["b"]

    def test_nested_if_with_comparison(self, gen):
        """IF(AND(GT(EVENT("x"), 0), LT(EVENT("x"), 100)), EVENT("x"), 0)"""
        node = FunctionCall("IF", (
            FunctionCall("AND", (
                FunctionCall("GT", (FieldRef("EVENT", "x"), Literal(value=0, type="number"))),
                FunctionCall("LT", (FieldRef("EVENT", "x"), Literal(value=100, type="number"))),
            )),
            FieldRef("EVENT", "x"),
            Literal(value=0, type="number"),
        ))
        sql = gen.generate(node)
        assert sql == 'CASE WHEN (("props"."x" > ?) AND ("props"."x" < ?)) THEN "props"."x" ELSE ? END'
        assert gen.params == [0, 100, 0]
