from __future__ import annotations

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/summary")
async def get_summary_report(
    days: int = Query(default=30, ge=1, le=90),
) -> dict:
    """Generate a summary report for the last N days."""
    import json
    from pathlib import Path
    from src.irec.config import settings

    # Try loading existing IREC results
    irec_dir = settings.data_dir / "analytics" / "irec_scores"
    results = []

    if irec_dir.exists():
        for f in sorted(irec_dir.glob("irec_results_*.json"), reverse=True):
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                    results = data.get("results", [])
                    break
            except Exception:
                continue

    return {
        "period_days": days,
        "communities_analyzed": len(results),
        "results": results,
    }


@router.get("/risk-distribution")
async def get_risk_distribution() -> dict:
    """Get the risk level distribution across all communities."""
    import json
    from pathlib import Path
    from src.irec.config import settings

    irec_dir = settings.data_dir / "analytics" / "irec_scores"
    distribution: dict[str, int] = {}

    if irec_dir.exists():
        for f in sorted(irec_dir.glob("irec_results_*.json"), reverse=True):
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(f)
                    for r in data.get("results", []):
                        level = r.get("irec_level", "unknown")
                        distribution[level] = distribution.get(level, 0) + 1
                    break
            except Exception:
                continue

    return {"distribution": distribution}
