"""Property-based tests for ConfigService, TriggerService, and JobService.

# Feature: backend-api, Properties 1-6: Config/Trigger/Job CRUD

These tests use an in-memory dict-based mock of PostgresRepository so that
the actual service logic (ConfigService, TriggerService, JobService) is exercised
against a realistic storage simulation rather than simple mock assertions.
"""

from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from hypothesis import given, settings, strategies as st

from app.models.common import PaginatedResult
from app.models.config import ReportingConfig
from app.models.trigger import TriggerAction, TriggerCreate, TriggerSetting
from app.repositories.postgres_repo import PostgresRepository
from app.services.config_service import ConfigService
from app.services.job_service import JobService
from app.services.trigger_service import TriggerService


# ---------------------------------------------------------------------------
# In-memory mock PostgresRepository
# ---------------------------------------------------------------------------


class InMemoryPostgresRepo:
    """A dict-backed mock that simulates PostgresRepository behaviour.

    Supports the project_config and trigger_settings tables used by
    ConfigService and TriggerService.
    """

    def __init__(self) -> None:
        # project_config: keyed by (project_id, config_key)
        self._config: dict[tuple[str, str], str] = {}
        # project_reporting_config: keyed by project_id
        self._reporting_config: dict[str, dict] = {}
        # trigger_settings: keyed by (project_id, rule_id)
        self._triggers: dict[tuple[str, str], dict[str, Any]] = {}
        # jobs: keyed by job_id
        self._jobs: dict[str, dict[str, Any]] = {}

    async def execute(self, query: str, *args: Any) -> str:
        q = query.strip().upper()

        # --- project_config INSERT (upsert) ---
        if "INSERT INTO PROJECT_CONFIG" in q.replace("\n", " ").replace("  ", " "):
            project_id, key, value = args[0], args[1], args[2]
            self._config[(project_id, key)] = value
            return "INSERT 0 1"

        # --- project_config DELETE ---
        if "DELETE FROM PROJECT_CONFIG" in q.replace("\n", " ").replace("  ", " "):
            project_id, key = args[0], args[1]
            if (project_id, key) in self._config:
                del self._config[(project_id, key)]
                return "DELETE 1"
            return "DELETE 0"

        # --- project_reporting_config INSERT (upsert) ---
        if "INSERT INTO PROJECT_REPORTING_CONFIG" in q.replace("\n", " ").replace("  ", " "):
            project_id, config_json = args[0], args[1]
            self._reporting_config[project_id] = json.loads(config_json)
            return "INSERT 0 1"

        # --- trigger_settings DELETE ---
        if "DELETE FROM TRIGGER_SETTINGS" in q.replace("\n", " ").replace("  ", " "):
            project_id, rule_id = args[0], args[1]
            if (project_id, rule_id) in self._triggers:
                del self._triggers[(project_id, rule_id)]
                return "DELETE 1"
            return "DELETE 0"

        # --- jobs INSERT ---
        if "INSERT INTO JOBS" in q.replace("\n", " ").replace("  ", " "):
            job_id, project_id, job_type = args[0], args[1], args[2]
            params_json = args[3]
            now = datetime.now(timezone.utc)
            self._jobs[job_id] = {
                "job_id": job_id,
                "project_id": project_id,
                "job_type": job_type,
                "status": "queued",
                "params": json.loads(params_json),
                "result": None,
                "error": None,
                "created_at": now,
                "started_at": None,
                "completed_at": None,
            }
            return "INSERT 0 1"

        # --- jobs UPDATE ---
        if "UPDATE JOBS" in q.replace("\n", " ").replace("  ", " "):
            now = datetime.now(timezone.utc)
            if "STARTED_AT" in q and "COMPLETED_AT" not in q:
                # status = running: args = (status, job_id)
                status, job_id = args[0], args[1]
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = status
                    self._jobs[job_id]["started_at"] = now
                return "UPDATE 1"
            elif "COMPLETED_AT" in q:
                # status = completed/failed: args = (status, result_json, error, job_id)
                status, result_json, error, job_id = args[0], args[1], args[2], args[3]
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = status
                    self._jobs[job_id]["result"] = json.loads(result_json) if result_json else None
                    self._jobs[job_id]["error"] = error
                    self._jobs[job_id]["completed_at"] = now
                return "UPDATE 1"
            else:
                # generic status update: args = (status, job_id)
                status, job_id = args[0], args[1]
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = status
                return "UPDATE 1"

        return "OK"

    async def fetch_one(self, query: str, *args: Any) -> Optional[dict]:
        q = query.strip().upper()
        normalised = q.replace("\n", " ").replace("  ", " ")

        # --- project_config SELECT single ---
        if "FROM PROJECT_CONFIG" in normalised and "CONFIG_VALUE" in normalised:
            project_id, key = args[0], args[1]
            val = self._config.get((project_id, key))
            if val is None:
                return None
            return {"config_value": val}

        # --- project_reporting_config SELECT ---
        if "FROM PROJECT_REPORTING_CONFIG" in normalised:
            project_id = args[0]
            cfg = self._reporting_config.get(project_id)
            if cfg is None:
                return None
            return {"config": deepcopy(cfg)}

        # --- trigger_settings INSERT RETURNING ---
        if "INSERT INTO TRIGGER_SETTINGS" in normalised and "RETURNING" in normalised:
            rule_id = args[0]
            project_id = args[1]
            now = datetime.now(timezone.utc)
            actions_data = json.loads(args[6])
            row = {
                "rule_id": rule_id,
                "project_id": project_id,
                "name": args[2],
                "description": args[3],
                "dsl": args[4],
                "status": args[5],
                "actions": actions_data,
                "created_at": now,
                "updated_at": now,
            }
            self._triggers[(project_id, rule_id)] = deepcopy(row)
            return deepcopy(row)

        # --- trigger_settings SELECT single ---
        if normalised.startswith("SELECT") and "FROM TRIGGER_SETTINGS" in normalised and "RULE_ID = " in normalised:
            project_id, rule_id = args[0], args[1]
            row = self._triggers.get((project_id, rule_id))
            if row is None:
                return None
            return deepcopy(row)

        # --- jobs SELECT single ---
        if "FROM JOBS" in normalised and "JOB_ID" in normalised:
            job_id = args[0]
            row = self._jobs.get(job_id)
            if row is None:
                return None
            return deepcopy(row)

        return None

    async def fetch_all(self, query: str, *args: Any) -> list[dict]:
        q = query.strip().upper()
        normalised = q.replace("\n", " ").replace("  ", " ")

        # --- project_config SELECT all ---
        if "FROM PROJECT_CONFIG" in normalised and "CONFIG_KEY" in normalised:
            project_id = args[0]
            return [
                {"config_key": k, "config_value": v}
                for (pid, k), v in self._config.items()
                if pid == project_id
            ]

        # --- trigger_settings SELECT list ---
        if "FROM TRIGGER_SETTINGS" in normalised and "LIMIT" in normalised:
            project_id = args[0]
            page_size = args[1]
            offset = args[2]
            items = [
                deepcopy(row)
                for (pid, _), row in self._triggers.items()
                if pid == project_id
            ]
            # Sort by created_at DESC to match the service query
            items.sort(key=lambda r: r["created_at"], reverse=True)
            return items[offset : offset + page_size]

        return []

    async def fetch_count(self, query: str, *args: Any) -> int:
        q = query.strip().upper()
        normalised = q.replace("\n", " ").replace("  ", " ")

        if "FROM TRIGGER_SETTINGS" in normalised:
            project_id = args[0]
            return sum(1 for (pid, _) in self._triggers if pid == project_id)

        return 0


# ---------------------------------------------------------------------------
# Hypothesis strategies
# ---------------------------------------------------------------------------

# Project IDs: 1-20 char alphanumeric
project_id_strategy = st.from_regex(r"[a-z][a-z0-9]{0,19}", fullmatch=True)

# Config keys: 1-255 chars, alphanumeric + underscore (matching Req 1 key constraints)
config_key_strategy = st.from_regex(r"[a-zA-Z][a-zA-Z0-9_]{0,49}", fullmatch=True)

# Config values: arbitrary non-empty strings
config_value_strategy = st.text(min_size=1, max_size=200)

# Trigger names: 1-255 chars
trigger_name_strategy = st.text(
    min_size=1, max_size=50,
    alphabet=st.characters(whitelist_categories=("L", "N", "Zs"), whitelist_characters="_-"),
).filter(lambda s: s.strip())

# DSL expressions: valid balanced expressions
dsl_strategy = st.from_regex(r"[a-z][a-z0-9_.]{0,29} [><=!]+ [0-9]{1,5}", fullmatch=True)

# Trigger status
trigger_status_strategy = st.sampled_from(["active", "inactive", "draft"])

# Trigger actions: 1-3 webhook actions
trigger_action_strategy = st.just(
    TriggerAction(type="webhook", url="https://example.com/hook")
)

trigger_actions_strategy = st.lists(trigger_action_strategy, min_size=1, max_size=3)

# Full TriggerCreate payload
trigger_create_strategy = st.builds(
    TriggerCreate,
    name=trigger_name_strategy,
    description=st.one_of(st.none(), st.text(min_size=1, max_size=100)),
    dsl=dsl_strategy,
    status=trigger_status_strategy,
    actions=trigger_actions_strategy,
)


# ---------------------------------------------------------------------------
# Property 1: Config CRUD Round-Trip
# **Validates: Requirements 1.1, 1.2, 1.5, 2.1, 2.2**
# ---------------------------------------------------------------------------


class TestConfigCRUDRoundTrip:
    """Property 1: For any project_id, key, and value, after persisting a
    key-value pair via set_value, a subsequent get_value for that key should
    return the same value. Additionally, get_all should return a superset
    containing that key-value pair."""

    @given(
        project_id=project_id_strategy,
        key=config_key_strategy,
        value=config_value_strategy,
    )
    @settings(max_examples=100)
    async def test_set_then_get_returns_same_value(
        self, project_id: str, key: str, value: str
    ):
        """After set_value(project_id, key, value), get_value(project_id, key)
        must return exactly value.

        **Validates: Requirements 1.1, 1.2**
        """
        repo = InMemoryPostgresRepo()
        svc = ConfigService(repo)

        await svc.set_value(project_id, key, value)
        result = await svc.get_value(project_id, key)

        assert result == value, (
            f"Expected get_value to return {value!r}, got {result!r}"
        )

    @given(
        project_id=project_id_strategy,
        key=config_key_strategy,
        value=config_value_strategy,
    )
    @settings(max_examples=100)
    async def test_set_then_get_all_contains_pair(
        self, project_id: str, key: str, value: str
    ):
        """After set_value(project_id, key, value), get_all(project_id)
        must return a dict containing {key: value}.

        **Validates: Requirements 1.5**
        """
        repo = InMemoryPostgresRepo()
        svc = ConfigService(repo)

        await svc.set_value(project_id, key, value)
        all_config = await svc.get_all(project_id)

        assert key in all_config, (
            f"Expected key {key!r} in get_all result, got keys: {list(all_config.keys())}"
        )
        assert all_config[key] == value, (
            f"Expected all_config[{key!r}] == {value!r}, got {all_config[key]!r}"
        )

    @given(
        project_id=project_id_strategy,
        key=config_key_strategy,
        value1=config_value_strategy,
        value2=config_value_strategy,
    )
    @settings(max_examples=100)
    async def test_upsert_overwrites_previous_value(
        self, project_id: str, key: str, value1: str, value2: str
    ):
        """Setting the same key twice should overwrite: get_value returns
        the latest value.

        **Validates: Requirements 1.1, 1.2**
        """
        repo = InMemoryPostgresRepo()
        svc = ConfigService(repo)

        await svc.set_value(project_id, key, value1)
        await svc.set_value(project_id, key, value2)
        result = await svc.get_value(project_id, key)

        assert result == value2, (
            f"Expected get_value to return latest value {value2!r}, got {result!r}"
        )

    @given(
        project_id=project_id_strategy,
        config=st.builds(
            ReportingConfig,
            default_timeframe=st.sampled_from(["last_7_days", "last_30_days", "last_90_days"]),
            max_concurrent_reports=st.integers(min_value=1, max_value=20),
            default_report_type=st.sampled_from(["trend", "attribution", "cohort"]),
        ),
    )
    @settings(max_examples=100)
    async def test_reporting_config_round_trip(
        self, project_id: str, config: ReportingConfig
    ):
        """After set_reporting_config, get_reporting_config must return
        an equivalent ReportingConfig.

        **Validates: Requirements 2.1, 2.2**
        """
        repo = InMemoryPostgresRepo()
        svc = ConfigService(repo)

        await svc.set_reporting_config(project_id, config)
        result = await svc.get_reporting_config(project_id)

        assert result.default_timeframe == config.default_timeframe
        assert result.max_concurrent_reports == config.max_concurrent_reports
        assert result.default_report_type == config.default_report_type


# ---------------------------------------------------------------------------
# Property 2: Resource Deletion Removes Access
# **Validates: Requirements 1.4, 3.5**
# ---------------------------------------------------------------------------


class TestResourceDeletionRemovesAccess:
    """Property 2: For any project_id and resource that exists, after delete,
    a subsequent get should return None/False."""

    @given(
        project_id=project_id_strategy,
        key=config_key_strategy,
        value=config_value_strategy,
    )
    @settings(max_examples=100)
    async def test_config_delete_then_get_returns_none(
        self, project_id: str, key: str, value: str
    ):
        """After set_value then delete_value, get_value must return None.

        **Validates: Requirements 1.4**
        """
        repo = InMemoryPostgresRepo()
        svc = ConfigService(repo)

        await svc.set_value(project_id, key, value)
        deleted = await svc.delete_value(project_id, key)
        assert deleted is True

        result = await svc.get_value(project_id, key)
        assert result is None, (
            f"Expected None after deletion, got {result!r}"
        )

    @given(
        project_id=project_id_strategy,
        key=config_key_strategy,
        value=config_value_strategy,
    )
    @settings(max_examples=100)
    async def test_config_delete_removes_from_get_all(
        self, project_id: str, key: str, value: str
    ):
        """After set_value then delete_value, get_all must not contain the key.

        **Validates: Requirements 1.4**
        """
        repo = InMemoryPostgresRepo()
        svc = ConfigService(repo)

        await svc.set_value(project_id, key, value)
        await svc.delete_value(project_id, key)
        all_config = await svc.get_all(project_id)

        assert key not in all_config, (
            f"Expected key {key!r} to be absent after deletion, "
            f"but found in get_all: {all_config}"
        )

    @given(
        project_id=project_id_strategy,
        payload=trigger_create_strategy,
    )
    @settings(max_examples=100)
    async def test_trigger_delete_then_get_returns_none(
        self, project_id: str, payload: TriggerCreate
    ):
        """After creating a trigger then deleting it, get must return None.

        **Validates: Requirements 3.5**
        """
        repo = InMemoryPostgresRepo()
        svc = TriggerService(repo)

        created = await svc.create(project_id, payload)
        deleted = await svc.delete(project_id, created.rule_id)
        assert deleted is True

        result = await svc.get(project_id, created.rule_id)
        assert result is None, (
            f"Expected None after trigger deletion, got {result!r}"
        )


# ---------------------------------------------------------------------------
# Property 3: Trigger CRUD Round-Trip
# **Validates: Requirements 3.1, 3.2, 3.4**
# ---------------------------------------------------------------------------


class TestTriggerCRUDRoundTrip:
    """Property 3: For any valid trigger setting, after creating it, a
    subsequent get by rule_id should return a trigger with matching name,
    dsl, status, and actions."""

    @given(
        project_id=project_id_strategy,
        payload=trigger_create_strategy,
    )
    @settings(max_examples=100)
    async def test_create_then_get_returns_matching_fields(
        self, project_id: str, payload: TriggerCreate
    ):
        """After create(project_id, payload), get(project_id, rule_id) must
        return a TriggerSetting with matching name, dsl, status, and actions.

        **Validates: Requirements 3.1, 3.2**
        """
        repo = InMemoryPostgresRepo()
        svc = TriggerService(repo)

        created = await svc.create(project_id, payload)

        # Verify the created result itself
        assert created.name == payload.name
        assert created.dsl == payload.dsl
        assert created.status == payload.status
        assert created.project_id == project_id
        assert created.rule_id  # non-empty

        # Now fetch it back
        fetched = await svc.get(project_id, created.rule_id)
        assert fetched is not None, "get() returned None for just-created trigger"

        assert fetched.name == payload.name
        assert fetched.dsl == payload.dsl
        assert fetched.status == payload.status
        assert fetched.project_id == project_id
        assert fetched.rule_id == created.rule_id
        assert len(fetched.actions) == len(payload.actions)
        for i, action in enumerate(fetched.actions):
            assert action.type == payload.actions[i].type

    @given(
        project_id=project_id_strategy,
        payload=trigger_create_strategy,
    )
    @settings(max_examples=100)
    async def test_created_trigger_has_valid_rule_id(
        self, project_id: str, payload: TriggerCreate
    ):
        """The created trigger must have a non-empty rule_id (UUID format).

        **Validates: Requirements 3.1**
        """
        repo = InMemoryPostgresRepo()
        svc = TriggerService(repo)

        created = await svc.create(project_id, payload)

        assert created.rule_id is not None
        assert len(created.rule_id) == 36  # UUID format: 8-4-4-4-12

    @given(
        project_id=project_id_strategy,
        payload=trigger_create_strategy,
    )
    @settings(max_examples=100)
    async def test_created_trigger_has_timestamps(
        self, project_id: str, payload: TriggerCreate
    ):
        """The created trigger must have created_at and updated_at timestamps.

        **Validates: Requirements 3.1**
        """
        repo = InMemoryPostgresRepo()
        svc = TriggerService(repo)

        created = await svc.create(project_id, payload)

        assert created.created_at is not None
        assert created.updated_at is not None


# ---------------------------------------------------------------------------
# Property 4: Trigger List Completeness
# **Validates: Requirements 3.3**
# ---------------------------------------------------------------------------


class TestTriggerListCompleteness:
    """Property 4: For any set of N triggers created for a project, listing
    all triggers should return exactly N triggers."""

    @given(
        project_id=project_id_strategy,
        payloads=st.lists(trigger_create_strategy, min_size=1, max_size=10),
    )
    @settings(max_examples=100)
    async def test_list_returns_exact_count(
        self, project_id: str, payloads: list[TriggerCreate]
    ):
        """After creating N triggers, list() total must equal N.

        **Validates: Requirements 3.3**
        """
        repo = InMemoryPostgresRepo()
        svc = TriggerService(repo)

        created_ids = set()
        for payload in payloads:
            created = await svc.create(project_id, payload)
            created_ids.add(created.rule_id)

        n = len(payloads)
        result = await svc.list(project_id, page=1, page_size=max(n, 10))

        assert result.total == n, (
            f"Expected total={n}, got {result.total}"
        )

    @given(
        project_id=project_id_strategy,
        payloads=st.lists(trigger_create_strategy, min_size=1, max_size=10),
    )
    @settings(max_examples=100)
    async def test_list_returns_all_rule_ids(
        self, project_id: str, payloads: list[TriggerCreate]
    ):
        """After creating N triggers, listing all should return all rule_ids.

        **Validates: Requirements 3.3**
        """
        repo = InMemoryPostgresRepo()
        svc = TriggerService(repo)

        created_ids = set()
        for payload in payloads:
            created = await svc.create(project_id, payload)
            created_ids.add(created.rule_id)

        n = len(payloads)
        result = await svc.list(project_id, page=1, page_size=max(n, 10))

        returned_ids = {item.rule_id for item in result.items}
        assert returned_ids == created_ids, (
            f"Expected rule_ids {created_ids}, got {returned_ids}"
        )

    @given(
        project_id=project_id_strategy,
        payloads=st.lists(trigger_create_strategy, min_size=3, max_size=10),
    )
    @settings(max_examples=100)
    async def test_paginated_list_covers_all_triggers(
        self, project_id: str, payloads: list[TriggerCreate]
    ):
        """Paginating through all pages should yield all created triggers.

        **Validates: Requirements 3.3**
        """
        repo = InMemoryPostgresRepo()
        svc = TriggerService(repo)

        created_ids = set()
        for payload in payloads:
            created = await svc.create(project_id, payload)
            created_ids.add(created.rule_id)

        n = len(payloads)
        page_size = 3
        all_returned_ids = set()
        page = 1

        while True:
            result = await svc.list(project_id, page=page, page_size=page_size)
            for item in result.items:
                all_returned_ids.add(item.rule_id)
            if page * page_size >= result.total:
                break
            page += 1

        assert all_returned_ids == created_ids, (
            f"Paginated listing missed some triggers. "
            f"Expected {created_ids}, got {all_returned_ids}"
        )

# ---------------------------------------------------------------------------
# Property 5: Concurrency Limiter Invariant
# Feature: backend-api, Property 5: Concurrency Limiter Invariant
# ---------------------------------------------------------------------------

import asyncio

from app.infra.concurrency_limiter import ConcurrencyLimiter


class TestConcurrencyLimiterInvariant:
    """Property 5: Concurrency Limiter Invariant.

    For any concurrency limiter with per-project max P and global max G,
    the number of concurrently running tasks for any single project should
    never exceed P, and the total number of concurrently running tasks across
    all projects should never exceed G. After a task completes and releases
    its slot, the available count should increase by one.

    **Validates: Requirements 4.1, 4.2, 4.3**
    """

    @given(
        per_project_max=st.integers(min_value=1, max_value=10),
        global_max=st.integers(min_value=1, max_value=20),
        num_projects=st.integers(min_value=1, max_value=5),
        tasks_per_project=st.integers(min_value=1, max_value=10),
    )
    @settings(max_examples=100)
    async def test_concurrent_tasks_never_exceed_limits(
        self,
        per_project_max: int,
        global_max: int,
        num_projects: int,
        tasks_per_project: int,
    ):
        """Concurrent running tasks never exceed per-project or global limits.

        **Validates: Requirements 4.1, 4.2, 4.3**
        """
        limiter = ConcurrencyLimiter(
            per_project_max=per_project_max, global_max=global_max
        )

        project_ids = [f"proj_{i}" for i in range(num_projects)]

        # Track concurrent running counts
        project_running: dict[str, int] = {pid: 0 for pid in project_ids}
        global_running = 0
        violations: list[str] = []

        async def run_task(project_id: str) -> None:
            nonlocal global_running

            await limiter.acquire(project_id)

            # Record that this task is now running
            project_running[project_id] += 1
            global_running += 1

            # Check invariants at the moment of acquisition
            if project_running[project_id] > per_project_max:
                violations.append(
                    f"Project {project_id}: {project_running[project_id]} running > "
                    f"per_project_max {per_project_max}"
                )
            if global_running > global_max:
                violations.append(
                    f"Global: {global_running} running > global_max {global_max}"
                )

            # Simulate some work — yield control so other tasks can interleave
            await asyncio.sleep(0)

            # Release
            project_running[project_id] -= 1
            global_running -= 1
            limiter.release(project_id)

        # Launch all tasks concurrently
        tasks = []
        for pid in project_ids:
            for _ in range(tasks_per_project):
                tasks.append(run_task(pid))

        await asyncio.gather(*tasks)

        assert not violations, (
            f"Concurrency violations detected:\n" + "\n".join(violations)
        )

        # After all tasks complete, all slots should be fully available
        for pid in project_ids:
            assert limiter.get_project_available(pid) == per_project_max, (
                f"Project {pid} available slots should be {per_project_max} "
                f"after all tasks complete, got {limiter.get_project_available(pid)}"
            )
        assert limiter.get_global_available() == global_max, (
            f"Global available slots should be {global_max} after all tasks "
            f"complete, got {limiter.get_global_available()}"
        )

    @given(
        per_project_max=st.integers(min_value=1, max_value=10),
        global_max=st.integers(min_value=1, max_value=20),
        project_id=st.text(
            alphabet=st.characters(whitelist_categories=("L", "N")),
            min_size=1,
            max_size=20,
        ),
    )
    @settings(max_examples=100)
    async def test_release_increases_available_by_one(
        self,
        per_project_max: int,
        global_max: int,
        project_id: str,
    ):
        """After a task completes and releases its slot, available count increases by one.

        **Validates: Requirements 4.3**
        """
        limiter = ConcurrencyLimiter(
            per_project_max=per_project_max, global_max=global_max
        )

        await limiter.acquire(project_id)

        project_avail_before = limiter.get_project_available(project_id)
        global_avail_before = limiter.get_global_available()

        limiter.release(project_id)

        assert limiter.get_project_available(project_id) == project_avail_before + 1, (
            f"Project available should increase by 1 after release: "
            f"was {project_avail_before}, now {limiter.get_project_available(project_id)}"
        )
        assert limiter.get_global_available() == global_avail_before + 1, (
            f"Global available should increase by 1 after release: "
            f"was {global_avail_before}, now {limiter.get_global_available()}"
        )


# ---------------------------------------------------------------------------
# Property 6: Job Lifecycle Round-Trip
# Feature: backend-api, Property 6: Job Lifecycle Round-Trip
# ---------------------------------------------------------------------------

# Strategies for job-related inputs
job_type_strategy = st.sampled_from(["trend", "attribution", "cohort"])

job_params_strategy = st.fixed_dictionaries(
    {"timeframe": st.sampled_from(["last_7_days", "last_30_days", "last_90_days"])},
    optional={
        "events": st.lists(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("L", "N"))), min_size=1, max_size=5),
        "group_by": st.lists(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("L",))), min_size=1, max_size=3),
    },
)

VALID_JOB_STATUSES = {"queued", "running", "completed", "failed"}


class TestJobLifecycleRoundTrip:
    """Property 6: Job Lifecycle Round-Trip.

    For any valid report request, submitting it should create a job with
    status "queued" and return a job_id. Querying that job_id should return
    a status in {"queued", "running", "completed", "failed"}. If the job
    completes successfully, the result should be non-null.

    **Validates: Requirements 4.4, 13.1, 13.2**
    """

    @given(
        project_id=project_id_strategy,
        job_type=job_type_strategy,
        params=job_params_strategy,
    )
    @settings(max_examples=100)
    async def test_create_job_returns_valid_uuid_and_queued_status(
        self, project_id: str, job_type: str, params: dict
    ):
        """Creating a job returns a valid UUID job_id and initial status is 'queued'.

        **Validates: Requirements 13.1**
        """
        repo = InMemoryPostgresRepo()
        svc = JobService(repo)

        job_id = await svc.create_job(project_id, job_type, params)

        # job_id must be a valid UUID (36 chars: 8-4-4-4-12)
        assert isinstance(job_id, str)
        assert len(job_id) == 36

        # Querying the job should return status "queued"
        status = await svc.get_status(job_id)
        assert status is not None, "get_status returned None for just-created job"
        assert status.job_id == job_id
        assert status.status == "queued"
        assert status.created_at is not None
        assert status.result is None
        assert status.error is None

    @given(
        project_id=project_id_strategy,
        job_type=job_type_strategy,
        params=job_params_strategy,
    )
    @settings(max_examples=100)
    async def test_queried_status_is_always_valid(
        self, project_id: str, job_type: str, params: dict
    ):
        """Querying a job_id always returns a status in the valid set.

        **Validates: Requirements 4.4, 13.2**
        """
        repo = InMemoryPostgresRepo()
        svc = JobService(repo)

        job_id = await svc.create_job(project_id, job_type, params)

        # Check status at each transition point
        status = await svc.get_status(job_id)
        assert status is not None
        assert status.status in VALID_JOB_STATUSES

        await svc.update_status(job_id, "running")
        status = await svc.get_status(job_id)
        assert status is not None
        assert status.status in VALID_JOB_STATUSES
        assert status.status == "running"

    @given(
        project_id=project_id_strategy,
        job_type=job_type_strategy,
        params=job_params_strategy,
        result_data=st.fixed_dictionaries(
            {"data": st.lists(st.integers(min_value=0, max_value=1000), min_size=1, max_size=5)},
        ),
    )
    @settings(max_examples=100)
    async def test_completed_job_has_non_null_result(
        self, project_id: str, job_type: str, params: dict, result_data: dict
    ):
        """A job that transitions queued → running → completed has non-null result.

        **Validates: Requirements 4.4, 13.2**
        """
        repo = InMemoryPostgresRepo()
        svc = JobService(repo)

        job_id = await svc.create_job(project_id, job_type, params)
        await svc.update_status(job_id, "running")
        await svc.update_status(job_id, "completed", result=result_data)

        status = await svc.get_status(job_id)
        assert status is not None
        assert status.status == "completed"
        assert status.result is not None
        assert status.result == result_data
        assert status.started_at is not None
        assert status.completed_at is not None

    @given(
        project_id=project_id_strategy,
        job_type=job_type_strategy,
        params=job_params_strategy,
        error_msg=st.text(min_size=1, max_size=200),
    )
    @settings(max_examples=100)
    async def test_failed_job_has_error_details(
        self, project_id: str, job_type: str, params: dict, error_msg: str
    ):
        """A job that transitions queued → running → failed has error details.

        **Validates: Requirements 4.4, 13.2**
        """
        repo = InMemoryPostgresRepo()
        svc = JobService(repo)

        job_id = await svc.create_job(project_id, job_type, params)
        await svc.update_status(job_id, "running")
        await svc.update_status(job_id, "failed", error=error_msg)

        status = await svc.get_status(job_id)
        assert status is not None
        assert status.status == "failed"
        assert status.error is not None
        assert status.error == error_msg
        assert status.started_at is not None
        assert status.completed_at is not None

    @given(
        project_id=project_id_strategy,
        job_type=job_type_strategy,
        params=job_params_strategy,
    )
    @settings(max_examples=100)
    async def test_nonexistent_job_returns_none(
        self, project_id: str, job_type: str, params: dict
    ):
        """Querying a job_id that was never created returns None.

        **Validates: Requirements 4.4, 13.2**
        """
        repo = InMemoryPostgresRepo()
        svc = JobService(repo)

        # Query a random UUID that was never created
        import uuid
        fake_id = str(uuid.uuid4())
        status = await svc.get_status(fake_id)
        assert status is None
