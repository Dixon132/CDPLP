from fastapi import APIRouter, Query
from emociones_ciudad.services.analysis_service import analyze_zone

router = APIRouter()


@router.get("/metrics")
def get_metrics(zone: str = Query(...), window: str = Query("7d")):
    days = int(window.replace("d", ""))
    return analyze_zone(zone, days)
