"""Application settings loaded from environment variables via pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Backend API configuration.

    All values are read from environment variables. Defaults match .env.example
    so the service can start locally without extra setup.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- PostgreSQL ---
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "prism"
    postgres_user: str = "prism"
    postgres_password: str = "prism_dev"

    @property
    def postgres_dsn(self) -> str:
        """Build an asyncpg-compatible PostgreSQL DSN."""
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # --- DuckDB ---
    duckdb_path: str = "/data/duckdb/prism.duckdb"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379"

    # --- Backend API ---
    backend_api_port: int = 8001
    backend_api_log_level: str = "info"

    # --- Query timeout ---
    backend_api_query_timeout_seconds: int = 30

    # --- Concurrency limits (Req 4.5, 4.6) ---
    max_project_concurrent_reports: int = 3
    max_service_concurrent_reports: int = 10


settings = Settings()
