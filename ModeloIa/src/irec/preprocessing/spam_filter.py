from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# Heuristic patterns for spam detection
URL_DENSITY_PATTERN = re.compile(r"https?://")
REPETITIVE_TEXT_PATTERN = re.compile(r"(.+?)\1{2,}")  # 3+ exact repetitions
EMOJI_ONLY_PATTERN = re.compile(r"^[\U0001F300-\U0001FAFF\s]+$")
ALL_CAPS_PATTERN = re.compile(r"^[A-ZÁÉÍÓÚÑÜ\s!]{10,}$")

SPAM_KEYWORDS = [
    "gané dinero", "gana dinero", "haz dinero", "ingresos extra",
    "trabajo desde casa", "work from home", "bitcoin", "cripto",
    "inversión segura", "método comprobado", "click aquí",
    "suscríbete", "suscríbanse", "like y suscríbete",
    "compra seguidores", "hack", "hackear", "cuenta gratis",
    "oferta limitada", "descuento increíble", "promoción exclusiva",
    "préstamo", "préstamos", "crédito rápido",
    "onlyfans", "contenido exclusivo",
    "visita mi perfil", "sígueme", "follow me",
    "whatsapp", "telegram",
    "descarga gratis", "descargar ahora", "free download",
]


def classify_spam(text: str) -> tuple[bool, float, str]:
    """Heuristic spam detection for social media text.

    Returns:
        Tuple of (is_spam: bool, confidence: float 0.0-1.0, reason: str).
    """
    if not text or not text.strip():
        return False, 0.0, "empty"

    text_lower = text.lower().strip()

    # Check spam keywords
    keyword_hits = sum(1 for kw in SPAM_KEYWORDS if kw in text_lower)
    if keyword_hits >= 2:
        return True, min(0.9, keyword_hits * 0.3), "multiple_spam_keywords"

    if keyword_hits == 1:
        return True, 0.6, "spam_keyword"

    # Check URL density
    urls = URL_DENSITY_PATTERN.findall(text)
    words = text_lower.split()
    if words and len(urls) > len(words) * 0.3:
        return True, 0.8, "high_url_density"

    # Emoji-only content (more than 5 emojis, no real words)
    alpha_chars = sum(1 for c in text if c.isalpha())
    if alpha_chars < 5 and len(text) > 10:
        return True, 0.5, "emoji_or_symbol_only"

    # All caps short messages
    if ALL_CAPS_PATTERN.match(text.strip()):
        return True, 0.4, "all_caps_spam"

    # Repetitive text patterns
    if REPETITIVE_TEXT_PATTERN.search(text_lower):
        return True, 0.7, "repetitive_pattern"

    return False, 0.0, "not_spam"


def filter_spam(
    records: list[dict],
    text_key: str = "text_content",
    min_confidence: float = 0.5,
) -> tuple[list[dict], list[dict]]:
    """Split records into clean and spam groups.

    Args:
        records: List of record dicts.
        text_key: Key of the text field to check.
        min_confidence: Minimum spam confidence to classify as spam.

    Returns:
        Tuple of (clean_records, spam_records).
    """
    clean: list[dict] = []
    spam: list[dict] = []

    for record in records:
        text = record.get(text_key, "")
        is_spam, confidence, reason = classify_spam(text)

        if is_spam and confidence >= min_confidence:
            record["spam_reason"] = reason
            record["spam_confidence"] = confidence
            spam.append(record)
        else:
            clean.append(record)

    if spam:
        logger.info("Filtered %d spam records (kept %d clean)", len(spam), len(clean))

    return clean, spam
