"""Tests for the DSL Function Registry."""

from app.dsl.function_registry import FUNCTION_REGISTRY, FunctionSignature


class TestFunctionSignature:
    def test_frozen_dataclass(self):
        sig = FunctionSignature("ADD", 2, 2, ["number", "number"], "number")
        assert sig.name == "ADD"
        assert sig.min_args == 2
        assert sig.max_args == 2
        assert sig.arg_types == ["number", "number"]
        assert sig.return_type == "number"

    def test_variadic_max_args_none(self):
        sig = FunctionSignature("AND", 2, None, ["boolean"], "boolean")
        assert sig.max_args is None


class TestFunctionRegistry:
    def test_registry_is_dict(self):
        assert isinstance(FUNCTION_REGISTRY, dict)

    def test_all_values_are_signatures(self):
        for key, sig in FUNCTION_REGISTRY.items():
            assert isinstance(sig, FunctionSignature)
            assert sig.name == key

    def test_registry_has_at_least_50_functions(self):
        assert len(FUNCTION_REGISTRY) >= 50

    def test_logical_functions_present(self):
        for name in ("AND", "OR", "NOT"):
            assert name in FUNCTION_REGISTRY

    def test_comparison_functions_present(self):
        for name in ("EQ", "NEQ", "GT", "LT", "GTE", "LTE"):
            assert name in FUNCTION_REGISTRY

    def test_aggregation_functions_present(self):
        for name in ("COUNT", "SUM", "AVG", "MIN", "MAX", "UNIQUE", "TOP"):
            assert name in FUNCTION_REGISTRY

    def test_math_functions_present(self):
        for name in ("ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "MOD", "POW",
                      "ABS", "ROUND", "CEIL", "FLOOR", "SQRT", "LOG", "EXP"):
            assert name in FUNCTION_REGISTRY

    def test_date_time_functions_present(self):
        for name in ("ACTION_TIME", "NOW", "DATE_FORMAT", "DATE_DIFF",
                      "WEEKDAY", "IN_RECENT_DAYS", "IS_RECURRING"):
            assert name in FUNCTION_REGISTRY

    def test_data_access_functions_present(self):
        for name in ("EVENT", "PROFILE", "PARAM"):
            assert name in FUNCTION_REGISTRY

    def test_string_functions_present(self):
        for name in ("CONTAINS", "STARTS_WITH", "ENDS_WITH", "REGEX_MATCH",
                      "UPPER", "LOWER", "TRIM", "SUBSTRING", "REPLACE",
                      "CONCAT", "SPLIT", "LENGTH"):
            assert name in FUNCTION_REGISTRY

    def test_filtering_functions_present(self):
        for name in ("IF", "WHERE", "BY"):
            assert name in FUNCTION_REGISTRY

    def test_conversion_functions_present(self):
        for name in ("TO_NUMBER", "TO_STRING", "TO_BOOLEAN", "CONVERT_UNIT"):
            assert name in FUNCTION_REGISTRY

    def test_segmentation_functions_present(self):
        assert "BUCKET" in FUNCTION_REGISTRY

    def test_variadic_functions(self):
        """AND, OR, and CONCAT should accept variable args (max_args=None)."""
        for name in ("AND", "OR", "CONCAT"):
            assert FUNCTION_REGISTRY[name].max_args is None

    def test_zero_arg_functions(self):
        """ACTION_TIME and NOW take no arguments."""
        for name in ("ACTION_TIME", "NOW"):
            sig = FUNCTION_REGISTRY[name]
            assert sig.min_args == 0
            assert sig.max_args == 0
            assert sig.arg_types == []

    def test_return_types_valid(self):
        valid_types = {"number", "string", "boolean", "array", "any"}
        for sig in FUNCTION_REGISTRY.values():
            assert sig.return_type in valid_types

    def test_arg_types_valid(self):
        valid_types = {"number", "string", "boolean", "array", "any"}
        for sig in FUNCTION_REGISTRY.values():
            for t in sig.arg_types:
                assert t in valid_types
