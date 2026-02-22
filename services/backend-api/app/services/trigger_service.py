"""TriggerService for trigger setting CRUD and DSL validation.

Manages CRUD operations on the trigger_settings PostgreSQL table
via the injected PostgresRepository. Provides basic DSL syntax
validation (actual DSL evaluation is handled by Flink).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import uuid4

import structlog

from app.models.common import PaginatedResult
from app.models.trigger import TriggerAction, TriggerCreate, TriggerSetting, TriggerUpdate
from app.repositories.postgres_repo import PostgresRepository

logger = structlog.get_logger()

MAX_DSL_LENGTH = 10_000


@dataclass
class ValidationResult:
    """Result of a DSL validation check."""

    valid: bool
    errors: list[str] = field(default_factory=list)


class TriggerService:
    """Manages trigger setting CRUD (Req 3)."""

    def __init__(self, repo: PostgresRepository) -> None:
        self._repo = repo

    async def create(self, project_id: str, payload: TriggerCreate) -> TriggerSetting:
        """Create a trigger. Validates DSL expression. Returns created record."""
        validation = self.validate_dsl(payload.dsl)
        if not validation.valid:
            raise ValueError(f"Invalid DSL: {'; '.join(validation.errors)}")

        rule_id = str(uuid4())
        actions_json = json.dumps([a.model_dump(mode="json") for a in payload.actions])

        row = await self._repo.fetch_one(
            """
            INSERT INTO trigger_settings (rule_id, project_id, name, description, dsl, status, actions, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW())
            RETURNING rule_id, project_id, name, description, dsl, status, actions, created_at, updated_at
            """,
            rule_id,
            project_id,
            payload.name,
            payload.description,
            payload.dsl,
            payload.status,
            actions_json,
        )

        return self._row_to_trigger(row)

    async def get(self, project_id: str, rule_id: str) -> Optional[TriggerSetting]:
        """Get a single trigger by rule_id."""
        row = await self._repo.fetch_one(
            "SELECT rule_id, project_id, name, description, dsl, status, actions, created_at, updated_at "
            "FROM trigger_settings WHERE project_id = $1 AND rule_id = $2",
            project_id,
            rule_id,
        )
        if row is None:
            return None
        return self._row_to_trigger(row)

    async def list(
        self, project_id: str, page: int, page_size: int
    ) -> PaginatedResult[TriggerSetting]:
        """List triggers with pagination."""
        total = await self._repo.fetch_count(
            "SELECT COUNT(*) FROM trigger_settings WHERE project_id = $1",
            project_id,
        )

        offset = (page - 1) * page_size
        rows = await self._repo.fetch_all(
            "SELECT rule_id, project_id, name, description, dsl, status, actions, created_at, updated_at "
            "FROM trigger_settings WHERE project_id = $1 "
            "ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            project_id,
            page_size,
            offset,
        )

        items = [self._row_to_trigger(r) for r in rows]
        return PaginatedResult(items=items, total=total, page=page, page_size=page_size)

    async def update(
        self, project_id: str, rule_id: str, payload: TriggerUpdate
    ) -> TriggerSetting:
        """Update a trigger. Validates DSL if changed."""
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
            if col == "actions":
                set_parts.append(f"actions = ${param_idx}::jsonb")
                args.append(json.dumps([a.model_dump(mode="json") for a in payload.actions]))
            else:
                set_parts.append(f"{col} = ${param_idx}")
                args.append(value)
            param_idx += 1

        if not set_parts:
            # Nothing to update — just return the existing record
            existing = await self.get(project_id, rule_id)
            if existing is None:
                raise LookupError(f"Trigger {rule_id} not found in project {project_id}")
            return existing

        # Always bump updated_at
        set_parts.append(f"updated_at = NOW()")

        set_clause = ", ".join(set_parts)
        args.append(project_id)
        args.append(rule_id)

        row = await self._repo.fetch_one(
            f"UPDATE trigger_settings SET {set_clause} "
            f"WHERE project_id = ${param_idx} AND rule_id = ${param_idx + 1} "
            f"RETURNING rule_id, project_id, name, description, dsl, status, actions, created_at, updated_at",
            *args,
        )

        if row is None:
            raise LookupError(f"Trigger {rule_id} not found in project {project_id}")

        return self._row_to_trigger(row)

    async def delete(self, project_id: str, rule_id: str) -> bool:
        """Delete a trigger. Returns True if deleted."""
        result = await self._repo.execute(
            "DELETE FROM trigger_settings WHERE project_id = $1 AND rule_id = $2",
            project_id,
            rule_id,
        )
        # asyncpg returns e.g. "DELETE 1" or "DELETE 0"
        return result.endswith("1")

    def validate_dsl(self, dsl: str) -> ValidationResult:
        """Validate a DSL expression syntax.

        Since actual DSL evaluation is handled by Flink, this performs
        basic syntax validation: non-empty, reasonable length, and
        balanced parentheses/brackets.
        """
        errors: list[str] = []

        if not dsl or not dsl.strip():
            errors.append("DSL expression must not be empty")
            return ValidationResult(valid=False, errors=errors)

        if len(dsl) > MAX_DSL_LENGTH:
            errors.append(f"DSL expression exceeds maximum length of {MAX_DSL_LENGTH} characters")

        # Check balanced parentheses and brackets
        stack: list[str] = []
        pairs = {"(": ")", "[": "]", "{": "}"}
        for ch in dsl:
            if ch in pairs:
                stack.append(pairs[ch])
            elif ch in pairs.values():
                if not stack or stack[-1] != ch:
                    errors.append("DSL expression has unbalanced brackets")
                    break
                stack.pop()
        else:
            if stack:
                errors.append("DSL expression has unbalanced brackets")

        return ValidationResult(valid=len(errors) == 0, errors=errors)

    @staticmethod
    def _row_to_trigger(row: dict) -> TriggerSetting:
        """Convert a database row dict to a TriggerSetting model."""
        actions_data = row["actions"]
        if isinstance(actions_data, str):
            actions_data = json.loads(actions_data)

        return TriggerSetting(
            rule_id=row["rule_id"],
            project_id=row["project_id"],
            name=row["name"],
            description=row.get("description"),
            dsl=row["dsl"],
            status=row["status"],
            actions=[TriggerAction(**a) for a in actions_data],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
