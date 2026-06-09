"""Router de agrupamiento temático: ``POST /clustering``.

Contrato (design.md): petición ``{ vectores: number[][] }`` → respuesta
``{ clusters:[{clusterId, miembros[], etiqueta}] }`` (Req. 14.3, 31.2).

El :class:`ClusteringService` se resuelve mediante una dependencia que lo
cachea en ``app.state``. En pruebas se sustituye con un doble determinista vía
``app.dependency_overrides`` sobre :func:`get_clustering_service`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import Cluster, ClusteringRequest, ClusteringResponse
from ..services import ClusteringService

router = APIRouter(tags=["clustering"])


def get_clustering_service(request: Request) -> ClusteringService:
    """Provee el :class:`ClusteringService`, cacheándolo en ``app.state``."""
    service: ClusteringService | None = getattr(
        request.app.state, "clustering_service", None
    )
    if service is None:
        service = ClusteringService()
        request.app.state.clustering_service = service
    return service


@router.post("/clustering", response_model=ClusteringResponse)
def post_clustering(
    payload: ClusteringRequest,
    service: ClusteringService = Depends(get_clustering_service),
) -> ClusteringResponse:
    """Agrupa ``vectores`` por similitud y devuelve los clusters detectados."""
    try:
        clusters = service.agrupar(payload.vectores, k=payload.k)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    return ClusteringResponse(
        clusters=[
            Cluster(clusterId=c.clusterId, miembros=c.miembros, etiqueta=c.etiqueta)
            for c in clusters
        ]
    )
