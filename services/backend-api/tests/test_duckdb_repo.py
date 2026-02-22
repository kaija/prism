"""Unit tests for DuckDBRepository with mocked duckdb connection."""

from unittest.mock import MagicMock, patch

import pytest

from app.repositories.duckdb_repo import DuckDBRepository


@pytest.fixture
def mock_conn():
    """Create a mock duckdb connection."""
    return MagicMock()


@pytest.fixture
def repo(mock_conn):
    return DuckDBRepository(mock_conn)


class TestDuckDBRepositoryInit:
    def test_stores_connection(self, mock_conn):
        repo = DuckDBRepository(mock_conn)
        assert repo._conn is mock_conn


class TestCreateConnection:
    def test_create_connection_from_settings(self):
        settings = MagicMock()
        settings.duckdb_path = "/tmp/test.duckdb"

        mock_conn = MagicMock()
        with patch(
            "app.repositories.duckdb_repo.duckdb.connect", return_value=mock_conn
        ) as connect:
            conn = DuckDBRepository.create_connection(settings)
            connect.assert_called_once_with(
                database="/tmp/test.duckdb", read_only=True
            )
            assert conn is mock_conn


class TestExecuteQuery:
    def test_returns_list_of_dicts(self, repo, mock_conn):
        mock_result = MagicMock()
        mock_result.description = [("id",), ("name",)]
        mock_result.fetchall.return_value = [(1, "alice"), (2, "bob")]
        mock_conn.execute.return_value = mock_result

        rows = repo.execute_query("SELECT id, name FROM users WHERE age > ?", [18])

        mock_conn.execute.assert_called_once_with(
            "SELECT id, name FROM users WHERE age > ?", [18]
        )
        assert rows == [{"id": 1, "name": "alice"}, {"id": 2, "name": "bob"}]

    def test_returns_empty_list_when_no_rows(self, repo, mock_conn):
        mock_result = MagicMock()
        mock_result.description = [("id",)]
        mock_result.fetchall.return_value = []
        mock_conn.execute.return_value = mock_result

        rows = repo.execute_query("SELECT id FROM users WHERE 1=0")

        assert rows == []

    def test_defaults_params_to_empty_list(self, repo, mock_conn):
        mock_result = MagicMock()
        mock_result.description = [("cnt",)]
        mock_result.fetchall.return_value = [(42,)]
        mock_conn.execute.return_value = mock_result

        rows = repo.execute_query("SELECT COUNT(*) AS cnt FROM users")

        mock_conn.execute.assert_called_once_with(
            "SELECT COUNT(*) AS cnt FROM users", []
        )
        assert rows == [{"cnt": 42}]

    def test_propagates_duckdb_error(self, repo, mock_conn):
        import duckdb

        mock_conn.execute.side_effect = duckdb.Error("syntax error")

        with pytest.raises(duckdb.Error, match="syntax error"):
            repo.execute_query("INVALID SQL")

    def test_handles_multiple_params(self, repo, mock_conn):
        mock_result = MagicMock()
        mock_result.description = [("id",), ("name",)]
        mock_result.fetchall.return_value = [(3, "charlie")]
        mock_conn.execute.return_value = mock_result

        rows = repo.execute_query(
            "SELECT id, name FROM users WHERE age > ? AND city = ?",
            [25, "NYC"],
        )

        mock_conn.execute.assert_called_once_with(
            "SELECT id, name FROM users WHERE age > ? AND city = ?",
            [25, "NYC"],
        )
        assert rows == [{"id": 3, "name": "charlie"}]


class TestExecuteQueryWithDescription:
    def test_returns_rows_and_columns(self, repo, mock_conn):
        mock_result = MagicMock()
        mock_result.description = [("id",), ("name",), ("age",)]
        mock_result.fetchall.return_value = [(1, "alice", 30)]
        mock_conn.execute.return_value = mock_result

        rows, columns = repo.execute_query_with_description(
            "SELECT id, name, age FROM users WHERE id = ?", [1]
        )

        assert columns == ["id", "name", "age"]
        assert rows == [{"id": 1, "name": "alice", "age": 30}]

    def test_returns_empty_with_columns(self, repo, mock_conn):
        mock_result = MagicMock()
        mock_result.description = [("id",), ("name",)]
        mock_result.fetchall.return_value = []
        mock_conn.execute.return_value = mock_result

        rows, columns = repo.execute_query_with_description(
            "SELECT id, name FROM users WHERE 1=0"
        )

        assert columns == ["id", "name"]
        assert rows == []

    def test_propagates_duckdb_error(self, repo, mock_conn):
        import duckdb

        mock_conn.execute.side_effect = duckdb.Error("table not found")

        with pytest.raises(duckdb.Error, match="table not found"):
            repo.execute_query_with_description("SELECT * FROM nonexistent")

    def test_defaults_params_to_empty_list(self, repo, mock_conn):
        mock_result = MagicMock()
        mock_result.description = [("total",)]
        mock_result.fetchall.return_value = [(100,)]
        mock_conn.execute.return_value = mock_result

        rows, columns = repo.execute_query_with_description(
            "SELECT COUNT(*) AS total FROM events"
        )

        mock_conn.execute.assert_called_once_with(
            "SELECT COUNT(*) AS total FROM events", []
        )
        assert columns == ["total"]
        assert rows == [{"total": 100}]
