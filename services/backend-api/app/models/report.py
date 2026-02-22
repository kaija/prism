"""Report generation and job tracking models."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional, Union

from pydantic import BaseModel


class Timeframe(BaseModel):
    """Time range filter supporting absolute and relative formats."""

    type: Literal["absolute", "relative"]
    start: Optional[int] = None  # epoch ms for absolute
    end: Optional[int] = None  # epoch ms for absolute
    relative: Optional[str] = None  # e.g. "last_7_days"


class EventSelection(BaseModel):
    """Event type selection filter."""

    type: Literal["all", "specific"]
    event_names: Optional[list[str]] = None


class ConditionFilter(BaseModel):
    """A single attribute condition predicate."""

    attribute: str
    operator: Literal[
        "is",
        "is_not",
        "contains",
        "not_contains",
        "starts_with",
        "not_starts_with",
        "ends_with",
        "not_ends_with",
        "equals",
        "not_equals",
        "greater_than",
        "less_than",
        "true",
        "false",
    ]
    value: Optional[Union[str, int, float, bool]] = None


class ConditionGroup(BaseModel):
    """Nested AND/OR condition group for complex filtering."""

    logic: Literal["and", "or"]
    conditions: list[Union[ConditionFilter, ConditionGroup]]


# Rebuild model to resolve self-referential forward reference
ConditionGroup.model_rebuild()


class Aggregation(BaseModel):
    """Aggregation function specification for report queries."""

    function: Literal[
        "count",
        "sum",
        "count_unique",
        "last_event",
        "first_event",
        "min",
        "max",
        "mean",
        "average",
        "tops",
    ]
    attribute: Optional[str] = None


class ReportRequest(BaseModel):
    """Full report generation request."""

    report_type: Literal["trend", "attribution", "cohort"]
    timeframe: Timeframe
    event_selection: EventSelection
    filters: Optional[ConditionGroup] = None
    aggregation: Aggregation
    group_by: Optional[list[str]] = None


class JobResponse(BaseModel):
    """Response returned when a report job is submitted."""

    job_id: str
    status: str


class JobStatus(BaseModel):
    """Full job status with result and timing information."""

    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
