"""SQL Query Builder service for translating structured filter/aggregation params into DuckDB SQL.

Implements parameterized query generation to prevent SQL injection (Req 14.1).
Covers timeframe (Req 7), event selection (Req 8), condition filters (Req 9),
and aggregation (Req 6) translation.
Provides serialize/parse for query object round-trip (Req 14.4).
"""

from __future__ import annotations

import json
import re
import time
from typing import Union

from app.models.report import (
    Aggregation,
    ConditionFilter,
    ConditionGroup,
    EventSelection,
    ReportRequest,
    Timeframe,
)

# Relative timeframe durations in milliseconds
_RELATIVE_DURATIONS_MS: dict[str, int] = {
    "last_1_hour": 60 * 60 * 1000,
    "last_24_hours": 24 * 60 * 60 * 1000,
    "last_7_days": 7 * 24 * 60 * 60 * 1000,
    "last_14_days": 14 * 24 * 60 * 60 * 1000,
    "last_30_days": 30 * 24 * 60 * 60 * 1000,
    "last_60_days": 60 * 24 * 60 * 60 * 1000,
    "last_90_days": 90 * 24 * 60 * 60 * 1000,
}

# Valid identifier pattern for column/attribute names
_IDENTIFIER_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def _quote_identifier(name: str) -> str:
    """Quote a column/attribute name as a DuckDB identifier using double quotes.

    Validates the name matches a safe identifier pattern first.
    Raises ValueError for invalid identifiers.
    """
    if not _IDENTIFIER_RE.match(name):
        raise ValueError(f"Invalid identifier: {name!r}")
    return f'"{name}"'


class QueryBuilderService:
    """Translates structured filter/aggregation params into DuckDB SQL (Req 6-9, 14)."""

    def __init__(self, *, now_ms: int | None = None) -> None:
        """Initialize the query builder.

        Args:
            now_ms: Override for current time in epoch ms (for testing).
                    If None, uses time.time() * 1000.
        """
        self._now_ms = now_ms

    def _current_time_ms(self) -> int:
        if self._now_ms is not None:
            return self._now_ms
        return int(time.time() * 1000)

    # ------------------------------------------------------------------
    # Timeframe (Req 7.1, 7.2)
    # ------------------------------------------------------------------

    def build_timeframe_clause(self, timeframe: Timeframe) -> tuple[str, list]:
        """Convert timeframe to WHERE clause fragment with params.

        Returns:
            Tuple of (sql_fragment, param_values) where sql_fragment uses ``?``
            placeholders.
        """
        if timeframe.type == "absolute":
            if timeframe.start is None or timeframe.end is None:
                raise ValueError("Absolute timeframe requires start and end")
            if timeframe.start > timeframe.end:
                raise ValueError("Timeframe start must be <= end")
            return (
                '"timestamp" >= ? AND "timestamp" <= ?',
                [timeframe.start, timeframe.end],
            )

        # Relative timeframe
        if timeframe.relative is None:
            raise ValueError("Relative timeframe requires a relative value")
        duration_ms = _RELATIVE_DURATIONS_MS.get(timeframe.relative)
        if duration_ms is None:
            raise ValueError(f"Unsupported relative timeframe: {timeframe.relative!r}")
        now = self._current_time_ms()
        start = now - duration_ms
        return (
            '"timestamp" >= ? AND "timestamp" <= ?',
            [start, now],
        )

    # ------------------------------------------------------------------
    # Event Selection (Req 8.1, 8.2)
    # ------------------------------------------------------------------

    def build_event_selection_clause(
        self, selection: EventSelection
    ) -> tuple[str, list]:
        """Convert event selection to WHERE clause fragment.

        Returns:
            Tuple of (sql_fragment, param_values). For "all" selection the
            sql_fragment is empty string and params is empty list.
        """
        if selection.type == "all":
            return ("", [])

        if not selection.event_names:
            raise ValueError("Specific event selection requires at least one event name")

        placeholders = ", ".join("?" for _ in selection.event_names)
        return (
            f'"event_name" IN ({placeholders})',
            list(selection.event_names),
        )

    # ------------------------------------------------------------------
    # Condition Filters (Req 9.1-9.7)
    # ------------------------------------------------------------------

    def _build_single_condition(
        self, condition: ConditionFilter
    ) -> tuple[str, list]:
        """Build SQL for a single condition filter."""
        col = _quote_identifier(condition.attribute)
        op = condition.operator
        val = condition.value

        # Boolean operators (no parameter needed)
        if op == "true":
            return (f"{col} = TRUE", [])
        if op == "false":
            return (f"{col} = FALSE", [])

        # String operators
        if op == "is":
            return (f"{col} = ?", [val])
        if op == "is_not":
            return (f"{col} != ?", [val])
        if op == "contains":
            return (f"{col} LIKE ?", [f"%{val}%"])
        if op == "not_contains":
            return (f"{col} NOT LIKE ?", [f"%{val}%"])
        if op == "starts_with":
            return (f"{col} LIKE ?", [f"{val}%"])
        if op == "not_starts_with":
            return (f"{col} NOT LIKE ?", [f"{val}%"])
        if op == "ends_with":
            return (f"{col} LIKE ?", [f"%{val}"])
        if op == "not_ends_with":
            return (f"{col} NOT LIKE ?", [f"%{val}"])

        # Numeric operators
        if op == "equals":
            return (f"{col} = ?", [val])
        if op == "not_equals":
            return (f"{col} != ?", [val])
        if op == "greater_than":
            return (f"{col} > ?", [val])
        if op == "less_than":
            return (f"{col} < ?", [val])

        raise ValueError(f"Unsupported operator: {op!r}")

    def build_condition_clause(
        self, conditions: ConditionGroup
    ) -> tuple[str, list]:
        """Convert nested AND/OR conditions to WHERE clause with params.

        Produces parenthesized expressions for nested groups.
        """
        parts: list[str] = []
        params: list = []

        for cond in conditions.conditions:
            if isinstance(cond, ConditionGroup):
                sub_sql, sub_params = self.build_condition_clause(cond)
                parts.append(f"({sub_sql})")
                params.extend(sub_params)
            else:
                sql_frag, cond_params = self._build_single_condition(cond)
                parts.append(sql_frag)
                params.extend(cond_params)

        joiner = " AND " if conditions.logic == "and" else " OR "
        return (joiner.join(parts), params)

    # ------------------------------------------------------------------
    # Aggregation (Req 6.1-6.6)
    # ------------------------------------------------------------------

    def build_aggregation_select(self, aggregation: Aggregation) -> str:
        """Convert aggregation spec to SELECT expression."""
        func = aggregation.function
        attr = _quote_identifier(aggregation.attribute) if aggregation.attribute else None

        if func == "count":
            return "COUNT(*)"
        if func == "sum":
            if attr is None:
                raise ValueError("sum aggregation requires an attribute")
            return f"SUM({attr})"
        if func == "count_unique":
            if attr is None:
                raise ValueError("count_unique aggregation requires an attribute")
            return f"COUNT(DISTINCT {attr})"
        if func == "min":
            if attr is None:
                raise ValueError("min aggregation requires an attribute")
            return f"MIN({attr})"
        if func == "max":
            if attr is None:
                raise ValueError("max aggregation requires an attribute")
            return f"MAX({attr})"
        if func in ("mean", "average"):
            if attr is None:
                raise ValueError(f"{func} aggregation requires an attribute")
            return f"AVG({attr})"
        if func == "tops":
            if attr is None:
                raise ValueError("tops aggregation requires an attribute")
            return f"{attr}, COUNT(*) AS count"
        if func == "last_event":
            return "*"
        if func == "first_event":
            return "*"

        raise ValueError(f"Unsupported aggregation function: {func!r}")

    # ------------------------------------------------------------------
    # Group By
    # ------------------------------------------------------------------

    def build_group_by(self, dimensions: list[str]) -> str:
        """Build GROUP BY clause from dimension list."""
        if not dimensions:
            return ""
        cols = ", ".join(_quote_identifier(d) for d in dimensions)
        return f"GROUP BY {cols}"

    # ------------------------------------------------------------------
    # Top-level query builder (Req 14.2, 14.3)
    # ------------------------------------------------------------------

    def build_query(self, params: ReportRequest) -> tuple[str, list]:
        """Build a complete parameterized SQL query from a ReportRequest.

        Returns:
            Tuple of (sql_string, param_values).
        """
        query_params: list = []

        # SELECT clause
        select_expr = self.build_aggregation_select(params.aggregation)
        sql = f"SELECT {select_expr} FROM events"

        # WHERE clauses
        where_parts: list[str] = []

        # Timeframe
        tf_sql, tf_params = self.build_timeframe_clause(params.timeframe)
        where_parts.append(tf_sql)
        query_params.extend(tf_params)

        # Event selection
        es_sql, es_params = self.build_event_selection_clause(params.event_selection)
        if es_sql:
            where_parts.append(es_sql)
            query_params.extend(es_params)

        # Condition filters
        if params.filters is not None:
            cond_sql, cond_params = self.build_condition_clause(params.filters)
            if cond_sql:
                where_parts.append(f"({cond_sql})")
                query_params.extend(cond_params)

        if where_parts:
            sql += " WHERE " + " AND ".join(where_parts)

        # GROUP BY
        func = params.aggregation.function
        group_by_dims: list[str] = []

        if params.group_by:
            group_by_dims.extend(params.group_by)

        if func == "tops" and params.aggregation.attribute:
            # tops requires GROUP BY on the attribute
            if params.aggregation.attribute not in group_by_dims:
                group_by_dims.insert(0, params.aggregation.attribute)

        if group_by_dims:
            sql += " " + self.build_group_by(group_by_dims)

        # ORDER BY
        if func == "tops":
            sql += " ORDER BY count DESC"
        elif func == "last_event":
            sql += ' ORDER BY "timestamp" DESC LIMIT 1'
        elif func == "first_event":
            sql += ' ORDER BY "timestamp" ASC LIMIT 1'

        return (sql, query_params)

    # ------------------------------------------------------------------
    # Serialize / Parse round-trip (Req 14.4)
    # ------------------------------------------------------------------

    def serialize(self, query: ReportRequest) -> str:
        """Serialize a query object to a JSON string.

        Uses Pydantic's model_dump to produce a faithful JSON representation
        of the ReportRequest that can be round-tripped via parse().
        """
        return query.model_dump_json()

    def parse(self, serialized: str) -> ReportRequest:
        """Parse a serialized JSON string back into a ReportRequest.

        Raises ValueError if the string is not valid JSON or does not
        conform to the ReportRequest schema.
        """
        try:
            return ReportRequest.model_validate_json(serialized)
        except Exception as exc:
            raise ValueError(f"Failed to parse query: {exc}") from exc

