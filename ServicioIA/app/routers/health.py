"""Router de salud: ``GET /health``.

Reporta el estado del servicio, los modelos cargados al arranque y el
dispositivo de inferencia, leyendo el :class:`ModelRegistry` que el ``lifespan``
dejó en ``app.state``.
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from ..model_registry import ModelRegistry
from ..models import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health(request: Request) -> HealthResponse:
    """Devuelve ``{ status, modelos[], device }``.

    ``status`` es ``"ok"`` cuando hay un registro de modelos listo; en cualquier
    otro caso reporta ``"degraded"`` (p. ej. si los modelos no se cargaron).
    """
    registry: ModelRegistry | None = getattr(request.app.state, "model_registry", None)

    if registry is None:
        return HealthResponse(status="degraded", modelos=[], device="unknown")

    status = "ok" if registry.all_ready and len(registry) > 0 else "degraded"
    return HealthResponse(
        status=status,
        modelos=registry.names(),
        device=registry.device,
    )
