import re
from collections import Counter
from typing import List, Dict

import pandas as pd

# Stopwords muy básicos en español (puedes ampliarlos luego)
STOPWORDS_ES = {
    "de",
    "la",
    "el",
    "y",
    "en",
    "que",
    "los",
    "las",
    "un",
    "una",
    "por",
    "con",
    "no",
    "se",
    "al",
    "lo",
    "como",
    "es",
    "ya",
    "más",
    "mas",
    "esto",
    "esa",
    "ese",
    "a",
    "mi",
    "me",
    "tu",
    "su",
    "esto",
    "eso",
    "solo",
    "sólo",
    "aunque",
    "pero",
    "sin",
    "ni",
    "del",
}

# Mapear algunas palabras clave a "temas" más interpretables
THEME_KEYWORDS = {
    "pdc": "desconfianza en el nuevo gobierno",
    "libre": "frustración por derrota del partido LIBRE",
    "bloqueos": "conflictos sociales y bloqueos",
    "bloqueando": "conflictos sociales y bloqueos",
    "bloqueos": "conflictos sociales y bloqueos",
    "fraude": "dudas sobre la transparencia electoral",
    "economía": "preocupación por la economía",
    "economia": "preocupación por la economía",
    "trabajo": "miedo a perder estabilidad laboral",
    "laboral": "miedo a perder estabilidad laboral",
    "miedo": "sensación generalizada de miedo",
    "ansiedad": "aumento de ansiedad colectiva",
    "futuro": "incertidumbre por el futuro del país",
    "bloqueos": "conflictos sociales y bloqueos",
    "calle": "tensión y conflictos en las calles",
    "protestar": "posibles movilizaciones y protestas",
    "democracia": "tensión por resultados democráticos",
    "desastre": "percepción negativa del resultado electoral",
}


def tokenize(text: str) -> List[str]:
    """Tokenización muy simple: letras, minúsculas, sin stopwords."""
    if not isinstance(text, str):
        return []
    text = text.lower()
    # dejar solo letras y espacios
    text = re.sub(r"[^a-záéíóúñü\s]", " ", text)
    tokens = text.split()
    tokens = [t for t in tokens if t not in STOPWORDS_ES and len(t) >= 4]
    return tokens


def extract_top_keywords_for_group(
    df_group: pd.DataFrame, emotion_col: str, threshold: float = 0.6, top_n: int = 5
) -> List[str]:
    """
    Para un grupo (zona+fecha), toma los textos con emoción alta y
    devuelve las palabras clave más frecuentes.
    """
    # Filtrar posts donde la emoción dominante está alta
    df_sel = df_group[df_group[emotion_col] >= threshold]
    if df_sel.empty:
        df_sel = df_group  # si no hay altos, usamos todos

    counter = Counter()

    for text in df_sel["text"]:
        for tok in tokenize(text):
            counter[tok] += 1

    if not counter:
        return []

    return [w for w, _ in counter.most_common(top_n)]


def map_keywords_to_themes(keywords: List[str]) -> List[str]:
    """Transforma algunas palabras clave en temas explicativos."""
    themes = set()
    for kw in keywords:
        if kw in THEME_KEYWORDS:
            themes.add(THEME_KEYWORDS[kw])
    return list(themes)


def build_explanations(df_emotions: pd.DataFrame, agg_df: pd.DataFrame) -> pd.DataFrame:
    """
    Toma el DataFrame con emociones por post (df_emotions) y el agregado
    por zona+fecha (agg_df), y devuelve un nuevo DataFrame con una columna
    'summary' explicativa.
    """
    summaries = []

    for _, row in agg_df.iterrows():
        zone = row["zone"]
        date = row["date"]

        # Filtrar posts de esa zona y fecha
        mask = (df_emotions["zone"] == zone) & (df_emotions["date"] == date)
        df_group = df_emotions[mask]

        if df_group.empty:
            summaries.append("")
            continue

        # Encontrar emoción dominante en el promedio
        mean_vals = {
            "ansiedad": row["ansiedad_mean"],
            "tristeza": row["tristeza_mean"],
            "incertidumbre": row["incertidumbre_mean"],
        }
        dominant_emotion = max(mean_vals, key=mean_vals.get)  # type: ignore[arg-type]

        # Extraer keywords y temas para esa emoción dominante
        keywords = extract_top_keywords_for_group(
            df_group,
            emotion_col=dominant_emotion,
            threshold=0.6,
            top_n=5,
        )
        themes = map_keywords_to_themes(keywords)

        # Armar frase explicativa
        risk = row["risk_level"]
        n_posts = int(row["n_posts"])

        emotion_label = {
            "ansiedad": "ansiedad",
            "tristeza": "tristeza",
            "incertidumbre": "incertidumbre",
        }[dominant_emotion]

        if themes:
            themes_text = "; ".join(themes)
        elif keywords:
            themes_text = "palabras frecuentes: " + ", ".join(keywords)
        else:
            themes_text = "comentarios variados sin un tema dominante claro"

        summary = (
            f"En {zone} el día {date}, el nivel de riesgo emocional es {risk} "
            f"(principalmente por {emotion_label}). "
            f"Se analizaron {n_posts} publicaciones. "
            f"Las principales preocupaciones detectadas son: {themes_text}."
        )

        summaries.append(summary)

    # Añadir columna al DataFrame agregado
    agg_with_summary = agg_df.copy()
    agg_with_summary["summary"] = summaries
    return agg_with_summary
