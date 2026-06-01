from __future__ import annotations

from src.irec.nlp.sentiment_analyzer import analyze_sentiment
from src.irec.nlp.emotion_detector import detect_emotions, detect_emotions_detailed, get_emotion_family_aggregate
from src.irec.nlp.topic_classifier import classify_topic, get_topic_labels
from src.irec.nlp.risk_indicator_detector import detect_risk_indicators, batch_detect_risks
from src.irec.nlp.embeddings_generator import generate_embeddings, generate_single_embedding, is_embeddings_available
from src.irec.nlp.nlp_pipeline import NLPPipeline

__all__ = [
    "analyze_sentiment",
    "detect_emotions",
    "detect_emotions_detailed",
    "get_emotion_family_aggregate",
    "classify_topic",
    "get_topic_labels",
    "detect_risk_indicators",
    "batch_detect_risks",
    "generate_embeddings",
    "generate_single_embedding",
    "is_embeddings_available",
    "NLPPipeline",
]
