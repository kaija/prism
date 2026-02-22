"""Profile summary and timeline models."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models.report import ConditionGroup, EventSelection, Timeframe


class ProfileSummaryRequest(BaseModel):
    """Request for filtered profile summary with custom columns."""

    filters: Optional[ConditionGroup] = None
    columns: list[str] = Field(min_length=1)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class TimelineRequest(BaseModel):
    """Request for profile group event timeline."""

    profile_ids: list[str]
    timeframe: Timeframe
    event_selection: Optional[EventSelection] = None
    filters: Optional[ConditionGroup] = None
    bucket_size: Literal["hour", "day", "week", "month"] = "day"
