"""SegmentService for segment CRUD and DSL validation.

Manages CRUD operations on the segments PostgreSQL table
via the injected PostgresRepository. Validates DSL expressions
using the Lark-based DSL parser and Function Registry validator.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional
from uuid import uuid4

import structlog

from app.models.common import PaginatedResult
from app.models.segment import SegmentCreate, SegmentResponse, SegmentTimeframe, SegmentUpdate
from app.dsl.parser import DslParser
from app.dsl.validator import validate
from app.repositories.postgres_repo import PostgresRepository

logger = structlog.get_logger()

MAX_DSL_LENGTH = 10_000


@dataclass
class ValidationResult:
    """Result of a DSL validation check."""

    valid: bool
    errors: list[str] = field(default_factory=list)


class SegmentService:
    """Manages segment CRUD operations and DSL validation."""

    def __init__(self, repo: PostgresRepository) -> None:
        self._repo = repo
        self._parser = DslParser()

    async def create(self, project_id: str, payload: SegmentCreate) -> SegmentResponse:
        """Create a segment. Validates DSL expression. Returns created record."""
        validation = self.validate_dsl(payload.dsl)
        if not validation.valid:
            raise ValueError(f"Invalid DSL: {'; '.join(validation.errors)}")

        segment_id = str(uuid4())
        timeframe_json = json.dumps(payload.timeframe.model_dump(mode="json"))

        row = await self._repo.fetch_one(
            """
            INSERT INTO segments (segment_id, project_id, name, description, dsl, timeframe, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
            RETURNING segment_id, project_id, name, description, dsl, timeframe, created_at, updated_at
            """,
            segment_id,
            project_id,
            payload.name,
            payload.description,
            payload.dsl,
            timeframe_json,
        )

        return self._row_to_segment(row)

    async def get(self, project_id: str, segment_id: str) -> Optional[SegmentResponse]:
        """Get a single segment by segment_id."""
        row = await self._repo.fetch_one(
            "SELECT segment_id, project_id, name, description, dsl, timeframe, created_at, updated_at "
            "FROM segments WHERE project_id = $1 AND segment_id = $2",
            project_id,
            segment_id,
        )
        if row is None:
            return None
        return self._row_to_segment(row)

    async def list(
        self, project_id: str, page: int, page_size: int
    ) -> PaginatedResult[SegmentResponse]:
        """List segments with pagination."""
        total = await self._repo.fetch_count(
            "SELECT COUNT(*) FROM segments WHERE project_id = $1",
            project_id,
        )

        offset = (page - 1) * page_size
        rows = await self._repo.fetch_all(
            "SELECT segment_id, project_id, name, description, dsl, timeframe, created_at, updated_at "
            "FROM segments WHERE project_id = $1 "
            "ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            project_id,
            page_size,
            offset,
        )

        items = [self._row_to_segment(r) for r in rows]
        return PaginatedResult(items=items, total=total, page=page, page_size=page_size)

    async def update(
        self, project_id: str, segment_id: str, payload: SegmentUpdate
    ) -> SegmentResponse:
        """Update a segment. Validates DSL if changed."""
        if payload.dsl is not None:
            validation = self.validate_dsl(payload.dsl)
            if not validation.valid:
                raise ValueError(f"Invalid DSL: {'; '.join(validation.errors)}")

        # Build SET clause dynamically from non-None fields
        set_parts: list[str] = []
        args: list = []
        param_idx = 1

        fields = payload.model_dump(exclude_none=True)
        for col, value in fields.items():
            if col == "timeframe":
                set_parts.append(f"timeframe = ${param_idx}::jsonb")
                args.append(json.dumps(payload.timeframe.model_dump(mode="json")))
            else:
                set_parts.append(f"{col} = ${param_idx}")
                args.append(value)
            param_idx += 1

        if not set_parts:
            # Nothing to update — just return the existing record
            existing = await self.get(project_id, segment_id)
            if existing is None:
                raise LookupError(f"Segment {segment_id} not found in project {project_id}")
            return existing

        # Always bump updated_at
        set_parts.append("updated_at = NOW()")

        set_clause = ", ".join(set_parts)
        args.append(project_id)
        args.append(segment_id)

        row = await self._repo.fetch_one(
            f"UPDATE segments SET {set_clause} "
            f"WHERE project_id = ${param_idx} AND segment_id = ${param_idx + 1} "
            f"RETURNING segment_id, project_id, name, description, dsl, timeframe, created_at, updated_at",
            *args,
        )

        if row is None:
            raise LookupError(f"Segment {segment_id} not found in project {project_id}")

        return self._row_to_segment(row)

    async def delete(self, project_id: str, segment_id: str) -> bool:
        """Delete a segment. Returns True if deleted."""
        result = await self._repo.execute(
            "DELETE FROM segments WHERE project_id = $1 AND segment_id = $2",
            project_id,
            segment_id,
        )
        # asyncpg returns e.g. "DELETE 1" or "DELETE 0"
        return result.endswith("1")

    def validate_dsl(self, dsl: str) -> ValidationResult:
        """Validate a DSL expression using the DSL parser and validator.

        Parses the expression into an AST using DslParser, then validates
        the AST against the Function Registry for function existence,
        argument counts, and type compatibility.
        """
        errors: list[str] = []

        if not dsl or not dsl.strip():
            errors.append("DSL expression must not be empty")
            return ValidationResult(valid=False, errors=errors)

        if len(dsl) > MAX_DSL_LENGTH:
            errors.append(f"DSL expression exceeds maximum length of {MAX_DSL_LENGTH} characters")
            return ValidationResult(valid=False, errors=errors)

        try:
            ast = self._parser.parse(dsl)
        except Exception as exc:
            errors.append(f"DSL syntax error: {exc}")
            return ValidationResult(valid=False, errors=errors)

        result = validate(ast)
        if not result.valid:
            errors.extend(e.message for e in result.errors)

        return ValidationResult(valid=len(errors) == 0, errors=errors)

    @staticmethod
    def _row_to_segment(row: dict) -> SegmentResponse:
        """Convert a database row dict to a SegmentResponse model."""
        timeframe_data = row["timeframe"]
        if isinstance(timeframe_data, str):
            timeframe_data = json.loads(timeframe_data)

        return SegmentResponse(
            segment_id=row["segment_id"],
            project_id=row["project_id"],
            name=row["name"],
            description=row.get("description"),
            dsl=row["dsl"],
            timeframe=SegmentTimeframe(**timeframe_data),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
