"""Configuration models for project key-value store and reporting settings."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ConfigValue(BaseModel):
    """A single project configuration key-value pair."""

    key: str = Field(min_length=1, max_length=255)
    value: str


class ReportingConfig(BaseModel):
    """Per-project reporting configuration."""

    default_timeframe: str = "last_30_days"
    max_concurrent_reports: int = Field(default=3, ge=1, le=20)
    default_report_type: str = "trend"
