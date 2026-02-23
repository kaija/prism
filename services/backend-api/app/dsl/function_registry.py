"""Function Registry — centralized catalog of all DSL function signatures.

Used by the validator to check argument counts, argument types, and infer
return types for every function call in a DSL expression.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class FunctionSignature:
    """Describes a single DSL function's type signature."""

    name: str
    min_args: int
    max_args: Optional[int]  # None = variadic
    arg_types: list[str]  # ["number", "number"] or ["any"] for polymorphic
    return_type: str  # "number", "string", "boolean", "array", "any"


FUNCTION_REGISTRY: dict[str, FunctionSignature] = {
    # Logical
    "AND": FunctionSignature("AND", 2, None, ["boolean"], "boolean"),
    "OR": FunctionSignature("OR", 2, None, ["boolean"], "boolean"),
    "NOT": FunctionSignature("NOT", 1, 1, ["boolean"], "boolean"),
    # Comparison
    "EQ": FunctionSignature("EQ", 2, 2, ["any", "any"], "boolean"),
    "NEQ": FunctionSignature("NEQ", 2, 2, ["any", "any"], "boolean"),
    "GT": FunctionSignature("GT", 2, 2, ["number", "number"], "boolean"),
    "LT": FunctionSignature("LT", 2, 2, ["number", "number"], "boolean"),
    "GTE": FunctionSignature("GTE", 2, 2, ["number", "number"], "boolean"),
    "LTE": FunctionSignature("LTE", 2, 2, ["number", "number"], "boolean"),
    # Aggregation
    "COUNT": FunctionSignature("COUNT", 1, 1, ["any"], "number"),
    "SUM": FunctionSignature("SUM", 1, 1, ["number"], "number"),
    "AVG": FunctionSignature("AVG", 1, 1, ["number"], "number"),
    "MIN": FunctionSignature("MIN", 1, 1, ["number"], "number"),
    "MAX": FunctionSignature("MAX", 1, 1, ["number"], "number"),
    "UNIQUE": FunctionSignature("UNIQUE", 1, 1, ["any"], "array"),
    "TOP": FunctionSignature("TOP", 2, 2, ["any", "number"], "array"),
    # Math
    "ADD": FunctionSignature("ADD", 2, 2, ["number", "number"], "number"),
    "SUBTRACT": FunctionSignature("SUBTRACT", 2, 2, ["number", "number"], "number"),
    "MULTIPLY": FunctionSignature("MULTIPLY", 2, 2, ["number", "number"], "number"),
    "DIVIDE": FunctionSignature("DIVIDE", 2, 2, ["number", "number"], "number"),
    "MOD": FunctionSignature("MOD", 2, 2, ["number", "number"], "number"),
    "POW": FunctionSignature("POW", 2, 2, ["number", "number"], "number"),
    "ABS": FunctionSignature("ABS", 1, 1, ["number"], "number"),
    "ROUND": FunctionSignature("ROUND", 1, 1, ["number"], "number"),
    "CEIL": FunctionSignature("CEIL", 1, 1, ["number"], "number"),
    "FLOOR": FunctionSignature("FLOOR", 1, 1, ["number"], "number"),
    "SQRT": FunctionSignature("SQRT", 1, 1, ["number"], "number"),
    "LOG": FunctionSignature("LOG", 1, 1, ["number"], "number"),
    "EXP": FunctionSignature("EXP", 1, 1, ["number"], "number"),
    # Date/Time
    "ACTION_TIME": FunctionSignature("ACTION_TIME", 0, 0, [], "number"),
    "NOW": FunctionSignature("NOW", 0, 0, [], "number"),
    "DATE_FORMAT": FunctionSignature("DATE_FORMAT", 2, 2, ["number", "string"], "string"),
    "DATE_DIFF": FunctionSignature("DATE_DIFF", 3, 3, ["string", "number", "number"], "number"),
    "WEEKDAY": FunctionSignature("WEEKDAY", 1, 1, ["number"], "number"),
    "IN_RECENT_DAYS": FunctionSignature("IN_RECENT_DAYS", 1, 1, ["number"], "boolean"),
    "IS_RECURRING": FunctionSignature("IS_RECURRING", 2, 2, ["any", "number"], "boolean"),
    # Data Access
    "EVENT": FunctionSignature("EVENT", 1, 1, ["string"], "any"),
    "PROFILE": FunctionSignature("PROFILE", 1, 1, ["string"], "any"),
    "PARAM": FunctionSignature("PARAM", 1, 1, ["string"], "any"),
    # String
    "CONTAINS": FunctionSignature("CONTAINS", 2, 2, ["string", "string"], "boolean"),
    "STARTS_WITH": FunctionSignature("STARTS_WITH", 2, 2, ["string", "string"], "boolean"),
    "ENDS_WITH": FunctionSignature("ENDS_WITH", 2, 2, ["string", "string"], "boolean"),
    "REGEX_MATCH": FunctionSignature("REGEX_MATCH", 2, 2, ["string", "string"], "boolean"),
    "UPPER": FunctionSignature("UPPER", 1, 1, ["string"], "string"),
    "LOWER": FunctionSignature("LOWER", 1, 1, ["string"], "string"),
    "TRIM": FunctionSignature("TRIM", 1, 1, ["string"], "string"),
    "SUBSTRING": FunctionSignature("SUBSTRING", 3, 3, ["string", "number", "number"], "string"),
    "REPLACE": FunctionSignature("REPLACE", 3, 3, ["string", "string", "string"], "string"),
    "CONCAT": FunctionSignature("CONCAT", 2, None, ["string"], "string"),
    "SPLIT": FunctionSignature("SPLIT", 2, 2, ["string", "string"], "array"),
    "LENGTH": FunctionSignature("LENGTH", 1, 1, ["string"], "number"),
    # Filtering
    "IF": FunctionSignature("IF", 3, 3, ["boolean", "any", "any"], "any"),
    "WHERE": FunctionSignature("WHERE", 2, 2, ["any", "boolean"], "any"),
    "BY": FunctionSignature("BY", 2, 2, ["any", "string"], "any"),
    # Conversion
    "TO_NUMBER": FunctionSignature("TO_NUMBER", 1, 1, ["any"], "number"),
    "TO_STRING": FunctionSignature("TO_STRING", 1, 1, ["any"], "string"),
    "TO_BOOLEAN": FunctionSignature("TO_BOOLEAN", 1, 1, ["any"], "boolean"),
    "CONVERT_UNIT": FunctionSignature("CONVERT_UNIT", 3, 3, ["number", "string", "string"], "number"),
    # Segmentation
    "BUCKET": FunctionSignature("BUCKET", 2, 2, ["number", "array"], "string"),
}
