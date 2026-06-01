from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Scene categories relevant to educational/emotional context
# These describe general visual contexts WITHOUT identifying individuals
SCENE_CATEGORIES = {
    "academic_study": [
        "libros", "cuaderno", "apuntes", "laptop", "computadora",
        "escritorio", "estudiando", "tareas", "biblioteca",
        "resaltador", "marcador", "pizarra", "pizarrón",
        "calculadora", "tablet", "ipad",
    ],
    "campus_life": [
        "campus", "universidad", "aula", "salón", "clase",
        "cafetería", "pasillo", "auditorio", "gimnasio",
        "jardín", "entrada", "edificio", "facultad",
    ],
    "meme_academic": [
        "meme", "shitpost", "captura", "screenshot", "tweet",
        "whatsapp", "chat", "conversación", "reacción",
    ],
    "emotional_text": [
        "frase", "cita", "reflexión", "poema", "texto",
        "imagen con texto", "typography", "letras",
    ],
    "night_study": [
        "noche", "madrugada", "café", "taza", "desvelado",
        "lámpara", "oscuro", "ventana",
    ],
    "schedule_calendar": [
        "horario", "calendario", "cronograma", "fechas",
        "parciales", "exámenes", "entregas", "deadline",
    ],
    "food_drink": [
        "comida", "café", "bebida", "almuerzo", "snack",
        "energizante", "monster", "red bull",
    ],
    "irrelevant": [
        "selfie", "paisaje", "playa", "fiesta", "concierto",
        "comida", "mascota", "perro", "gato", "carro", "auto",
    ],
}


def classify_scene(text: str) -> dict:
    """Classify the visual context based on text metadata.

    Uses text signals (captions, OCR, descriptions) to infer the
    type of scene. Does NOT analyze actual images directly.

    Args:
        text: Combined text from captions, OCR, and descriptions.

    Returns:
        Dict with category, confidence, and matched keywords.
    """
    if not text:
        return {"category": "unknown", "confidence": 0.0, "matched": []}

    text_lower = text.lower()
    scores: dict[str, float] = {}

    for category, keywords in SCENE_CATEGORIES.items():
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits > 0:
            scores[category] = min(1.0, hits / max(len(keywords), 1) * 4)

    if not scores:
        return {"category": "unknown", "confidence": 0.0, "matched": []}

    best = max(scores.items(), key=lambda x: x[1])

    return {
        "category": best[0],
        "confidence": round(best[1], 4),
        "all_scores": {k: round(v, 4) for k, v in scores.items()},
    }


def is_educational_scene(scene_classification: dict) -> bool:
    """Check if the scene is related to educational context.

    Args:
        scene_classification: Result from classify_scene().

    Returns:
        True if scene is educational/academic.
    """
    educational_categories = {
        "academic_study", "campus_life", "night_study",
        "schedule_calendar", "meme_academic",
    }
    return scene_classification.get("category") in educational_categories
