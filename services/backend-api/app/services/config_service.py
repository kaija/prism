"""ConfigService for per-project key-value and reporting configuration.

Manages CRUD operations on the project_config and project_reporting_config
PostgreSQL tables via the injected PostgresRepository.
"""

from __future__ import annotations

import json
from typing import Optional

import structlog

from app.models.config import ReportingConfig
from app.repositories.postgres_repo import PostgresRepository

logger = structlog.get_logger()


class ConfigService:
    """Manages per-project key-value configuration (Req 1, 2)."""

    def __init__(self, repo: PostgresRepository) -> None:
        self._repo = repo

    async def get_value(self, project_id: str, key: str) -> Optional[str]:
        """Get a single config value. Returns None if not found."""
        row = await self._repo.fetch_one(
            "SELECT config_value FROM project_config WHERE project_id = $1 AND config_key = $2",
            project_id,
            key,
        )
        if row is None:
            return None
        return row["config_value"]

    async def get_all(self, project_id: str) -> dict[str, str]:
        """Get all config key-value pairs for a project."""
        rows = await self._repo.fetch_all(
            "SELECT config_key, config_value FROM project_config WHERE project_id = $1",
            project_id,
        )
        return {row["config_key"]: row["config_value"] for row in rows}

    async def set_value(self, project_id: str, key: str, value: str) -> None:
        """Upsert a config key-value pair."""
        await self._repo.execute(
            """
            INSERT INTO project_config (project_id, config_key, config_value, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (project_id, config_key)
            DO UPDATE SET config_value = $3, updated_at = NOW()
            """,
            project_id,
            key,
            value,
        )

    async def delete_value(self, project_id: str, key: str) -> bool:
        """Delete a config key. Returns True if deleted, False if not found."""
        result = await self._repo.execute(
            "DELETE FROM project_config WHERE project_id = $1 AND config_key = $2",
            project_id,
            key,
        )
        # asyncpg returns e.g. "DELETE 1" or "DELETE 0"
        return result.endswith("1")

    async def get_reporting_config(self, project_id: str) -> ReportingConfig:
        """Get reporting configuration for a project.

        Returns default ReportingConfig if no record exists.
        """
        row = await self._repo.fetch_one(
            "SELECT config FROM project_reporting_config WHERE project_id = $1",
            project_id,
        )
        if row is None:
            return ReportingConfig()
        config_data = row["config"]
        # asyncpg returns JSONB as a dict already, but handle string case too
        if isinstance(config_data, str):
            config_data = json.loads(config_data)
        return ReportingConfig(**config_data)

    async def set_reporting_config(self, project_id: str, config: ReportingConfig) -> None:
        """Validate and persist reporting configuration."""
        config_json = json.dumps(config.model_dump())
        await self._repo.execute(
            """
            INSERT INTO project_reporting_config (project_id, config, updated_at)
            VALUES ($1, $2::jsonb, NOW())
            ON CONFLICT (project_id)
            DO UPDATE SET config = $2::jsonb, updated_at = NOW()
            """,
            project_id,
            config_json,
        )
