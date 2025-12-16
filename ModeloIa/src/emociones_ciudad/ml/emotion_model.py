from dataclasses import asdict
from typing import List, Dict
from ..nlp.text_cleaning import clean_text
from ..domain.entities import EmotionScore


# Listas súper simples de palabras para el MVP
ANSIEDAD_WORDS = [
    "ansiedad",
    "miedo",
    "asusta",
    "preocupa",
    "preocupación",
    "incertidumbre",
    "bloqueos",
    "caos",
]

TRISTEZA_WORDS = [
    "triste",
    "tristeza",
    "vacío",
    "llorar",
    "nada tuviera sentido",
    "perdió",
    "cansado",
    "cansancio",
]

INCERTIDUMBRE_WORDS = [
    "incertidumbre",
    "no sé",
    "no se si",
    "futuro",
    "qué viene",
    "no confío",
    "no confio",
]


def _score_from_keywords(text: str, keywords: List[str]) -> float:
    text = clean_text(text)
    score = 0
    for kw in keywords:
        if kw in text:
            score += 1
    # normalización súper simple
    return min(score / 3.0, 1.0)  # máximo 1.0


def predict_emotions_for_posts(texts: List[str]) -> List[Dict]:
    results = []
    for t in texts:
        score = EmotionScore(
            ansiedad=_score_from_keywords(t, ANSIEDAD_WORDS),
            tristeza=_score_from_keywords(t, TRISTEZA_WORDS),
            incertidumbre=_score_from_keywords(t, INCERTIDUMBRE_WORDS),
        )
        results.append(asdict(score))
    return results
