from typing import Optional
from ..infrastructure.io.csv_reader import load_posts_csv
from ..ml.emotion_model import predict_emotions_for_posts
from ..analytics.aggregation import aggregate_by_zone_and_day
from ..analytics.explanations import build_explanations


def run_offline_pipeline(
    input_path: Optional[str] = None,
    filter_zone: Optional[str] = None,
    filter_date: Optional[str] = None,
):
    # 1. Cargar datos
    df = load_posts_csv(input_path)

    # 2. Calcular emociones por post
    emotions = predict_emotions_for_posts(df["text"].tolist())
    df_emotions = df.copy()
    df_emotions["ansiedad"] = [e["ansiedad"] for e in emotions]
    df_emotions["tristeza"] = [e["tristeza"] for e in emotions]
    df_emotions["incertidumbre"] = [e["incertidumbre"] for e in emotions]

    # 3. Agregar por zona + día
    agg = aggregate_by_zone_and_day(df_emotions)

    # 4. Añadir explicaciones (resumen por zona/día)
    agg_with_summary = build_explanations(df_emotions, agg)

    # 5. Filtros opcionales
    if filter_zone:
        agg_with_summary = agg_with_summary[agg_with_summary["zone"] == filter_zone]
    if filter_date:
        agg_with_summary = agg_with_summary[
            agg_with_summary["date"].astype(str) == filter_date
        ]

    # 6. Mostrar resultado numérico
    print("\n=== RESUMEN NUMÉRICO DE EMOCIONES POR ZONA Y DÍA ===")
    print(
        agg_with_summary[
            [
                "zone",
                "date",
                "ansiedad_mean",
                "tristeza_mean",
                "incertidumbre_mean",
                "n_posts",
                "risk_level",
            ]
        ].to_string(index=False)
    )

    # 7. Mostrar explicaciones
    print("\n=== EXPLICACIONES POR ZONA Y DÍA ===")
    for _, row in agg_with_summary.iterrows():
        print(f"- {row['summary']}")

    return agg_with_summary
