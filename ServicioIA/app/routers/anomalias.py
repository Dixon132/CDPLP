"""Router de detección de anomalías: ``POST /anomalias``.

Contrato (design.md): petición ``{ serie: number[][], zona? }`` → respuesta
``{ anomalias:[{refId, score, descripcion}] }`` (Req. 31.2).

El :class:`AnomalyService` se resuelve mediante una dependencia que lo cachea
en ``app.state``. En pruebas se sustituye con un doble determinista vía
``app.dependency_overrides`` sobre :func:`get_anomaly_service`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import Anomalia, AnomaliasRequest, AnomaliasResponse
from ..services import AnomalyService

router = APIRouter(tags=["anomalias"])


def get_anomaly_service(request: Request) -> AnomalyService:
    """Provee el :class:`AnomalyService`, cacheándolo en ``app.state``."""
    service: AnomalyService | None = getattr(
        request.app.state, "anomaly_service", None
    )
    if service is None:
        service = AnomalyService()
        request.app.state.anomaly_service = service
    return service


@router.post("/anomalias", response_model=AnomaliasResponse)
def post_anomalias(
    payload: AnomaliasRequest,
    service: AnomalyService = Depends(get_anomaly_service),
) -> AnomaliasResponse:
    """Detecta los puntos anómalos de ``serie`` respecto al patrón acumulado."""
    try:
        anomalias = service.detectar(payload.serie, zona=payload.zona)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    return AnomaliasResponse(
        anomalias=[
            Anomalia(refId=a.refId, score=a.score, descripcion=a.descripcion)
            for a in anomalias
        ]
    )
