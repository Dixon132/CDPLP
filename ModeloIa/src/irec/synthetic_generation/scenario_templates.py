from __future__ import annotations

import random
from typing import Any

# ============================================================
# Educational institutions (fictionalized for privacy)
# ============================================================

INSTITUTIONS = [
    {"name": "Universidad Nacional", "type": "pública", "country": "genérico"},
    {"name": "Universidad Tecnológica", "type": "pública", "country": "genérico"},
    {"name": "Universidad del Valle", "type": "privada", "country": "genérico"},
    {"name": "Instituto Superior Tecnológico", "type": "técnico", "country": "genérico"},
    {"name": "Universidad Autónoma Metropolitana", "type": "pública", "country": "genérico"},
    {"name": "Universidad Católica", "type": "privada", "country": "genérico"},
]

FACULTIES = [
    "Ingeniería", "Medicina", "Derecho", "Psicología", "Administración",
    "Arquitectura", "Ciencias", "Humanidades", "Economía", "Enfermería",
    "Odontología", "Veterinaria", "Informática", "Contaduría", "Comunicación",
]

CAREERS = [
    "Ingeniería Civil", "Medicina", "Ingeniería de Sistemas", "Derecho",
    "Psicología", "Administración de Empresas", "Arquitectura", "Contaduría",
    "Ingeniería Industrial", "Enfermería", "Economía", "Marketing",
    "Diseño Gráfico", "Medicina Veterinaria", "Ingeniería Mecánica",
    "Biología", "Matemáticas", "Física", "Literatura", "Filosofía",
]

# ============================================================
# Academic stress scenarios
# ============================================================

SCENARIOS = {
    "semana_parciales": {
        "description": "Semana de exámenes parciales, máxima presión académica",
        "emotions": ["estrés", "ansiedad", "agotamiento", "miedo"],
        "typical_phrases": [
            "no he dormido en 3 días",
            "tengo 4 parciales esta semana",
            "no llego con el estudio",
            "me va a dar algo",
            "sobreviviendo a puro café",
        ],
    },
    "entregas_finales": {
        "description": "Entrega de trabajos finales, saturación de tareas",
        "emotions": ["frustración", "estrés", "agotamiento", "ira"],
        "typical_phrases": [
            "tengo 3 entregas para mañana",
            "no voy a terminar nunca",
            "el grupo no hace nada",
            "me está consumiendo este semestre",
            "necesito vacaciones urgente",
        ],
    },
    "matricula": {
        "description": "Proceso de matrícula, problemas económicos y administrativos",
        "emotions": ["frustración", "ansiedad", "incertidumbre", "ira"],
        "typical_phrases": [
            "la matrícula está carísima",
            "colapsó el sistema",
            "no sé si voy a poder pagar",
            "otra vez haciendo cola por 3 horas",
            "los trámites son un desastre",
        ],
    },
    "inicio_semestre": {
        "description": "Primeras semanas del semestre, adaptación",
        "emotions": ["incertidumbre", "motivación", "ansiedad", "esperanza"],
        "typical_phrases": [
            "primer día y ya estoy perdido",
            "este profe parece buena onda",
            "no conozco a nadie en mi clase",
            "este semestre promete",
            "los horarios están terribles",
        ],
    },
    "crisis_vocacional": {
        "description": "Dudas sobre la carrera, cuestionamiento existencial",
        "emotions": ["desesperanza", "tristeza", "confusión", "ansiedad"],
        "typical_phrases": [
            "no sé si esta es mi vocación",
            "me equivoqué de carrera",
            "mis papás me obligaron a estudiar esto",
            "no me veo trabajando de esto",
            "quiero dejarlo todo",
        ],
    },
    "aislamiento_social": {
        "description": "Dificultades de integración, soledad en el campus",
        "emotions": ["soledad", "tristeza", "vergüenza", "ansiedad"],
        "typical_phrases": [
            "no tengo amigos en la universidad",
            "todos ya tienen sus grupos",
            "me como solo en la cafetería",
            "nadie me habla",
            "me siento invisible",
        ],
    },
    "apoyo_positivo": {
        "description": "Experiencias positivas, apoyo, superación",
        "emotions": ["esperanza", "alegría", "motivación", "pertenencia"],
        "typical_phrases": [
            "mis compañeros me ayudaron muchísimo",
            "aprobé el examen que creía imposible",
            "hoy me sentí orgulloso de mi carrera",
            "el profe nos dio una charla muy motivadora",
            "fui a orientación psicológica y me ayudó",
        ],
    },
    "conflicto_docente": {
        "description": "Problemas con profesores, maltrato, injusticias",
        "emotions": ["frustración", "ira", "impotencia", "humillación"],
        "typical_phrases": [
            "el profe nos humilló en clase",
            "es injusto cómo califica",
            "tiene preferidos y es obvio",
            "nos trata como si fuéramos tontos",
            "puse queja pero no pasó nada",
        ],
    },
}


def get_random_scenario_context() -> dict[str, Any]:
    """Generate a random educational context for synthetic data."""
    institution = random.choice(INSTITUTIONS)
    faculty = random.choice(FACULTIES)
    career = random.choice(CAREERS)
    scenario_name, scenario = random.choice(list(SCENARIOS.items()))

    context_phrases = [
        f"estudiante de {career} en {institution['name']}",
        f"{faculty} de la {institution['name']}",
        f"{institution['type']} - {career}",
        f"semestre avanzado en {faculty}",
        f"primeros ciclos de {career}",
        f"universidad {institution['type']} - {faculty}",
    ]

    return {
        "institution": institution,
        "faculty": faculty,
        "career": career,
        "scenario": scenario_name,
        "scenario_description": scenario["description"],
        "context_hint": random.choice(context_phrases),
    }
