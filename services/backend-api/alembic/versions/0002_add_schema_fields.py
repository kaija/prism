"""Add description and data_type columns to attribute_definitions.

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "attribute_definitions",
        sa.Column("description", sa.Text, nullable=True),
    )
    op.add_column(
        "attribute_definitions",
        sa.Column(
            "data_type",
            sa.String(50),
            nullable=False,
            server_default="string",
        ),
    )


def downgrade() -> None:
    op.drop_column("attribute_definitions", "data_type")
    op.drop_column("attribute_definitions", "description")
