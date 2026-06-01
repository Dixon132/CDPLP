from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from langdetect import DetectorFactory, detect, detect_langs
    DetectorFactory.seed = 0  # deterministic results
    HAS_LANGDETECT = True
except ImportError:
    HAS_LANGDETECT = False
    logger.warning("langdetect not installed. Using fallback heuristic.")


def detect_language(text: str) -> str:
    """Detect the language of a text string.

    Uses langdetect if available, falls back to character-based heuristic.

    Args:
        text: Text to analyze.

    Returns:
        ISO 639-1 language code (e.g., 'es', 'en', 'pt').
    """
    if not text or not text.strip():
        return "es"

    if HAS_LANGDETECT:
        try:
            return detect(text)
        except Exception:
            pass

    return _heuristic_detect(text)


def detect_language_with_confidence(text: str) -> tuple[str, float]:
    """Detect language with confidence score.

    Args:
        text: Text to analyze.

    Returns:
        Tuple of (language_code, confidence_score 0.0-1.0).
    """
    if not text or not text.strip():
        return "es", 0.0

    if HAS_LANGDETECT:
        try:
            results = detect_langs(text)
            if results:
                best = results[0]
                return best.lang, best.prob
        except Exception:
            pass

    return _heuristic_detect(text), 0.5


def _heuristic_detect(text: str) -> str:
    """Simple heuristic language detection based on stopword counts."""
    import re
    words = set(re.findall(r"\w+", text.lower()))

    en_markers = {"the", "is", "are", "was", "were", "have", "has", "been",
                  "this", "that", "with", "for", "from", "and", "but", "not",
                  "you", "your", "they", "their", "it", "its", "can", "will",
                  "just", "like", "so", "what", "when", "how", "all", "would"}
    es_markers = {"el", "la", "los", "las", "es", "son", "fue", "fueron",
                  "ha", "han", "estado", "este", "esta", "con", "para", "desde",
                  "y", "pero", "no", "tu", "tus", "ellos", "sus", "que", "por",
                  "del", "las", "una", "como", "más", "ya", "muy", "todo",
                  "también", "me", "nos", "lo", "le", "se", "un"}
    pt_markers = {"que", "não", "é", "são", "foi", "foram", "tem", "está",
                  "com", "para", "mas", "uma", "como", "muito", "já", "meu",
                  "sua", "isso", "essa", "ele", "ela", "você", "nós"}

    en_count = len(words & en_markers)
    es_count = len(words & es_markers)
    pt_count = len(words & pt_markers)

    if es_count > en_count and es_count > pt_count:
        return "es"
    elif pt_count > en_count:
        return "pt"
    else:
        return "en"
