"""Tests for app.config Settings."""

import os
from unittest.mock import patch

from app.config import Settings


class TestSettingsDefaults:
    """Verify default values match .env.example expectations."""

    def test_postgres_defaults(self):
        s = Settings()
        assert s.postgres_host == "localhost"
        assert s.postgres_port == 5432
        assert s.postgres_db == "prism"
        assert s.postgres_user == "prism"
        assert s.postgres_password == "prism_dev"

    def test_postgres_dsn(self):
        s = Settings()
        assert s.postgres_dsn == "postgresql://prism:prism_dev@localhost:5432/prism"

    def test_duckdb_default(self):
        s = Settings()
        assert s.duckdb_path == "/data/duckdb/prism.duckdb"

    def test_redis_default(self):
        s = Settings()
        assert s.redis_url == "redis://localhost:6379"

    def test_backend_api_defaults(self):
        s = Settings()
        assert s.backend_api_port == 8001
        assert s.backend_api_log_level == "info"

    def test_query_timeout_default(self):
        s = Settings()
        assert s.backend_api_query_timeout_seconds == 30

    def test_concurrency_defaults(self):
        s = Settings()
        assert s.max_project_concurrent_reports == 3
        assert s.max_service_concurrent_reports == 10


class TestSettingsFromEnv:
    """Verify settings can be overridden via environment variables."""

    @patch.dict(
        os.environ,
        {
            "POSTGRES_HOST": "db.prod",
            "POSTGRES_PORT": "5433",
            "POSTGRES_DB": "prod_db",
            "POSTGRES_USER": "admin",
            "POSTGRES_PASSWORD": "s3cret",
            "DUCKDB_PATH": "/mnt/duck.duckdb",
            "REDIS_URL": "redis://cache:6380/1",
            "BACKEND_API_PORT": "9000",
            "BACKEND_API_LOG_LEVEL": "debug",
            "BACKEND_API_QUERY_TIMEOUT_SECONDS": "60",
            "MAX_PROJECT_CONCURRENT_REPORTS": "5",
            "MAX_SERVICE_CONCURRENT_REPORTS": "20",
        },
    )
    def test_env_overrides(self):
        s = Settings()
        assert s.postgres_host == "db.prod"
        assert s.postgres_port == 5433
        assert s.postgres_db == "prod_db"
        assert s.postgres_user == "admin"
        assert s.postgres_password == "s3cret"
        assert s.postgres_dsn == "postgresql://admin:s3cret@db.prod:5433/prod_db"
        assert s.duckdb_path == "/mnt/duck.duckdb"
        assert s.redis_url == "redis://cache:6380/1"
        assert s.backend_api_port == 9000
        assert s.backend_api_log_level == "debug"
        assert s.backend_api_query_timeout_seconds == 60
        assert s.max_project_concurrent_reports == 5
        assert s.max_service_concurrent_reports == 20
