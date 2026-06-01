from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class Platform(str, Enum):
    REDDIT = "reddit"
    YOUTUBE = "youtube"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    FACEBOOK = "facebook"
    PUBLIC_DATASET = "public_dataset"


class SourceType(str, Enum):
    POST = "post"
    COMMENT = "comment"
    REPLY = "reply"
    CAPTION = "caption"
    DESCRIPTION = "description"
    TITLE = "title"


class MediaType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    MIXED = "mixed"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    ERROR = "error"
    VALIDATED = "validated"
    DISCARDED = "discarded"


class EngagementMetrics(BaseModel):
    likes: int = 0
    replies: int = 0
    shares: int = 0
    score: Optional[int] = None


class SocialDigitalRecord(BaseModel):
    """Unified internal representation of any digital social content.

    All external sources (Reddit, YouTube, synthetic platforms) are normalized
    into this schema before entering the analysis pipeline.
    """

    record_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    platform: Platform
    source_type: SourceType
    original_content_id: Optional[str] = None
    pseudo_user_id: str
    parent_content_id: Optional[str] = None
    thread_id: Optional[str] = None
    text_content: str = ""
    title: Optional[str] = None
    description: Optional[str] = None
    hashtags: list[str] = Field(default_factory=list)
    timestamp: datetime
    language: str = "es"
    media_type: MediaType = MediaType.TEXT
    media_url_reference: Optional[str] = None
    ocr_text: Optional[str] = None
    image_caption: Optional[str] = None
    scene_description: Optional[str] = None
    engagement_metrics: EngagementMetrics = Field(default_factory=EngagementMetrics)
    community_hints: list[str] = Field(default_factory=list)
    raw_metadata: dict[str, Any] = Field(default_factory=dict)
    ingestion_date: datetime = Field(default_factory=datetime.utcnow)
    processing_status: ProcessingStatus = ProcessingStatus.PENDING

    def to_enriched_text(self) -> str:
        """Combine all text fields into a single analyzable text."""
        parts: list[str] = []

        if self.title:
            parts.append(self.title)
        if self.text_content:
            parts.append(self.text_content)
        if self.description:
            parts.append(self.description)
        if self.hashtags:
            parts.append(" ".join(self.hashtags))
        if self.ocr_text:
            parts.append(self.ocr_text)
        if self.image_caption:
            parts.append(self.image_caption)
        if self.scene_description:
            parts.append(self.scene_description)

        return " ".join(parts).strip()

    class Config:
        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class NLPAnalysisResult(BaseModel):
    """Output of the NLP pipeline for a single record."""

    record_id: str
    enriched_text: str = ""
    language: str = "es"
    language_confidence: float = 0.0
    sentiment_label: str = "neutral"
    sentiment_score: float = 0.0
    emotions: dict[str, float] = Field(default_factory=dict)
    topics: list[str] = Field(default_factory=list)
    risk_indicators: dict[str, float] = Field(default_factory=dict)
    embedding: Optional[list[float]] = None
    processing_timestamp: datetime = Field(default_factory=datetime.utcnow)


class CommunityAssociation(BaseModel):
    """Result of community association scoring."""

    record_id: str
    institution_candidates: list[str] = Field(default_factory=list)
    association_score: float = 0.0
    association_level: str = "none"  # none, low, medium, high
    matched_signals: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class IRECScore(BaseModel):
    """Índice de Riesgo Emocional Comunitario for a community+window."""

    community_id: str
    community_name: str
    time_window_start: datetime
    time_window_end: datetime
    irec_value: float = 0.0
    irec_level: str = "sin_tendencia"  # sin_tendencia, leve, moderada, elevada, critica
    stress_score: float = 0.0
    burnout_score: float = 0.0
    anxiety_score: float = 0.0
    hopelessness_score: float = 0.0
    isolation_score: float = 0.0
    demotivation_score: float = 0.0
    conflict_score: float = 0.0
    persistence_score: float = 0.0
    protective_score: float = 0.0
    total_records: int = 0
    relevant_records: int = 0
    trend_direction: str = "stable"  # increasing, decreasing, stable
    explanation: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
