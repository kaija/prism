"""Unit tests for ReportService."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.infra.concurrency_limiter import ConcurrencyLimiter
from app.models.report import (
    Aggregation,
    EventSelection,
    JobResponse,
    ReportRequest,
    Timeframe,
)
from app.repositories.duckdb_repo import DuckDBRepository
from app.services.job_service import JobService
from app.services.query_builder import QueryBuilderService
from app.services.report_service import ReportService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_job_service():
    svc = MagicMock(spec=JobService)
    svc.create_job = AsyncMock(return_value="job-123")
    svc.update_status = AsyncMock()
    svc.get_status = AsyncMock()
    return svc


@pytest.fixture
def mock_query_builder():
    qb = MagicMock(spec=QueryBuilderService)
    qb.build_query.return_value = ("SELECT COUNT(*) FROM events WHERE 1=1", [])
    return qb


@pytest.fixture
def mock_duckdb_repo():
    repo = MagicMock(spec=DuckDBRepository)
    repo.execute_query.return_value = [{"count": 42}]
    return repo


@pytest.fixture
def concurrency_limiter():
    return ConcurrencyLimiter(per_project_max=5, global_max=10)


@pytest.fixture
def service(mock_job_service, mock_query_builder, mock_duckdb_repo, concurrency_limiter):
    return ReportService(
        job_service=mock_job_service,
        query_builder=mock_query_builder,
        duckdb_repo=mock_duckdb_repo,
        concurrency_limiter=concurrency_limiter,
    )


def _make_request(report_type: str = "trend") -> ReportRequest:
    return ReportRequest(
        report_type=report_type,
        timeframe=Timeframe(type="absolute", start=1000, end=2000),
        event_selection=EventSelection(type="all"),
        aggregation=Aggregation(function="count"),
    )


# ---------------------------------------------------------------------------
# submit_report
# ---------------------------------------------------------------------------

class TestSubmitReport:
    async def test_returns_job_response_with_queued_status(self, service, mock_job_service):
        request = _make_request()
        result = await service.submit_report("proj1", request)

        assert isinstance(result, JobResponse)
        assert result.job_id == "job-123"
        assert result.status == "queued"

    async def test_creates_job_via_job_service(self, service, mock_job_service):
        request = _make_request("attribution")
        await service.submit_report("proj1", request)

        mock_job_service.create_job.assert_called_once_with(
            project_id="proj1",
            job_type="attribution",
            params=request.model_dump(),
        )

    async def test_fires_background_task(self, service, mock_job_service):
        """submit_report should schedule _execute_report as a background task."""
        request = _make_request()
        await service.submit_report("proj1", request)

        # Give the event loop a tick so the background task starts
        await asyncio.sleep(0.05)

        # _execute_report should have updated status to "running"
        calls = mock_job_service.update_status.call_args_list
        statuses = [c[0][1] for c in calls]
        assert "running" in statuses


# ---------------------------------------------------------------------------
# _execute_report
# ---------------------------------------------------------------------------

class TestExecuteReport:
    async def test_successful_execution_updates_to_completed(
        self, service, mock_job_service, mock_duckdb_repo
    ):
        request = _make_request()
        await service._execute_report("job-123", "proj1", request)

        # Should update to running, then completed
        calls = mock_job_service.update_status.call_args_list
        assert calls[0][0] == ("job-123", "running")
        assert calls[1][0][0] == "job-123"
        assert calls[1][0][1] == "completed"
        # Result should be a dict with report data
        result = calls[1][1].get("result") or calls[1][0][2]
        assert result["report_type"] == "trend"
        assert result["data"] == [{"count": 42}]

    async def test_failed_execution_updates_to_failed(
        self, service, mock_job_service, mock_duckdb_repo
    ):
        mock_duckdb_repo.execute_query.side_effect = RuntimeError("DuckDB down")
        request = _make_request()

        await service._execute_report("job-123", "proj1", request)

        calls = mock_job_service.update_status.call_args_list
        assert calls[0][0] == ("job-123", "running")
        # Second call should be "failed" with error
        assert calls[1][0][0] == "job-123"
        assert calls[1][0][1] == "failed"
        assert "DuckDB down" in (calls[1][1].get("error") or calls[1][0][2])

    async def test_releases_concurrency_slot_on_success(self, service, concurrency_limiter):
        request = _make_request()
        before = concurrency_limiter.get_global_available()

        await service._execute_report("job-123", "proj1", request)

        after = concurrency_limiter.get_global_available()
        assert after == before  # slot acquired and released

    async def test_releases_concurrency_slot_on_failure(
        self, service, mock_duckdb_repo, concurrency_limiter
    ):
        mock_duckdb_repo.execute_query.side_effect = RuntimeError("fail")
        request = _make_request()
        before = concurrency_limiter.get_global_available()

        await service._execute_report("job-123", "proj1", request)

        after = concurrency_limiter.get_global_available()
        assert after == before  # slot released even on failure

    async def test_dispatches_to_trend(self, service, mock_job_service):
        request = _make_request("trend")
        await service._execute_report("job-123", "proj1", request)

        result = mock_job_service.update_status.call_args_list[1]
        result_data = result[1].get("result") or result[0][2]
        assert result_data["report_type"] == "trend"

    async def test_dispatches_to_attribution(self, service, mock_job_service):
        request = _make_request("attribution")
        await service._execute_report("job-123", "proj1", request)

        result = mock_job_service.update_status.call_args_list[1]
        result_data = result[1].get("result") or result[0][2]
        assert result_data["report_type"] == "attribution"

    async def test_dispatches_to_cohort(self, service, mock_job_service):
        request = _make_request("cohort")
        await service._execute_report("job-123", "proj1", request)

        result = mock_job_service.update_status.call_args_list[1]
        result_data = result[1].get("result") or result[0][2]
        assert result_data["report_type"] == "cohort"


# ---------------------------------------------------------------------------
# generate_trend
# ---------------------------------------------------------------------------

class TestGenerateTrend:
    async def test_builds_and_executes_query(
        self, service, mock_query_builder, mock_duckdb_repo
    ):
        request = _make_request("trend")
        result = await service.generate_trend("proj1", request)

        mock_query_builder.build_query.assert_called_once_with(request)
        mock_duckdb_repo.execute_query.assert_called_once()
        assert result["report_type"] == "trend"
        assert result["project_id"] == "proj1"
        assert result["data"] == [{"count": 42}]

    async def test_returns_empty_data_when_no_rows(
        self, service, mock_duckdb_repo
    ):
        mock_duckdb_repo.execute_query.return_value = []
        request = _make_request("trend")

        result = await service.generate_trend("proj1", request)

        assert result["data"] == []

    async def test_passes_sql_and_params_to_duckdb(
        self, service, mock_query_builder, mock_duckdb_repo
    ):
        mock_query_builder.build_query.return_value = (
            "SELECT COUNT(*) FROM events WHERE ts >= ?",
            [1000],
        )
        request = _make_request("trend")

        await service.generate_trend("proj1", request)

        mock_duckdb_repo.execute_query.assert_called_once_with(
            "SELECT COUNT(*) FROM events WHERE ts >= ?", [1000]
        )


# ---------------------------------------------------------------------------
# generate_attribution
# ---------------------------------------------------------------------------

class TestGenerateAttribution:
    async def test_builds_and_executes_query(
        self, service, mock_query_builder, mock_duckdb_repo
    ):
        request = _make_request("attribution")
        result = await service.generate_attribution("proj1", request)

        mock_query_builder.build_query.assert_called_once_with(request)
        assert result["report_type"] == "attribution"
        assert result["project_id"] == "proj1"
        assert result["data"] == [{"count": 42}]

    async def test_propagates_duckdb_errors(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.side_effect = RuntimeError("query failed")
        request = _make_request("attribution")

        with pytest.raises(RuntimeError, match="query failed"):
            await service.generate_attribution("proj1", request)


# ---------------------------------------------------------------------------
# generate_cohort
# ---------------------------------------------------------------------------

class TestGenerateCohort:
    async def test_builds_and_executes_query(
        self, service, mock_query_builder, mock_duckdb_repo
    ):
        request = _make_request("cohort")
        result = await service.generate_cohort("proj1", request)

        mock_query_builder.build_query.assert_called_once_with(request)
        assert result["report_type"] == "cohort"
        assert result["project_id"] == "proj1"
        assert result["data"] == [{"count": 42}]

    async def test_includes_group_by_in_request(
        self, service, mock_query_builder, mock_duckdb_repo
    ):
        request = ReportRequest(
            report_type="cohort",
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            event_selection=EventSelection(type="all"),
            aggregation=Aggregation(function="count"),
            group_by=["region"],
        )
        await service.generate_cohort("proj1", request)

        mock_query_builder.build_query.assert_called_once_with(request)
