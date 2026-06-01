from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Sample institution registry (expandable)
# In production, this would come from a database
INSTITUTION_REGISTRY: list[dict] = [
    {
        "id": "inst_001",
        "name": "Universidad Nacional",
        "acronyms": ["UN", "U. Nacional", "UNAL"],
        "type": "publica",
        "variants": ["universidad nacional", "unal", "u nacional", "la nacional"],
        "faculties": [
            "ingeniería", "medicina", "derecho", "ciencias", "economía",
            "artes", "enfermería", "odontología", "psicología", "filosofía",
            "sociología", "arquitectura", "veterinaria", "agronomía",
        ],
        "campus": ["ciudad universitaria", "campus central", "sede bogotá"],
        "hashtags": ["#UN", "#UNAL", "#UniversidadNacional", "#SoyUN"],
        "keywords": ["unal", "universidad nacional", "ciudad universitaria"],
    },
    {
        "id": "inst_002",
        "name": "Universidad Tecnológica",
        "acronyms": ["UTEC", "U. Tecnológica"],
        "type": "publica",
        "variants": ["universidad tecnológica", "utec", "la tecnológica"],
        "faculties": [
            "ingeniería de sistemas", "ingeniería industrial", "ingeniería civil",
            "ingeniería mecánica", "ingeniería electrónica", "informática",
            "telecomunicaciones", "mecatrónica",
        ],
        "campus": ["campus tecnología", "sede central"],
        "hashtags": ["#UTEC", "#UniversidadTecnológica", "#SoyUTEC"],
        "keywords": ["utec", "universidad tecnológica", "la tecnológica"],
    },
    {
        "id": "inst_003",
        "name": "Universidad del Valle",
        "acronyms": ["UV", "Univalle"],
        "type": "privada",
        "variants": ["universidad del valle", "univalle", "u del valle"],
        "faculties": [
            "administración", "marketing", "contaduría", "negocios",
            "derecho", "psicología", "comunicación", "diseño gráfico",
        ],
        "campus": ["campus valle", "sede norte", "sede sur"],
        "hashtags": ["#Univalle", "#UniversidadDelValle", "#UV"],
        "keywords": ["univalle", "universidad del valle"],
    },
    {
        "id": "inst_004",
        "name": "Instituto Superior Tecnológico",
        "acronyms": ["IST", "TECSUP"],
        "type": "tecnico",
        "variants": ["instituto superior tecnológico", "ist", "tecsup", "instituto técnico"],
        "faculties": [
            "electrónica", "mecánica", "informática", "redes",
            "administración industrial", "minería",
        ],
        "campus": ["sede principal", "taller central"],
        "hashtags": ["#IST", "#TECSUP", "#InstitutoTecnológico"],
        "keywords": ["ist", "tecsup", "instituto tecnológico"],
    },
    {
        "id": "inst_005",
        "name": "Universidad Católica",
        "acronyms": ["UC", "UCatólica", "La Católica"],
        "type": "privada",
        "variants": ["universidad católica", "la católica", "ucatolica", "u católica"],
        "faculties": [
            "teología", "derecho canónico", "filosofía", "educación",
            "medicina", "enfermería", "psicología", "trabajo social",
        ],
        "campus": ["campus central", "sede san miguel"],
        "hashtags": ["#UCatolica", "#UniversidadCatolica", "#LaCatolica"],
        "keywords": ["católica", "la católica", "universidad católica"],
    },
]

# Generic educational signals (not tied to specific institution)
GENERIC_EDUCATION_SIGNALS: list[str] = [
    "universidad", "universitario", "universitaria", "facultad",
    "carrera", "semestre", "ciclo", "parcial", "parciales",
    "examen", "exámenes", "clases", "profesor", "profesora",
    "compañeros", "estudiante", "estudiantes", "estudiar", "estudiando",
    "campus", "matrícula", "graduación", "tesis", "créditos",
    "beca", "becas", "biblioteca", "laboratorio",
    "decano", "rector", "secretaría académica",
    "bienestar estudiantil", "orientación", "consejería",
    "carrera universitaria", "mi carrera", "la carrera",
]


def find_education_signals(text: str) -> list[str]:
    """Find any educational context signals in text.

    Args:
        text: Preprocessed text (lowercase).

    Returns:
        List of matched signal strings.
    """
    if not text:
        return []

    text_lower = text.lower()
    signals: list[str] = []

    for signal in GENERIC_EDUCATION_SIGNALS:
        if signal in text_lower:
            signals.append(signal)

    return signals


def has_education_context(text: str, min_signals: int = 2) -> bool:
    """Quick check: does text have enough educational signals?

    Args:
        text: Preprocessed text.
        min_signals: Minimum number of signals required.

    Returns:
        True if enough educational signals found.
    """
    return len(find_education_signals(text)) >= min_signals
