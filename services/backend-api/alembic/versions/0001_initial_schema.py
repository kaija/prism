"""Initial schema - baseline from existing tables.

Revision ID: 0001
Revises: None
Create Date: 2026-02-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- projects ---
    op.create_table(
        "projects",
        sa.Column("project_id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("settings", postgresql.JSONB, server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    # --- api_keys ---
    op.create_table(
        "api_keys",
        sa.Column("key_id", sa.String(64), primary_key=True),
        sa.Column("project_id", sa.String(64), sa.ForeignKey("projects.project_id")),
        sa.Column("key_hash", sa.String(255), nullable=False),
        sa.Column("prefix", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        if_not_exists=True,
    )

    # --- attribute_definitions ---
    op.create_table(
        "attribute_definitions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("project_id", sa.String(64), sa.ForeignKey("projects.project_id")),
        sa.Column("entity_type", sa.String(20), nullable=False),
        sa.Column("attr_name", sa.String(128), nullable=False),
        sa.Column("attr_type", sa.String(20), nullable=False),
        sa.Column("indexed", sa.Boolean, server_default="false"),
        sa.Column("computed", sa.Boolean, server_default="false"),
        sa.Column("formula", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "entity_type", "attr_name"),
        if_not_exists=True,
    )

    # --- trigger_rules ---
    op.create_table(
        "trigger_rules",
        sa.Column("rule_id", sa.String(64), primary_key=True),
        sa.Column("project_id", sa.String(64), sa.ForeignKey("projects.project_id")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("dsl", sa.Text, nullable=False),
        sa.Column("compiled_hash", sa.String(64)),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("actions", postgresql.JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    # --- project_config ---
    op.create_table(
        "project_config",
        sa.Column(
            "project_id",
            sa.String(64),
            sa.ForeignKey("projects.project_id"),
            primary_key=True,
        ),
        sa.Column("config_key", sa.String(255), primary_key=True),
        sa.Column("config_value", sa.Text, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    # --- project_reporting_config ---
    op.create_table(
        "project_reporting_config",
        sa.Column(
            "project_id",
            sa.String(64),
            sa.ForeignKey("projects.project_id"),
            primary_key=True,
        ),
        sa.Column("config", postgresql.JSONB, server_default="{}", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    # --- trigger_settings ---
    op.create_table(
        "trigger_settings",
        sa.Column("rule_id", sa.String(64), primary_key=True),
        sa.Column("project_id", sa.String(64), sa.ForeignKey("projects.project_id")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("dsl", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("actions", postgresql.JSONB, server_default="[]", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    # --- jobs ---
    op.create_table(
        "jobs",
        sa.Column("job_id", sa.String(64), primary_key=True),
        sa.Column("project_id", sa.String(64), sa.ForeignKey("projects.project_id")),
        sa.Column("job_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("params", postgresql.JSONB, nullable=False),
        sa.Column("result", postgresql.JSONB),
        sa.Column("error", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        if_not_exists=True,
    )

    # --- request_logs ---
    op.create_table(
        "request_logs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("project_id", sa.String(64)),
        sa.Column("method", sa.String(10), nullable=False),
        sa.Column("path", sa.String(512), nullable=False),
        sa.Column("status_code", sa.Integer, nullable=False),
        sa.Column("duration_ms", sa.Float, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    # --- Indexes (using if_not_exists for idempotency) ---
    op.create_index("idx_api_keys_project", "api_keys", ["project_id"], if_not_exists=True)
    op.create_index("idx_api_keys_prefix", "api_keys", ["prefix"], if_not_exists=True)
    op.create_index(
        "idx_attr_defs_project", "attribute_definitions", ["project_id"], if_not_exists=True
    )
    op.create_index(
        "idx_trigger_rules_project", "trigger_rules", ["project_id"], if_not_exists=True
    )
    op.create_index(
        "idx_trigger_rules_status",
        "trigger_rules",
        ["project_id", "status"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_trigger_settings_project",
        "trigger_settings",
        ["project_id"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_jobs_project_status", "jobs", ["project_id", "status"], if_not_exists=True
    )
    op.create_index("idx_jobs_status", "jobs", ["status"], if_not_exists=True)
    op.create_index(
        "idx_request_logs_project",
        "request_logs",
        ["project_id", "created_at"],
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_table("request_logs", if_exists=True)
    op.drop_table("jobs", if_exists=True)
    op.drop_table("trigger_settings", if_exists=True)
    op.drop_table("project_reporting_config", if_exists=True)
    op.drop_table("project_config", if_exists=True)
    op.drop_table("trigger_rules", if_exists=True)
    op.drop_table("attribute_definitions", if_exists=True)
    op.drop_table("api_keys", if_exists=True)
    op.drop_table("projects", if_exists=True)
