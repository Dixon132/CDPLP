from typing import Dict
import pandas as pd

from emociones_ciudad.infrastructure.io.csv_reader import load_posts_csv
from emociones_ciudad.ml.model_predict import predict_emotion


DATA_PATH = "data/raw/posts_electorales.csv"


# =========================================================
# ANALIZAR MÉTRICAS POR ZONA
# =========================================================
def analyze_zone(zone: str, days: int) -> Dict:
    print("\n=== ANALYZE_ZONE START ===")
    print(f"Zona solicitada: {zone}")
    print(f"Días solicitados: {days}")

    df = load_posts_csv(DATA_PATH)

    # Asegurar que created_at sea timezone-aware (UTC)
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)

    # Filtrar por zona
    df = df[df["zone"] == zone]

    # Ventana temporal
    cutoff = pd.Timestamp.utcnow() - pd.Timedelta(days=days)
    df = df[df["created_at"] >= cutoff]

    total_posts = len(df)
    print(f"Total de publicaciones filtradas: {total_posts}")

    if total_posts == 0:
        response = {
            "zone": zone,
            "total_posts": 0,
            "prevalence": {
                "ansiedad": 0.0,
                "tristeza": 0.0,
                "neutral": 0.0,
            },
        }
        print("RESPUESTA METRICS (SIN DATOS):", response)
        return response

    # Predicción emocional
    df["emotion"] = df["text"].apply(predict_emotion)

    prevalence = df["emotion"].value_counts(normalize=True).round(3).to_dict()

    # Asegurar claves fijas
    for key in ["ansiedad", "tristeza", "neutral"]:
        prevalence.setdefault(key, 0.0)

    response = {
        "zone": zone,
        "total_posts": total_posts,
        "prevalence": prevalence,
    }

    print("RESPUESTA METRICS:", response)
    print("=== ANALYZE_ZONE END ===\n")

    return response


# =========================================================
# EVALUAR ALERTA EMOCIONAL
# =========================================================
def evaluate_alert(zone: str, days: int) -> Dict:
    print("\n=== EVALUATE_ALERT START ===")

    metrics = analyze_zone(zone, days)
    prevalence = metrics.get("prevalence", {})

    if not prevalence or metrics["total_posts"] == 0:
        response = {
            "triggered": False,
            "level": "SIN DATOS",
            "reason": "No existen publicaciones suficientes para evaluar la zona.",
        }
        print("RESPUESTA ALERT (SIN DATOS):", response)
        print("=== EVALUATE_ALERT END ===\n")
        return response

    # Emoción dominante
    dominant_emotion = max(prevalence, key=prevalence.get)
    dominant_emotion = dominant_emotion.strip().lower()
    value = prevalence.get(dominant_emotion, 0.0)

    print("Prevalencia:", prevalence)
    print("Emoción dominante:", dominant_emotion)
    print("Valor dominante:", value)

    # Umbrales por emoción
    thresholds = {
        "ansiedad": {
            "alerta": 0.15,
            "critico": 0.35,
            "desc": "preocupación colectiva, incertidumbre social y estrés sostenido",
        },
        "tristeza": {
            "alerta": 0.30,
            "critico": 0.60,
            "desc": "desánimo colectivo y percepción negativa del entorno",
        },
        "neutral": {
            "alerta": 0.85,
            "critico": 0.95,
            "desc": "apatía emocional y baja expresión afectiva",
        },
    }

    # Umbral por defecto (seguridad)
    limits = thresholds.get(
        dominant_emotion,
        {
            "alerta": 0.4,
            "critico": 0.7,
            "desc": "comportamiento emocional atípico",
        },
    )

    # Nivel CRÍTICO
    if value >= limits["critico"]:
        response = {
            "triggered": True,
            "level": "CRITICO",
            "reason": (
                f"Alta prevalencia de {dominant_emotion} "
                f"({value * 100:.1f}%). "
                f"Se detecta {limits['desc']}."
            ),
        }
        print("RESPUESTA ALERT (CRITICO):", response)
        print("=== EVALUATE_ALERT END ===\n")
        return response

    # Nivel ALERTA
    if value >= limits["alerta"]:
        response = {
            "triggered": False,
            "level": "ALERTA",
            "reason": (
                f"Incremento significativo de {dominant_emotion} "
                f"({value * 100:.1f}%). "
                "Se recomienda monitoreo continuo."
            ),
        }
        print("RESPUESTA ALERT (ALERTA):", response)
        print("=== EVALUATE_ALERT END ===\n")
        return response

    # Nivel NORMAL
    response = {
        "triggered": False,
        "level": "NORMAL",
        "reason": (
            "Las emociones predominantes se mantienen dentro de rangos normales."
        ),
    }

    print("RESPUESTA ALERT (NORMAL):", response)
    print("=== EVALUATE_ALERT END ===\n")
    return response
