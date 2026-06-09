"""Schemas pydantic del contrato HTTP de ``POST /anomalias``.

Contrato (design.md, tabla de endpoints del ``Servicio_IA``):

- Petición: ``{ serie: number[][], zona? }``
- Respuesta: ``{ anomalias:[{refId, score, descripcion}] }``

Detección de anomalías respecto al patrón longitudinal acumulado (Req. 31.2).
En producción puede apoyarse en *scikit-learn* (``IsolationForest``); por
defecto usa un detector ligero por **z-score** determinista (ver
:mod:`app.services.anomaly_service`).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class AnomaliasRequest(BaseModel):
    """Petición de ``POST /anomalias``: ``{ serie: number[][], zona? }``.

    ``serie`` es la secuencia de observaciones (una fila por punto temporal,
    una columna por dimensión). ``zona`` es la ``Zona_Geografica`` opcional que
    contextualiza la descripción de la anomalía (Req. 33).
    """

    serie: list[list[float]] = Field(
        default_factory=list,
        description="Secuencia de observaciones: una fila por punto temporal.",
    )
    zona: str | None = Field(
        default=None,
        description="Zona geográfica opcional para contextualizar la anomalía.",
    )


class Anomalia(BaseModel):
    """Anomalía detectada en la serie."""

    refId: int = Field(description="Índice del punto anómalo dentro de la serie.")
    score: float = Field(
        description="Puntuación de anomalía (mayor = más atípico)."
    )
    descripcion: str = Field(
        description="Explicación en lenguaje natural de la anomalía detectada."
    )


class AnomaliasResponse(BaseModel):
    """Respuesta de ``POST /anomalias``: ``{ anomalias:[...] }``."""

    anomalias: list[Anomalia] = Field(
        default_factory=list,
        description="Anomalías detectadas, ordenadas por ``refId`` creciente.",
    )
