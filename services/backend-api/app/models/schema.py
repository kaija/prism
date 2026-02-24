"""Pydantic models for Profile & Event Schema property definitions."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PropertyCreate(BaseModel):
    """Request model for creating a new schema property."""

    name: str = Field(min_length=1, max_length=128)
    data_type: str = Field(min_length=1, max_length=50)
    description: str | None = None
    property_type: Literal["static", "dynamic"]
    formula: str | None = None


class PropertyUpdate(BaseModel):
    """Request model for updating an existing schema property."""

    name: str | None = Field(default=None, min_length=1, max_length=128)
    data_type: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = None
    property_type: Literal["static", "dynamic"] | None = None
    formula: str | None = None


class PropertyResponse(BaseModel):
    """Response model for a schema property."""

    id: int
    project_id: str
    schema_type: str
    name: str
    data_type: str
    description: str | None = None
    property_type: Literal["static", "dynamic"]
    formula: str | None = None
    created_at: datetime
