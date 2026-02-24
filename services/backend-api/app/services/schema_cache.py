"""Schema Cache — Redis-backed cache for project schema properties.

Provides get / set / invalidate operations keyed by
``schema:{project_id}:{schema_type}``.  All Redis calls are wrapped in
try/except so that a Redis outage never breaks the API — the service
simply falls back to the database.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    import redis.asyncio as redis

logger = structlog.get_logger()


class SchemaCache:
    """Thin async wrapper around Redis for schema property caching."""

    def __init__(self, redis_client: "redis.Redis", ttl: int = 3600) -> None:
        self._redis = redis_client
        self._ttl = ttl

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get(self, project_id: str, schema_type: str) -> list[dict] | None:
        """Return cached property list, or *None* on miss / error."""
        key = self._build_key(project_id, schema_type)
        try:
            raw: bytes | None = await self._redis.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception:
            logger.warning(
                "schema_cache_get_failed",
                key=key,
                exc_info=True,
            )
            return None

    async def set(
        self, project_id: str, schema_type: str, data: list[dict]
    ) -> None:
        """Store *data* in Redis with the configured TTL."""
        key = self._build_key(project_id, schema_type)
        try:
            await self._redis.set(key, json.dumps(data), ex=self._ttl)
        except Exception:
            logger.warning(
                "schema_cache_set_failed",
                key=key,
                exc_info=True,
            )

    async def invalidate(self, project_id: str, schema_type: str) -> None:
        """Delete the cached entry for *project_id* / *schema_type*."""
        key = self._build_key(project_id, schema_type)
        try:
            await self._redis.delete(key)
        except Exception:
            logger.warning(
                "schema_cache_invalidate_failed",
                key=key,
                exc_info=True,
            )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_key(project_id: str, schema_type: str) -> str:
        return f"schema:{project_id}:{schema_type}"
