from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from src.irec.storage.postgres_client import Base


class SocialRecord(Base):
    """Raw ingested social media record (maps to SocialDigitalRecord)."""
    __tablename__ = "social_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    platform = Column(String(50), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)
    pseudo_user_id = Column(String(100), nullable=False, index=True)
    parent_id = Column(String, nullable=True)
    thread_id = Column(String, nullable=True)
    text_content = Column(Text, nullable=True)
    cleaned_text = Column(Text, nullable=True)
    anonymized_text = Column(Text, nullable=True)
    enriched_text = Column(Text, nullable=True)
    hashtags = Column(JSON, default=list)
    language = Column(String(10), default="es")
    media_type = Column(String(20), default="text")
    ocr_text = Column(Text, nullable=True)
    image_caption = Column(Text, nullable=True)
    scene_description = Column(Text, nullable=True)
    engagement_likes = Column(Integer, default=0)
    engagement_replies = Column(Integer, default=0)
    community_hints = Column(JSON, default=list)
    raw_metadata = Column(JSON, default=dict)
    timestamp = Column(DateTime, nullable=False, index=True)
    week_number = Column(Integer, nullable=True)
    year_month = Column(String(10), nullable=True)
    processing_status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    nlp_result = relationship("NLPResult", back_populates="record", uselist=False, cascade="all, delete-orphan")
    community_assoc = relationship("CommunityAssociation", back_populates="record", uselist=False, cascade="all, delete-orphan")


class NLPResult(Base):
    """NLP analysis results for a record."""
    __tablename__ = "nlp_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id = Column(String, ForeignKey("social_records.id"), unique=True, nullable=False)
    sentiment_label = Column(String(20))
    sentiment_score = Column(Float, default=0.0)
    sentiment_confidence = Column(Float, default=0.0)
    dominant_emotion = Column(String(50))
    dominant_family = Column(String(50))
    emotion_scores = Column(JSON, default=dict)
    family_scores = Column(JSON, default=dict)
    topics = Column(JSON, default=list)
    topic_scores = Column(JSON, default=dict)
    risk_scores = Column(JSON, default=dict)
    overall_risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20))
    active_risks = Column(JSON, default=list)
    protective_signals = Column(JSON, default=list)
    is_educational_scene = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("SocialRecord", back_populates="nlp_result")


class CommunityAssociation(Base):
    """Community/institution association for a record."""
    __tablename__ = "community_associations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id = Column(String, ForeignKey("social_records.id"), unique=True, nullable=False)
    has_education_context = Column(Boolean, default=False)
    edu_signals_count = Column(Integer, default=0)
    association_level = Column(String(20), default="none")
    institutions = Column(JSON, default=list)  # [{"id": ..., "name": ..., "score": ...}]
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("SocialRecord", back_populates="community_assoc")


class IRECResult(Base):
    """IREC scores per community per time window."""
    __tablename__ = "irec_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    community_id = Column(String, nullable=False, index=True)
    community_name = Column(String, nullable=False)
    time_window_start = Column(DateTime, nullable=False)
    time_window_end = Column(DateTime, nullable=False)
    window_record_count = Column(Integer, default=0)
    irec_value = Column(Float, default=0.0)
    irec_level = Column(String(20))
    base_irec = Column(Float, default=0.0)
    persistence_bonus = Column(Float, default=0.0)
    protective_penalty = Column(Float, default=0.0)
    trend_factor = Column(Float, default=1.0)
    breakdown = Column(JSON, default=dict)
    protective_score = Column(Float, default=0.0)
    trend_direction = Column(String(20))
    trend_growth_rate = Column(Float, default=0.0)
    trend_confidence = Column(Float, default=0.0)
    is_anomaly = Column(Boolean, default=False)
    persistence = Column(Float, default=0.0)
    explanation = Column(Text, nullable=True)
    window_aggregation = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class TrainingDataset(Base):
    """Accumulated labeled data for Tier 2/3 model training."""
    __tablename__ = "training_datasets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    text_content = Column(Text, nullable=False)
    cleaned_text = Column(Text, nullable=True)
    language = Column(String(10), default="es")
    label_sentiment = Column(String(20), nullable=True)
    label_emotion = Column(String(50), nullable=True)
    label_topic = Column(String(50), nullable=True)
    label_risk_level = Column(String(20), nullable=True)
    label_source = Column(String(20), default="auto")  # auto, manual, ollama_assisted
    label_confidence = Column(Float, default=1.0)
    validated = Column(Boolean, default=False)
    validated_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    week_number = Column(Integer, nullable=True)
    community_id = Column(String, nullable=True)


class LearningState(Base):
    """Persistent adaptive learning state."""
    __tablename__ = "learning_state"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    state_key = Column(String(100), unique=True, nullable=False, index=True)
    state_value = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Analysis(Base):
    """Analysis configuration and results."""
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="created")
    
    institution_ids = Column(JSON, default=list)
    radius_km = Column(Float, default=5.0)
    date_range_start = Column(DateTime, nullable=True)
    date_range_end = Column(DateTime, nullable=True)
    mode = Column(String(20), default="simulation")
    analysis_type = Column(String(20), default="complete")
    platforms = Column(JSON, default=list)
    
    irec_value = Column(Float, default=0.0)
    irec_level = Column(String(20), default="sin_tendencia")
    pipeline_metrics = Column(JSON, default=dict)
    result_data = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
