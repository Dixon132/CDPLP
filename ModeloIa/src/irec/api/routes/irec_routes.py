from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/irec", tags=["irec"])


@router.post("/calculate")
async def calculate_irec_endpoint(
    window_days: int = Query(default=7, ge=1, le=90),
    limit: int = Query(default=1000, ge=1),
) -> dict:
    """Calculate IREC scores for all communities.

    Loads the latest preprocessed data and runs the full
    risk pipeline (communities → windows → IREC).
    """
    import json
    from pathlib import Path
    from src.irec.config import settings
    from src.irec.risk import RiskPipeline

    # Load the latest preprocessed data
    processed_dir = settings.data_dir / "processed" / "nlp"
    if not processed_dir.exists():
        raise HTTPException(status_code=404, detail="No processed data found. Run preprocessing first.")

    all_records = []
    for f in sorted(processed_dir.glob("*_nlp.json")):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                records = data.get("records", [])
                all_records.extend(records[:limit])
        except Exception:
            continue

    if not all_records:
        raise HTTPException(status_code=404, detail="No records found in processed data.")

    pipeline = RiskPipeline(window_days=window_days)
    results = pipeline.analyze(all_records)

    # Sort by IREC value descending
    results.sort(key=lambda r: r.get("irec_value", 0), reverse=True)

    return {
        "metadata": {
            "window_days": window_days,
            "total_communities": pipeline.stats["total_communities"],
            "total_windows": pipeline.stats["total_windows"],
            "alerts_triggered": pipeline.stats["alerts_triggered"],
        },
        "results": results[:20],  # Top 20
    }


@router.get("/score")
async def get_irec_score(
    family_presion: float = 0.0,
    family_malestar: float = 0.0,
    family_social: float = 0.0,
    family_protectoras: float = 0.0,
    persistence: float = 0.0,
    trend_increasing: bool = False,
) -> dict:
    """Calculate IREC from raw family scores (for testing/demo)."""
    from src.irec.risk import calculate_irec

    families = {
        "presion_academica": family_presion,
        "malestar_interno": family_malestar,
        "social_negativo": family_social,
        "protectoras": family_protectoras,
    }

    trend_factor = 1.15 if trend_increasing else 1.0
    return calculate_irec(families, persistence, trend_factor)


@router.get("/levels")
async def get_irec_levels() -> dict:
    """Return the IREC level definitions."""
    from src.irec.utils.constants import IREC_LEVELS
    return {"levels": {f"{lo}-{hi}": label for (lo, hi), label in IREC_LEVELS.items()}}
