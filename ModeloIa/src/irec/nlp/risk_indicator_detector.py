from __future__ import annotations

import logging
from typing import Optional

from src.irec.nlp.emotion_detector import detect_emotions, get_emotion_family_aggregate
from src.irec.utils.constants import IREC_WEIGHTS

logger = logging.getLogger(__name__)


def detect_risk_indicators(text: str) -> dict:
    """Detect risk emotional indicators in text.

    Combines emotion detection with weighted scoring aligned to IREC.

    Args:
        text: Preprocessed text.

    Returns:
        Dict with risk_scores per indicator, overall_risk_score (0-1),
        risk_level, protective_signals.
    """
    emotions = detect_emotions(text)

    if not emotions or "neutro" in emotions:
        return {
            "risk_scores": {},
            "overall_risk_score": 0.0,
            "risk_level": "sin_riesgo",
            "protective_signals": [],
            "active_risks": [],
        }

    # Weight scores by IREC weights
    weighted_risk = 0.0
    total_weight = 0.0
    risk_scores: dict[str, float] = {}
    protective_signals: list[str] = []
    active_risks: list[str] = []

    for indicator, score in emotions.items():
        risk_scores[indicator] = round(score, 4)

        weight = IREC_WEIGHTS.get(indicator, 0.0)
        if weight > 0 and indicator not in ("protectoras",):
            weighted_risk += score * weight
            total_weight += weight
            if score > 0.2:
                active_risks.append(indicator)
        elif indicator in ("apoyo_social", "pertenencia", "busqueda_ayuda", "esperanza"):
            protective_signals.append(indicator)

    # Normalize overall risk
    if total_weight > 0:
        overall_risk = weighted_risk / total_weight
    else:
        overall_risk = 0.0

    # Risk level
    if overall_risk < 0.2:
        level = "sin_riesgo"
    elif overall_risk < 0.4:
        level = "bajo"
    elif overall_risk < 0.6:
        level = "medio"
    elif overall_risk < 0.8:
        level = "alto"
    else:
        level = "critico"

    # Family aggregates
    families = get_emotion_family_aggregate(emotions)

    return {
        "risk_scores": risk_scores,
        "overall_risk_score": round(overall_risk, 4),
        "risk_level": level,
        "protective_signals": protective_signals,
        "active_risks": active_risks,
        "family_scores": families,
    }


def batch_detect_risks(texts: list[str]) -> list[dict]:
    """Detect risk indicators for a batch of texts.

    Args:
        texts: List of preprocessed text strings.

    Returns:
        List of risk detection results.
    """
    return [detect_risk_indicators(text) for text in texts]
