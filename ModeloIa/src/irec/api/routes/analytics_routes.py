from __future__ import annotations

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/sentiment")
async def analyze_sentiment(text: str) -> dict:
    """Analyze sentiment of a text string."""
    from src.irec.nlp.sentiment_analyzer import analyze_sentiment
    return analyze_sentiment(text)


@router.get("/emotions")
async def detect_emotions(text: str) -> dict:
    """Detect emotions in text."""
    from src.irec.nlp.emotion_detector import detect_emotions_detailed
    return detect_emotions_detailed(text)


@router.get("/topics")
async def classify_topics(text: str, top_n: int = 3) -> dict:
    """Classify topics in text."""
    from src.irec.nlp.topic_classifier import classify_topic
    results = classify_topic(text, top_n=top_n)
    return {"text": text, "topics": results}


@router.get("/risk")
async def assess_risk(text: str) -> dict:
    """Detect risk indicators in text."""
    from src.irec.nlp.risk_indicator_detector import detect_risk_indicators
    return detect_risk_indicators(text)


@router.get("/full-analysis")
async def full_text_analysis(text: str) -> dict:
    """Run complete NLP analysis on a single text."""
    from src.irec.preprocessing import clean_text, normalize_emoji
    from src.irec.nlp.sentiment_analyzer import analyze_sentiment
    from src.irec.nlp.emotion_detector import detect_emotions_detailed
    from src.irec.nlp.topic_classifier import classify_topic
    from src.irec.nlp.risk_indicator_detector import detect_risk_indicators
    from src.irec.community.association_scorer import get_community_summary

    cleaned = clean_text(text)
    emojified = normalize_emoji(text)

    return {
        "original": text,
        "cleaned": cleaned,
        "emoji_normalized": emojified,
        "sentiment": analyze_sentiment(cleaned),
        "emotions": detect_emotions_detailed(cleaned),
        "topics": classify_topic(cleaned, top_n=5),
        "risk": detect_risk_indicators(cleaned),
        "community": get_community_summary(cleaned),
    }
