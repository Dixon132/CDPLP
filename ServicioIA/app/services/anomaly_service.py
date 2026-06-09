"""Servicio de detección de anomalías del Servicio_IA.

Implementa el ``POST /anomalias`` (Req. 31.2): dada una ``serie`` de
observaciones (``number[][]``), identifica los puntos atípicos respecto al
patrón longitudinal acumulado y devuelve
``anomalias:[{refId, score, descripcion}]``.

Diseño orientado a pruebas
--------------------------
En producción la detección puede delegar en *scikit-learn*
(``IsolationForest``) a través de un :class:`AnomalyDetector` inyectable; la
importación de la librería pesada sería **perezosa**.

Por defecto el servicio usa un detector ligero por **z-score** determinista en
Python puro (sin numpy/scikit-learn): para cada punto calcula el máximo
``|z|`` sobre sus dimensiones y lo marca como anomalía si supera el ``umbral``.
Esto mantiene las pruebas baratas y reproducibles.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable, Protocol, runtime_checkable


@dataclass(frozen=True)
class AnomalyResult:
    """Una anomalía: el índice del punto, su score y una descripción."""

    refId: int
    score: float
    descripcion: str


@runtime_checkable
class AnomalyDetector(Protocol):
    """Primitiva de detección inyectable (IsolationForest real o doble).

    Devuelve, por cada punto de la serie, una tupla ``(es_anomalia, score)``.
    """

    def score(self, serie: list[list[float]]) -> list[tuple[bool, float]]:
        ...


class _ZScoreDetector:
    """Detector por z-score determinista en Python puro.

    Calcula media y desviación típica (poblacional) por dimensión y asigna a
    cada punto el máximo ``|z|`` entre sus dimensiones. Un punto es anómalo si
    ese máximo supera ``umbral``. Si una dimensión tiene desviación nula, no
    aporta z-score (todos sus valores son iguales).
    """

    def __init__(self, *, umbral: float = 3.0) -> None:
        self._umbral = umbral

    def score(self, serie: list[list[float]]) -> list[tuple[bool, float]]:
        n = len(serie)
        if n == 0:
            return []
        dim = len(serie[0])

        medias: list[float] = []
        desviaciones: list[float] = []
        for d in range(dim):
            columna = [punto[d] for punto in serie]
            media = sum(columna) / n
            varianza = sum((x - media) * (x - media) for x in columna) / n
            medias.append(media)
            desviaciones.append(math.sqrt(varianza))

        resultados: list[tuple[bool, float]] = []
        for punto in serie:
            max_z = 0.0
            for d in range(dim):
                if desviaciones[d] > 0.0:
                    z = abs(punto[d] - medias[d]) / desviaciones[d]
                    if z > max_z:
                        max_z = z
            resultados.append((max_z > self._umbral, max_z))
        return resultados


class AnomalyService:
    """Detecta anomalías en una serie y construye la respuesta del contrato."""

    def __init__(
        self,
        *,
        detector_factory: Callable[[], AnomalyDetector] | None = None,
        umbral: float = 3.0,
    ) -> None:
        self._detector_factory = detector_factory
        self._umbral = umbral

    def _make_detector(self) -> AnomalyDetector:
        if self._detector_factory is not None:
            return self._detector_factory()
        return _ZScoreDetector(umbral=self._umbral)

    def detectar(
        self, serie: list[list[float]], zona: str | None = None
    ) -> list[AnomalyResult]:
        """Detecta los puntos anómalos de ``serie`` (Req. 31.2).

        - Valida que ``serie`` sea una matriz rectangular numérica.
        - Con entrada vacía devuelve ``[]``.
        - ``zona`` (opcional) contextualiza la descripción de cada anomalía.
        """
        if not isinstance(serie, list) or not all(
            isinstance(fila, list) and all(isinstance(x, (int, float)) for x in fila)
            for fila in serie
        ):
            raise ValueError("'serie' debe ser una matriz (lista de listas) numérica.")

        if not serie:
            return []

        ancho = len(serie[0])
        if ancho == 0 or any(len(fila) != ancho for fila in serie):
            raise ValueError("Todos los puntos de la serie deben tener la misma dimensión (> 0).")

        evaluaciones = self._make_detector().score(serie)
        if len(evaluaciones) != len(serie):
            raise ValueError("El detector devolvió un número de evaluaciones inválido.")

        sufijo_zona = f" en la zona '{zona}'" if zona else ""
        anomalias: list[AnomalyResult] = []
        for indice, (es_anomalia, score) in enumerate(evaluaciones):
            if es_anomalia:
                anomalias.append(
                    AnomalyResult(
                        refId=indice,
                        score=round(float(score), 6),
                        descripcion=(
                            f"Punto {indice} atípico{sufijo_zona} "
                            f"(score={float(score):.3f})."
                        ),
                    )
                )
        return anomalias
