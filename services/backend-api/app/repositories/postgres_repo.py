"""Async PostgreSQL repository using asyncpg connection pool."""

from __future__ import annotations

from typing import Any, Optional

import asyncpg
import structlog

from app.config import Settings

logger = structlog.get_logger()


class PostgresRepository:
    """Async PostgreSQL access via asyncpg pool.

    Accepts an asyncpg pool via constructor for dependency injection.
    Provides generic execute/fetch methods that convert asyncpg Records to dicts.
    """

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    @classmethod
    async def create_pool(cls, settings: Settings) -> asyncpg.Pool:
        """Create an asyncpg connection pool from application settings.

        Args:
            settings: Application settings containing postgres_dsn.

        Returns:
            An asyncpg connection pool ready for use.
        """
        logger.info("creating_pg_pool", dsn=settings.postgres_dsn.split("@")[-1])
        pool = await asyncpg.create_pool(dsn=settings.postgres_dsn)
        logger.info("pg_pool_created")
        return pool

    async def execute(self, query: str, *args: Any) -> str:
        """Execute a write query (INSERT, UPDATE, DELETE).

        Args:
            query: SQL query string with $1, $2, ... placeholders.
            *args: Query parameter values.

        Returns:
            Command status string (e.g. 'INSERT 0 1').
        """
        try:
            async with self._pool.acquire() as conn:
                result = await conn.execute(query, *args)
            return result
        except asyncpg.PostgresError as exc:
            logger.error("pg_execute_error", query=query, error=str(exc))
            raise

    async def fetch_one(self, query: str, *args: Any) -> Optional[dict]:
        """Fetch a single row as a dict.

        Args:
            query: SQL query string with $1, $2, ... placeholders.
            *args: Query parameter values.

        Returns:
            A dict representing the row, or None if no row found.
        """
        try:
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(query, *args)
            return dict(row) if row is not None else None
        except asyncpg.PostgresError as exc:
            logger.error("pg_fetch_one_error", query=query, error=str(exc))
            raise

    async def fetch_all(self, query: str, *args: Any) -> list[dict]:
        """Fetch all rows as a list of dicts.

        Args:
            query: SQL query string with $1, $2, ... placeholders.
            *args: Query parameter values.

        Returns:
            A list of dicts, one per row. Empty list if no rows.
        """
        try:
            async with self._pool.acquire() as conn:
                rows = await conn.fetch(query, *args)
            return [dict(r) for r in rows]
        except asyncpg.PostgresError as exc:
            logger.error("pg_fetch_all_error", query=query, error=str(exc))
            raise

    async def fetch_count(self, query: str, *args: Any) -> int:
        """Fetch a count value from a query.

        Expects the query to return a single row with a single integer column
        (e.g. SELECT COUNT(*) FROM ...).

        Args:
            query: SQL count query with $1, $2, ... placeholders.
            *args: Query parameter values.

        Returns:
            The integer count value. Returns 0 if no row found.
        """
        try:
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(query, *args)
            if row is None:
                return 0
            # fetchrow returns a Record; grab the first column value
            return row[0]
        except asyncpg.PostgresError as exc:
            logger.error("pg_fetch_count_error", query=query, error=str(exc))
            raise
