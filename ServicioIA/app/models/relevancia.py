"""Schemas pydantic del contrato HTTP de ``POST /relevancia``.

Contrato (design.md, tabla de endpoints del ``Servicio_IA``):

- Petición: ``{ items:[{refId, texto}] }``
- Respuesta: ``{ contributivos[], noContributivos[] }``

El ``Filtro_Relevancia`` separa señal vs ruido: clasifica cada item
(post/comentario) ya anonimizado como **contributivo** (alimenta NLP→índice) o
**no-contributivo** (ruido conservado y marcado, NO eliminado). Es el clasificador
PRIMARIO; el fallback determinista TS cumple el MISMO contrato, de modo que ambos
son intercambiables sin tocar el ``Pipeline_Analisis`` (Req. 34.1, 34.6).

Los nombres de campo (``refId``, ``contributividad``, ``noContributivos``) son
``camelCase`` para coincidir exactamente con la interfaz estable ``ItemClasificado``
/ ``ResultadoFiltroRelevancia`` del ``ServidorGDS``.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class Contributividad(str, Enum):
    """Etiqueta de clasificación señal/ruido (idéntica al enum TS)."""

    CONTRIBUTIVO = "CONTRIBUTIVO"
    NO_CONTRIBUTIVO = "NO_CONTRIBUTIVO"


class ItemRelevancia(BaseModel):
    """Item de entrada a clasificar: ``{ refId, texto }`` (ya anonimizado)."""

    refId: str = Field(description="Id estable del fragmento (p. ej. 'post', 'comment:0').")
    texto: str = Field(description="Texto anonimizado del item a clasificar.")


class ItemClasificado(BaseModel):
    """Item clasificado: ``{ refId, contributividad, motivo }``."""

    refId: str = Field(description="Id estable del item clasificado.")
    contributividad: Contributividad = Field(
        description="CONTRIBUTIVO (señal) o NO_CONTRIBUTIVO (ruido)."
    )
    motivo: str = Field(description="Razón de la clasificación (señal vs ruido).")


class RelevanciaRequest(BaseModel):
    """Petición de ``POST /relevancia``: ``{ items:[{refId, texto}] }``."""

    items: list[ItemRelevancia] = Field(
        default_factory=list,
        description="Items (post/comentarios) anonimizados a clasificar.",
    )


class RelevanciaResponse(BaseModel):
    """Respuesta de ``POST /relevancia``: ``{ contributivos[], noContributivos[] }``.

    Cada item aparece exactamente una vez (partición sin solape), conservando el
    orden de entrada; el contenido no-contributivo se marca, NO se elimina
    (Req. 34.2, 34.3).
    """

    contributivos: list[ItemClasificado] = Field(
        default_factory=list,
        description="Items contributivos (señal); alimenta NLP→índice (Req. 34.2).",
    )
    noContributivos: list[ItemClasificado] = Field(
        default_factory=list,
        description="Items no-contributivos (ruido) conservados y marcados (Req. 34.3).",
    )
