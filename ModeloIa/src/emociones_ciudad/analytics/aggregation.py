import pandas as pd
from ..domain.services import compute_risk_level


def aggregate_by_zone_and_day(df: pd.DataFrame) -> pd.DataFrame:
    group_cols = ["zone", "date"]
    agg = (
        df.groupby(group_cols)
        .agg(
            ansiedad_mean=("ansiedad", "mean"),
            tristeza_mean=("tristeza", "mean"),
            incertidumbre_mean=("incertidumbre", "mean"),
            n_posts=("text", "count"),
        )
        .reset_index()
    )

    agg["risk_level"] = agg.apply(
        lambda row: compute_risk_level(
            row["ansiedad_mean"],
            row["tristeza_mean"],
            row["incertidumbre_mean"],
        ),
        axis=1,
    )

    return agg
