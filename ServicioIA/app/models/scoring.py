"""Schemas pydantic del contrato HTTP de ``POST /score-calibrado`` y ``POST /calibrar``.

Contrato (design.md, tabla de endpoints del ``Servicio_IA``):

- ``POST /score-calibrado``: petición ``{ entradaIndice }`` → respuesta
  ``{ score:[0..1], evidenciaIds[] }`` (Req. 31.2, 31.7).
- ``POST /calibrar``: petición ``{ referenciaCorpus }`` → respuesta
  ``{ version, metricas }`` (Req. 31.3, 31.4, 36.4).

El ``Servicio_IA`` aporta el **scoring calibrado del `Indice_Riesgo`** a nivel
**exclusivamente colectivo** (`Comunidad_Digital`), siempre respaldado por
`Evidencia` referenciada por id trazable (``evidenciaIds``), coherente con el
principio de **no diagnóstico individual** (Req. 31.7). La calibración usa el
`Corpus_Longitudinal` acumulado dentro del propio `Servicio_IA` (CRISP-DM/MLOps)
y devuelve una ``version`` y sus ``metricas`` (Req. 31.3, 31.4, 36.4).

Los nombres de campo son ``camelCase`` para coincidir exactamente con las
interfaces estables ``EntradaIndice``/``ReferenciaCorpus`` y la firma de
``Capa_ML`` (``scoreRiesgoCalibrado`` / ``calibrar``) del ``ServidorGDS``.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class DimensionEntrada(BaseModel):
    """Una dimensión del `Indice_Riesgo` a puntuar (Req. 17.1, 17.2).

    Cada dimensión es **independiente**, se mide dentro de su propio
    ``[minimo, maximo]`` y referencia la `Evidencia` que la respalda por id
    trazable (Req. 30.1). El ``peso`` permite ponderar la contribución relativa
    de la dimensión al score colectivo agregado.
    """

    nombre: str = Field(description="Nombre de la dimensión (p. ej. 'estres_academico').")
    valor: float = Field(description="Valor observado de la dimensión en su rango.")
    minimo: float = Field(default=0.0, description="Cota inferior del rango de la dimensión.")
    maximo: float = Field(default=1.0, description="Cota superior del rango de la dimensión.")
    peso: float = Field(
        default=1.0,
        description="Peso relativo (>=0) de la dimensión en el score agregado.",
    )
    evidenciaIds: list[str] = Field(
        default_factory=list,
        description="Ids trazables de la Evidencia que respalda la dimensión.",
    )


class EntradaIndice(BaseModel):
    """Entrada colectiva del `Indice_Riesgo` por `Comunidad_Digital`/`Semana_Simulada`.

    Agrupa las dimensiones a puntuar y, opcionalmente, evidencia a nivel de la
    entrada. Es siempre **colectiva**: no contiene ni produce señal individual.
    """

    comunidadId: str | None = Field(
        default=None, description="Id de la Comunidad_Digital (colectivo)."
    )
    semana: int | None = Field(
        default=None, description="Número de Semana_Simulada de la entrada."
    )
    dimensiones: list[DimensionEntrada] = Field(
        default_factory=list,
        description="Dimensiones independientes del índice a puntuar.",
    )
    evidenciaIds: list[str] = Field(
        default_factory=list,
        description="Evidencia a nivel de la entrada (además de la de cada dimensión).",
    )


class ScoreCalibradoRequest(BaseModel):
    """Petición de ``POST /score-calibrado``: ``{ entradaIndice }``."""

    entradaIndice: EntradaIndice = Field(
        description="Entrada colectiva del Indice_Riesgo a puntuar."
    )


class ScoreCalibradoResponse(BaseModel):
    """Respuesta de ``POST /score-calibrado``: ``{ score:[0..1], evidenciaIds[] }``.

    ``score`` está **garantizado en [0,1]** (calibrado y acotado) y se acompaña
    de la ``evidenciaIds`` colectiva que lo respalda (Req. 31.2, 31.7).
    """

    score: float = Field(
        ge=0.0,
        le=1.0,
        description="Score calibrado del Indice_Riesgo en [0,1] (colectivo).",
    )
    evidenciaIds: list[str] = Field(
        default_factory=list,
        description="Ids trazables de la Evidencia que respalda el score.",
    )


class MuestraCorpus(BaseModel):
    """Muestra del `Corpus_Longitudinal`: una entrada y su objetivo opcional.

    El ``objetivo`` (en [0,1]) es la señal supervisada de calibración cuando
    está disponible; cuando falta, la muestra solo aporta al volumen del corpus.
    """

    entrada: EntradaIndice = Field(description="Entrada colectiva del corpus.")
    objetivo: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Objetivo de calibración en [0,1] (opcional, supervisado).",
    )


class ReferenciaCorpus(BaseModel):
    """Referencia al `Corpus_Longitudinal` acumulado para calibrar la `Capa_ML`.

    Puede traer las ``muestras`` materializadas (entrada + objetivo) y/o
    metadatos de la acumulación (``analisisId``, ``numSemanas``). El corpus
    **se acumula sin eliminar** semanas previas (Req. 36.2), de modo que más
    muestras ⇒ mejor calibración (Req. 31.3, 31.4, 36.4).
    """

    analisisId: str | None = Field(
        default=None, description="Id del Analisis de origen del corpus."
    )
    muestras: list[MuestraCorpus] = Field(
        default_factory=list,
        description="Muestras acumuladas (entrada + objetivo) del corpus.",
    )
    numSemanas: int | None = Field(
        default=None, description="Número de Semana_Simulada acumuladas (opcional)."
    )
    descripcion: str | None = Field(
        default=None, description="Descripción/etiqueta del corpus (opcional)."
    )


class CalibrarRequest(BaseModel):
    """Petición de ``POST /calibrar``: ``{ referenciaCorpus }``."""

    referenciaCorpus: ReferenciaCorpus = Field(
        description="Referencia al Corpus_Longitudinal con el que calibrar la Capa_ML."
    )


class CalibrarResponse(BaseModel):
    """Respuesta de ``POST /calibrar``: ``{ version, metricas }``.

    ``version`` identifica de forma **determinista** el artefacto de calibración
    (derivada del contenido del corpus) y ``metricas`` reporta los indicadores
    numéricos de la calibración (cobertura, error, etc.).
    """

    version: str = Field(description="Versión determinista del artefacto de calibración.")
    metricas: dict[str, float] = Field(
        default_factory=dict,
        description="Métricas numéricas de la calibración (Record<string, number>).",
    )
