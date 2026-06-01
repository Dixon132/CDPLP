from __future__ import annotations

import logging
import re
from typing import Optional

from src.irec.utils.constants import (
    EMOTION_CATEGORIES,
    PROTECTIVE_INDICATORS,
    RISK_INDICATORS,
)

logger = logging.getLogger(__name__)

# Build keyword-to-emotion reverse mapping from RISK_INDICATORS
_KEYWORD_EMOTION_MAP: dict[str, str] = {}
_KEYWORD_PROTECTIVE_MAP: dict[str, str] = {}

for indicator, config in RISK_INDICATORS.items():
    family = config["family"]
    for kw in config["keywords"]:
        _KEYWORD_EMOTION_MAP[kw.lower()] = indicator

for indicator, keywords in PROTECTIVE_INDICATORS.items():
    for kw in keywords:
        _KEYWORD_PROTECTIVE_MAP[kw.lower()] = indicator


def detect_emotions(text: str) -> dict[str, float]:
    """Detect emotional signals in text using keyword matching.

    Returns scores (0.0 to 1.0) for each risk indicator category plus
    protective signals.

    Args:
        text: Preprocessed text (lowercase, cleaned).

    Returns:
        Dict mapping indicator_name → score (0.0 to 1.0).
    """
    if not text:
        return {}

    text_lower = text.lower()
    scores: dict[str, float] = {}
    total_matches = 0

    # Count keyword matches per indicator
    for indicator, config in RISK_INDICATORS.items():
        hits = sum(1 for kw in config["keywords"] if kw.lower() in text_lower)
        if hits > 0:
            total_matches += hits
            scores[indicator] = min(1.0, hits / max(len(config["keywords"]), 1) * 3)

    # Protective signals
    protective_hits = 0
    for indicator, keywords in PROTECTIVE_INDICATORS.items():
        hits = sum(1 for kw in keywords if kw.lower() in text_lower)
        if hits > 0:
            protective_hits += hits
            scores[indicator] = min(1.0, hits / max(len(keywords), 1) * 3)

    # Normalize if many matches
    if not scores:
        return {"neutro": 0.5}

    return scores


def detect_emotions_detailed(text: str) -> dict:
    """Detailed emotion detection with per-category breakdown.

    Returns:
        Dict with individual indicator scores, dominant_emotion,
        dominant_family, protective_signals_present, and all_scores.
    """
    scores = detect_emotions(text)

    if not scores or "neutro" in scores:
        return {
            "dominant_emotion": "neutro",
            "dominant_family": "none",
            "scores": scores,
            "protective_present": False,
        }

    # Find dominant emotion (highest score)
    dominant = max(scores.items(), key=lambda x: x[1])

    # Find family
    family = "unknown"
    for indicator, config in RISK_INDICATORS.items():
        if indicator == dominant[0]:
            family = config["family"]
            break

    # Check protective signals
    protective_present = any(
        ind in PROTECTIVE_INDICATORS for ind in scores
    )

    return {
        "dominant_emotion": dominant[0],
        "dominant_score": round(dominant[1], 4),
        "dominant_family": family,
        "scores": {k: round(v, 4) for k, v in scores.items()},
        "protective_present": protective_present,
    }


def get_emotion_family_aggregate(scores: dict[str, float]) -> dict[str, float]:
    """Aggregate individual indicator scores into family scores.

    Returns:
        Dict with family_name → average_score.
    """
    families: dict[str, list[float]] = {
        "malestar_interno": [],
        "presion_academica": [],
        "social_negativo": [],
        "protectoras": [],
    }

    for indicator, score in scores.items():
        if indicator in PROTECTIVE_INDICATORS:
            families["protectoras"].append(score)
        else:
            for indicator_name, config in RISK_INDICATORS.items():
                if indicator == indicator_name:
                    families[config["family"]].append(score)
                    break

    return {
        family: round(sum(vals) / len(vals), 4) if vals else 0.0
        for family, vals in families.items()
    }
