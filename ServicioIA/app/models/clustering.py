"""Schemas pydantic del contrato HTTP de ``POST /clustering``.

Contrato (design.md, tabla de endpoints del ``Servicio_IA``):

- Petición: ``{ vectores: number[][] }``
- Respuesta: ``{ clusters:[{clusterId, miembros[], etiqueta}] }``

Agrupamiento temático por similitud de los ``Embeddings`` (Req. 14.3, 31.2). En
producción se apoya en *scikit-learn* (KMeans/HDBSCAN); para pruebas se usa un
algoritmo determinista ligero (ver :mod:`app.services.clustering_service`).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ClusteringRequest(BaseModel):
    """Petición de ``POST /clustering``: ``{ vectores: number[][] }``.

    ``vectores`` es la matriz de embeddings (una fila por elemento a agrupar).
    ``k`` es opcional: cuando se omite, el servicio elige un número de clusters
    de forma determinista a partir del tamaño de la entrada.
    """

    vectores: list[list[float]] = Field(
        default_factory=list,
        description="Matriz de embeddings: un vector (fila) por elemento.",
    )
    k: int | None = Field(
        default=None,
        ge=1,
        description="Número de clusters deseado; por defecto se infiere.",
    )


class Cluster(BaseModel):
    """Cluster resultante del agrupamiento temático."""

    clusterId: int = Field(description="Identificador del cluster (0-indexado).")
    miembros: list[int] = Field(
        default_factory=list,
        description="Índices de los vectores asignados al cluster (en orden).",
    )
    etiqueta: str = Field(description="Etiqueta representativa del cluster.")


class ClusteringResponse(BaseModel):
    """Respuesta de ``POST /clustering``: ``{ clusters:[...] }``."""

    clusters: list[Cluster] = Field(
        default_factory=list,
        description="Clusters detectados, ordenados por ``clusterId`` creciente.",
    )
