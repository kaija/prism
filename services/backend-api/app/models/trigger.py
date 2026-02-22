"""Trigger setting models for event-driven automation rules."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, HttpUrl


class TriggerAction(BaseModel):
    """An action to execute when a trigger fires."""

    type: Literal[
        "webhook", "kafka_publish", "notification", "tag_profile", "update_attribute"
    ]
    enabled: bool = True
    url: Optional[HttpUrl] = None
    topic: Optional[str] = None
    headers: Optional[dict[str, str]] = None
    payload_template: Optional[str] = None


class TriggerCreate(BaseModel):
    """Payload for creating a new trigger setting."""

    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    dsl: str = Field(min_length=1)
    status: Literal["active", "inactive", "draft"] = "draft"
    actions: list[TriggerAction] = Field(min_length=1)


class TriggerUpdate(BaseModel):
    """Payload for updating an existing trigger setting. All fields optional."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    dsl: Optional[str] = Field(default=None, min_length=1)
    status: Optional[Literal["active", "inactive", "draft"]] = None
    actions: Optional[list[TriggerAction]] = Field(default=None, min_length=1)


class TriggerSetting(BaseModel):
    """Full trigger setting record as stored in PostgreSQL."""

    rule_id: str
    project_id: str
    name: str
    description: Optional[str] = None
    dsl: str
    status: str
    actions: list[TriggerAction]
    created_at: datetime
    updated_at: datetime
