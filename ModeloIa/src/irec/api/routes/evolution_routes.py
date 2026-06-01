from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from src.irec.config import settings

router = APIRouter(prefix="/api/evolution", tags=["evolution"])


@router.get("/irec-over-time")
async def get_irec_evolution() -> dict:
    """Get IREC evolution data over time (for line charts)."""
    from src.irec.temporal.weekly_processor import load_history

    simulation_path = (
        settings.data_dir / "analytics" / "irec_scores" / "simulation_6months.json"
    )

    # Try simulation data first
    if simulation_path.exists():
        with open(simulation_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        monthly = data.get("monthly_results", [])
        labels = []
        values = []
        for m in monthly:
            irec_results = m.get("irec_results", [])
            if irec_results:
                latest = irec_results[-1]
                labels.append(f"Mes {m['month']}")
                values.append(latest.get("irec_value", 0))
        if labels:
            return _build_chart_response(labels, values)

    # Fallback: weekly history from real ingestion
    history = load_history()
    weeks = history.get("weeks", [])
    if weeks:
        labels = [w["label"] for w in weeks]
        values = [w["irec"]["irec_value"] for w in weeks if w.get("irec")]
        if labels:
            return _build_chart_response(labels, values)

    # Nothing yet
    return {
        "chart_data": {
            "labels": [],
            "datasets": [{"label": "IREC", "data": [], "type": "line"}],
        },
        "levels": [],
        "summary": {"trend": "no_data", "current_irec": 0, "current_level": "unknown", "total_alerts": 0},
    }


def _build_chart_response(labels: list, values: list) -> dict:
    return {
        "chart_data": {
            "labels": labels,
            "datasets": [
                {"label": "IREC", "data": values, "type": "line"},
            ],
        },
        "summary": {
            "trend": "increasing" if len(values) >= 2 and values[-1] > values[0] else "stable",
            "current_irec": values[-1] if values else 0,
            "current_level": "unknown",
            "total_alerts": 0,
        },
    }


@router.get("/emotions-over-time")
async def get_emotions_evolution() -> dict:
    """Get emotion distribution evolution over time (for stacked/area charts)."""
    simulation_path = (
        settings.data_dir / "analytics" / "irec_scores" / "simulation_6months.json"
    )

    if not simulation_path.exists():
        raise HTTPException(status_code=404, detail="No simulation data found.")

    with open(simulation_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    monthly = data.get("monthly_results", [])
    labels = []
    emotions_data = {
        "presion_academica": [],
        "malestar_interno": [],
        "social_negativo": [],
        "protectoras": [],
    }

    for m in monthly:
        irec_results = m.get("irec_results", [])
        if irec_results:
            latest = irec_results[-1]
            labels.append(f"Mes {m['month']}")
            families = latest.get("window_aggregation", {}).get("avg_families", {})
            for key in emotions_data:
                emotions_data[key].append(round(families.get(key, 0) * 100, 1))

    return {
        "chart_data": {
            "labels": labels,
            "datasets": [
                {"label": k.replace("_", " ").title(), "data": v}
                for k, v in emotions_data.items()
            ],
        },
    }
