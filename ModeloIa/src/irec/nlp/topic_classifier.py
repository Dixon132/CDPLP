from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# Topic taxonomy with associated keywords
TOPIC_KEYWORDS: dict[str, list[str]] = {
    "estres_academico": [
        "parcial", "parciales", "examen", "exámenes", "entregas", "tareas",
        "sobrecarga", "presión", "nota", "calificación", "reprobar", "reprobé",
        "no duermo", "sin dormir", "trasnochar", "semana pesada", "no llego",
        "acumulado", "saturado", "carga académica", "créditos",
    ],
    "examenes": [
        "examen", "exámenes", "parcial", "parciales", "final", "finales",
        "evaluación", "evaluaciones", "prueba", "pruebas", "test", "quiz",
        "nota", "notas", "calificación", "saqué", "puntaje",
    ],
    "sobrecarga_tareas": [
        "tarea", "tareas", "entrega", "entregas", "trabajo", "trabajos",
        "grupal", "grupales", "plazo", "deadline", "no llego", "acumulado",
        "saturado", "muchas tareas", "montón", "demasiado",
    ],
    "problemas_economicos": [
        "dinero", "plata", "matrícula", "costoso", "caro", "cara", "carísimo",
        "no puedo pagar", "deuda", "préstamo", "beca", "económico", "económica",
        "trabajo y estudio", "trabajar y estudiar", "no alcanza", "gastos",
    ],
    "problemas_familiares": [
        "mis papás", "mis padres", "mi mamá", "mi papá", "familia", "familiar",
        "presión familiar", "me obligan", "no me apoyan", "problemas en casa",
        "discusión", "pelea", "divorcio",
    ],
    "acoso_bullying": [
        "burla", "burlan", "humillan", "humillación", "hostigan", "acoso",
        "acosan", "bullying", "matoneo", "maltrato", "me tratan mal",
        "se meten conmigo", "chistes sobre mí", "me excluyen", "grupo",
    ],
    "soledad_aislamiento": [
        "solo", "sola", "soledad", "aislado", "aislada", "invisible",
        "nadie me habla", "sin amigos", "no encajo", "excluido", "excluida",
        "no pertenezco", "ignorado", "ignorada",
    ],
    "presion_social": [
        "presión social", "expectativas", "comparación", "competencia",
        "qué dirán", "apariencias", "encajar", "aceptación", "redes sociales",
        "instagram", "tiktok", "aparentar",
    ],
    "ansiedad_rendimiento": [
        "ansiedad", "ansioso", "ansiosa", "rendimiento", "desempeño",
        "no voy a poder", "me da miedo", "pánico", "bloqueo", "bloqueé",
        "mente en blanco", "nervioso", "nerviosa", "nervios",
    ],
    "desmotivacion_academica": [
        "desmotivado", "desmotivada", "sin ganas", "no quiero seguir",
        "dejar la carrera", "abandonar", "no me importa", "da igual",
        "para qué", "no sirvo para esto", "no es lo mío",
    ],
    "vida_universitaria": [
        "universidad", "universitario", "universitaria", "campus", "facultad",
        "carrera", "semestre", "ciclo", "clases", "horario", "profesor",
        "profesora", "compañero", "compañera", "compañeros",
        "estudiante", "estudiantes", "biblioteca", "cafetería",
    ],
    "burnout_estudiantil": [
        "burnout", "quemado", "quemada", "agotado", "agotada", "no doy más",
        "sin energía", "sin fuerzas", "drenado", "drenada", "me consume",
        "no rindo", "fatiga", "desgaste",
    ],
    "insomnio_cansancio": [
        "no duermo", "sin dormir", "insomnio", "dormir", "sueño", "trasnochar",
        "trasnochado", "trasnochada", "desvelado", "desvelada", "cansado",
        "cansada", "cansancio", "fatiga", "agotado", "agotada",
    ],
    "incertidumbre_vocacional": [
        "vocación", "vocacional", "no sé si esto es lo mío", "cambio de carrera",
        "me equivoqué", "no era lo que esperaba", "futuro", "incierto",
        "no me veo", "salida laboral", "campo laboral",
    ],
    "desercion_abandono": [
        "dejar la universidad", "abandonar", "retirarme", "no seguir",
        "no continúo", "no vuelvo", "me salgo", "me salí", "no terminé",
        "desertar", "deserción",
    ],
    "conflictos_grupales": [
        "grupo", "grupal", "compañeros", "conflicto", "problema", "pelea",
        "discusión", "no hacen nada", "no trabajan", "aprovechan",
        "yo hago todo", "no colaboran",
    ],
    "discriminacion": [
        "discriminación", "discriminan", "racismo", "machismo", "homofobia",
        "xenofobia", "clasismo", "por ser", "por mi", "diferente",
    ],
    "crisis_institucional": [
        "huelga", "paro", "toma", "protesta", "manifestación", "crisis",
        "administración", "rector", "rectoría", "autoridades", "no hacen nada",
        "corrupción", "injusticia",
    ],
}


def classify_topic(text: str, top_n: int = 3, min_score: float = 0.1) -> list[dict]:
    """Classify text into one or more topics using keyword matching.

    Args:
        text: Preprocessed text (lowercase, cleaned).
        top_n: Maximum number of topics to return.
        min_score: Minimum score threshold to include a topic.

    Returns:
        List of {topic, score} dicts, sorted by score descending.
    """
    if not text:
        return []

    text_lower = text.lower()
    topic_scores: dict[str, float] = {}

    for topic, keywords in TOPIC_KEYWORDS.items():
        hits = 0
        for kw in keywords:
            if kw.lower() in text_lower:
                hits += 1

        if hits > 0:
            # Score: proportion of keywords matched, capped at 1.0
            score = min(1.0, hits / max(len(keywords), 1) * 5)
            topic_scores[topic] = round(score, 4)

    # Sort by score
    sorted_topics = sorted(topic_scores.items(), key=lambda x: x[1], reverse=True)

    return [
        {"topic": topic, "score": score}
        for topic, score in sorted_topics[:top_n]
        if score >= min_score
    ]


def get_topic_labels(classifications: list[dict]) -> list[str]:
    """Extract just the topic labels from classification results."""
    return [c["topic"] for c in classifications]
