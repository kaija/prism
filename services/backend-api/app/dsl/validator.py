"""AST Validator — validates DSL ASTs against the Function Registry.

Performs recursive validation checking:
- Function existence in the registry
- Argument count (min/max)
- Argument type compatibility with function signatures
- Infers and returns the expression's return type
"""

from dataclasses import dataclass

from app.dsl.ast_nodes import DslNode, FieldRef, FunctionCall, Literal
from app.dsl.function_registry import FUNCTION_REGISTRY


@dataclass
class ValidationError:
    message: str
    node: DslNode


@dataclass
class ValidationResult:
    valid: bool
    errors: list[ValidationError]
    return_type: str | None = None


def validate(node: DslNode) -> ValidationResult:
    """Validate an AST against the function registry. Returns inferred return type."""
    errors: list[ValidationError] = []
    ret_type = _validate_node(node, errors)
    return ValidationResult(valid=len(errors) == 0, errors=errors, return_type=ret_type)


def _is_type_compatible(expected: str, actual: str | None) -> bool:
    """Check if an actual inferred type is compatible with an expected type.

    ``any`` on either side is always compatible.  ``None`` (unknown due to
    earlier errors) is treated as compatible to avoid cascading errors.
    """
    if actual is None or expected == "any" or actual == "any":
        return True
    return expected == actual


def _validate_node(node: DslNode, errors: list[ValidationError]) -> str | None:
    match node:
        case Literal(type=t):
            return t
        case FieldRef():
            return "any"
        case FunctionCall(name=name, args=args):
            sig = FUNCTION_REGISTRY.get(name)
            if sig is None:
                errors.append(ValidationError(f"Unknown function: {name}", node))
                return None

            # Check argument count
            if len(args) < sig.min_args:
                errors.append(
                    ValidationError(
                        f"{name} requires at least {sig.min_args} argument(s), got {len(args)}",
                        node,
                    )
                )
            if sig.max_args is not None and len(args) > sig.max_args:
                errors.append(
                    ValidationError(
                        f"{name} accepts at most {sig.max_args} argument(s), got {len(args)}",
                        node,
                    )
                )

            # Validate each argument recursively and check type compatibility
            for i, arg in enumerate(args):
                arg_type = _validate_node(arg, errors)
                if sig.arg_types:
                    # For variadic functions the arg_types list may be shorter
                    # than the actual args — use the last declared type for
                    # any extra positional arguments.
                    expected = sig.arg_types[min(i, len(sig.arg_types) - 1)]
                    if not _is_type_compatible(expected, arg_type):
                        errors.append(
                            ValidationError(
                                f"{name} argument {i + 1} expected {expected}, got {arg_type}",
                                node,
                            )
                        )

            return sig.return_type
    return None
