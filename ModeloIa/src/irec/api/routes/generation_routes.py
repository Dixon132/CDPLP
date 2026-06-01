from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

router = APIRouter(prefix="/api/generate", tags=["generation"])


@router.post("/synthetic")
async def trigger_generation(
    background_tasks: BackgroundTasks,
    platform: str = Query(default="all", description="Platform or 'all'"),
    count: int = Query(default=20, ge=5, le=100),
) -> dict:
    """Trigger synthetic data generation for one or all platforms.

    Generation runs in background. Check data/raw/ for output files.
    """
    from src.irec.synthetic_generation import SyntheticDataGenerator

    platforms = ["reddit", "youtube", "instagram", "tiktok", "facebook"]

    if platform != "all" and platform not in platforms:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform: {platform}. Valid: all, {', '.join(platforms)}",
        )

    target_platforms = platforms if platform == "all" else [platform]

    def _generate():
        gen = SyntheticDataGenerator()
        for p in target_platforms:
            try:
                gen.generate_for_platform(p, count=count)
            except Exception as e:
                pass

    background_tasks.add_task(_generate)

    return {
        "status": "started",
        "platforms": target_platforms,
        "count_per_platform": count,
        "message": f"Generating {count} records for {len(target_platforms)} platform(s) in background",
    }


@router.post("/simulate")
async def trigger_simulation(
    background_tasks: BackgroundTasks,
    months: int = Query(default=6, ge=1, le=12),
    posts_per_day: int = Query(default=10, ge=1, le=50),
) -> dict:
    """Trigger a multi-month IREC simulation.

    Generates progressive data and calculates IREC evolution.
    Results saved to data/analytics/irec_scores/simulation_6months.json
    """
    def _simulate():
        from scripts.simulate_months import simulate_months
        simulate_months(num_months=months, posts_per_day=posts_per_day)

    background_tasks.add_task(_simulate)

    return {
        "status": "started",
        "months": months,
        "posts_per_day": posts_per_day,
        "message": (
            f"Simulating {months} months of data in background. "
            f"Check /api/evolution/irec-over-time for results."
        ),
    }
