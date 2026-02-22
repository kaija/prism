"""DuckDB repository for analytical query execution."""

from __future__ import annotations

from typing import Any

import duckdb
import structlog

from app.config import Settings

logger = structlog.get_logger()


class DuckDBRepository:
    """DuckDB connection management for analytical queries.

    Wraps a duckdb.DuckDBPyConnection and provides parameterized query
    execution that returns results as lists of dicts.

    Note:
        DuckDB connections are NOT thread-safe. Each thread or async
        worker that needs DuckDB access should use its own connection
        (e.g. via ``conn.cursor()`` or a separate ``duckdb.connect``).
    """

    def __init__(self, conn: duckdb.DuckDBPyConnection) -> None:
        self._conn = conn

    @classmethod
    def create_connection(cls, settings: Settings) -> duckdb.DuckDBPyConnection:
        """Create a DuckDB connection from application settings.

        Opens in read-write mode so the database file is created if it
        does not yet exist (e.g. before Flink has written any data).

        Args:
            settings: Application settings containing ``duckdb_path``.

        Returns:
            A DuckDB connection ready for use.
        """
        import os

        logger.info("creating_duckdb_connection", path=settings.duckdb_path)
        os.makedirs(os.path.dirname(settings.duckdb_path) or ".", exist_ok=True)
        conn = duckdb.connect(database=settings.duckdb_path, read_only=False)
        logger.info("duckdb_connection_created")
        return conn

    def execute_query(self, sql: str, params: list[Any] | None = None) -> list[dict]:
        """Execute a parameterized read query against DuckDB.

        Uses ``?`` placeholders for parameter binding to prevent SQL injection.

        Args:
            sql: SQL query string with ``?`` placeholders.
            params: List of parameter values to bind. Defaults to empty list.

        Returns:
            A list of dicts, one per row. Empty list if no rows.

        Raises:
            duckdb.Error: If the query fails.
        """
        params = params or []
        try:
            result = self._conn.execute(sql, params)
            columns = [desc[0] for desc in result.description]
            rows = result.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        except duckdb.Error as exc:
            logger.error("duckdb_query_error", sql=sql, error=str(exc))
            raise

    def execute_query_with_description(
        self, sql: str, params: list[Any] | None = None
    ) -> tuple[list[dict], list[str]]:
        """Execute query and return results with column names.

        Args:
            sql: SQL query string with ``?`` placeholders.
            params: List of parameter values to bind. Defaults to empty list.

        Returns:
            A tuple of (rows_as_dicts, column_names).

        Raises:
            duckdb.Error: If the query fails.
        """
        params = params or []
        try:
            result = self._conn.execute(sql, params)
            columns = [desc[0] for desc in result.description]
            rows = result.fetchall()
            return [dict(zip(columns, row)) for row in rows], columns
        except duckdb.Error as exc:
            logger.error("duckdb_query_with_desc_error", sql=sql, error=str(exc))
            raise
