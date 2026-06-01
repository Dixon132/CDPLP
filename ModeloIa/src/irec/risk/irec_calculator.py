from __future__ import annotations

import logging
from typing import Any, Optional

from src.irec.utils.constants import IREC_LEVELS, IREC_WEIGHTS

logger = logging.getLogger(__name__)


def calculate_irec(
    family_scores: dict[str, float],
    persistence_score: float = 0.0,
    trend_factor: float = 1.0,
) -> dict:
    """Calculate the Índice de Riesgo Emocional Comunitario (IREC).

    IREC = Σ (family_score × weight) + persistence_bonus - protective_penalty

    Args:
        family_scores: Aggregated emotion family scores.
        persistence_score: How persistently elevated (0-1).
        trend_factor: Growth multiplier (>1 if increasing).

    Returns:
        Dict with irec_value (0-100), irec_level, breakdown.
    """
    if not family_scores:
        return _empty_irec()

    # Map family names to IREC weights
    family_weight_map = {
        "presion_academica": ["estres_academico", "agotamiento_emocional", "desmotivacion_academica"],
        "malestar_interno": ["ansiedad_preocupacion", "tristeza_desesperanza"],
        "social_negativo": ["aislamiento_social", "acoso_conflicto"],
    }

    weighted_sum = 0.0
    total_weight = 0.0
    breakdown: dict[str, float] = {}

    for family, indicators in family_weight_map.items():
        family_score = family_scores.get(family, 0.0)
        for ind in indicators:
            w = IREC_WEIGHTS.get(ind, 0.0)
            weighted_sum += family_score * w
            total_weight += w
            breakdown[ind] = round(family_score * w * 100, 2)

    # Base IREC (0-100 scale)
    if total_weight > 0:
        base_irec = (weighted_sum / total_weight) * 100
    else:
        base_irec = 0.0

    # Persistence bonus: up to +10 points
    persistence_bonus = persistence_score * 10.0

    # Protective penalty: subtract protective signals
    protective_score = family_scores.get("protectoras", 0.0)
    protective_penalty = protective_score * 15.0

    # Trend factor (multiplies base if increasing)
    adjusted_base = base_irec * trend_factor

    # Final IREC
    irec_value = max(0.0, min(100.0, adjusted_base + persistence_bonus - protective_penalty))

    # Determine level (round to avoid boundary issues)
    irec_rounded = round(irec_value)
    irec_level = "sin_tendencia"
    for (low, high), label in IREC_LEVELS.items():
        if low <= irec_rounded <= high:
            irec_level = label
            break

    return {
        "irec_value": round(irec_value, 2),
        "irec_level": irec_level,
        "base_irec": round(base_irec, 2),
        "persistence_bonus": round(persistence_bonus, 2),
        "protective_penalty": round(protective_penalty, 2),
        "trend_factor": round(trend_factor, 2),
        "breakdown": breakdown,
        "protective_score": round(protective_score, 4),
    }


def generate_irec_explanation(irec_result: dict) -> str:
    """Generate a human-readable explanation of the IREC score.

    Args:
        irec_result: Result from calculate_irec().

    Returns:
        Spanish explanation string.
    """
    value = irec_result["irec_value"]
    level = irec_result["irec_level"]
    breakdown = irec_result.get("breakdown", {})

    level_descriptions = {
        "sin_tendencia": "No se observa una tendencia significativa de riesgo emocional en esta comunidad durante el período analizado.",
        "leve": "Se detecta una tendencia leve de malestar emocional. Se recomienda observación institucional.",
        "moderada": "Existe una tendencia moderada de riesgo emocional comunitario. Se sugiere revisión de factores contribuyentes.",
        "elevada": "Se observa una tendencia elevada de riesgo emocional. Se recomienda activar medidas preventivas institucionales.",
        "critica": "ALERTA: Tendencia crítica de riesgo emocional comunitario. Se requiere activación de protocolos de apoyo institucional.",
    }

    description = level_descriptions.get(level, "")

    # Identify top contributing factors
    if breakdown:
        top_factors = sorted(breakdown.items(), key=lambda x: x[1], reverse=True)[:3]
        factor_text = ", ".join(
            f"{ind.replace('_', ' ')} ({score:.1f}%)"
            for ind, score in top_factors if score > 0
        )
        if factor_text:
            description += f" Principales factores: {factor_text}."

    return description


def _empty_irec() -> dict:
    return {
        "irec_value": 0.0,
        "irec_level": "sin_tendencia",
        "base_irec": 0.0,
        "persistence_bonus": 0.0,
        "protective_penalty": 0.0,
        "trend_factor": 1.0,
        "breakdown": {},
        "protective_score": 0.0,
    }
