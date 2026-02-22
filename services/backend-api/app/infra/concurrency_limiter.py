"""Semaphore-based concurrency control for report generation.

Provides per-project and global slot management using asyncio.Semaphore
to enforce concurrency limits at both the project and service levels (Req 4).
"""

from __future__ import annotations

import asyncio

import structlog

logger = structlog.get_logger()


class ConcurrencyLimiter:
    """Semaphore-based concurrency control (Req 4).

    Enforces two levels of concurrency limiting:
    - Per-project: each project can run at most `per_project_max` concurrent tasks
    - Global: the entire service can run at most `global_max` concurrent tasks

    Both semaphores must be acquired before a task can proceed. Per-project
    semaphores are lazily created on first acquire for a given project_id.
    """

    def __init__(self, per_project_max: int, global_max: int) -> None:
        if per_project_max < 1:
            raise ValueError("per_project_max must be >= 1")
        if global_max < 1:
            raise ValueError("global_max must be >= 1")

        self._global_sem = asyncio.Semaphore(global_max)
        self._global_max = global_max
        self._project_sems: dict[str, asyncio.Semaphore] = {}
        self._per_project_max = per_project_max

    def _get_project_sem(self, project_id: str) -> asyncio.Semaphore:
        """Get or lazily create the semaphore for a project."""
        if project_id not in self._project_sems:
            self._project_sems[project_id] = asyncio.Semaphore(self._per_project_max)
        return self._project_sems[project_id]

    async def acquire(self, project_id: str) -> None:
        """Acquire both project and global concurrency slots.

        Awaits until both slots are available. Acquires the project semaphore
        first, then the global semaphore. If the global semaphore cannot be
        acquired immediately, the call will await (the task is effectively
        queued).
        """
        project_sem = self._get_project_sem(project_id)
        await project_sem.acquire()
        try:
            await self._global_sem.acquire()
        except BaseException:
            # If global acquire fails or is cancelled, release the project slot
            project_sem.release()
            raise
        logger.debug(
            "concurrency_slot_acquired",
            project_id=project_id,
            project_available=self.get_project_available(project_id),
            global_available=self.get_global_available(),
        )

    def release(self, project_id: str) -> None:
        """Release both project and global concurrency slots."""
        project_sem = self._project_sems.get(project_id)
        if project_sem is not None:
            project_sem.release()
        self._global_sem.release()
        logger.debug(
            "concurrency_slot_released",
            project_id=project_id,
            project_available=self.get_project_available(project_id),
            global_available=self.get_global_available(),
        )

    def get_project_available(self, project_id: str) -> int:
        """Get available slots for a project.

        Returns per_project_max if the project has no semaphore yet (no
        active tasks).
        """
        sem = self._project_sems.get(project_id)
        if sem is None:
            return self._per_project_max
        return sem._value  # noqa: SLF001 — accessing internal Semaphore counter

    def get_global_available(self) -> int:
        """Get available global slots."""
        return self._global_sem._value  # noqa: SLF001
