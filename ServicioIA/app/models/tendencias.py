"""Schemas pydantic del contrato HTTP de ``POST /tendencias``.

Contrato (design.md, tabla de endpoints del ``Servicio_IA``):

- Petición: ``{ evolucion, zona? }``
- Respuesta: ``{ tendencias:[{dimension, direccion, magnitud}] }``

Detección de tendencias sobre la evolución temporal de cada dimensión del
``Indice_Riesgo`` mediante series temporales (NumPy/Pandas) (Req. 31.2). Por
defecto usa una regresión lineal por mínimos cuadrados determinista en Python
puro (ver :mod:`app.services.trend_service`).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class TendenciasRequest(BaseModel):
    """Petición de ``POST /tendencias``: ``{ evolucion, zona? }``.

    ``evolucion`` mapea cada dimensión a su serie temporal de valores (un valor
    por ``Semana_Simulada``, en orden cronológico). ``zona`` es la
    ``Zona_Geografica`` opcional para contextualizar la tendencia (Req. 33).
    """

    evolucion: dict[str, list[float]] = Field(
        default_factory=dict,
        description="Por dimensión, su serie temporal ordenada cronológicamente.",
    )
    zona: str | None = Field(
        default=None,
        description="Zona geográfica opcional para contextualizar las tendencias.",
    )


class Tendencia(BaseModel):
    """Tendencia detectada para una dimensión."""

    dimension: str = Field(description="Nombre de la dimensión analizada.")
    direccion: str = Field(
        description="Dirección de la tendencia: 'ascendente', 'descendente' o 'estable'."
    )
    magnitud: float = Field(
        description="Magnitud de la tendencia (pendiente absoluta, >= 0)."
    )


class TendenciasResponse(BaseModel):
    """Respuesta de ``POST /tendencias``: ``{ tendencias:[...] }``."""

    tendencias: list[Tendencia] = Field(
        default_factory=list,
        description="Tendencias por dimensión, ordenadas por nombre de dimensión.",
    )
