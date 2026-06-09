"""Router de detección de tendencias: ``POST /tendencias``.

Contrato (design.md): petición ``{ evolucion, zona? }`` → respuesta
``{ tendencias:[{dimension, direccion, magnitud}] }`` (Req. 31.2).

El :class:`TrendService` se resuelve mediante una dependencia que lo cachea en
``app.state``. En pruebas se sustituye con un doble determinista vía
``app.dependency_overrides`` sobre :func:`get_trend_service`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import Tendencia, TendenciasRequest, TendenciasResponse
from ..services import TrendService

router = APIRouter(tags=["tendencias"])


def get_trend_service(request: Request) -> TrendService:
    """Provee el :class:`TrendService`, cacheándolo en ``app.state``."""
    service: TrendService | None = getattr(request.app.state, "trend_service", None)
    if service is None:
        service = TrendService()
        request.app.state.trend_service = service
    return service


@router.post("/tendencias", response_model=TendenciasResponse)
def post_tendencias(
    payload: TendenciasRequest,
    service: TrendService = Depends(get_trend_service),
) -> TendenciasResponse:
    """Detecta la tendencia (dirección y magnitud) de cada dimensión."""
    try:
        tendencias = service.detectar(payload.evolucion, zona=payload.zona)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    return TendenciasResponse(
        tendencias=[
            Tendencia(
                dimension=t.dimension, direccion=t.direccion, magnitud=t.magnitud
            )
            for t in tendencias
        ]
    )
