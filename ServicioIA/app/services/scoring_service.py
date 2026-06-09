"""Servicio de scoring calibrado del `Indice_Riesgo` (``Capa_ML`` del Servicio_IA).

Implementa el **scoring calibrado** del `Indice_Riesgo` (Req. 31.2, 31.7):

- toma una :class:`EntradaIndice` **colectiva** (dimensiones independientes por
  `Comunidad_Digital`/`Semana_Simulada`),
- normaliza cada dimensión a ``[0,1]`` dentro de su propio ``[minimo, maximo]``
  (acotando los valores fuera de rango),
- agrega las dimensiones con sus pesos en un score crudo,
- aplica un **calibrador** (inyectable) y **acota el resultado a [0,1]**, de modo
  que el score devuelto está **garantizado en el rango** sin importar la entrada,
- acompaña el score de la ``evidenciaIds`` colectiva que lo respalda.

La salida es siempre **colectiva** (nunca diagnóstico individual, Req. 31.7) y
**determinista** (sin pesos reales ni GPU), por lo que es directamente testeable
y coherente con el fallback determinista TS de la ``Capa_ML``.

Diseño orientado a pruebas
--------------------------
La transformación de calibración vive detrás de un :class:`Calibrator`
inyectable. Por defecto se usa un calibrador **identidad acotada** (clamp a
[0,1]); la calibración aprendida del `Corpus_Longitudinal`
(:mod:`app.services.calibration_service`) puede sustituirlo por un calibrador
lineal sin tocar la agregación ni el contrato HTTP.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Protocol, runtime_checkable

from ..models.scoring import DimensionEntrada, EntradaIndice


def clamp01(valor: float) -> float:
    """Acota ``valor`` al rango cerrado ``[0, 1]``."""
    if valor < 0.0:
        return 0.0
    if valor > 1.0:
        return 1.0
    return float(valor)


def normalizar_dimension(dim: DimensionEntrada) -> float:
    """Normaliza el valor de una dimensión a ``[0,1]`` dentro de su ``[minimo, maximo]``.

    Si el rango es degenerado (``maximo <= minimo``), se interpreta el ``valor``
    directamente y se acota. Cualquier valor fuera de rango se acota a [0,1].
    """
    span = dim.maximo - dim.minimo
    if span <= 0:
        return clamp01(dim.valor)
    return clamp01((dim.valor - dim.minimo) / span)


@runtime_checkable
class Calibrator(Protocol):
    """Transformación de calibración del score crudo (inyectable)."""

    def calibrate(self, raw: float) -> float:
        """Mapea un score crudo en [0,1] a un score calibrado (se acotará a [0,1])."""
        ...


class IdentityCalibrator:
    """Calibrador por defecto: identidad acotada a ``[0,1]``."""

    def calibrate(self, raw: float) -> float:
        return clamp01(raw)


@dataclass(frozen=True)
class LinearCalibrator:
    """Calibrador lineal ``clamp01(pendiente * raw + intercepto)``.

    Lo produce la calibración del `Corpus_Longitudinal`; mantiene el score en
    [0,1] al acotar el resultado.
    """

    pendiente: float = 1.0
    intercepto: float = 0.0

    def calibrate(self, raw: float) -> float:
        return clamp01(self.pendiente * raw + self.intercepto)


@dataclass(frozen=True)
class ScoreResult:
    """Resultado del scoring: score calibrado en [0,1] + evidencia colectiva."""

    score: float
    evidenciaIds: list[str]


def evidencia_colectiva(entrada: EntradaIndice) -> list[str]:
    """Une, sin duplicar y preservando el orden, la evidencia de la entrada.

    Incluye primero la evidencia a nivel de entrada y luego la de cada dimensión
    en orden, de modo que el resultado es **determinista**.
    """
    vistas: set[str] = set()
    ordenada: list[str] = []
    for ref in list(entrada.evidenciaIds) + [
        ref for dim in entrada.dimensiones for ref in dim.evidenciaIds
    ]:
        if ref not in vistas:
            vistas.add(ref)
            ordenada.append(ref)
    return ordenada


def agregar_entrada(entrada: EntradaIndice) -> float:
    """Agrega las dimensiones normalizadas en un score crudo en [0,1].

    Usa una media ponderada por ``peso`` (>=0). Si no hay pesos positivos, usa
    una media simple. Sin dimensiones, el score crudo es 0.0.
    """
    dims = entrada.dimensiones
    if not dims:
        return 0.0

    normalizados = [normalizar_dimension(d) for d in dims]
    pesos = [max(d.peso, 0.0) for d in dims]
    total_peso = sum(pesos)

    if total_peso <= 0.0:
        return clamp01(sum(normalizados) / len(normalizados))

    ponderado = sum(n * p for n, p in zip(normalizados, pesos)) / total_peso
    return clamp01(ponderado)


class ScoringService:
    """Calcula el score calibrado del `Indice_Riesgo` (colectivo, en [0,1])."""

    def __init__(
        self,
        *,
        calibrator: Calibrator | None = None,
        calibrator_factory: Callable[[], Calibrator] | None = None,
    ) -> None:
        if calibrator is not None:
            self._calibrator: Calibrator = calibrator
        elif calibrator_factory is not None:
            self._calibrator = calibrator_factory()
        else:
            self._calibrator = IdentityCalibrator()

    @property
    def calibrator(self) -> Calibrator:
        return self._calibrator

    def score(self, entrada: EntradaIndice) -> ScoreResult:
        """Devuelve el score calibrado en [0,1] y la evidencia colectiva (Req. 31.2, 31.7)."""
        raw = agregar_entrada(entrada)
        calibrado = clamp01(self._calibrator.calibrate(raw))
        return ScoreResult(score=calibrado, evidenciaIds=evidencia_colectiva(entrada))
