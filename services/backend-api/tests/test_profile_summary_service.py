"""Unit tests for ProfileSummaryService."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.models.common import PaginatedResult
from app.models.report import (
    ConditionFilter,
    ConditionGroup,
    Timeframe,
)
from app.repositories.duckdb_repo import DuckDBRepository
from app.services.profile_summary_service import ProfileSummaryService
from app.services.query_builder import QueryBuilderService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_query_builder():
    qb = MagicMock(spec=QueryBuilderService)
    qb.build_condition_clause.return_value = ('"age" > ?', [18])
    qb.build_timeframe_clause.return_value = (
        '"timestamp" >= ? AND "timestamp" <= ?',
        [1000, 2000],
    )
    return qb


@pytest.fixture
def mock_duckdb_repo():
    return MagicMock(spec=DuckDBRepository)


@pytest.fixture
def service(mock_query_builder, mock_duckdb_repo):
    return ProfileSummaryService(
        query_builder=mock_query_builder,
        duckdb_repo=mock_duckdb_repo,
    )


def _make_filters() -> ConditionGroup:
    return ConditionGroup(
        logic="and",
        conditions=[
            ConditionFilter(attribute="age", operator="greater_than", value=18),
        ],
    )


# ---------------------------------------------------------------------------
# query_profiles
# ---------------------------------------------------------------------------

class TestQueryProfiles:
    async def test_returns_paginated_result(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.side_effect = [
            [{"total": 50}],  # count query
            [{"name": "Alice"}, {"name": "Bob"}],  # data query
        ]
        result = await service.query_profiles(
            project_id="proj1",
            filters=_make_filters(),
            columns=["name"],
            page=1,
            page_size=20,
        )

        assert isinstance(result, PaginatedResult)
        assert result.total == 50
        assert result.page == 1
        assert result.page_size == 20
        assert len(result.items) == 2

    async def test_custom_columns_in_select(self, service, mock_duckdb_repo, mock_query_builder):
        mock_duckdb_repo.execute_query.side_effect = [
            [{"total": 1}],
            [{"name": "Alice", "email": "a@b.com"}],
        ]
        await service.query_profiles(
            project_id="proj1",
            filters=_make_filters(),
            columns=["name", "email"],
            page=1,
            page_size=10,
        )

        # The data query (second call) should contain the requested columns
        data_call = mock_duckdb_repo.execute_query.call_args_list[1]
        sql = data_call[0][0]
        assert '"name"' in sql
        assert '"email"' in sql

    async def test_pagination_offset_calculation(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.side_effect = [
            [{"total": 100}],
            [{"name": "Charlie"}],
        ]
        await service.query_profiles(
            project_id="proj1",
            filters=_make_filters(),
            columns=["name"],
            page=3,
            page_size=10,
        )

        # Page 3 with page_size 10 → OFFSET 20
        data_call = mock_duckdb_repo.execute_query.call_args_list[1]
        params = data_call[0][1]
        # Last two params are LIMIT and OFFSET
        assert params[-2] == 10  # page_size
        assert params[-1] == 20  # offset = (3-1)*10

    async def test_applies_project_id_filter(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.side_effect = [
            [{"total": 0}],
            [],
        ]
        await service.query_profiles(
            project_id="proj42",
            filters=_make_filters(),
            columns=["name"],
            page=1,
            page_size=20,
        )

        # Both queries should include project_id param
        for call in mock_duckdb_repo.execute_query.call_args_list:
            sql = call[0][0]
            params = call[0][1]
            assert '"project_id" = ?' in sql
            assert "proj42" in params

    async def test_delegates_filter_building_to_query_builder(
        self, service, mock_duckdb_repo, mock_query_builder
    ):
        mock_duckdb_repo.execute_query.side_effect = [
            [{"total": 0}],
            [],
        ]
        filters = _make_filters()
        await service.query_profiles(
            project_id="proj1",
            filters=filters,
            columns=["name"],
            page=1,
            page_size=20,
        )

        mock_query_builder.build_condition_clause.assert_called_once_with(filters)

    async def test_empty_result_returns_zero_total(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.side_effect = [
            [{"total": 0}],
            [],
        ]
        result = await service.query_profiles(
            project_id="proj1",
            filters=_make_filters(),
            columns=["name"],
            page=1,
            page_size=20,
        )

        assert result.total == 0
        assert result.items == []


# ---------------------------------------------------------------------------
# get_event_summary
# ---------------------------------------------------------------------------

class TestGetEventSummary:
    async def test_returns_event_counts(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.return_value = [
            {"event_name": "page_view", "count": 100},
            {"event_name": "click", "count": 50},
        ]
        result = await service.get_event_summary("proj1", ["user1", "user2"])

        assert len(result) == 2
        assert result[0]["event_name"] == "page_view"
        assert result[0]["count"] == 100

    async def test_empty_profile_ids_returns_empty(self, service, mock_duckdb_repo):
        result = await service.get_event_summary("proj1", [])

        assert result == []
        mock_duckdb_repo.execute_query.assert_not_called()

    async def test_groups_by_event_name(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.return_value = []
        await service.get_event_summary("proj1", ["user1"])

        sql = mock_duckdb_repo.execute_query.call_args[0][0]
        assert 'GROUP BY "event_name"' in sql

    async def test_filters_by_project_and_profile_ids(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.return_value = []
        await service.get_event_summary("proj1", ["u1", "u2", "u3"])

        sql = mock_duckdb_repo.execute_query.call_args[0][0]
        params = mock_duckdb_repo.execute_query.call_args[0][1]

        assert '"project_id" = ?' in sql
        assert '"profile_id" IN (?, ?, ?)' in sql
        assert params[0] == "proj1"
        assert params[1:] == ["u1", "u2", "u3"]

    async def test_orders_by_count_descending(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.return_value = []
        await service.get_event_summary("proj1", ["user1"])

        sql = mock_duckdb_repo.execute_query.call_args[0][0]
        assert "ORDER BY count DESC" in sql


# ---------------------------------------------------------------------------
# get_timeline
# ---------------------------------------------------------------------------

class TestGetTimeline:
    async def test_returns_bucketed_data(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.return_value = [
            {"bucket": "2024-01-01", "count": 10},
            {"bucket": "2024-01-02", "count": 20},
        ]
        result = await service.get_timeline(
            project_id="proj1",
            profile_ids=["user1"],
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            filters=None,
            bucket_size="day",
        )

        assert len(result) == 2
        assert result[0]["bucket"] == "2024-01-01"
        assert result[1]["count"] == 20

    async def test_empty_profile_ids_returns_empty(self, service, mock_duckdb_repo):
        result = await service.get_timeline(
            project_id="proj1",
            profile_ids=[],
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            filters=None,
            bucket_size="day",
        )

        assert result == []
        mock_duckdb_repo.execute_query.assert_not_called()

    async def test_uses_date_trunc_with_bucket_size(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.return_value = []

        for bucket, expected_trunc in [
            ("hour", "hour"),
            ("day", "day"),
            ("week", "week"),
            ("month", "month"),
        ]:
            mock_duckdb_repo.reset_mock()
            await service.get_timeline(
                project_id="proj1",
                profile_ids=["user1"],
                timeframe=Timeframe(type="absolute", start=1000, end=2000),
                filters=None,
                bucket_size=bucket,
            )
            sql = mock_duckdb_repo.execute_query.call_args[0][0]
            assert f"date_trunc('{expected_trunc}'" in sql

    async def test_applies_timeframe_filter(self, service, mock_duckdb_repo, mock_query_builder):
        mock_duckdb_repo.execute_query.return_value = []
        tf = Timeframe(type="absolute", start=1000, end=2000)

        await service.get_timeline(
            project_id="proj1",
            profile_ids=["user1"],
            timeframe=tf,
            filters=None,
            bucket_size="day",
        )

        mock_query_builder.build_timeframe_clause.assert_called_once_with(tf)

    async def test_applies_optional_condition_filters(
        self, service, mock_duckdb_repo, mock_query_builder
    ):
        mock_duckdb_repo.execute_query.return_value = []
        filters = _make_filters()

        await service.get_timeline(
            project_id="proj1",
            profile_ids=["user1"],
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            filters=filters,
            bucket_size="day",
        )

        mock_query_builder.build_condition_clause.assert_called_once_with(filters)

    async def test_no_condition_clause_when_filters_none(
        self, service, mock_duckdb_repo, mock_query_builder
    ):
        mock_duckdb_repo.execute_query.return_value = []

        await service.get_timeline(
            project_id="proj1",
            profile_ids=["user1"],
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            filters=None,
            bucket_size="day",
        )

        mock_query_builder.build_condition_clause.assert_not_called()

    async def test_includes_project_and_profile_filters(
        self, service, mock_duckdb_repo
    ):
        mock_duckdb_repo.execute_query.return_value = []

        await service.get_timeline(
            project_id="proj1",
            profile_ids=["u1", "u2"],
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            filters=None,
            bucket_size="day",
        )

        sql = mock_duckdb_repo.execute_query.call_args[0][0]
        params = mock_duckdb_repo.execute_query.call_args[0][1]

        assert '"project_id" = ?' in sql
        assert '"profile_id" IN (?, ?)' in sql
        assert params[0] == "proj1"
        assert "u1" in params
        assert "u2" in params

    async def test_orders_by_bucket_ascending(self, service, mock_duckdb_repo):
        mock_duckdb_repo.execute_query.return_value = []

        await service.get_timeline(
            project_id="proj1",
            profile_ids=["user1"],
            timeframe=Timeframe(type="absolute", start=1000, end=2000),
            filters=None,
            bucket_size="day",
        )

        sql = mock_duckdb_repo.execute_query.call_args[0][0]
        assert "ORDER BY bucket ASC" in sql

    async def test_invalid_bucket_size_raises(self, service):
        with pytest.raises(ValueError, match="Unsupported bucket_size"):
            await service.get_timeline(
                project_id="proj1",
                profile_ids=["user1"],
                timeframe=Timeframe(type="absolute", start=1000, end=2000),
                filters=None,
                bucket_size="quarter",
            )
