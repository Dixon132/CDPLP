from __future__ import annotations

import logging
from typing import Any, Optional

from src.irec.community.institution_matcher import (
    GENERIC_EDUCATION_SIGNALS,
    INSTITUTION_REGISTRY,
    find_education_signals,
    has_education_context,
)
from src.irec.utils.constants import COMMUNITY_SIGNAL_WEIGHTS

logger = logging.getLogger(__name__)


def score_institution_match(text: str, institution: dict) -> dict:
    """Score how likely text belongs to a specific institution.

    Uses multiple weighted signals:
    - Explicit institution mention (highest weight)
    - Hashtag match
    - Faculty/career mention
    - Campus mention
    - Language/keyword match

    Args:
        text: Preprocessed, lowercase text.
        institution: Institution registry dict.

    Returns:
        Dict with scores, matched signals, and total association score.
    """
    if not text:
        return _empty_result()

    text_lower = text.lower()
    signals_found: list[str] = []
    scores: dict[str, float] = {}

    # 1. Institution mention (name variants)
    name_score = 0.0
    for variant in institution.get("variants", []):
        if variant in text_lower:
            name_score = max(name_score, 1.0)
            signals_found.append(f"name_match:{variant}")

    for acronym in institution.get("acronyms", []):
        # Acronyms need word-boundary matching to avoid false positives
        import re
        pattern = r"\b" + re.escape(acronym.lower()) + r"\b"
        if re.search(pattern, text_lower):
            name_score = max(name_score, 0.9)
            signals_found.append(f"acronym_match:{acronym}")

    scores["institution_mention"] = name_score

    # 2. Hashtag match
    hashtag_score = 0.0
    for tag in institution.get("hashtags", []):
        if tag.lower().lstrip("#") in text_lower:
            hashtag_score = max(hashtag_score, 1.0)
            signals_found.append(f"hashtag:{tag}")

    scores["hashtag_match"] = hashtag_score

    # 3. Faculty mention
    faculty_score = 0.0
    for faculty in institution.get("faculties", []):
        if faculty in text_lower:
            faculty_score = min(1.0, faculty_score + 0.25)
            if faculty_score <= 0.25:
                signals_found.append(f"faculty:{faculty}")

    scores["faculty_mention"] = faculty_score

    # 4. Campus mention
    campus_score = 0.0
    for campus in institution.get("campus", []):
        if campus in text_lower:
            campus_score = max(campus_score, 0.8)
            signals_found.append(f"campus:{campus}")

    scores["campus_mention"] = campus_score

    # 5. Generic education context
    edu_signals = find_education_signals(text)
    context_score = min(1.0, len(edu_signals) / 4)
    scores["language_match"] = context_score
    if edu_signals:
        signals_found.append(f"edu_signals:{len(edu_signals)}")

    # Compute weighted total
    total = 0.0
    max_possible = 0.0
    for signal_type, weight in COMMUNITY_SIGNAL_WEIGHTS.items():
        if signal_type in scores:
            total += scores[signal_type] * weight
            max_possible += weight

    association_score = total / max_possible if max_possible > 0 else 0.0

    return {
        "institution_id": institution.get("id"),
        "institution_name": institution.get("name"),
        "association_score": round(association_score, 4),
        "signal_scores": {k: round(v, 4) for k, v in scores.items()},
        "matched_signals": signals_found,
        "confidence": round(min(1.0, association_score * 1.2), 4),
    }


def find_top_institutions(
    text: str,
    top_n: int = 3,
    min_score: float = 0.1,
) -> list[dict]:
    """Find the most likely institutions for a given text.

    Args:
        text: Preprocessed text.
        top_n: Maximum number of institutions to return.
        min_score: Minimum association score threshold.

    Returns:
        List of institution match results, sorted by score descending.
    """
    if not text:
        return []

    results = [score_institution_match(text, inst) for inst in INSTITUTION_REGISTRY]
    results = [r for r in results if r["association_score"] >= min_score]
    results.sort(key=lambda r: r["association_score"], reverse=True)

    return results[:top_n]


def get_community_summary(text: str) -> dict:
    """Get a complete community context summary for a text.

    Returns:
        Dict with has_edu_context, generic_signals count,
        top institution matches, and association_level.
    """
    signals = find_education_signals(text)
    matches = find_top_institutions(text)

    top_score = matches[0]["association_score"] if matches else 0.0

    if top_score >= 0.6:
        level = "high"
    elif top_score >= 0.3:
        level = "medium"
    elif len(signals) >= 1:
        level = "low"
    else:
        level = "none"

    return {
        "has_education_context": has_education_context(text),
        "generic_signals_count": len(signals),
        "generic_signals": signals[:10],
        "top_institutions": matches,
        "association_level": level,
    }


def _empty_result() -> dict:
    return {
        "institution_id": None,
        "institution_name": None,
        "association_score": 0.0,
        "signal_scores": {},
        "matched_signals": [],
        "confidence": 0.0,
    }
