"""Schema de respuesta del endpoint de salud (``GET /health``)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Contrato de ``GET /health``: ``{ status, modelos[], device }``."""

    status: str = Field(description="Estado del servicio: 'ok' o 'degraded'.")
    modelos: list[str] = Field(
        default_factory=list,
        description="Nombres de los modelos cargados al arranque.",
    )
    device: str = Field(description="Dispositivo de inferencia (cuda/cpu).")
