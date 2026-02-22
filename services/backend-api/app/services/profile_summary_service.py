"""ProfileSummaryService for profile filtering, display, and timeline queries.

Handles profile queries with custom column selection and pagination (Req 10),
event summaries grouped by event_name (Req 11.1), and time-bucketed
timeline data with optional filters (Req 11.2, 11.3).
"""

from __future__ import annotations

from typing import Any, Optional

import structlog

from app.models.common import PaginatedResult
from app.models.report import ConditionGroup, Timeframe
from app.repositories.duckdb_repo import DuckDBRepository
from app.services.query_builder import QueryBuilderService, _quote_identifier

logger = structlog.get_logger()

# Mapping from bucket_size to DuckDB date_trunc precision
_BUCKET_TRUNC: dict[str, str] = {
    "hour": "hour",
    "day": "day",
    "week": "week",
    "month": "month",
}


class ProfileSummaryService:
    """Handles profile filtering, display, and timeline queries (Req 10, 11)."""

    def __init__(
        self,
        query_builder: QueryBuilderService,
        duckdb_repo: DuckDBRepository,
    ) -> None:
        self._query_builder = query_builder
        self._duckdb_repo = duckdb_repo

    async def query_profiles(
        self,
        project_id: str,
        filters: ConditionGroup,
        columns: list[str],
        page: int,
        page_size: int,
    ) -> PaginatedResult[dict]:
        """Query profiles with filters and custom column selection (Req 10.1, 10.2, 10.3).

        Builds a SELECT with only the specified columns, applies filter
        conditions via QueryBuilderService, adds LIMIT/OFFSET for pagination,
        and runs a parallel COUNT query for total.
        """
        # Build SELECT columns
        select_cols = ", ".join(_quote_identifier(c) for c in columns)

        # Build WHERE from filters
        where_sql, where_params = self._query_builder.build_condition_clause(filters)

        # Project isolation
        project_clause = '"project_id" = ?'
        project_param = [project_id]

        where_full = f"{project_clause} AND ({where_sql})" if where_sql else project_clause
        full_params = project_param + where_params

        # Count query
        count_sql = f'SELECT COUNT(*) AS total FROM profiles WHERE {where_full}'
        count_rows = self._duckdb_repo.execute_query(count_sql, full_params)
        total = count_rows[0]["total"] if count_rows else 0

        # Data query with pagination
        offset = (page - 1) * page_size
        data_sql = (
            f"SELECT {select_cols} FROM profiles"
            f" WHERE {where_full}"
            f" LIMIT ? OFFSET ?"
        )
        data_params = full_params + [page_size, offset]

        items = self._duckdb_repo.execute_query(data_sql, data_params)

        logger.info(
            "query_profiles",
            project_id=project_id,
            total=total,
            page=page,
            page_size=page_size,
            returned=len(items),
        )

        return PaginatedResult(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_event_summary(
        self,
        project_id: str,
        profile_ids: list[str],
    ) -> list[dict[str, Any]]:
        """Get aggregated event counts by event_name for a profile group (Req 11.1).

        Returns a list of dicts with ``event_name`` and ``count`` keys.
        """
        if not profile_ids:
            return []

        placeholders = ", ".join("?" for _ in profile_ids)
        sql = (
            'SELECT "event_name", COUNT(*) AS count'
            " FROM events"
            f' WHERE "project_id" = ? AND "profile_id" IN ({placeholders})'
            ' GROUP BY "event_name"'
            " ORDER BY count DESC"
        )
        params: list[Any] = [project_id] + list(profile_ids)

        rows = self._duckdb_repo.execute_query(sql, params)

        logger.info(
            "get_event_summary",
            project_id=project_id,
            profile_count=len(profile_ids),
            event_types=len(rows),
        )

        return rows

    async def get_timeline(
        self,
        project_id: str,
        profile_ids: list[str],
        timeframe: Timeframe,
        filters: Optional[ConditionGroup],
        bucket_size: str,
    ) -> list[dict[str, Any]]:
        """Get time-bucketed event data for chart rendering (Req 11.2, 11.3).

        Buckets events by the specified time period (hour/day/week/month)
        and applies optional filter conditions.

        Returns a list of dicts with ``bucket`` and ``count`` keys.
        """
        if not profile_ids:
            return []

        trunc_precision = _BUCKET_TRUNC.get(bucket_size)
        if trunc_precision is None:
            raise ValueError(f"Unsupported bucket_size: {bucket_size!r}")

        # Build WHERE clauses
        where_parts: list[str] = []
        params: list[Any] = []

        # Project isolation
        where_parts.append('"project_id" = ?')
        params.append(project_id)

        # Profile filter
        placeholders = ", ".join("?" for _ in profile_ids)
        where_parts.append(f'"profile_id" IN ({placeholders})')
        params.extend(profile_ids)

        # Timeframe (Req 11.3)
        tf_sql, tf_params = self._query_builder.build_timeframe_clause(timeframe)
        where_parts.append(tf_sql)
        params.extend(tf_params)

        # Optional condition filters (Req 11.3)
        if filters is not None:
            cond_sql, cond_params = self._query_builder.build_condition_clause(filters)
            if cond_sql:
                where_parts.append(f"({cond_sql})")
                params.extend(cond_params)

        where_clause = " AND ".join(where_parts)

        sql = (
            f'SELECT date_trunc(\'{trunc_precision}\', "timestamp") AS bucket,'
            " COUNT(*) AS count"
            " FROM events"
            f" WHERE {where_clause}"
            " GROUP BY bucket"
            " ORDER BY bucket ASC"
        )

        rows = self._duckdb_repo.execute_query(sql, params)

        logger.info(
            "get_timeline",
            project_id=project_id,
            profile_count=len(profile_ids),
            bucket_size=bucket_size,
            buckets=len(rows),
        )

        return rows
