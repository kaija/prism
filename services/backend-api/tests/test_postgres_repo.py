"""Unit tests for PostgresRepository with mocked asyncpg pool."""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.repositories.postgres_repo import PostgresRepository


@pytest.fixture
def mock_pool():
    """Create a mock asyncpg pool with async context manager support.

    asyncpg's pool.acquire() returns an async context manager directly
    (not a coroutine), so we use a real asynccontextmanager wrapper.
    """
    pool = MagicMock()
    conn = AsyncMock()

    @asynccontextmanager
    async def _acquire():
        yield conn

    pool.acquire = _acquire

    return pool, conn


@pytest.fixture
def repo(mock_pool):
    pool, _ = mock_pool
    return PostgresRepository(pool)


class TestPostgresRepositoryInit:
    def test_stores_pool(self, mock_pool):
        pool, _ = mock_pool
        repo = PostgresRepository(pool)
        assert repo._pool is pool


class TestCreatePool:
    @pytest.mark.asyncio
    async def test_create_pool_calls_asyncpg(self):
        settings = MagicMock()
        settings.postgres_dsn = "postgresql://user:pass@localhost:5432/db"

        mock_pool = AsyncMock()
        with patch("app.repositories.postgres_repo.asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool) as create:
            pool = await PostgresRepository.create_pool(settings)
            create.assert_called_once_with(dsn="postgresql://user:pass@localhost:5432/db")
            assert pool is mock_pool


class TestExecute:
    @pytest.mark.asyncio
    async def test_execute_returns_status(self, repo, mock_pool):
        _, conn = mock_pool
        conn.execute.return_value = "INSERT 0 1"

        result = await repo.execute("INSERT INTO t (a) VALUES ($1)", "val")

        conn.execute.assert_called_once_with("INSERT INTO t (a) VALUES ($1)", "val")
        assert result == "INSERT 0 1"

    @pytest.mark.asyncio
    async def test_execute_propagates_error(self, repo, mock_pool):
        import asyncpg
        _, conn = mock_pool
        conn.execute.side_effect = asyncpg.PostgresError("connection lost")

        with pytest.raises(asyncpg.PostgresError):
            await repo.execute("DELETE FROM t WHERE id = $1", 1)


class TestFetchOne:
    @pytest.mark.asyncio
    async def test_fetch_one_returns_dict(self, repo, mock_pool):
        _, conn = mock_pool
        # asyncpg Record acts like a mapping; simulate with a MagicMock
        mock_record = MagicMock()
        mock_record.__iter__ = MagicMock(return_value=iter([("id", 1), ("name", "test")]))
        mock_record.items = MagicMock(return_value=[("id", 1), ("name", "test")])
        mock_record.keys = MagicMock(return_value=["id", "name"])
        mock_record.values = MagicMock(return_value=[1, "test"])
        # dict() on a Record uses keys/values, simulate via __iter__ on keys
        # Simplest: just make dict(mock_record) work
        mock_record.__getitem__ = lambda self, k: {"id": 1, "name": "test"}[k]

        # Use a real dict-like object that dict() can convert
        class FakeRecord:
            def keys(self):
                return ["id", "name"]
            def __getitem__(self, key):
                return {"id": 1, "name": "test"}[key]

        conn.fetchrow.return_value = FakeRecord()

        result = await repo.fetch_one("SELECT * FROM t WHERE id = $1", 1)

        assert result == {"id": 1, "name": "test"}

    @pytest.mark.asyncio
    async def test_fetch_one_returns_none(self, repo, mock_pool):
        _, conn = mock_pool
        conn.fetchrow.return_value = None

        result = await repo.fetch_one("SELECT * FROM t WHERE id = $1", 999)

        assert result is None

    @pytest.mark.asyncio
    async def test_fetch_one_propagates_error(self, repo, mock_pool):
        import asyncpg
        _, conn = mock_pool
        conn.fetchrow.side_effect = asyncpg.PostgresError("query failed")

        with pytest.raises(asyncpg.PostgresError):
            await repo.fetch_one("SELECT * FROM t WHERE id = $1", 1)


class TestFetchAll:
    @pytest.mark.asyncio
    async def test_fetch_all_returns_list_of_dicts(self, repo, mock_pool):
        _, conn = mock_pool

        class FakeRecord:
            def __init__(self, data):
                self._data = data
            def keys(self):
                return self._data.keys()
            def __getitem__(self, key):
                return self._data[key]

        conn.fetch.return_value = [
            FakeRecord({"id": 1, "name": "a"}),
            FakeRecord({"id": 2, "name": "b"}),
        ]

        result = await repo.fetch_all("SELECT * FROM t")

        assert result == [{"id": 1, "name": "a"}, {"id": 2, "name": "b"}]

    @pytest.mark.asyncio
    async def test_fetch_all_returns_empty_list(self, repo, mock_pool):
        _, conn = mock_pool
        conn.fetch.return_value = []

        result = await repo.fetch_all("SELECT * FROM t WHERE 1=0")

        assert result == []

    @pytest.mark.asyncio
    async def test_fetch_all_propagates_error(self, repo, mock_pool):
        import asyncpg
        _, conn = mock_pool
        conn.fetch.side_effect = asyncpg.PostgresError("timeout")

        with pytest.raises(asyncpg.PostgresError):
            await repo.fetch_all("SELECT * FROM t")


class TestFetchCount:
    @pytest.mark.asyncio
    async def test_fetch_count_returns_integer(self, repo, mock_pool):
        _, conn = mock_pool

        class FakeRecord:
            def __getitem__(self, idx):
                if idx == 0:
                    return 42
                raise IndexError

        conn.fetchrow.return_value = FakeRecord()

        result = await repo.fetch_count("SELECT COUNT(*) FROM t")

        assert result == 42

    @pytest.mark.asyncio
    async def test_fetch_count_returns_zero_on_none(self, repo, mock_pool):
        _, conn = mock_pool
        conn.fetchrow.return_value = None

        result = await repo.fetch_count("SELECT COUNT(*) FROM t WHERE 1=0")

        assert result == 0

    @pytest.mark.asyncio
    async def test_fetch_count_propagates_error(self, repo, mock_pool):
        import asyncpg
        _, conn = mock_pool
        conn.fetchrow.side_effect = asyncpg.PostgresError("error")

        with pytest.raises(asyncpg.PostgresError):
            await repo.fetch_count("SELECT COUNT(*) FROM t")
