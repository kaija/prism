"""Pydantic v2 models for the Backend API."""

from app.models.common import ErrorResponse, PaginatedResult
from app.models.config import ConfigValue, ReportingConfig
from app.models.profile import ProfileSummaryRequest, TimelineRequest
from app.models.report import (
    Aggregation,
    ConditionFilter,
    ConditionGroup,
    EventSelection,
    JobResponse,
    JobStatus,
    ReportRequest,
    Timeframe,
)
from app.models.trigger import (
    TriggerAction,
    TriggerCreate,
    TriggerSetting,
    TriggerUpdate,
)

__all__ = [
    # common
    "PaginatedResult",
    "ErrorResponse",
    # config
    "ConfigValue",
    "ReportingConfig",
    # trigger
    "TriggerAction",
    "TriggerCreate",
    "TriggerUpdate",
    "TriggerSetting",
    # report
    "Timeframe",
    "EventSelection",
    "ConditionFilter",
    "ConditionGroup",
    "Aggregation",
    "ReportRequest",
    "JobResponse",
    "JobStatus",
    # profile
    "ProfileSummaryRequest",
    "TimelineRequest",
]
