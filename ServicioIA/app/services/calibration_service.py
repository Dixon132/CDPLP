"""Servicio de calibración de la `Capa_ML` con el `Corpus_Longitudinal`.

Implementa ``POST /calibrar`` (Req. 31.3, 31.4, 36.4): calibra la `Capa_ML`
**dentro del propio `Servicio_IA`** (CRISP-DM/MLOps, sin reentrenamiento pesado)
a partir del `Corpus_Longitudinal` acumulado, y devuelve una ``version`` y sus
``metricas``.

Enfoque determinista (CRISP-DM)
-------------------------------
- **Datos.** Toma las :class:`MuestraCorpus` de la :class:`ReferenciaCorpus`.
  Para cada muestra calcula el score **crudo** reutilizando la agregación del
  :class:`ScoringService` (misma lógica que el scoring), y usa el ``objetivo``
  supervisado cuando está disponible.
- **Modelado.** Ajusta un calibrador **lineal** ``pendiente*raw + intercepto``
  por mínimos cuadrados de forma cerrada y **determinista** (sin aleatoriedad,
  sin GPU). Si no hay señal supervisada suficiente, conserva la identidad.
- **Evaluación.** Reporta ``metricas`` numéricas (cobertura, MAE/RMSE antes y
  después de calibrar, etc.).
- **Versionado (MLOps).** La ``version`` se deriva de forma **determinista** del
  contenido del corpus y de los parámetros ajustados, de modo que el mismo
  corpus produce siempre la misma versión (reproducibilidad).

El servicio entrega además el :class:`LinearCalibrator` ajustado para que el
``ScoringService`` pueda consumirlo sin tocar el contrato HTTP.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

from ..models.scoring import ReferenciaCorpus
from .scoring_service import (
    IdentityCalibrator,
    LinearCalibrator,
    ScoringService,
    agregar_entrada,
    clamp01,
)


@dataclass(frozen=True)
class CalibrationResult:
    """Resultado de la calibración: versión, métricas y calibrador ajustado."""

    version: str
    metricas: dict[str, float]
    calibrador: LinearCalibrator | IdentityCalibrator


def _ajustar_lineal(pares: list[tuple[float, float]]) -> tuple[float, float]:
    """Ajusta ``objetivo ≈ pendiente*raw + intercepto`` por mínimos cuadrados.

    Devuelve ``(pendiente, intercepto)``. Determinista y de forma cerrada. Si la
    varianza de ``raw`` es nula (no hay información para ajustar la pendiente),
    devuelve identidad ``(1.0, 0.0)``.
    """
    n = len(pares)
    if n == 0:
        return 1.0, 0.0

    sum_x = sum(x for x, _ in pares)
    sum_y = sum(y for _, y in pares)
    media_x = sum_x / n
    media_y = sum_y / n

    sxx = sum((x - media_x) ** 2 for x, _ in pares)
    if sxx <= 1e-12:
        # Sin varianza en raw: no se puede estimar pendiente; centra al objetivo.
        return 0.0, clamp01(media_y)

    sxy = sum((x - media_x) * (y - media_y) for x, y in pares)
    pendiente = sxy / sxx
    intercepto = media_y - pendiente * media_x
    return pendiente, intercepto


def _redondear(valor: float, ndigits: int = 6) -> float:
    """Redondea para métricas estables y comparables entre ejecuciones."""
    return round(float(valor), ndigits)


def _version_determinista(
    corpus: ReferenciaCorpus, pendiente: float, intercepto: float
) -> str:
    """Deriva una versión reproducible del contenido del corpus + parámetros."""
    payload = {
        "corpus": corpus.model_dump(mode="json"),
        "pendiente": round(float(pendiente), 9),
        "intercepto": round(float(intercepto), 9),
    }
    canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return f"cal-{digest[:12]}"


class CalibrationService:
    """Calibra la `Capa_ML` con el `Corpus_Longitudinal` (Req. 31.3, 31.4, 36.4)."""

    def __init__(self, *, scoring: ScoringService | None = None) -> None:
        # La agregación cruda es independiente del calibrador; se usa uno neutro.
        self._scoring = scoring or ScoringService(calibrator=IdentityCalibrator())

    def calibrar(self, corpus: ReferenciaCorpus) -> CalibrationResult:
        """Ajusta el calibrador y reporta versión + métricas de la calibración."""
        muestras = corpus.muestras
        num = len(muestras)

        # Score crudo por muestra (misma agregación que el scoring).
        crudos = [agregar_entrada(m.entrada) for m in muestras]

        # Pares supervisados (raw, objetivo) para el ajuste.
        pares = [
            (crudo, float(m.objetivo))
            for crudo, m in zip(crudos, muestras)
            if m.objetivo is not None
        ]

        pendiente, intercepto = _ajustar_lineal(pares)

        if pares:
            calibrador: LinearCalibrator | IdentityCalibrator = LinearCalibrator(
                pendiente=pendiente, intercepto=intercepto
            )
        else:
            # Sin señal supervisada: conserva identidad (no degrada el scoring).
            calibrador = IdentityCalibrator()
            pendiente, intercepto = 1.0, 0.0

        metricas = self._metricas(num, pares, calibrador)
        version = _version_determinista(corpus, pendiente, intercepto)

        return CalibrationResult(
            version=version,
            metricas=metricas,
            calibrador=calibrador,
        )

    def _metricas(
        self,
        num_muestras: int,
        pares: list[tuple[float, float]],
        calibrador: LinearCalibrator | IdentityCalibrator,
    ) -> dict[str, float]:
        """Calcula métricas numéricas deterministas de la calibración."""
        num_etiquetadas = len(pares)
        metricas: dict[str, float] = {
            "numMuestras": float(num_muestras),
            "numEtiquetadas": float(num_etiquetadas),
            "cobertura": _redondear(num_etiquetadas / num_muestras) if num_muestras else 0.0,
        }

        if not pares:
            return metricas

        # Error antes de calibrar (raw vs objetivo) y después (calibrado vs objetivo).
        err_crudo = [raw - obj for raw, obj in pares]
        err_cal = [clamp01(calibrador.calibrate(raw)) - obj for raw, obj in pares]

        metricas["maeCrudo"] = _redondear(sum(abs(e) for e in err_crudo) / num_etiquetadas)
        metricas["rmseCrudo"] = _redondear(
            (sum(e * e for e in err_crudo) / num_etiquetadas) ** 0.5
        )
        metricas["mae"] = _redondear(sum(abs(e) for e in err_cal) / num_etiquetadas)
        metricas["rmse"] = _redondear(
            (sum(e * e for e in err_cal) / num_etiquetadas) ** 0.5
        )
        return metricas
