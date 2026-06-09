"""Servicio de agrupamiento temático del Servicio_IA.

Implementa el ``POST /clustering`` (Req. 14.3, 31.2): dado un conjunto de
``Embeddings`` (``vectores: number[][]``), agrupa los elementos por similitud y
devuelve ``clusters:[{clusterId, miembros[], etiqueta}]``.

Diseño orientado a pruebas
--------------------------
En producción el agrupamiento puede delegar en *scikit-learn* (``KMeans`` o
``HDBSCAN``) a través de un :class:`Clusterer` inyectable construido por un
``clusterer_factory``. La importación de la librería pesada es **perezosa**.

Por defecto, sin embargo, el servicio usa un **KMeans determinista en Python
puro** (sin numpy ni scikit-learn): inicialización reproducible, asignación por
distancia euclídea con desempate por menor ``clusterId`` y un número de
iteraciones acotado. Esto mantiene las pruebas ligeras, deterministas y sin
descargar pesos ni usar GPU, coherente con el resto del Servicio_IA.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable, Protocol, runtime_checkable


@dataclass(frozen=True)
class ClusterResult:
    """Un cluster: su id, los índices miembros (en orden) y su etiqueta."""

    clusterId: int
    miembros: list[int]
    etiqueta: str


@runtime_checkable
class Clusterer(Protocol):
    """Primitiva de agrupamiento inyectable (KMeans/HDBSCAN reales o doble)."""

    def fit_predict(self, vectores: list[list[float]]) -> list[int]:
        """Devuelve la etiqueta de cluster (entero) de cada vector de entrada."""
        ...


def _distancia2(a: list[float], b: list[float]) -> float:
    """Distancia euclídea al cuadrado entre dos vectores de igual longitud."""
    return sum((x - y) * (x - y) for x, y in zip(a, b))


class _PurePythonKMeans:
    """KMeans determinista en Python puro (sin numpy/scikit-learn).

    Inicializa los centroides con los primeros ``k`` vectores **distintos** de
    la entrada (orden estable) y repite asignación/actualización hasta
    converger o agotar ``max_iter``. Todos los desempates se resuelven por el
    menor ``clusterId`` para garantizar reproducibilidad.
    """

    def __init__(self, *, k: int, max_iter: int = 50) -> None:
        self._k = k
        self._max_iter = max_iter

    def _init_centroides(self, vectores: list[list[float]]) -> list[list[float]]:
        centroides: list[list[float]] = []
        for vector in vectores:
            if vector not in centroides:
                centroides.append(list(vector))
            if len(centroides) == self._k:
                break
        # Si hay menos vectores distintos que k, replica el último para completar.
        while len(centroides) < self._k and centroides:
            centroides.append(list(centroides[-1]))
        return centroides

    def fit_predict(self, vectores: list[list[float]]) -> list[int]:
        centroides = self._init_centroides(vectores)
        asignaciones = [0] * len(vectores)

        for _ in range(self._max_iter):
            # --- Asignación ---
            cambio = False
            for i, vector in enumerate(vectores):
                mejor_id = 0
                mejor_dist = math.inf
                for cid, centro in enumerate(centroides):
                    dist = _distancia2(vector, centro)
                    if dist < mejor_dist:
                        mejor_dist = dist
                        mejor_id = cid
                if asignaciones[i] != mejor_id:
                    cambio = True
                asignaciones[i] = mejor_id

            # --- Actualización de centroides ---
            nuevos: list[list[float]] = []
            for cid in range(len(centroides)):
                miembros = [vectores[i] for i in range(len(vectores)) if asignaciones[i] == cid]
                if not miembros:
                    # Centroide sin miembros: se conserva para mantener k estable.
                    nuevos.append(list(centroides[cid]))
                    continue
                dim = len(miembros[0])
                centro = [sum(m[d] for m in miembros) / len(miembros) for d in range(dim)]
                nuevos.append(centro)
            centroides = nuevos

            if not cambio:
                break

        return asignaciones


class ClusteringService:
    """Agrupa embeddings por similitud y construye la respuesta del contrato."""

    def __init__(
        self,
        *,
        clusterer_factory: Callable[[int], Clusterer] | None = None,
        max_iter: int = 50,
    ) -> None:
        self._clusterer_factory = clusterer_factory
        self._max_iter = max_iter

    @staticmethod
    def _inferir_k(n: int) -> int:
        """Número de clusters por defecto (heurística determinista).

        Usa ``ceil(sqrt(n / 2))`` acotado a ``[1, n]``: para entradas pequeñas
        produce pocos clusters y crece suavemente con el tamaño.
        """
        if n <= 1:
            return max(n, 0) or 1
        return max(1, min(n, math.ceil(math.sqrt(n / 2))))

    def _make_clusterer(self, k: int) -> Clusterer:
        if self._clusterer_factory is not None:
            return self._clusterer_factory(k)
        return _PurePythonKMeans(k=k, max_iter=self._max_iter)

    def agrupar(
        self, vectores: list[list[float]], k: int | None = None
    ) -> list[ClusterResult]:
        """Agrupa ``vectores`` en clusters (Req. 14.3, 31.2).

        - Valida que ``vectores`` sea una matriz rectangular de números.
        - Con entrada vacía devuelve ``[]``.
        - El número de clusters es ``k`` si se indica (acotado a ``n``) o se
          infiere de forma determinista.
        """
        if not isinstance(vectores, list) or not all(
            isinstance(fila, list) and all(isinstance(x, (int, float)) for x in fila)
            for fila in vectores
        ):
            raise ValueError("'vectores' debe ser una matriz (lista de listas) numérica.")

        if not vectores:
            return []

        ancho = len(vectores[0])
        if ancho == 0 or any(len(fila) != ancho for fila in vectores):
            raise ValueError("Todos los vectores deben tener la misma dimensión (> 0).")

        n = len(vectores)
        k_efectivo = self._inferir_k(n) if k is None else max(1, min(int(k), n))

        etiquetas = self._make_clusterer(k_efectivo).fit_predict(vectores)
        if len(etiquetas) != n:
            raise ValueError("El agrupador devolvió un número de etiquetas inválido.")

        # Agrupa por etiqueta conservando el orden de aparición de los miembros.
        miembros_por_cluster: dict[int, list[int]] = {}
        for indice, etiqueta in enumerate(etiquetas):
            miembros_por_cluster.setdefault(int(etiqueta), []).append(indice)

        # Reindexa de forma estable: clusters ordenados por su id original y
        # renumerados a 0..m-1 para una salida compacta y reproducible.
        clusters: list[ClusterResult] = []
        for nuevo_id, original in enumerate(sorted(miembros_por_cluster)):
            miembros = miembros_por_cluster[original]
            clusters.append(
                ClusterResult(
                    clusterId=nuevo_id,
                    miembros=miembros,
                    etiqueta=f"cluster_{nuevo_id}",
                )
            )
        return clusters
