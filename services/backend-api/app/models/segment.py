"""Segment models for profile group management."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class SegmentTimeframe(BaseModel):
    """Segment 時間篩選條件，複用 report.Timeframe 的結構。"""

    type: Literal["absolute", "relative"]
    start: Optional[int] = None  # epoch ms（absolute 時使用）
    end: Optional[int] = None  # epoch ms（absolute 時使用）
    relative: Optional[str] = None  # e.g. "last_7_days"（relative 時使用）


class SegmentCreate(BaseModel):
    """建立 segment 的請求 payload。"""

    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    dsl: str = Field(min_length=1)
    timeframe: SegmentTimeframe


class SegmentUpdate(BaseModel):
    """更新 segment 的請求 payload，所有欄位皆為可選。"""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    dsl: Optional[str] = Field(default=None, min_length=1)
    timeframe: Optional[SegmentTimeframe] = None


class SegmentResponse(BaseModel):
    """Segment 完整回應模型。"""

    segment_id: str
    project_id: str
    name: str
    description: Optional[str] = None
    dsl: str
    timeframe: SegmentTimeframe
    created_at: datetime
    updated_at: datetime

class SegmentQueryRequest(BaseModel):
    """Segment Query API 的請求模型。"""

    timeframe_override: Optional[SegmentTimeframe] = None


class SegmentQueryResponse(BaseModel):
    """Segment Query API 的回應模型。"""

    sql: str
    params: list
    dsl: str
    timeframe: SegmentTimeframe

