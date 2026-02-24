"""Create segments table.

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "segments",
        sa.Column("segment_id", sa.Text, primary_key=True),
        sa.Column("project_id", sa.Text, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("dsl", sa.Text, nullable=False),
        sa.Column("timeframe", postgresql.JSONB, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        if_not_exists=True,
    )

    op.create_index(
        "idx_segments_project_id",
        "segments",
        ["project_id"],
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("idx_segments_project_id", table_name="segments", if_exists=True)
    op.drop_table("segments", if_exists=True)
