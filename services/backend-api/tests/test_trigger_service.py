"""Unit tests for TriggerService with mocked PostgresRepository."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.common import PaginatedResult
from app.models.trigger import TriggerAction, TriggerCreate, TriggerSetting, TriggerUpdate
from app.repositories.postgres_repo import PostgresRepository
from app.services.trigger_service import TriggerService, ValidationResult


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
    return TriggerService(mock_repo)


def _make_action(type_="webhook", url="https://example.com/hook"):
    return TriggerAction(type=type_, url=url)


def _make_db_row(
    rule_id="rule-1",
    project_id="proj1",
    name="My Trigger",
    description=None,
    dsl="event.count > 5",
    status="draft",
    actions=None,
):
    if actions is None:
        actions = [{"type": "webhook", "enabled": True, "url": "https://example.com/hook",
                     "topic": None, "headers": None, "payload_template": None}]
    now = datetime.now(timezone.utc)
    return {
        "rule_id": rule_id,
        "project_id": project_id,
        "name": name,
        "description": description,
        "dsl": dsl,
        "status": status,
        "actions": actions,
        "created_at": now,
        "updated_at": now,
    }


class TestCreate:
    async def test_creates_trigger_and_returns_setting(self, service, mock_repo):
        mock_repo.fetch_one.return_value = _make_db_row(dsl='GT(EVENT("count"), 5)')
        payload = TriggerCreate(
            name="My Trigger",
            dsl='GT(EVENT("count"), 5)',
            actions=[_make_action()],
        )

        result = await service.create("proj1", payload)

        assert isinstance(result, TriggerSetting)
        assert result.name == "My Trigger"
        assert result.dsl == 'GT(EVENT("count"), 5)'
        assert result.status == "draft"
        assert len(result.actions) == 1
        mock_repo.fetch_one.assert_called_once()
        sql = mock_repo.fetch_one.call_args[0][0]
        assert "INSERT INTO trigger_settings" in sql
        assert "RETURNING" in sql

    async def test_create_validates_dsl(self, service, mock_repo):
        payload = TriggerCreate(
            name="Bad Trigger",
            dsl="  ",
            actions=[_make_action()],
        )

        with pytest.raises(ValueError, match="Invalid DSL"):
            await service.create("proj1", payload)

        mock_repo.fetch_one.assert_not_called()

    async def test_create_generates_uuid_rule_id(self, service, mock_repo):
        mock_repo.fetch_one.return_value = _make_db_row(dsl='GT(EVENT("x"), 1)')
        payload = TriggerCreate(
            name="Trigger",
            dsl='GT(EVENT("x"), 1)',
            actions=[_make_action()],
        )

        await service.create("proj1", payload)

        # The second arg (index 1) should be a UUID string
        call_args = mock_repo.fetch_one.call_args[0]
        rule_id_arg = call_args[1]
        assert len(rule_id_arg) == 36  # UUID format

    async def test_create_serializes_actions_as_json(self, service, mock_repo):
        mock_repo.fetch_one.return_value = _make_db_row(dsl='GT(EVENT("x"), 1)')
        payload = TriggerCreate(
            name="Trigger",
            dsl='GT(EVENT("x"), 1)',
            actions=[_make_action(), TriggerAction(type="notification")],
        )

        await service.create("proj1", payload)

        call_args = mock_repo.fetch_one.call_args[0]
        actions_json = call_args[7]  # 7th positional arg is actions_json
        parsed = json.loads(actions_json)
        assert len(parsed) == 2
        assert parsed[0]["type"] == "webhook"
        assert parsed[1]["type"] == "notification"


class TestGet:
    async def test_returns_trigger_when_found(self, service, mock_repo):
        mock_repo.fetch_one.return_value = _make_db_row(rule_id="r1")

        result = await service.get("proj1", "r1")

        assert result is not None
        assert result.rule_id == "r1"
        sql = mock_repo.fetch_one.call_args[0][0]
        assert "trigger_settings" in sql
        assert mock_repo.fetch_one.call_args[0][1] == "proj1"
        assert mock_repo.fetch_one.call_args[0][2] == "r1"

    async def test_returns_none_when_not_found(self, service, mock_repo):
        mock_repo.fetch_one.return_value = None

        result = await service.get("proj1", "missing")

        assert result is None


class TestList:
    async def test_returns_paginated_result(self, service, mock_repo):
        mock_repo.fetch_count.return_value = 2
        mock_repo.fetch_all.return_value = [
            _make_db_row(rule_id="r1", name="T1"),
            _make_db_row(rule_id="r2", name="T2"),
        ]

        result = await service.list("proj1", page=1, page_size=10)

        assert isinstance(result, PaginatedResult)
        assert result.total == 2
        assert result.page == 1
        assert result.page_size == 10
        assert len(result.items) == 2
        assert result.items[0].rule_id == "r1"
        assert result.items[1].rule_id == "r2"

    async def test_pagination_offset_calculation(self, service, mock_repo):
        mock_repo.fetch_count.return_value = 25
        mock_repo.fetch_all.return_value = []

        await service.list("proj1", page=3, page_size=10)

        call_args = mock_repo.fetch_all.call_args[0]
        assert "LIMIT" in call_args[0]
        assert "OFFSET" in call_args[0]
        assert call_args[2] == 10   # page_size
        assert call_args[3] == 20   # offset = (3-1)*10

    async def test_empty_list(self, service, mock_repo):
        mock_repo.fetch_count.return_value = 0
        mock_repo.fetch_all.return_value = []

        result = await service.list("proj1", page=1, page_size=10)

        assert result.total == 0
        assert result.items == []


class TestUpdate:
    async def test_updates_specified_fields(self, service, mock_repo):
        mock_repo.fetch_one.return_value = _make_db_row(name="Updated")
        payload = TriggerUpdate(name="Updated")

        result = await service.update("proj1", "r1", payload)

        assert result.name == "Updated"
        sql = mock_repo.fetch_one.call_args[0][0]
        assert "UPDATE trigger_settings" in sql
        assert "name = $1" in sql
        assert "updated_at" in sql

    async def test_update_validates_dsl_when_changed(self, service, mock_repo):
        payload = TriggerUpdate(dsl="   ")

        with pytest.raises(ValueError, match="Invalid DSL"):
            await service.update("proj1", "r1", payload)

        mock_repo.fetch_one.assert_not_called()

    async def test_update_skips_dsl_validation_when_not_changed(self, service, mock_repo):
        mock_repo.fetch_one.return_value = _make_db_row(status="active")
        payload = TriggerUpdate(status="active")

        result = await service.update("proj1", "r1", payload)

        assert result.status == "active"

    async def test_update_raises_when_not_found(self, service, mock_repo):
        mock_repo.fetch_one.return_value = None
        payload = TriggerUpdate(name="New Name")

        with pytest.raises(LookupError, match="not found"):
            await service.update("proj1", "r1", payload)

    async def test_update_with_no_fields_returns_existing(self, service, mock_repo):
        mock_repo.fetch_one.return_value = _make_db_row(rule_id="r1")
        payload = TriggerUpdate()

        result = await service.update("proj1", "r1", payload)

        assert result.rule_id == "r1"

    async def test_update_actions_serialized_as_jsonb(self, service, mock_repo):
        mock_repo.fetch_one.return_value = _make_db_row()
        payload = TriggerUpdate(actions=[_make_action(type_="notification")])

        await service.update("proj1", "r1", payload)

        sql = mock_repo.fetch_one.call_args[0][0]
        assert "actions = $1::jsonb" in sql
        actions_arg = mock_repo.fetch_one.call_args[0][1]
        parsed = json.loads(actions_arg)
        assert parsed[0]["type"] == "notification"


class TestDelete:
    async def test_returns_true_when_deleted(self, service, mock_repo):
        mock_repo.execute.return_value = "DELETE 1"

        result = await service.delete("proj1", "r1")

        assert result is True
        sql = mock_repo.execute.call_args[0][0]
        assert "DELETE FROM trigger_settings" in sql
        assert mock_repo.execute.call_args[0][1] == "proj1"
        assert mock_repo.execute.call_args[0][2] == "r1"

    async def test_returns_false_when_not_found(self, service, mock_repo):
        mock_repo.execute.return_value = "DELETE 0"

        result = await service.delete("proj1", "missing")

        assert result is False


class TestValidateDsl:
    def test_valid_simple_expression(self, service):
        result = service.validate_dsl("GT(EVENT(\"count\"), 5)")

        assert result.valid is True
        assert result.errors == []

    def test_empty_string_is_invalid(self, service):
        result = service.validate_dsl("")

        assert result.valid is False
        assert any("empty" in e.lower() for e in result.errors)

    def test_whitespace_only_is_invalid(self, service):
        result = service.validate_dsl("   ")

        assert result.valid is False
        assert any("empty" in e.lower() for e in result.errors)

    def test_exceeds_max_length(self, service):
        result = service.validate_dsl("x" * 10_001)

        assert result.valid is False
        assert any("length" in e.lower() for e in result.errors)

    def test_syntax_error_invalid_expression(self, service):
        result = service.validate_dsl("GT(EVENT(\"count\"), )")

        assert result.valid is False
        assert any("syntax" in e.lower() for e in result.errors)

    def test_valid_nested_expression(self, service):
        result = service.validate_dsl('AND(GT(EVENT("count"), 5), LT(EVENT("age"), 30))')

        assert result.valid is True

    def test_unknown_function_is_invalid(self, service):
        result = service.validate_dsl('FOOBAR(EVENT("x"))')

        assert result.valid is False
        assert any("unknown" in e.lower() for e in result.errors)

    def test_wrong_arg_count_is_invalid(self, service):
        result = service.validate_dsl("GT(1)")

        assert result.valid is False
        assert any("argument" in e.lower() for e in result.errors)

    def test_valid_literal_expression(self, service):
        result = service.validate_dsl("42")

        assert result.valid is True

    def test_returns_validation_result_type(self, service):
        result = service.validate_dsl("true")

        assert isinstance(result, ValidationResult)


class TestRowToTrigger:
    def test_handles_actions_as_list(self, service):
        row = _make_db_row(actions=[{"type": "webhook", "enabled": True, "url": "https://x.com",
                                      "topic": None, "headers": None, "payload_template": None}])

        result = TriggerService._row_to_trigger(row)

        assert len(result.actions) == 1
        assert result.actions[0].type == "webhook"

    def test_handles_actions_as_json_string(self, service):
        actions = [{"type": "notification", "enabled": True, "url": None,
                     "topic": None, "headers": None, "payload_template": None}]
        row = _make_db_row(actions=json.dumps(actions))

        result = TriggerService._row_to_trigger(row)

        assert len(result.actions) == 1
        assert result.actions[0].type == "notification"
