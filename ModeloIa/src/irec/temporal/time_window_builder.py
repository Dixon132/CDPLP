from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

logger = logging.getLogger(__name__)

from src.irec.utils.constants import DEFAULT_WINDOW_DAYS, WINDOW_SIZES


def build_time_windows(
    records: list[dict[str, Any]],
    window_days: int = DEFAULT_WINDOW_DAYS,
    timestamp_key: str = "timestamp",
) -> list[dict]:
    """Group records into non-overlapping time windows.

    Args:
        records: Records with timestamp fields.
        window_days: Size of each window in days.
        timestamp_key: Key of the timestamp field (ISO string or datetime).

    Returns:
        List of window dicts with window_id, start, end, and records.
    """
    if not records:
        return []

    # Parse and sort timestamps
    parsed: list[tuple[datetime, dict]] = []
    for rec in records:
        ts = _parse_record_timestamp(rec, timestamp_key)
        if ts:
            parsed.append((ts, rec))

    if not parsed:
        return []

    parsed.sort(key=lambda x: x[0])
    start_date = parsed[0][0]
    end_date = parsed[-1][0]

    # Build windows
    windows: list[dict] = []
    current_start = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    while current_start <= end_date:
        current_end = current_start + timedelta(days=window_days)
        window_records = [
            rec for ts, rec in parsed
            if current_start <= ts < current_end
        ]

        if window_records:
            windows.append({
                "window_id": f"W{current_start.strftime('%Y%m%d')}",
                "start": current_start.isoformat(),
                "end": current_end.isoformat(),
                "year_week": f"{current_start.year}-W{current_start.isocalendar()[1]:02d}",
                "record_count": len(window_records),
                "records": window_records,
            })

        current_start = current_end

    logger.info(
        "Built %d time windows (%d days each) from %d records",
        len(windows), window_days, len(records),
    )
    return windows


def group_by_community(
    records: list[dict[str, Any]],
    community_key: str = "community_id",
) -> dict[str, list[dict]]:
    """Group records by community identifier.

    If no community_id exists, tries to use the dominant institution.

    Args:
        records: Records with community association data.
        community_key: Key to group by.

    Returns:
        Dict mapping community_id → list of records.
    """
    groups: dict[str, list[dict]] = {}

    for rec in records:
        # Try explicit community_id
        cid = rec.get(community_key)

        # Fallback: use top institution from community analysis
        if not cid:
            institutions = rec.get("community_institutions", [])
            if institutions:
                cid = institutions[0].get("institution_id")

        # Fallback: use association_level as key
        if not cid:
            level = rec.get("association_level", "unknown")
            cid = f"level_{level}"

        if cid not in groups:
            groups[cid] = []
        groups[cid].append(rec)

    logger.info("Grouped records into %d communities", len(groups))
    return groups


def aggregate_window_emotions(window: dict) -> dict:
    """Aggregate emotion/risk scores for all records in a time window.

    Args:
        window: Window dict from build_time_windows().

    Returns:
        Dict with aggregated metrics.
    """
    records = window.get("records", [])
    if not records:
        return _empty_aggregation()

    n = len(records)

    # Aggregate sentiment
    sentiment_scores = [r.get("sentiment_score", 0) for r in records if "sentiment_score" in r]
    avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0.0
    neg_ratio = sum(1 for s in sentiment_scores if s < -0.15) / len(sentiment_scores) if sentiment_scores else 0.0

    # Aggregate risk scores
    risk_scores = [r.get("overall_risk_score", 0) for r in records if "overall_risk_score" in r]
    avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0

    # Aggregate emotion scores
    emotion_aggs: dict[str, float] = {}
    emotion_counts: dict[str, int] = {}
    for rec in records:
        emotion_scores = rec.get("emotion_scores", {})
        dominant = rec.get("dominant_emotion")
        if dominant:
            emotion_counts[dominant] = emotion_counts.get(dominant, 0) + 1
        for em, score in emotion_scores.items():
            if em not in emotion_aggs:
                emotion_aggs[em] = []
            emotion_aggs[em].append(score)

    avg_emotions = {
        em: round(sum(scores) / len(scores), 4)
        for em, scores in emotion_aggs.items()
    }

    # Aggregate family scores
    family_aggs: dict[str, list[float]] = {}
    for rec in records:
        family_scores = rec.get("family_scores", {})
        for fam, score in family_scores.items():
            if fam not in family_aggs:
                family_aggs[fam] = []
            family_aggs[fam].append(score)

    avg_families = {
        fam: round(sum(scores) / len(scores), 4)
        for fam, scores in family_aggs.items()
    }

    # Dominant emotion (most frequent)
    dominant_emotion = max(emotion_counts.items(), key=lambda x: x[1])[0] if emotion_counts else "neutro"

    # Risk levels distribution
    risk_levels: dict[str, int] = {}
    for rec in records:
        rl = rec.get("risk_level", "sin_riesgo")
        risk_levels[rl] = risk_levels.get(rl, 0) + 1

    # Topic frequency
    topic_counts: dict[str, int] = {}
    for rec in records:
        for topic in rec.get("topics", []):
            topic_counts[topic] = topic_counts.get(topic, 0) + 1
    top_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "record_count": n,
        "avg_sentiment": round(avg_sentiment, 4),
        "negative_ratio": round(neg_ratio, 4),
        "avg_risk_score": round(avg_risk, 4),
        "avg_emotions": avg_emotions,
        "avg_families": avg_families,
        "dominant_emotion": dominant_emotion,
        "risk_level_distribution": risk_levels,
        "top_topics": [{"topic": t, "count": c} for t, c in top_topics],
    }


def _parse_record_timestamp(record: dict, key: str) -> Optional[datetime]:
    """Extract timestamp from a record dict, handling multiple formats."""
    ts = record.get(key)
    if ts is None:
        # Try date_normalized
        ts = record.get("date_normalized")
    if ts is None:
        return None

    if isinstance(ts, datetime):
        return ts

    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass

    return None


def _empty_aggregation() -> dict:
    return {
        "record_count": 0,
        "avg_sentiment": 0.0,
        "negative_ratio": 0.0,
        "avg_risk_score": 0.0,
        "avg_emotions": {},
        "avg_families": {},
        "dominant_emotion": "neutro",
        "risk_level_distribution": {},
        "top_topics": [],
    }
