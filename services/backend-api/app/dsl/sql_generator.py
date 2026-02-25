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

    def _visit_count(self, args: tuple) -> str:
        """Handle COUNT with domain-aware semantics.

        COUNT(EVENT("page_view"))
          → COUNT(*) FILTER (WHERE "props"."event_name" = ?)

        COUNT(WHERE(EVENT("page_view"), ...constraints))
          → COUNT(*) FILTER (WHERE "props"."event_name" = ? AND ...constraints)
        """
        inner = args[0]

        if isinstance(inner, FieldRef) and inner.source == "EVENT":
            # COUNT(EVENT("event_name")) → COUNT(*) FILTER (WHERE "props"."event_name" = ?)
            self.params.append(inner.field)
            return 'COUNT(*) FILTER (WHERE "props"."event_name" = ?)'

        if isinstance(inner, FunctionCall) and inner.name == "WHERE":
            # COUNT(WHERE(EVENT("name"), ...constraints))
            # The WHERE node's first arg is the event ref, rest are constraints
            where_args = inner.args
            event_ref = where_args[0]
            constraints = where_args[1:]

            if isinstance(event_ref, FieldRef) and event_ref.source == "EVENT":
                self.params.append(event_ref.field)
                event_filter = '"props"."event_name" = ?'
                constraint_sqls = [self._visit(c) for c in constraints]
                all_conditions = [event_filter] + constraint_sqls
                return f'COUNT(*) FILTER (WHERE {" AND ".join(all_conditions)})'

        # Fallback: generic COUNT
        visited = self._visit(inner)
        return f"COUNT({visited})"

    def _visit_function(self, name: str, args: tuple) -> str:
        # Special handling for COUNT — the inner EVENT("name") means
        # "count events where event_name = name", not "count column name".
        if name == "COUNT":
            return self._visit_count(args)

        visited = [self._visit(a) for a in args]

        # Aggregation (non-COUNT)
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
