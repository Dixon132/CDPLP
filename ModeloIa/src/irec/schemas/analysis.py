from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AnalysisCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    institution_ids: list[str] = []
    radius_km: float = 5.0
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    mode: str = "simulation"
    analysis_type: str = "complete"
    platforms: list[str] = []


class AnalysisUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    institution_ids: Optional[list[str]] = None
    radius_km: Optional[float] = None
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    mode: Optional[str] = None
    analysis_type: Optional[str] = None
    platforms: Optional[str] = None


class AnalysisResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    institution_ids: list[str]
    radius_km: float
    date_range_start: Optional[datetime]
    date_range_end: Optional[datetime]
    mode: str
    analysis_type: str
    platforms: list[str]
    irec_value: float
    irec_level: str
    pipeline_metrics: dict
    result_data: dict
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
