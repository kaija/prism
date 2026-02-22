"""Unit tests for ConcurrencyLimiter."""

from __future__ import annotations

import asyncio

import pytest

from app.infra.concurrency_limiter import ConcurrencyLimiter


class TestInit:
    def test_creates_with_valid_limits(self):
        limiter = ConcurrencyLimiter(per_project_max=3, global_max=10)
        assert limiter.get_global_available() == 10

    def test_rejects_zero_per_project_max(self):
        with pytest.raises(ValueError, match="per_project_max"):
            ConcurrencyLimiter(per_project_max=0, global_max=10)

    def test_rejects_zero_global_max(self):
        with pytest.raises(ValueError, match="global_max"):
            ConcurrencyLimiter(per_project_max=3, global_max=0)

    def test_rejects_negative_limits(self):
        with pytest.raises(ValueError):
            ConcurrencyLimiter(per_project_max=-1, global_max=5)


class TestAcquireRelease:
    async def test_acquire_decrements_both_slots(self):
        limiter = ConcurrencyLimiter(per_project_max=3, global_max=5)

        await limiter.acquire("proj1")

        assert limiter.get_project_available("proj1") == 2
        assert limiter.get_global_available() == 4

    async def test_release_increments_both_slots(self):
        limiter = ConcurrencyLimiter(per_project_max=3, global_max=5)

        await limiter.acquire("proj1")
        limiter.release("proj1")

        assert limiter.get_project_available("proj1") == 3
        assert limiter.get_global_available() == 5

    async def test_multiple_acquires_same_project(self):
        limiter = ConcurrencyLimiter(per_project_max=3, global_max=10)

        await limiter.acquire("proj1")
        await limiter.acquire("proj1")

        assert limiter.get_project_available("proj1") == 1
        assert limiter.get_global_available() == 8

    async def test_acquires_across_projects(self):
        limiter = ConcurrencyLimiter(per_project_max=3, global_max=10)

        await limiter.acquire("proj1")
        await limiter.acquire("proj2")

        assert limiter.get_project_available("proj1") == 2
        assert limiter.get_project_available("proj2") == 2
        assert limiter.get_global_available() == 8

    async def test_release_unknown_project_releases_global(self):
        limiter = ConcurrencyLimiter(per_project_max=3, global_max=5)
        # Release on a project that was never acquired — should still release global
        limiter.release("unknown")
        # Global goes above initial (semaphore allows it)
        assert limiter.get_global_available() == 6


class TestProjectLimiting:
    async def test_blocks_when_project_limit_reached(self):
        limiter = ConcurrencyLimiter(per_project_max=1, global_max=10)

        await limiter.acquire("proj1")
        assert limiter.get_project_available("proj1") == 0

        # Next acquire should block — verify with a timeout
        acquired = asyncio.Event()

        async def try_acquire():
            await limiter.acquire("proj1")
            acquired.set()

        task = asyncio.create_task(try_acquire())
        await asyncio.sleep(0.05)
        assert not acquired.is_set()

        # Release the slot — the blocked acquire should proceed
        limiter.release("proj1")
        await asyncio.sleep(0.05)
        assert acquired.is_set()

        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    async def test_other_project_not_blocked(self):
        limiter = ConcurrencyLimiter(per_project_max=1, global_max=10)

        await limiter.acquire("proj1")
        # proj2 should still be able to acquire
        await asyncio.wait_for(limiter.acquire("proj2"), timeout=0.1)

        assert limiter.get_project_available("proj1") == 0
        assert limiter.get_project_available("proj2") == 0


class TestGlobalLimiting:
    async def test_blocks_when_global_limit_reached(self):
        limiter = ConcurrencyLimiter(per_project_max=5, global_max=2)

        await limiter.acquire("proj1")
        await limiter.acquire("proj2")
        assert limiter.get_global_available() == 0

        acquired = asyncio.Event()

        async def try_acquire():
            await limiter.acquire("proj3")
            acquired.set()

        task = asyncio.create_task(try_acquire())
        await asyncio.sleep(0.05)
        assert not acquired.is_set()

        limiter.release("proj1")
        await asyncio.sleep(0.05)
        assert acquired.is_set()

        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    async def test_global_limit_across_same_project(self):
        limiter = ConcurrencyLimiter(per_project_max=5, global_max=2)

        await limiter.acquire("proj1")
        await limiter.acquire("proj1")
        assert limiter.get_global_available() == 0

        acquired = asyncio.Event()

        async def try_acquire():
            await limiter.acquire("proj1")
            acquired.set()

        task = asyncio.create_task(try_acquire())
        await asyncio.sleep(0.05)
        assert not acquired.is_set()

        limiter.release("proj1")
        await asyncio.sleep(0.05)
        assert acquired.is_set()

        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


class TestGetAvailable:
    def test_project_available_before_any_acquire(self):
        limiter = ConcurrencyLimiter(per_project_max=3, global_max=10)
        assert limiter.get_project_available("new_project") == 3

    def test_global_available_at_init(self):
        limiter = ConcurrencyLimiter(per_project_max=3, global_max=7)
        assert limiter.get_global_available() == 7

    async def test_available_counts_after_mixed_operations(self):
        limiter = ConcurrencyLimiter(per_project_max=3, global_max=5)

        await limiter.acquire("proj1")
        await limiter.acquire("proj1")
        await limiter.acquire("proj2")

        assert limiter.get_project_available("proj1") == 1
        assert limiter.get_project_available("proj2") == 2
        assert limiter.get_global_available() == 2

        limiter.release("proj1")

        assert limiter.get_project_available("proj1") == 2
        assert limiter.get_global_available() == 3


class TestCancellationSafety:
    async def test_cancelled_global_acquire_releases_project_slot(self):
        """If global acquire is cancelled, the project slot should be released."""
        limiter = ConcurrencyLimiter(per_project_max=3, global_max=1)

        # Exhaust global
        await limiter.acquire("proj1")
        assert limiter.get_global_available() == 0

        async def try_acquire():
            await limiter.acquire("proj2")

        task = asyncio.create_task(try_acquire())
        await asyncio.sleep(0.05)

        # Cancel while waiting for global semaphore
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

        # proj2's project slot should have been released back
        assert limiter.get_project_available("proj2") == 3
