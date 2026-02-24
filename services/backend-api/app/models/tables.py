"""SQLAlchemy table models matching the existing Prism PostgreSQL schema."""

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.types import REAL
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

from datetime import datetime


class Project(Base):
    __tablename__ = "projects"

    project_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), server_default="active")
    settings: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(server_default=func.now())


class ApiKey(Base):
    __tablename__ = "api_keys"

    key_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("projects.project_id")
    )
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    prefix: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), server_default="active")
    created_at: Mapped[datetime | None] = mapped_column(server_default=func.now())
    last_used_at: Mapped[datetime | None] = mapped_column()

    __table_args__ = (
        Index("idx_api_keys_project", "project_id"),
        Index("idx_api_keys_prefix", "prefix"),
    )


class AttributeDefinition(Base):
    __tablename__ = "attribute_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("projects.project_id")
    )
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False)
    attr_name: Mapped[str] = mapped_column(String(128), nullable=False)
    attr_type: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    data_type: Mapped[str] = mapped_column(String(50), nullable=False, server_default="string")
    indexed: Mapped[bool] = mapped_column(Boolean, server_default="false")
    computed: Mapped[bool] = mapped_column(Boolean, server_default="false")
    formula: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(server_default=func.now())

    __table_args__ = (
        Index("idx_attr_defs_project", "project_id"),
    )


class TriggerRule(Base):
    __tablename__ = "trigger_rules"

    rule_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("projects.project_id")
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    dsl: Mapped[str] = mapped_column(Text, nullable=False)
    compiled_hash: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), server_default="active")
    actions: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(server_default=func.now())

    __table_args__ = (
        Index("idx_trigger_rules_project", "project_id"),
        Index("idx_trigger_rules_status", "project_id", "status"),
    )


class ProjectConfig(Base):
    __tablename__ = "project_config"

    project_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("projects.project_id"), primary_key=True
    )
    config_key: Mapped[str] = mapped_column(String(255), primary_key=True)
    config_value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(server_default=func.now())


class ProjectReportingConfig(Base):
    __tablename__ = "project_reporting_config"

    project_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("projects.project_id"), primary_key=True
    )
    config: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(server_default=func.now())


class TriggerSetting(Base):
    __tablename__ = "trigger_settings"

    rule_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("projects.project_id")
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    dsl: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="draft")
    actions: Mapped[dict] = mapped_column(JSONB, server_default="[]", nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(server_default=func.now())

    __table_args__ = (Index("idx_trigger_settings_project", "project_id"),)


class Job(Base):
    __tablename__ = "jobs"

    job_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("projects.project_id")
    )
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="queued")
    params: Mapped[dict] = mapped_column(JSONB, nullable=False)
    result: Mapped[dict | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column()
    completed_at: Mapped[datetime | None] = mapped_column()

    __table_args__ = (
        Index("idx_jobs_project_status", "project_id", "status"),
        Index("idx_jobs_status", "status"),
    )


class RequestLog(Base):
    __tablename__ = "request_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    project_id: Mapped[str | None] = mapped_column(String(64))
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    path: Mapped[str] = mapped_column(String(512), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_ms: Mapped[float] = mapped_column(REAL, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(server_default=func.now())

    __table_args__ = (Index("idx_request_logs_project", "project_id", "created_at"),)
