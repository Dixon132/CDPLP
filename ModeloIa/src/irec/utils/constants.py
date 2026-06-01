from __future__ import annotations

# ============================================================
# Emotion categories used across the system
# ============================================================

EMOTION_CATEGORIES = [
    "tristeza",
    "miedo",
    "ansiedad",
    "ira",
    "frustracion",
    "alegria",
    "cansancio",
    "culpa",
    "verguenza",
    "soledad",
    "desesperanza",
    "estres",
    "agotamiento",
    "confusion",
    "desmotivacion",
]

# Families for aggregation
EMOTION_FAMILIES = {
    "malestar_interno": ["tristeza", "ansiedad", "miedo", "soledad", "desesperanza"],
    "presion_academica": ["estres", "agotamiento", "frustracion", "desmotivacion"],
    "social_negativo": ["aislamiento", "verguenza", "culpa"],
    "protectoras": ["alegria", "esperanza", "motivacion", "apoyo_social", "pertenencia"],
}

# ============================================================
# Risk indicators
# ============================================================

RISK_INDICATORS = {
    "estres_academico": {
        "keywords": [
            "parciales", "examen", "exámenes", "entregas", "tareas",
            "sobrecarga", "presión", "nota", "calificación", "reprobar",
            "no duermo", "sin dormir", "trasnochar", "semana pesada",
            "no llego", "acumulado", "saturado",
        ],
        "family": "presion_academica",
    },
    "agotamiento_emocional": {
        "keywords": [
            "no doy más", "no puedo más", "quemado", "burnout",
            "agotado", "agotada", "sin energía", "sin fuerzas",
            "cansado", "cansada", "fatiga", "desgaste",
            "no rindo", "me consume",
        ],
        "family": "presion_academica",
    },
    "ansiedad_preocupacion": {
        "keywords": [
            "miedo", "ansiedad", "ansioso", "ansiosa", "preocupado",
            "preocupada", "nervioso", "nervios", "no puedo dejar de pensar",
            "me da miedo", "tengo miedo", "pánico", "bloqueo",
            "incertidumbre", "qué va a pasar",
        ],
        "family": "malestar_interno",
    },
    "tristeza_desesperanza": {
        "keywords": [
            "triste", "tristeza", "sin sentido", "vacío", "vacía",
            "no importa", "da igual", "desesperanza", "sin esperanza",
            "no vale la pena", "para qué", "sin ganas",
        ],
        "family": "malestar_interno",
    },
    "aislamiento_social": {
        "keywords": [
            "solo", "sola", "soledad", "aislado", "aislada",
            "nadie me habla", "sin amigos", "no encajo", "excluido",
            "excluida", "invisible", "ignorado", "no pertenezco",
        ],
        "family": "social_negativo",
    },
    "acoso_conflicto": {
        "keywords": [
            "burla", "burlan", "humillan", "humillación", "hostigan",
            "acosan", "acoso", "bullying", "maltrato", "me tratan mal",
            "discriminación", "se meten conmigo", "chistes sobre mí",
        ],
        "family": "social_negativo",
    },
    "desmotivacion_academica": {
        "keywords": [
            "no quiero seguir", "dejar la carrera", "abandonar",
            "no me importa la universidad", "sin motivación",
            "desmotivado", "desmotivada", "no tengo ganas de ir",
            "no sirvo para esto", "no es lo mío",
        ],
        "family": "presion_academica",
    },
}

PROTECTIVE_INDICATORS = {
    "apoyo_social": [
        "me ayudaron", "apoyo", "compañeros", "amigos", "gracias a",
        "estamos juntos", "no estoy solo", "me escucharon",
    ],
    "pertenencia": [
        "me gusta mi universidad", "orgulloso", "orgullosa",
        "pertenezco", "mi facultad", "mi carrera",
    ],
    "busqueda_ayuda": [
        "fui a orientación", "pedí ayuda", "terapia", "psicólogo",
        "psicóloga", "consejería", "bienestar estudiantil",
    ],
    "esperanza": [
        "va a mejorar", "saldré adelante", "todo pasa", "esperanza",
        "optimista", "confío", "se puede",
    ],
}

# ============================================================
# IREC configuration
# ============================================================

IREC_WEIGHTS = {
    "estres_academico": 0.20,
    "agotamiento_emocional": 0.20,
    "ansiedad_preocupacion": 0.15,
    "tristeza_desesperanza": 0.15,
    "aislamiento_social": 0.12,
    "acoso_conflicto": 0.10,
    "desmotivacion_academica": 0.08,
    "persistencia_temporal": 0.10,  # bonus multiplier
    "protectoras": 0.10,  # subtractive weight
}

IREC_LEVELS = {
    (0, 20): "sin_tendencia",
    (21, 40): "leve",
    (41, 60): "moderada",
    (61, 80): "elevada",
    (81, 100): "critica",
}

# ============================================================
# Topic taxonomy
# ============================================================

TOPIC_TAXONOMY = [
    "estres_academico",
    "examenes",
    "sobrecarga_tareas",
    "problemas_economicos",
    "problemas_familiares",
    "acoso_bullying",
    "soledad_aislamiento",
    "presion_social",
    "ansiedad_rendimiento",
    "desmotivacion_academica",
    "problemas_docentes",
    "problemas_administrativos",
    "vida_universitaria",
    "burnout_estudiantil",
    "insomnio_cansancio",
    "incertidumbre_vocacional",
    "desercion_abandono",
    "conflictos_grupales",
    "discriminacion",
    "crisis_institucional",
]

# ============================================================
# Community / Institution signals
# ============================================================

COMMUNITY_SIGNAL_WEIGHTS = {
    "institution_mention": 0.35,
    "hashtag_match": 0.20,
    "faculty_mention": 0.15,
    "campus_mention": 0.10,
    "event_match": 0.10,
    "language_match": 0.10,
}

# ============================================================
# Temporal windows
# ============================================================

DEFAULT_WINDOW_DAYS = 7
WINDOW_SIZES = [7, 14, 30]

# ============================================================
# Spanish stopwords for analytics
# ============================================================

SPANISH_STOPWORDS = {
    "de", "la", "que", "el", "en", "y", "a", "los", "del", "se",
    "las", "por", "un", "para", "con", "no", "una", "su", "al",
    "lo", "como", "más", "pero", "sus", "le", "ya", "o", "este",
    "sí", "porque", "esta", "entre", "cuando", "muy", "sin", "sobre",
    "también", "me", "hasta", "hay", "donde", "quien", "todo",
    "nos", "durante", "todos", "uno", "les", "ni", "contra",
    "otros", "ese", "eso", "ante", "ellos", "e", "qué", "está",
    "mi", "tu", "te", "han", "haber", "ser", "tener", "hacer",
    "poder", "decir", "ir", "ver", "dar", "saber", "querer",
    "llegar", "pasar", "deber", "poner", "parecer", "quedar",
    "creer", "hablar", "llevar", "dejar", "seguir", "encontrar",
    "llamar",
}
