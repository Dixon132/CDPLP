"""Servicio de detección de tendencias del Servicio_IA.

Implementa el ``POST /tendencias`` (Req. 31.2): dada la ``evolucion`` temporal
de cada dimensión del ``Indice_Riesgo``, determina la dirección y la magnitud
de su tendencia y devuelve ``tendencias:[{dimension, direccion, magnitud}]``.

Diseño orientado a pruebas
--------------------------
En producción el análisis de series temporales puede apoyarse en
**NumPy/Pandas** a través de un :class:`TrendEstimator` inyectable (importación
perezosa). Por defecto, el servicio estima la **pendiente por mínimos
cuadrados** en Python puro (sin numpy/pandas): determinista, barato y
suficiente para el contrato. La dirección se decide comparando la pendiente con
un ``epsilon`` configurable; la magnitud es la pendiente absoluta.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Protocol, runtime_checkable

DIRECCION_ASCENDENTE = "ascendente"
DIRECCION_DESCENDENTE = "descendente"
DIRECCION_ESTABLE = "estable"


@dataclass(frozen=True)
class TrendResult:
    """Tendencia de una dimensión: nombre, dirección y magnitud (pendiente abs)."""

    dimension: str
    direccion: str
    magnitud: float


@runtime_checkable
class TrendEstimator(Protocol):
    """Primitiva inyectable que estima la pendiente de una serie temporal."""

    def slope(self, serie: list[float]) -> float:
        """Devuelve la pendiente (cambio por paso temporal) de la serie."""
        ...


class _LeastSquaresEstimator:
    """Estimador de pendiente por mínimos cuadrados en Python puro.

    Para una serie ``y`` con tiempos ``x = 0, 1, ..., n-1`` calcula la pendiente
    ``b = Σ(x-x̄)(y-ȳ) / Σ(x-x̄)²``. Con menos de dos puntos, o varianza nula en
    ``x``, la pendiente es ``0`` (serie constante o insuficiente).
    """

    def slope(self, serie: list[float]) -> float:
        n = len(serie)
        if n < 2:
            return 0.0
        xs = list(range(n))
        x_media = sum(xs) / n
        y_media = sum(serie) / n
        numerador = sum((x - x_media) * (y - y_media) for x, y in zip(xs, serie))
        denominador = sum((x - x_media) * (x - x_media) for x in xs)
        if denominador == 0.0:
            return 0.0
        return numerador / denominador


class TrendService:
    """Detecta tendencias por dimensión y construye la respuesta del contrato."""

    def __init__(
        self,
        *,
        estimator_factory: Callable[[], TrendEstimator] | None = None,
        epsilon: float = 1e-6,
    ) -> None:
        self._estimator_factory = estimator_factory
        self._epsilon = epsilon

    def _make_estimator(self) -> TrendEstimator:
        if self._estimator_factory is not None:
            return self._estimator_factory()
        return _LeastSquaresEstimator()

    def _direccion(self, slope: float) -> str:
        if slope > self._epsilon:
            return DIRECCION_ASCENDENTE
        if slope < -self._epsilon:
            return DIRECCION_DESCENDENTE
        return DIRECCION_ESTABLE

    def detectar(
        self, evolucion: dict[str, list[float]], zona: str | None = None
    ) -> list[TrendResult]:
        """Detecta la tendencia de cada dimensión de ``evolucion`` (Req. 31.2).

        - Valida que ``evolucion`` mapee nombres de dimensión a series numéricas.
        - Con un mapa vacío devuelve ``[]``.
        - El resultado se ordena por nombre de dimensión para reproducibilidad.
        - ``zona`` se acepta para contextualización; no altera el cálculo de la
          pendiente (la serie ya viene anclada a su ``Zona_Geografica``).
        """
        if not isinstance(evolucion, dict) or not all(
            isinstance(nombre, str)
            and isinstance(serie, list)
            and all(isinstance(x, (int, float)) for x in serie)
            for nombre, serie in evolucion.items()
        ):
            raise ValueError(
                "'evolucion' debe mapear nombres de dimensión a series numéricas."
            )

        estimator = self._make_estimator()
        tendencias: list[TrendResult] = []
        for dimension in sorted(evolucion):
            serie = evolucion[dimension]
            slope = estimator.slope(serie)
            tendencias.append(
                TrendResult(
                    dimension=dimension,
                    direccion=self._direccion(slope),
                    magnitud=round(abs(float(slope)), 6),
                )
            )
        return tendencias
