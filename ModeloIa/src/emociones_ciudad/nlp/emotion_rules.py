import re
from collections import Counter

# Palabras clave simples (baseline)
ANXIETY_WORDS = {
    "miedo",
    "ansiedad",
    "preocupa",
    "preocupado",
    "inseguridad",
    "tenso",
    "nervioso",
    "temor",
    "incertidumbre",
}

SADNESS_WORDS = {
    "triste",
    "tristeza",
    "llorar",
    "pena",
    "vacío",
    "deprimido",
    "agotado",
    "cansado",
    "frustrado",
}

UNCERTAINTY_WORDS = {
    "no sé",
    "no se",
    "qué pasará",
    "qué viene",
    "incierto",
    "dudas",
    "confusión",
    "confundido",
}


def score_emotions(text: str) -> dict:
    """
    Devuelve un score simple por emoción basado en palabras clave.
    """
    if not text:
        return {
            "ansiedad": 0.0,
            "tristeza": 0.0,
            "incertidumbre": 0.0,
        }

    text = text.lower()

    tokens = re.findall(r"\b\w+\b", text)
    counts = Counter(tokens)

    ansiedad = sum(counts[w] for w in ANXIETY_WORDS if w in counts)
    tristeza = sum(counts[w] for w in SADNESS_WORDS if w in counts)
    incertidumbre = sum(1 for w in UNCERTAINTY_WORDS if w in text)

    total = ansiedad + tristeza + incertidumbre

    if total == 0:
        return {
            "ansiedad": 0.0,
            "tristeza": 0.0,
            "incertidumbre": 0.0,
        }

    return {
        "ansiedad": ansiedad / total,
        "tristeza": tristeza / total,
        "incertidumbre": incertidumbre / total,
    }
