"""Schemas pydantic del contrato HTTP de ``POST /nlp``.

Contrato (design.md, tabla de endpoints del ``Servicio_IA``):

- Petición: ``{ contenido[] }`` (texto **anonimizado** y **contributivo**).
- Respuesta: ``{ semantico, emocion, temas[], entidades[], causas[],
  eventos[], tendenciasTexto }``.

Cubre el ``Servicio_NLP`` (Req. 14.1–14.4):

- **14.1** análisis semántico, detección emocional y clasificación temática;
- **14.2** extracción de causas, eventos y detonantes;
- **14.3** agrupamiento temático y análisis conversacional;
- **14.4** interpretación de tendencias del texto.

La salida es siempre **colectiva** (nunca diagnóstico individual). El servicio
solo recibe ``Contenido_Contributivo`` (Req. 34.2).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class NlpRequest(BaseModel):
    """Petición de ``POST /nlp``: ``{ contenido[] }``.

    ``contenido`` son fragmentos de texto ya anonimizados y filtrados como
    contributivos por el ``Filtro_Relevancia`` (Req. 34.2).
    """

    contenido: list[str] = Field(
        default_factory=list,
        description="Fragmentos de texto anonimizados y contributivos a analizar.",
    )


class ConversacionalNLP(BaseModel):
    """Análisis conversacional sobre las interacciones (Req. 14.3)."""

    numIntervenciones: int = Field(
        default=0, description="Número de fragmentos/interacciones analizadas."
    )
    longitudPromedio: float = Field(
        default=0.0, description="Longitud media (en tokens) por intervención."
    )
    diversidadLexica: float = Field(
        default=0.0,
        description="Riqueza léxica colectiva en [0,1] (tipos únicos / tokens).",
    )


class SemanticoNLP(BaseModel):
    """Análisis semántico colectivo del contenido (Req. 14.1)."""

    resumen: str = Field(
        default="", description="Resumen semántico colectivo en lenguaje natural."
    )
    terminosClave: list[str] = Field(
        default_factory=list,
        description="Términos clave más representativos del contenido.",
    )
    conversacional: ConversacionalNLP = Field(
        default_factory=ConversacionalNLP,
        description="Métricas del análisis conversacional de las interacciones.",
    )


class EmocionNLP(BaseModel):
    """Detección emocional colectiva (Req. 14.1)."""

    etiqueta: str = Field(
        default="neutral", description="Emoción dominante del conjunto."
    )
    puntuacion: float = Field(
        default=0.0, description="Confianza media de la emoción dominante en [0,1]."
    )
    distribucion: dict[str, float] = Field(
        default_factory=dict,
        description="Distribución agregada por emoción (suma ≈ 1 si hay contenido).",
    )


class TemaNLP(BaseModel):
    """Tema resultante del agrupamiento temático (Req. 14.3)."""

    etiqueta: str = Field(description="Etiqueta representativa del tema/cluster.")
    peso: float = Field(
        default=0.0, description="Peso relativo del tema en [0,1] (proporción)."
    )
    miembros: list[int] = Field(
        default_factory=list,
        description="Índices de los fragmentos de 'contenido' asignados al tema.",
    )


class EntidadNLP(BaseModel):
    """Entidad nombrada reconocida (NER, Req. 14.1/14.2)."""

    texto: str = Field(description="Texto de la entidad reconocida.")
    tipo: str = Field(description="Tipo de la entidad (PER, LOC, ORG, MISC, ...).")


class NlpResponse(BaseModel):
    """Respuesta de ``POST /nlp`` (contrato del ``Servicio_NLP``)."""

    semantico: SemanticoNLP = Field(
        default_factory=SemanticoNLP, description="Análisis semántico colectivo."
    )
    emocion: EmocionNLP = Field(
        default_factory=EmocionNLP, description="Detección emocional colectiva."
    )
    temas: list[TemaNLP] = Field(
        default_factory=list, description="Agrupamiento temático del contenido."
    )
    entidades: list[EntidadNLP] = Field(
        default_factory=list, description="Entidades nombradas reconocidas."
    )
    causas: list[str] = Field(
        default_factory=list, description="Causas y detonantes identificados."
    )
    eventos: list[str] = Field(
        default_factory=list, description="Eventos identificados en el contenido."
    )
    tendenciasTexto: str = Field(
        default="", description="Interpretación de tendencias a partir del texto."
    )
