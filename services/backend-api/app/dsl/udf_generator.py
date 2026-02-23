"""UDF Generator — converts a DSL AST into a Python expression for PySpark UDFs.

Uses the visitor pattern over AST nodes. Aggregation functions that require
a full dataset are rejected since UDFs operate row-by-row.
"""

from app.dsl.ast_nodes import DslNode, FunctionCall, Literal, FieldRef

UNSUPPORTED_IN_UDF = {
    "COUNT", "SUM", "AVG", "MIN", "MAX", "UNIQUE", "TOP", "WHERE", "BY",
}


class UdfGenerator:
    """Converts a DSL AST into a Python expression string for PySpark UDFs."""

    def generate(self, node: DslNode) -> str:
        """Generate a Python expression string from an AST node."""
        return self._visit(node)

    def _visit(self, node: DslNode) -> str:
        match node:
            case Literal(value=v, type="string"):
                return repr(v)
            case Literal(value=v, type="number"):
                return repr(v)
            case Literal(value=v, type="boolean"):
                return "True" if v else "False"
            case FieldRef(source="EVENT", field=f):
                return f'row["props"]["{f}"]'
            case FieldRef(source="PROFILE", field=f):
                return f'profile["{f}"]'
            case FunctionCall(name=name, args=args):
                if name in UNSUPPORTED_IN_UDF:
                    raise ValueError(
                        f"Function {name} is not supported in UDF mode"
                    )
                return self._visit_function(name, args)
        raise ValueError(f"Unknown node: {node}")

    def _visit_function(self, name: str, args: tuple) -> str:
        visited = [self._visit(a) for a in args]

        # Math
        if name == "ADD":
            return f"({visited[0]} + {visited[1]})"
        if name == "SUBTRACT":
            return f"({visited[0]} - {visited[1]})"
        if name == "MULTIPLY":
            return f"({visited[0]} * {visited[1]})"
        if name == "DIVIDE":
            return f"({visited[0]} / {visited[1]} if {visited[1]} != 0 else None)"

        # Comparison
        if name == "EQ":
            return f"({visited[0]} == {visited[1]})"

        # Logical
        if name == "AND":
            return "(" + " and ".join(visited) + ")"
        if name == "OR":
            return "(" + " or ".join(visited) + ")"
        if name == "NOT":
            return f"(not {visited[0]})"

        # Filtering
        if name == "IF":
            return f"({visited[1]} if {visited[0]} else {visited[2]})"

        # String
        if name == "UPPER":
            return f"str({visited[0]}).upper()"
        if name == "LOWER":
            return f"str({visited[0]}).lower()"

        # Conversion
        if name == "TO_NUMBER":
            return f"float({visited[0]})"
        if name == "TO_STRING":
            return f"str({visited[0]})"

        # Fallback: generic function call
        return f"{name.lower()}({', '.join(visited)})"
