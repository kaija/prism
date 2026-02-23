"""SQL Generator — converts a DSL AST into a DuckDB-compatible SQL fragment.

Uses the visitor pattern over AST nodes, collecting parameterized values
in a list to prevent SQL injection.
"""

from app.dsl.ast_nodes import DslNode, FunctionCall, Literal, FieldRef


class SqlGenerator:
    """Converts a DSL AST into a DuckDB SQL fragment with parameterized values."""

    def __init__(self) -> None:
        self.params: list = []

    def generate(self, node: DslNode) -> str:
        """Generate SQL from an AST node. Populates self.params with bind values."""
        self.params = []
        return self._visit(node)

    def _visit(self, node: DslNode) -> str:
        match node:
            case Literal(value=v, type="string"):
                self.params.append(v)
                return "?"
            case Literal(value=v, type="number"):
                self.params.append(v)
                return "?"
            case Literal(value=v, type="boolean"):
                return "TRUE" if v else "FALSE"
            case FieldRef(source="EVENT", field=f):
                return f'"props"."{f}"'
            case FieldRef(source="PROFILE", field=f):
                return f'"profile_props"."{f}"'
            case FieldRef(source="PARAM", field=f):
                self.params.append(f)
                return "?"
            case FunctionCall(name=name, args=args):
                return self._visit_function(name, args)
        raise ValueError(f"Unknown node: {node}")

    def _visit_function(self, name: str, args: tuple) -> str:
        visited = [self._visit(a) for a in args]

        # Aggregation
        if name == "COUNT":
            return f"COUNT({visited[0]})"
        if name == "SUM":
            return f"SUM({visited[0]})"
        if name == "AVG":
            return f"AVG({visited[0]})"
        if name == "MIN":
            return f"MIN({visited[0]})"
        if name == "MAX":
            return f"MAX({visited[0]})"
        if name == "UNIQUE":
            return f"DISTINCT {visited[0]}"

        # Comparison → SQL operators
        if name == "EQ":
            return f"({visited[0]} = {visited[1]})"
        if name == "NEQ":
            return f"({visited[0]} != {visited[1]})"
        if name == "GT":
            return f"({visited[0]} > {visited[1]})"
        if name == "LT":
            return f"({visited[0]} < {visited[1]})"
        if name == "GTE":
            return f"({visited[0]} >= {visited[1]})"
        if name == "LTE":
            return f"({visited[0]} <= {visited[1]})"

        # Logical → SQL operators
        if name == "AND":
            return "(" + " AND ".join(visited) + ")"
        if name == "OR":
            return "(" + " OR ".join(visited) + ")"
        if name == "NOT":
            return f"(NOT {visited[0]})"

        # Math → SQL operators
        if name == "ADD":
            return f"({visited[0]} + {visited[1]})"
        if name == "SUBTRACT":
            return f"({visited[0]} - {visited[1]})"
        if name == "MULTIPLY":
            return f"({visited[0]} * {visited[1]})"
        if name == "DIVIDE":
            return f"({visited[0]} / NULLIF({visited[1]}, 0))"
        if name == "MOD":
            return f"({visited[0]} % {visited[1]})"

        # String → DuckDB functions
        if name == "CONTAINS":
            return f"contains({visited[0]}, {visited[1]})"
        if name == "STARTS_WITH":
            return f"starts_with({visited[0]}, {visited[1]})"
        if name == "ENDS_WITH":
            return f"ends_with({visited[0]}, {visited[1]})"
        if name == "UPPER":
            return f"upper({visited[0]})"
        if name == "LOWER":
            return f"lower({visited[0]})"
        if name == "LENGTH":
            return f"length({visited[0]})"
        if name == "CONCAT":
            return f"concat({', '.join(visited)})"

        # Filtering
        if name == "IF":
            return f"CASE WHEN {visited[0]} THEN {visited[1]} ELSE {visited[2]} END"
        if name == "WHERE":
            return f"{visited[0]} FILTER (WHERE {visited[1]})"

        # Conversion
        if name == "TO_NUMBER":
            return f"CAST({visited[0]} AS DOUBLE)"
        if name == "TO_STRING":
            return f"CAST({visited[0]} AS VARCHAR)"
        if name == "TO_BOOLEAN":
            return f"CAST({visited[0]} AS BOOLEAN)"

        # Fallback: generic function call
        return f"{name}({', '.join(visited)})"
