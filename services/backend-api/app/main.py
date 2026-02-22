"""Prism Backend API - FastAPI application entry point."""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.infra.concurrency_limiter import ConcurrencyLimiter
from app.middleware.error_handler import (
    global_exception_handler,
    validation_exception_handler,
)
from app.middleware.request_log import RequestLogMiddleware
from app.middleware.tenant import TenantMiddleware
from app.repositories.duckdb_repo import DuckDBRepository
from app.repositories.postgres_repo import PostgresRepository
from app.routers import (
    config_router,
    health_router,
    job_router,
    profile_router,
    report_router,
    reporting_config_router,
    trigger_router,
)
from app.services.config_service import ConfigService
from app.services.job_service import JobService
from app.services.profile_summary_service import ProfileSummaryService
from app.services.query_builder import QueryBuilderService
from app.services.report_service import ReportService
from app.services.trigger_service import TriggerService

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle.

    Startup: initialize DB pools, services, and concurrency limiter.
    Shutdown: close DB pools and release resources.
    """
    logger.info("starting_up")

    # --- Infrastructure ---
    pg_pool = await PostgresRepository.create_pool(settings)
    pg_repo = PostgresRepository(pg_pool)

    duckdb_conn = DuckDBRepository.create_connection(settings)
    duckdb_repo = DuckDBRepository(duckdb_conn)

    concurrency_limiter = ConcurrencyLimiter(
        per_project_max=settings.max_project_concurrent_reports,
        global_max=settings.max_service_concurrent_reports,
    )

    # --- Services ---
    query_builder = QueryBuilderService()
    config_service = ConfigService(pg_repo)
    trigger_service = TriggerService(pg_repo)
    job_service = JobService(pg_repo)
    report_service = ReportService(
        job_service=job_service,
        query_builder=query_builder,
        duckdb_repo=duckdb_repo,
        concurrency_limiter=concurrency_limiter,
    )
    profile_summary_service = ProfileSummaryService(
        query_builder=query_builder,
        duckdb_repo=duckdb_repo,
    )

    # --- Store on app.state ---
    app.state.pg_repo = pg_repo
    app.state.duckdb_repo = duckdb_repo
    app.state.concurrency_limiter = concurrency_limiter
    app.state.config_service = config_service
    app.state.trigger_service = trigger_service
    app.state.report_service = report_service
    app.state.profile_summary_service = profile_summary_service
    app.state.job_service = job_service

    logger.info("startup_complete")
    yield

    # --- Shutdown ---
    logger.info("shutting_down")

    await pg_pool.close()
    duckdb_conn.close()

    logger.info("shutdown_complete")


app = FastAPI(
    title="Prism Backend API",
    version="0.1.0",
    lifespan=lifespan,
)

# --- Exception handlers ---
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# --- Middleware (order matters: last added = first executed) ---
app.add_middleware(RequestLogMiddleware)
app.add_middleware(TenantMiddleware)

# --- Routers ---
app.include_router(config_router.router)
app.include_router(reporting_config_router.router)
app.include_router(trigger_router.router)
app.include_router(report_router.router)
app.include_router(profile_router.router)
app.include_router(job_router.router)
app.include_router(health_router.router)
