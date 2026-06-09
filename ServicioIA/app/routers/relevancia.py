"""Router del ``Filtro_Relevancia``: ``POST /relevancia``.

Contrato (design.md): petición ``{ items:[{refId, texto}] }`` → respuesta
``{ contributivos[], noContributivos[] }`` (Req. 34.1, 34.6).

Es el clasificador PRIMARIO; el fallback determinista TS del ``ServidorGDS``
cumple el MISMO contrato, de modo que alternar entre ambos no requiere cambios en
el ``Pipeline_Analisis``.

El :class:`RelevanciaService` se resuelve mediante una dependencia que lo lee de
``app.state`` (construyéndolo una sola vez). En pruebas se sustituye con un doble
determinista vía ``app.dependency_overrides`` sobre :func:`get_relevancia_service`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..models import RelevanciaRequest, RelevanciaResponse
from ..models.relevancia import ItemClasificado
from ..services import RelevanciaService
from ..services.relevancia_service import ItemEntrada

router = APIRouter(tags=["relevancia"])


def get_relevancia_service(request: Request) -> RelevanciaService:
    """Provee el :class:`RelevanciaService`, cacheándolo en ``app.state``.

    Las pruebas inyectan un doble determinista sobreescribiendo esta dependencia.
    """
    service: RelevanciaService | None = getattr(
        request.app.state, "relevancia_service", None
    )
    if service is None:
        service = RelevanciaService()
        request.app.state.relevancia_service = service
    return service


@router.post("/relevancia", response_model=RelevanciaResponse)
def post_relevancia(
    payload: RelevanciaRequest,
    service: RelevanciaService = Depends(get_relevancia_service),
) -> RelevanciaResponse:
    """Clasifica cada item en contributivo/no-contributivo (señal vs ruido)."""
    result = service.clasificar(
        [ItemEntrada(refId=item.refId, texto=item.texto) for item in payload.items]
    )

    return RelevanciaResponse(
        contributivos=[
            ItemClasificado(
                refId=item.refId,
                contributividad=item.contributividad,
                motivo=item.motivo,
            )
            for item in result.contributivos
        ],
        noContributivos=[
            ItemClasificado(
                refId=item.refId,
                contributividad=item.contributividad,
                motivo=item.motivo,
            )
            for item in result.noContributivos
        ],
    )
