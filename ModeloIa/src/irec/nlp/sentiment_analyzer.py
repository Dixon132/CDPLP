from __future__ import annotations

import logging
from typing import Optional

from src.irec.utils.constants import SPANISH_STOPWORDS

logger = logging.getLogger(__name__)

# Spanish sentiment lexicons
POSITIVE_WORDS: set[str] = {
    "feliz", "alegre", "contento", "contenta", "bien", "excelente", "genial",
    "maravilloso", "maravillosa", "increíble", "fantástico", "fantástica",
    "bueno", "buena", "bonito", "bonita", "hermoso", "hermosa", "grandioso",
    "grandiosa", "espectacular", "positivo", "positiva", "motivado", "motivada",
    "motivación", "esperanzado", "esperanzada", "esperanza", "optimista",
    "agradecido", "agradecida", "gracias", "orgulloso", "orgullosa",
    "satisfecho", "satisfecha", "tranquilo", "tranquila", "encantado",
    "encantada", "emocionado", "emocionada", "amor", "cariño", "apoyo",
    "ayuda", "ayudaron", "ayudó", "compañeros", "amigos", "amigas",
    "superado", "superé", "logré", "logrado", "aprobé", "aprobado",
    "éxito", "exitosa", "exitoso", "confío", "confianza", "seguro",
    "segura", "puedo", "podemos", "saldré", "adelante", "mejor",
    "mejorando", "aprendí", "aprendiendo", "creciendo",
}

NEGATIVE_WORDS: set[str] = {
    "triste", "tristeza", "deprimido", "deprimida", "mal", "horrible",
    "terrible", "pésimo", "pésima", "horroroso", "horrorosa", "fatal",
    "desastroso", "desastrosa", "negativo", "negativa", "desmotivado",
    "desmotivada", "desesperado", "desesperada", "desesperanza",
    "angustiado", "angustiada", "angustia", "ansioso", "ansiosa",
    "ansiedad", "estresado", "estresada", "estrés", "agotado", "agotada",
    "agotamiento", "cansado", "cansada", "cansancio", "quemado", "quemada",
    "burnout", "frustrado", "frustrada", "frustración", "fracaso",
    "fracasé", "fracasar", "reprobé", "reprobar", "perdí", "perder",
    "solo", "sola", "soledad", "aislado", "aislada", "excluido",
    "excluida", "ignorado", "ignorada", "invisible", "humillado",
    "humillada", "humillación", "burla", "burlan", "acoso", "acosan",
    "bullying", "miedo", "temor", "asustado", "asustada", "preocupado",
    "preocupada", "preocupación", "dolor", "duele", "sufrimiento",
    "sufrir", "llorar", "llanto", "odio", "odiar", "enojo", "ira",
    "furioso", "furiosa", "impotente", "impotencia", "culpa", "culpable",
    "vergüenza", "inútil", "insuficiente", "no puedo", "no doy más",
    "sin ganas", "sin sentido", "vacío", "vacía",
}

INTENSIFIERS: set[str] = {
    "muy", "mucho", "muchísimo", "bastante", "demasiado", "tan", "tanto",
    "extremadamente", "totalmente", "completamente", "absolutamente",
    "realmente", "verdaderamente", "super", "súper", "re",
}

NEGATION_WORDS: set[str] = {
    "no", "ni", "nunca", "jamás", "tampoco", "nada", "nadie", "ningún",
    "ninguno", "ninguna", "sin",
}


def analyze_sentiment(text: str) -> dict:
    """Rule-based sentiment analysis for Spanish text.

    Uses lexicon matching with negation handling and intensifier boosting.

    Returns:
        Dict with label (positivo/negativo/neutro), score (-1.0 to 1.0),
        and confidence (0.0 to 1.0).
    """
    if not text or not text.strip():
        return {"label": "neutro", "score": 0.0, "confidence": 0.0}

    words = text.lower().split()
    if not words:
        return {"label": "neutro", "score": 0.0, "confidence": 0.0}

    pos_count = 0
    neg_count = 0
    negate_window = 0  # how many remaining words to negate
    intensifier_active = False
    total_relevant = 0

    for i, word in enumerate(words):
        clean = word.strip(".,!?¿¡:;()[]\"'")

        if clean in NEGATION_WORDS:
            negate_window = 2  # negate the next 2 relevant words
            continue

        if clean in INTENSIFIERS:
            intensifier_active = True
            continue

        in_negation = negate_window > 0

        if clean in POSITIVE_WORDS:
            weight = 1.5 if intensifier_active else 1.0
            if in_negation:
                neg_count += weight
            else:
                pos_count += weight
            total_relevant += 1
            if negate_window > 0:
                negate_window -= 1

        elif clean in NEGATIVE_WORDS:
            weight = 1.5 if intensifier_active else 1.0
            if in_negation:
                pos_count += weight
            else:
                neg_count += weight
            total_relevant += 1
            if negate_window > 0:
                negate_window -= 1

        intensifier_active = False

    if total_relevant == 0:
        return {"label": "neutro", "score": 0.0, "confidence": 0.3}

    # Compute sentiment score (-1 to 1)
    if pos_count + neg_count == 0:
        return {"label": "neutro", "score": 0.0, "confidence": 0.0}

    score = (pos_count - neg_count) / (pos_count + neg_count)

    # Confidence based on how many relevant words were found
    confidence = min(1.0, total_relevant / max(len(words), 1) * 3)

    # Label
    if score > 0.15:
        label = "positivo"
    elif score < -0.15:
        label = "negativo"
    else:
        label = "neutro"

    return {
        "label": label,
        "score": round(score, 4),
        "confidence": round(confidence, 4),
        "positive_words": pos_count,
        "negative_words": neg_count,
        "total_relevant": total_relevant,
    }
