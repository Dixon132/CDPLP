from fastapi import APIRouter, HTTPException
from emociones_ciudad.services.analysis_service import evaluate_alert

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("")
def get_alerts(zone: str, window: str):
    try:
        days = int(window.replace("d", ""))
        return evaluate_alert(zone, days)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error evaluando alertas: {str(e)}"
        )
