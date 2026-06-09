"""Schemas pydantic del contrato HTTP de ``POST /embeddings``.

Contrato (design.md, tabla de endpoints del ``Servicio_IA``):

- Petición: ``{ textos[], modelo }``
- Respuesta: ``{ vectores: number[][], modelo, dim }``

Soporta los modelos de embeddings declarados (``BAAI/bge-m3`` —primario, 1024
dim—, ``BAAI/bge-large-en-v1.5`` y ``all-MiniLM-L6-v2``) y alimenta la
``Memoria_Semantica`` en ``pgvector`` (Req. 31.2, 36.1).
"""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class EmbeddingsRequest(BaseModel):
    """Petición de ``POST /embeddings``: ``{ textos[], modelo }``.

    ``modelo`` es opcional; cuando se omite, el servicio usa el modelo primario
    (``BAAI/bge-m3``).
    """

    textos: list[str] = Field(
        default_factory=list,
        description="Fragmentos de texto (ya anonimizados) a vectorizar.",
    )
    modelo: str | None = Field(
        default=None,
        description="Nombre del modelo de embeddings; por defecto el primario.",
    )


class EmbeddingsResponse(BaseModel):
    """Respuesta de ``POST /embeddings``: ``{ vectores: number[][], modelo, dim }``."""

    vectores: list[list[float]] = Field(
        default_factory=list,
        description="Un vector por cada texto de entrada, en el mismo orden.",
    )
    modelo: str = Field(description="Modelo de embeddings efectivamente usado.")
    dim: int = Field(description="Dimensión de cada vector generado.")


class FiltroBusqueda(BaseModel):
    """Filtro de trazabilidad **colectiva** de ``Embeddings_Search``.

    Acota la búsqueda al ``Analisis`` y/o a la ``Comunidad_Digital`` de origen
    (Req. 36.5). No admite ningún criterio a nivel individual.
    """

    analisisId: str | None = Field(
        default=None, description="Restringe la búsqueda a un Analisis de origen."
    )
    comunidadId: str | None = Field(
        default=None,
        description="Restringe la búsqueda a una Comunidad_Digital de origen.",
    )


class EmbeddingsSearchRequest(BaseModel):
    """Petición de ``POST /embeddings/search``.

    Contrato (design.md): ``{ vectorConsulta | texto, k, filtro:{analisisId,
    comunidadId} }``. Debe proveerse **uno** de ``vectorConsulta`` (vector ya
    calculado) o ``texto`` (que el servicio vectoriza antes de buscar).
    """

    vectorConsulta: list[float] | None = Field(
        default=None,
        description="Vector de consulta ya calculado para la similitud.",
    )
    texto: str | None = Field(
        default=None,
        description="Texto de consulta; se vectoriza si no se da vectorConsulta.",
    )
    k: int = Field(
        default=5,
        gt=0,
        description="Número máximo de resultados a devolver (top-k).",
    )
    modelo: str | None = Field(
        default=None,
        description="Modelo de embeddings para vectorizar 'texto' (por defecto el primario).",
    )
    filtro: FiltroBusqueda = Field(
        default_factory=FiltroBusqueda,
        description="Filtro de trazabilidad colectiva (analisisId/comunidadId).",
    )

    @model_validator(mode="after")
    def _require_query(self) -> "EmbeddingsSearchRequest":
        """Exige exactamente una fuente de consulta: ``vectorConsulta`` o ``texto``."""
        tiene_vector = self.vectorConsulta is not None and len(self.vectorConsulta) > 0
        tiene_texto = self.texto is not None and self.texto.strip() != ""
        if not tiene_vector and not tiene_texto:
            raise ValueError(
                "Debe proveerse 'vectorConsulta' o 'texto' para la búsqueda."
            )
        return self


class ResultadoSimilitud(BaseModel):
    """Un resultado de ``Embeddings_Search`` (colectivo, trazable).

    ``similitud`` está dentro del rango de similitud definido (coseno, Req. 36.6)
    y ``semana`` referencia la ``Semana_Simulada`` de origen.
    """

    refId: str = Field(description="Id estable del vector/fragmento recuperado.")
    similitud: float = Field(description="Similitud coseno con la consulta (rango [-1, 1]).")
    refContenido: str = Field(description="Referencia al contenido anonimizado de origen.")
    semana: int | None = Field(
        default=None, description="Número de Semana_Simulada de origen, si se conoce."
    )


class EmbeddingsSearchResponse(BaseModel):
    """Respuesta de ``POST /embeddings/search``: ``{ resultados:[...] }``.

    ``resultados`` viene **ordenado por similitud descendente** y solo contiene
    resultados colectivos (sin diagnóstico individual) (Req. 36.3, 36.6, 39.4).
    """

    resultados: list[ResultadoSimilitud] = Field(
        default_factory=list,
        description="Resultados ordenados por similitud descendente (top-k).",
    )
