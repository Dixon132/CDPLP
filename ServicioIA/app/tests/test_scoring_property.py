# Feature: analisis-tendencias-riesgo-emocional, Property 33: Score calibrado del Índice por la Capa_ML dentro de rango
"""PBT de la Property 33 — score calibrado del `Indice_Riesgo` siempre en [0,1].

Tarea 6.10. Valida que, para **cualquier** :class:`EntradaIndice` (dimensiones
con ``valor``/``minimo``/``maximo`` arbitrarios, incluidos valores fuera de
rango y magnitudes extremas, pesos arbitrarios y rangos degenerados), el score
calibrado que devuelve la ``Capa_ML`` (:class:`ScoringService`) está **siempre
acotado a ``[0,1]``**, sin importar el calibrador inyectado.

Validates: Requirements 31.2, 31.7, 35.1

Property 33: Score calibrado del Índice por la Capa_ML dentro de rango.

Todo es determinista (sin pesos reales ni GPU), coherente con el harness y los
perfiles deterministas de Hypothesis registrados en ``conftest.py``.
"""

from __future__ import annotations

import math

import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.models.scoring import DimensionEntrada, EntradaIndice
from app.services.scoring_service import (
    Calibrator,
    IdentityCalibrator,
    LinearCalibrator,
    ScoringService,
)

# --- Estrategias inteligentes del espacio de entrada ------------------------
# Floats finitos (sin NaN/inf): cubren valores dentro, fuera del rango y
# magnitudes extremas para forzar el acotado a [0,1].
_finite_floats = st.floats(
    allow_nan=False,
    allow_infinity=False,
    min_value=-1e12,
    max_value=1e12,
    allow_subnormal=False,
)

# Pesos arbitrarios (incluye negativos y cero → el servicio los trata como >=0
# y cae a media simple si no hay pesos positivos).
_pesos = st.floats(
    allow_nan=False,
    allow_infinity=False,
    min_value=-1e6,
    max_value=1e6,
    allow_subnormal=False,
)

_evidencia_ids = st.lists(st.text(max_size=8), max_size=4)


@st.composite
def _dimensiones(draw: st.DrawFn) -> DimensionEntrada:
    """Genera una dimensión con rango arbitrario (incluido degenerado)."""
    return DimensionEntrada(
        nombre=draw(st.text(max_size=12)),
        valor=draw(_finite_floats),
        minimo=draw(_finite_floats),
        maximo=draw(_finite_floats),
        peso=draw(_pesos),
        evidenciaIds=draw(_evidencia_ids),
    )


_entradas = st.builds(
    EntradaIndice,
    comunidadId=st.none() | st.text(max_size=8),
    semana=st.none() | st.integers(min_value=0, max_value=520),
    dimensiones=st.lists(_dimensiones(), max_size=6),
    evidenciaIds=_evidencia_ids,
)

# Calibradores arbitrarios: identidad y lineales con pendiente/intercepto
# extremos (deben seguir acotando el resultado a [0,1]).
_calibradores = st.one_of(
    st.just(IdentityCalibrator()),
    st.builds(
        LinearCalibrator,
        pendiente=st.floats(
            allow_nan=False, allow_infinity=False, min_value=-1e6, max_value=1e6
        ),
        intercepto=st.floats(
            allow_nan=False, allow_infinity=False, min_value=-1e6, max_value=1e6
        ),
    ),
)


@pytest.mark.property
@given(entrada=_entradas, calibrador=_calibradores)
def test_score_calibrado_siempre_en_rango(
    entrada: EntradaIndice, calibrador: Calibrator
) -> None:
    """Property 33: el score calibrado está SIEMPRE en [0,1] para toda entrada."""
    resultado = ScoringService(calibrator=calibrador).score(entrada)

    assert isinstance(resultado.score, float)
    assert math.isfinite(resultado.score)
    assert 0.0 <= resultado.score <= 1.0


@pytest.mark.property
@given(entrada=_entradas)
def test_score_calibrado_por_defecto_en_rango(entrada: EntradaIndice) -> None:
    """El calibrador por defecto (identidad acotada) también mantiene [0,1]."""
    resultado = ScoringService().score(entrada)

    assert math.isfinite(resultado.score)
    assert 0.0 <= resultado.score <= 1.0
