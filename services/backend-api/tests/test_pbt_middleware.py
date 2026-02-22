"""Property-based tests for RequestLogMiddleware.

# Feature: backend-api, Property 14: Request Logging Persistence

For any API request processed by the Backend_API, after the response is sent,
the request_logs table should contain a record with matching method, path,
and status_code.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from hypothesis import given, settings, strategies as st

from app.middleware.request_log import INSERT_LOG_SQL, RequestLogMiddleware

# ---------------------------------------------------------------------------
# Hypothesis strategies
# ---------------------------------------------------------------------------

http_method_strategy = st.sampled_from(["GET", "POST", "PUT", "DELETE"])

# Project-scoped paths like /api/v1/projects/{id}/config
_project_id_strategy = st.from_regex(r"[a-z][a-z0-9\-]{0,19}", fullmatch=True)
_sub_resource_strategy = st.sampled_from([
    "/config", "/triggers", "/reports", "/jobs", "/summary",
])
project_path_strategy = st.builds(
    lambda pid, sub: f"/api/v1/projects/{pid}{sub}",
    pid=_project_id_strategy,
    sub=_sub_resource_strategy,
)

# Non-project paths
non_project_path_strategy = st.sampled_from([
    "/health", "/readiness", "/api/v1/status", "/metrics",
])

# Combined path strategy: mix of project-scoped and non-project paths
path_strategy = st.one_of(project_path_strategy, non_project_path_strategy)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_app(pg_repo: MagicMock) -> FastAPI:
    """Build a minimal FastAPI app with RequestLogMiddleware and a catch-all route."""
    app = FastAPI()
    app.add_middleware(RequestLogMiddleware)
    app.state.pg_repo = pg_repo

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def _catch_all(full_path: str):
        return {"ok": True}

    return app


def _mock_pg_repo() -> MagicMock:
    repo = MagicMock()
    repo.execute = AsyncMock()
    return repo


# ---------------------------------------------------------------------------
# Property 14: Request Logging Persistence
# **Validates: Requirements 12.1**
# ---------------------------------------------------------------------------


class TestRequestLoggingPersistence:
    """Property 14: Request Logging Persistence.

    For any API request processed by the Backend_API, after the response is
    sent, the request_logs table should contain a record with matching method,
    path, and status_code.

    **Validates: Requirements 12.1**
    """

    @given(method=http_method_strategy, path=path_strategy)
    @settings(max_examples=100)
    async def test_request_log_persists_matching_method_path_status(
        self, method: str, path: str
    ):
        """After any API request, pg_repo.execute is called with an INSERT
        into request_logs containing the correct method, path, and status_code.

        **Validates: Requirements 12.1**
        """
        pg_repo = _mock_pg_repo()
        app = _build_app(pg_repo)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.request(method, path)

        # Give the fire-and-forget task time to complete
        await asyncio.sleep(0.05)

        # The middleware must have called pg_repo.execute exactly once
        pg_repo.execute.assert_called_once()

        call_args = pg_repo.execute.call_args[0]
        logged_sql = call_args[0]
        logged_project_id = call_args[1]
        logged_method = call_args[2]
        logged_path = call_args[3]
        logged_status_code = call_args[4]
        logged_duration_ms = call_args[5]

        # SQL must be the INSERT statement
        assert logged_sql == INSERT_LOG_SQL

        # Method must match the request method
        assert logged_method == method, (
            f"Expected method {method!r}, got {logged_method!r}"
        )

        # Path must match the request path
        assert logged_path == path, (
            f"Expected path {path!r}, got {logged_path!r}"
        )

        # Status code must be 200 (our catch-all returns 200)
        assert logged_status_code == resp.status_code, (
            f"Expected status_code {resp.status_code}, got {logged_status_code}"
        )

        # Duration must be a non-negative float
        assert isinstance(logged_duration_ms, float)
        assert logged_duration_ms >= 0

    @given(method=http_method_strategy, path=project_path_strategy)
    @settings(max_examples=100)
    async def test_project_scoped_request_extracts_project_id(
        self, method: str, path: str
    ):
        """For project-scoped paths, the logged project_id must match the
        project ID extracted from the URL path.

        **Validates: Requirements 12.1**
        """
        pg_repo = _mock_pg_repo()
        app = _build_app(pg_repo)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.request(method, path)

        await asyncio.sleep(0.05)

        pg_repo.execute.assert_called_once()
        call_args = pg_repo.execute.call_args[0]
        logged_project_id = call_args[1]

        # Extract expected project_id from the path
        # Path format: /api/v1/projects/{project_id}/...
        parts = path.split("/")
        # ['', 'api', 'v1', 'projects', '{project_id}', ...]
        expected_project_id = parts[4]

        assert logged_project_id == expected_project_id, (
            f"Expected project_id {expected_project_id!r}, got {logged_project_id!r}"
        )

    @given(method=http_method_strategy, path=non_project_path_strategy)
    @settings(max_examples=100)
    async def test_non_project_request_logs_null_project_id(
        self, method: str, path: str
    ):
        """For non-project paths, the logged project_id must be None.

        **Validates: Requirements 12.1**
        """
        pg_repo = _mock_pg_repo()
        app = _build_app(pg_repo)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.request(method, path)

        await asyncio.sleep(0.05)

        pg_repo.execute.assert_called_once()
        call_args = pg_repo.execute.call_args[0]
        logged_project_id = call_args[1]

        assert logged_project_id is None, (
            f"Expected project_id None for non-project path {path!r}, "
            f"got {logged_project_id!r}"
        )


# ---------------------------------------------------------------------------
# Property 15: Multi-Tenant Isolation
# Feature: backend-api, Property 15: Multi-Tenant Isolation
# ---------------------------------------------------------------------------

from tests.test_pbt_services import (
    InMemoryPostgresRepo,
    config_key_strategy,
    config_value_strategy,
    project_id_strategy,
    trigger_create_strategy,
)
from app.services.config_service import ConfigService
from app.services.trigger_service import TriggerService


# Strategy for two distinct project_ids
distinct_project_ids = st.tuples(
    project_id_strategy, project_id_strategy
).filter(lambda pair: pair[0] != pair[1])


class TestMultiTenantIsolation:
    """Property 15: Multi-Tenant Isolation.

    For any two distinct project_ids with separate data, a query scoped to
    one project_id should never return data belonging to the other project_id.

    **Validates: Requirements 15.4**
    """

    @given(
        project_ids=distinct_project_ids,
        key=config_key_strategy,
        value_a=config_value_strategy,
        value_b=config_value_strategy,
    )
    @settings(max_examples=100)
    async def test_config_get_value_isolated_between_projects(
        self, project_ids: tuple[str, str], key: str, value_a: str, value_b: str
    ):
        """After storing a config value for project A and a different value
        for project B under the same key, get_value for each project returns
        only its own value.

        **Validates: Requirements 15.4**
        """
        pid_a, pid_b = project_ids
        repo = InMemoryPostgresRepo()
        svc = ConfigService(repo)

        await svc.set_value(pid_a, key, value_a)
        await svc.set_value(pid_b, key, value_b)

        result_a = await svc.get_value(pid_a, key)
        result_b = await svc.get_value(pid_b, key)

        assert result_a == value_a, (
            f"Project A ({pid_a}) got {result_a!r}, expected {value_a!r}"
        )
        assert result_b == value_b, (
            f"Project B ({pid_b}) got {result_b!r}, expected {value_b!r}"
        )

    @given(
        project_ids=distinct_project_ids,
        keys_a=st.lists(config_key_strategy, min_size=1, max_size=5, unique=True),
        keys_b=st.lists(config_key_strategy, min_size=1, max_size=5, unique=True),
    )
    @settings(max_examples=100)
    async def test_config_get_all_isolated_between_projects(
        self,
        project_ids: tuple[str, str],
        keys_a: list[str],
        keys_b: list[str],
    ):
        """get_all for project A returns only project A's keys, never
        project B's keys (and vice versa).

        **Validates: Requirements 15.4**
        """
        pid_a, pid_b = project_ids
        repo = InMemoryPostgresRepo()
        svc = ConfigService(repo)

        for k in keys_a:
            await svc.set_value(pid_a, k, f"val_a_{k}")
        for k in keys_b:
            await svc.set_value(pid_b, k, f"val_b_{k}")

        all_a = await svc.get_all(pid_a)
        all_b = await svc.get_all(pid_b)

        # Keys unique to project B must not appear in project A's result
        keys_only_b = set(keys_b) - set(keys_a)
        for k in keys_only_b:
            assert k not in all_a, (
                f"Project A's get_all contains key {k!r} that belongs only to project B"
            )

        # Keys unique to project A must not appear in project B's result
        keys_only_a = set(keys_a) - set(keys_b)
        for k in keys_only_a:
            assert k not in all_b, (
                f"Project B's get_all contains key {k!r} that belongs only to project A"
            )

        # Values for shared keys must be project-specific
        for k in set(keys_a) & set(keys_b):
            assert all_a[k] == f"val_a_{k}", (
                f"Project A's value for shared key {k!r} is wrong: {all_a[k]!r}"
            )
            assert all_b[k] == f"val_b_{k}", (
                f"Project B's value for shared key {k!r} is wrong: {all_b[k]!r}"
            )

    @given(
        project_ids=distinct_project_ids,
        payload_a=trigger_create_strategy,
        payload_b=trigger_create_strategy,
    )
    @settings(max_examples=100)
    async def test_trigger_get_isolated_between_projects(
        self,
        project_ids: tuple[str, str],
        payload_a,
        payload_b,
    ):
        """A trigger created for project A cannot be retrieved via
        get(project_b, rule_id).

        **Validates: Requirements 15.4**
        """
        pid_a, pid_b = project_ids
        repo = InMemoryPostgresRepo()
        svc = TriggerService(repo)

        created_a = await svc.create(pid_a, payload_a)
        created_b = await svc.create(pid_b, payload_b)

        # Project A's trigger must not be visible to project B
        cross_a = await svc.get(pid_b, created_a.rule_id)
        assert cross_a is None, (
            f"Project B retrieved project A's trigger {created_a.rule_id}"
        )

        # Project B's trigger must not be visible to project A
        cross_b = await svc.get(pid_a, created_b.rule_id)
        assert cross_b is None, (
            f"Project A retrieved project B's trigger {created_b.rule_id}"
        )

    @given(
        project_ids=distinct_project_ids,
        payloads_a=st.lists(trigger_create_strategy, min_size=1, max_size=5),
        payloads_b=st.lists(trigger_create_strategy, min_size=1, max_size=5),
    )
    @settings(max_examples=100)
    async def test_trigger_list_isolated_between_projects(
        self,
        project_ids: tuple[str, str],
        payloads_a: list,
        payloads_b: list,
    ):
        """Listing triggers for project A returns only project A's triggers,
        never project B's (and vice versa).

        **Validates: Requirements 15.4**
        """
        pid_a, pid_b = project_ids
        repo = InMemoryPostgresRepo()
        svc = TriggerService(repo)

        ids_a = set()
        for p in payloads_a:
            created = await svc.create(pid_a, p)
            ids_a.add(created.rule_id)

        ids_b = set()
        for p in payloads_b:
            created = await svc.create(pid_b, p)
            ids_b.add(created.rule_id)

        page_size = max(len(payloads_a), len(payloads_b), 10)

        list_a = await svc.list(pid_a, page=1, page_size=page_size)
        list_b = await svc.list(pid_b, page=1, page_size=page_size)

        returned_ids_a = {t.rule_id for t in list_a.items}
        returned_ids_b = {t.rule_id for t in list_b.items}

        # Project A's list must contain exactly its own triggers
        assert returned_ids_a == ids_a, (
            f"Project A list mismatch: expected {ids_a}, got {returned_ids_a}"
        )

        # Project B's list must contain exactly its own triggers
        assert returned_ids_b == ids_b, (
            f"Project B list mismatch: expected {ids_b}, got {returned_ids_b}"
        )

        # No overlap
        assert returned_ids_a.isdisjoint(returned_ids_b), (
            f"Trigger IDs overlap between projects: "
            f"{returned_ids_a & returned_ids_b}"
        )
