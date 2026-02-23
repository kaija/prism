"""Pretty-printer that converts a DSL AST back to a canonical expression string."""

from app.dsl.ast_nodes import DslNode, FieldRef, FunctionCall, Literal


def pretty_print(node: DslNode) -> str:
    """Convert an AST back to a canonical DSL expression string."""
    match node:
        case FunctionCall(name=name, args=args):
            arg_strs = ", ".join(pretty_print(a) for a in args)
            return f"{name}({arg_strs})"
        case FieldRef(source=source, field=field):
            escaped = field.replace('"', '\\"')
            return f'{source}("{escaped}")'
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
