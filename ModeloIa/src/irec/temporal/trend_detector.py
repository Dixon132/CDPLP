from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


def calculate_baseline(
    windows: list[dict],
    metric_key: str = "avg_risk_score",
) -> dict:
    """Calculate baseline statistics from historical time windows.

    Uses mean and standard deviation across all windows.

    Args:
        windows: List of window dicts from build_time_windows().
        metric_key: Which aggregated metric to baseline.

    Returns:
        Dict with baseline_mean, baseline_std, and baseline_range.
    """
    values: list[float] = []
    for w in windows:
        agg = w.get("aggregation", {})
        val = agg.get(metric_key, 0)
        values.append(val)

    if not values:
        return {"baseline_mean": 0.0, "baseline_std": 0.0, "count": 0}

    import statistics
    mean = statistics.mean(values)
    std = statistics.stdev(values) if len(values) > 1 else 0.0

    return {
        "baseline_mean": round(mean, 4),
        "baseline_std": round(std, 4),
        "baseline_min": round(min(values), 4),
        "baseline_max": round(max(values), 4),
        "count": len(values),
    }


def detect_trend(
    windows: list[dict],
    metric_key: str = "avg_risk_score",
    min_windows: int = 3,
) -> dict:
    """Detect if a metric shows an increasing, decreasing, or stable trend.

    Uses simple linear regression on the last N windows.

    Args:
        windows: Sorted time windows with aggregation data.
        metric_key: Metric to analyze.
        min_windows: Minimum windows required for trend detection.

    Returns:
        Dict with trend direction, slope, confidence, and growth rate.
    """
    values = _extract_metric_series(windows, metric_key)

    if len(values) < min_windows:
        return {
            "trend": "insufficient_data",
            "slope": 0.0,
            "confidence": 0.0,
            "growth_rate": 0.0,
            "current_value": values[-1] if values else 0.0,
        }

    n = len(values)
    x = list(range(n))

    # Simple linear regression
    mean_x = sum(x) / n
    mean_y = sum(values) / n

    numerator = sum((x[i] - mean_x) * (values[i] - mean_y) for i in range(n))
    denominator = sum((x[i] - mean_x) ** 2 for i in range(n))

    slope = numerator / denominator if denominator != 0 else 0.0

    # Growth rate: (last - first) / first
    growth_rate = (values[-1] - values[0]) / values[0] if values[0] != 0 else 0.0

    # Determine direction
    if slope > 0.01:
        direction = "increasing"
    elif slope < -0.01:
        direction = "decreasing"
    else:
        direction = "stable"

    # Confidence based on R²
    y_pred = [mean_y + slope * (xi - mean_x) for xi in x]
    ss_res = sum((values[i] - y_pred[i]) ** 2 for i in range(n))
    ss_tot = sum((values[i] - mean_y) ** 2 for i in range(n))
    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0.0

    return {
        "trend": direction,
        "slope": round(slope, 6),
        "confidence": round(max(0.0, min(1.0, r_squared)), 4),
        "growth_rate": round(growth_rate, 4),
        "current_value": round(values[-1], 4),
        "windows_analyzed": n,
    }


def detect_anomaly(
    windows: list[dict],
    metric_key: str = "avg_risk_score",
    z_threshold: float = 2.0,
) -> dict:
    """Detect if the latest window is anomalous compared to history.

    Uses Z-score method: |z| > threshold = anomaly.

    Args:
        windows: Sorted time windows.
        metric_key: Metric to check.
        z_threshold: Z-score threshold for anomaly detection.

    Returns:
        Dict with is_anomaly, z_score, and latest value vs baseline.
    """
    values = _extract_metric_series(windows, metric_key)

    if len(values) < 2:
        return {"is_anomaly": False, "z_score": 0.0, "latest_value": values[-1] if values else 0.0}

    import statistics
    historical = values[:-1]
    latest = values[-1]

    mean = statistics.mean(historical)
    std = statistics.stdev(historical) if len(historical) > 1 else 0.01

    z_score = (latest - mean) / std if std > 0 else 0.0

    return {
        "is_anomaly": abs(z_score) > z_threshold,
        "z_score": round(z_score, 4),
        "latest_value": round(latest, 4),
        "historical_mean": round(mean, 4),
        "historical_std": round(std, 4),
        "threshold": z_threshold,
    }


def compute_persistence(
    windows: list[dict],
    metric_key: str = "avg_risk_score",
) -> float:
    """Compute persistence: how many consecutive windows show elevated values.

    Returns a score 0-1 where 1 = sustained elevation across all windows.

    Args:
        windows: Sorted time windows.
        metric_key: Metric to check.

    Returns:
        Persistence score (0.0 to 1.0).
    """
    values = _extract_metric_series(windows, metric_key)
    if not values:
        return 0.0

    baseline = sum(values) / len(values)
    above_baseline = sum(1 for v in values if v > baseline)

    return round(above_baseline / len(values), 4)


def _extract_metric_series(windows: list[dict], metric_key: str) -> list[float]:
    """Extract a time series of a metric from windows."""
    values: list[float] = []
    for w in windows:
        agg = w.get("aggregation", {})
        val = agg.get(metric_key, 0)
        values.append(val)
    return values
