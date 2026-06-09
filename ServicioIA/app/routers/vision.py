"""Router del ``Vision_Engine``: ``POST /vision``.

Contrato (design.md): petición ``{ image_description }`` → respuesta
``{ scene, objects[], emotion_context }`` (Req. 15.1, 37.2).

El :class:`VisionService` se resuelve mediante una dependencia que lo cachea en
``app.state`` (construyéndolo una sola vez con el analizador de descripción
textual de v1). En pruebas se sustituye con un doble determinista vía
``app.dependency_overrides`` sobre :func:`get_vision_service`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import VisionRequest, VisionResponse
from ..services import VisionService

router = APIRouter(tags=["vision"])


def get_vision_service(request: Request) -> VisionService:
    """Provee el :class:`VisionService`, cacheándolo en ``app.state``.

    En producción construye el servicio con el ``Vision_Engine`` por defecto
    (analizador de texto v1). Las pruebas inyectan un doble determinista
    sobreescribiendo esta dependencia.
    """
    service: VisionService | None = getattr(
        request.app.state, "vision_service", None
    )
    if service is None:
        service = VisionService()
        request.app.state.vision_service = service
    return service


@router.post("/vision", response_model=VisionResponse)
def post_vision(
    payload: VisionRequest,
    service: VisionService = Depends(get_vision_service),
) -> VisionResponse:
    """Deriva ``{ scene, objects[], emotion_context }`` del ``image_description``."""
    try:
        result = service.analyze(payload.image_description)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    return VisionResponse(
        scene=result.scene,
        objects=result.objects,
        emotion_context=result.emotion_context,
    )
