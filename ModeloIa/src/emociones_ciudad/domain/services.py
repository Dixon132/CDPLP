from ..domain.entities import AggregatedMetrics


def compute_risk_level(
    ansiedad_mean: float, tristeza_mean: float, incertidumbre_mean: float
) -> str:
    # Reglas simples: luego se pueden tunear
    avg = (ansiedad_mean + tristeza_mean + incertidumbre_mean) / 3.0

    if avg < 0.3:
        return "NORMAL"
    elif avg < 0.6:
        return "ALTO"
    else:
        return "CRITICO"
