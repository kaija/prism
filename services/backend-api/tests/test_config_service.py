"""Unit tests for ConfigService with mocked PostgresRepository."""

from __future__ import annotations

import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.config import ReportingConfig
from app.repositories.postgres_repo import PostgresRepository
from app.services.config_service import ConfigService


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
    return ConfigService(mock_repo)


class TestGetValue:
    async def test_returns_value_when_found(self, service, mock_repo):
        mock_repo.fetch_one.return_value = {"config_value": "bar"}

        result = await service.get_value("proj1", "foo")

        assert result == "bar"
        mock_repo.fetch_one.assert_called_once()
        call_args = mock_repo.fetch_one.call_args
        assert "project_config" in call_args[0][0]
        assert call_args[0][1] == "proj1"
        assert call_args[0][2] == "foo"

    async def test_returns_none_when_not_found(self, service, mock_repo):
        mock_repo.fetch_one.return_value = None

        result = await service.get_value("proj1", "missing")

        assert result is None


class TestGetAll:
    async def test_returns_dict_of_all_pairs(self, service, mock_repo):
        mock_repo.fetch_all.return_value = [
            {"config_key": "k1", "config_value": "v1"},
            {"config_key": "k2", "config_value": "v2"},
        ]

        result = await service.get_all("proj1")

        assert result == {"k1": "v1", "k2": "v2"}
        call_args = mock_repo.fetch_all.call_args
        assert "project_config" in call_args[0][0]
        assert call_args[0][1] == "proj1"

    async def test_returns_empty_dict_when_no_config(self, service, mock_repo):
        mock_repo.fetch_all.return_value = []

        result = await service.get_all("proj1")

        assert result == {}


class TestSetValue:
    async def test_calls_execute_with_upsert(self, service, mock_repo):
        mock_repo.execute.return_value = "INSERT 0 1"

        await service.set_value("proj1", "key1", "val1")

        mock_repo.execute.assert_called_once()
        sql = mock_repo.execute.call_args[0][0]
        assert "INSERT INTO project_config" in sql
        assert "ON CONFLICT" in sql
        assert "DO UPDATE" in sql
        assert mock_repo.execute.call_args[0][1] == "proj1"
        assert mock_repo.execute.call_args[0][2] == "key1"
        assert mock_repo.execute.call_args[0][3] == "val1"


class TestDeleteValue:
    async def test_returns_true_when_deleted(self, service, mock_repo):
        mock_repo.execute.return_value = "DELETE 1"

        result = await service.delete_value("proj1", "key1")

        assert result is True
        sql = mock_repo.execute.call_args[0][0]
        assert "DELETE FROM project_config" in sql

    async def test_returns_false_when_not_found(self, service, mock_repo):
        mock_repo.execute.return_value = "DELETE 0"

        result = await service.delete_value("proj1", "missing")

        assert result is False


class TestGetReportingConfig:
    async def test_returns_config_from_db(self, service, mock_repo):
        mock_repo.fetch_one.return_value = {
            "config": {
                "default_timeframe": "last_7_days",
                "max_concurrent_reports": 5,
                "default_report_type": "cohort",
            }
        }

        result = await service.get_reporting_config("proj1")

        assert isinstance(result, ReportingConfig)
        assert result.default_timeframe == "last_7_days"
        assert result.max_concurrent_reports == 5
        assert result.default_report_type == "cohort"

    async def test_returns_default_when_no_record(self, service, mock_repo):
        mock_repo.fetch_one.return_value = None

        result = await service.get_reporting_config("proj1")

        assert isinstance(result, ReportingConfig)
        assert result.default_timeframe == "last_30_days"
        assert result.max_concurrent_reports == 3
        assert result.default_report_type == "trend"

    async def test_handles_json_string_config(self, service, mock_repo):
        """Handle case where JSONB is returned as a string."""
        mock_repo.fetch_one.return_value = {
            "config": json.dumps({
                "default_timeframe": "last_14_days",
                "max_concurrent_reports": 10,
                "default_report_type": "attribution",
            })
        }

        result = await service.get_reporting_config("proj1")

        assert result.default_timeframe == "last_14_days"
        assert result.max_concurrent_reports == 10
        assert result.default_report_type == "attribution"


class TestSetReportingConfig:
    async def test_calls_execute_with_upsert(self, service, mock_repo):
        mock_repo.execute.return_value = "INSERT 0 1"
        config = ReportingConfig(
            default_timeframe="last_7_days",
            max_concurrent_reports=5,
            default_report_type="cohort",
        )

        await service.set_reporting_config("proj1", config)

        mock_repo.execute.assert_called_once()
        sql = mock_repo.execute.call_args[0][0]
        assert "INSERT INTO project_reporting_config" in sql
        assert "ON CONFLICT" in sql
        assert "DO UPDATE" in sql
        assert mock_repo.execute.call_args[0][1] == "proj1"
        # Verify the JSON payload
        config_json = mock_repo.execute.call_args[0][2]
        parsed = json.loads(config_json)
        assert parsed["default_timeframe"] == "last_7_days"
        assert parsed["max_concurrent_reports"] == 5
        assert parsed["default_report_type"] == "cohort"

    async def test_persists_default_config(self, service, mock_repo):
        mock_repo.execute.return_value = "INSERT 0 1"
        config = ReportingConfig()

        await service.set_reporting_config("proj1", config)

        config_json = mock_repo.execute.call_args[0][2]
        parsed = json.loads(config_json)
        assert parsed["default_timeframe"] == "last_30_days"
        assert parsed["max_concurrent_reports"] == 3
        assert parsed["default_report_type"] == "trend"
