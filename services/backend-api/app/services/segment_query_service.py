"""SegmentQueryService — orchestrates DSL parsing and SQL generation for segments.

Takes a segment_id, fetches the segment from the database, parses its DSL
into an AST, validates it, generates a SQL fragment, combines it with a
timeframe clause, and returns the complete parameterized query.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import structlog

from app.dsl.parser import DslParser
from app.dsl.sql_generator import SqlGenerator
from app.dsl.validator import validate
from app.models.report import Timeframe
from app.models.segment import SegmentTimeframe
from app.services.query_builder import QueryBuilderService
from app.services.segment_service import SegmentService

logger = structlog.get_logger()


@dataclass
class SegmentQueryResult:
    """Internal result of a segment query build."""

    sql: str
    params: list
    dsl: str
    timeframe: SegmentTimeframe


class SegmentQueryService:
    """Orchestrates segment DSL parsing and SQL query generation."""

    def __init__(
        self,
        segment_service: SegmentService,
        query_builder: QueryBuilderService,
    ) -> None:
        self._segment_service = segment_service
        self._query_builder = query_builder
        self._parser = DslParser()
        self._sql_gen = SqlGenerator()

    async def build_query(
        self,
        project_id: str,
        segment_id: str,
        timeframe_override: SegmentTimeframe | None = None,
    ) -> SegmentQueryResult:
        """Build a complete parameterized SQL query for a segment.

        Steps:
        1. Fetch segment from SegmentService
        2. Parse DSL into AST
        3. Validate AST
        4. Generate DSL SQL fragment via SqlGenerator
        5. Generate timeframe SQL fragment via QueryBuilderService
        6. Combine into full query
        7. Log to stdout via structlog
        8. Return result
        """
        # 1. Fetch segment
        segment = await self._segment_service.get(project_id, segment_id)
        if segment is None:
            raise LookupError(f"Segment {segment_id} not found")

        # 2. Parse DSL
        try:
            ast = self._parser.parse(segment.dsl)
        except Exception as exc:
            raise ValueError(f"Invalid DSL: {exc}") from exc

        # 3. Validate AST
        validation = validate(ast)
        if not validation.valid:
            messages = "; ".join(e.message for e in validation.errors)
            raise ValueError(f"Invalid DSL: {messages}")

        # 4. Generate DSL SQL fragment
        dsl_sql = self._sql_gen.generate(ast)
        dsl_params = list(self._sql_gen.params)

        # 5. Determine effective timeframe and generate clause
        effective_timeframe = timeframe_override if timeframe_override is not None else segment.timeframe
        report_timeframe = Timeframe(
            type=effective_timeframe.type,
            start=effective_timeframe.start,
            end=effective_timeframe.end,
            relative=effective_timeframe.relative,
        )
        timeframe_sql, timeframe_params = self._query_builder.build_timeframe_clause(report_timeframe)

        # 6. Combine into full query
        sql = f"SELECT * FROM events WHERE {timeframe_sql} AND ({dsl_sql})"
        params = timeframe_params + dsl_params

        # 7. Log to stdout
        logger.info(
            "segment_query_built",
            project_id=project_id,
            segment_id=segment_id,
            sql=sql,
            params=params,
        )

        # 8. Return result
        return SegmentQueryResult(
            sql=sql,
            params=params,
            dsl=segment.dsl,
            timeframe=effective_timeframe,
        )
