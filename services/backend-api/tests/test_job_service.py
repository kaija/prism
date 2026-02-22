"""Unit tests for JobService with mocked PostgresRepository."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.report import JobStatus
from app.repositories.postgres_repo import PostgresRepository
from app.services.job_service import JobService


@pytest.fixture
def mock_repo():
    """Create a mocked PostgresRepository."""
    repo = MagicMock(spec=PostgresRepository)
    repo.execute = AsyncMock()
    repo.fetch_one = AsyncMock()
    repo.fetch_all = AsyncMock()
    repo.fetch_count = AsyncMock()
    return repo


@pytest.fixture
def service(mock_repo):
    return JobService(mock_repo)


class TestCreateJob:
    async def test_creates_job_and_returns_uuid(self, service, mock_repo):
        mock_repo.execute.return_value = "INSERT 0 1"

        job_id = await service.create_job("proj1", "trend", {"timeframe": "last_7_days"})

        assert isinstance(job_id, str)
        assert len(job_id) == 36  # UUID format
        mock_repo.execute.assert_called_once()

    async def test_inserts_with_queued_status(self, service, mock_repo):
        mock_repo.execute.return_value = "INSERT 0 1"

        await service.create_job("proj1", "trend", {"key": "val"})

        sql = mock_repo.execute.call_args[0][0]
        assert "INSERT INTO jobs" in sql
        assert "'queued'" in sql

    async def test_passes_correct_params(self, service, mock_repo):
        mock_repo.execute.return_value = "INSERT 0 1"
        params = {"timeframe": "last_7_days", "events": ["click"]}

        await service.create_job("proj1", "attribution", params)

        call_args = mock_repo.execute.call_args[0]
        # call_args[0] is SQL, [1] is job_id, [2] is project_id, [3] is job_type, [4] is params_json
        assert call_args[2] == "proj1"
        assert call_args[3] == "attribution"
        parsed_params = json.loads(call_args[4])
        assert parsed_params == params

    async def test_generates_unique_job_ids(self, service, mock_repo):
        mock_repo.execute.return_value = "INSERT 0 1"

        id1 = await service.create_job("proj1", "trend", {})
        id2 = await service.create_job("proj1", "trend", {})

        assert id1 != id2


class TestGetStatus:
    async def test_returns_job_status_when_found(self, service, mock_repo):
        now = datetime.now(timezone.utc)
        mock_repo.fetch_one.return_value = {
            "job_id": "abc-123",
            "status": "queued",
            "result": None,
            "error": None,
            "created_at": now,
            "started_at": None,
            "completed_at": None,
        }

        result = await service.get_status("abc-123")

        assert isinstance(result, JobStatus)
        assert result.job_id == "abc-123"
        assert result.status == "queued"
        assert result.result is None
        assert result.error is None
        assert result.created_at == now

    async def test_returns_none_when_not_found(self, service, mock_repo):
        mock_repo.fetch_one.return_value = None

        result = await service.get_status("nonexistent")

        assert result is None

    async def test_returns_completed_job_with_result(self, service, mock_repo):
        now = datetime.now(timezone.utc)
        mock_repo.fetch_one.return_value = {
            "job_id": "abc-123",
            "status": "completed",
            "result": {"data": [1, 2, 3]},
            "error": None,
            "created_at": now,
            "started_at": now,
            "completed_at": now,
        }

        result = await service.get_status("abc-123")

        assert result.status == "completed"
        assert result.result == {"data": [1, 2, 3]}

    async def test_returns_failed_job_with_error(self, service, mock_repo):
        now = datetime.now(timezone.utc)
        mock_repo.fetch_one.return_value = {
            "job_id": "abc-123",
            "status": "failed",
            "result": None,
            "error": "DuckDB connection timeout",
            "created_at": now,
            "started_at": now,
            "completed_at": now,
        }

        result = await service.get_status("abc-123")

        assert result.status == "failed"
        assert result.error == "DuckDB connection timeout"

    async def test_handles_result_as_json_string(self, service, mock_repo):
        now = datetime.now(timezone.utc)
        mock_repo.fetch_one.return_value = {
            "job_id": "abc-123",
            "status": "completed",
            "result": json.dumps({"data": [1, 2, 3]}),
            "error": None,
            "created_at": now,
            "started_at": now,
            "completed_at": now,
        }

        result = await service.get_status("abc-123")

        assert result.result == {"data": [1, 2, 3]}

    async def test_queries_correct_columns(self, service, mock_repo):
        mock_repo.fetch_one.return_value = None

        await service.get_status("abc-123")

        sql = mock_repo.fetch_one.call_args[0][0]
        assert "job_id" in sql
        assert "status" in sql
        assert "result" in sql
        assert "error" in sql
        assert "created_at" in sql
        assert "started_at" in sql
        assert "completed_at" in sql
        assert mock_repo.fetch_one.call_args[0][1] == "abc-123"


class TestUpdateStatus:
    async def test_sets_started_at_when_running(self, service, mock_repo):
        mock_repo.execute.return_value = "UPDATE 1"

        await service.update_status("abc-123", "running")

        sql = mock_repo.execute.call_args[0][0]
        assert "started_at = NOW()" in sql
        assert mock_repo.execute.call_args[0][1] == "running"
        assert mock_repo.execute.call_args[0][2] == "abc-123"

    async def test_sets_completed_at_and_result_when_completed(self, service, mock_repo):
        mock_repo.execute.return_value = "UPDATE 1"
        result_data = {"data": [1, 2, 3]}

        await service.update_status("abc-123", "completed", result=result_data)

        sql = mock_repo.execute.call_args[0][0]
        assert "completed_at = NOW()" in sql
        call_args = mock_repo.execute.call_args[0]
        assert call_args[1] == "completed"
        parsed_result = json.loads(call_args[2])
        assert parsed_result == result_data
        assert call_args[3] is None  # no error
        assert call_args[4] == "abc-123"

    async def test_sets_completed_at_and_error_when_failed(self, service, mock_repo):
        mock_repo.execute.return_value = "UPDATE 1"

        await service.update_status("abc-123", "failed", error="Query timeout")

        sql = mock_repo.execute.call_args[0][0]
        assert "completed_at = NOW()" in sql
        call_args = mock_repo.execute.call_args[0]
        assert call_args[1] == "failed"
        assert call_args[2] is None  # no result
        assert call_args[3] == "Query timeout"
        assert call_args[4] == "abc-123"

    async def test_updates_only_status_for_other_values(self, service, mock_repo):
        mock_repo.execute.return_value = "UPDATE 1"

        await service.update_status("abc-123", "queued")

        sql = mock_repo.execute.call_args[0][0]
        assert "status = $1" in sql
        assert "started_at" not in sql
        assert "completed_at" not in sql

    async def test_completed_with_both_result_and_error(self, service, mock_repo):
        mock_repo.execute.return_value = "UPDATE 1"
        result_data = {"partial": True}

        await service.update_status(
            "abc-123", "failed", result=result_data, error="Partial failure"
        )

        call_args = mock_repo.execute.call_args[0]
        assert call_args[1] == "failed"
        parsed_result = json.loads(call_args[2])
        assert parsed_result == {"partial": True}
        assert call_args[3] == "Partial failure"
