"""Pruebas del scoring calibrado y la calibración (tarea 6.6).

Cubre (Req. 31.2, 31.3, 31.4, 31.7, 36.4):

- lógica del :class:`ScoringService`: normalización por dimensión, agregación
  ponderada, **score garantizado en [0,1]** (incluso con valores fuera de rango),
  evidencia colectiva determinista y calibrador inyectable;
- lógica del :class:`CalibrationService`: ajuste lineal determinista,
  versión reproducible y métricas numéricas;
- contrato HTTP de ``POST /score-calibrado`` (``{ entradaIndice }`` →
  ``{ score:[0..1], evidenciaIds[] }``) y ``POST /calibrar``
  (``{ referenciaCorpus }`` → ``{ version, metricas }``).

La PBT de score-en-rango (Property 33) es la tarea 6.10 y NO se implementa aquí.
Todo es determinista (sin pesos reales ni GPU), coherente con el harness.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.scoring import (
    DimensionEntrada,
    EntradaIndice,
    MuestraCorpus,
    ReferenciaCorpus,
)
from app.routers.scoring import get_calibration_service, get_scoring_service
from app.services.scoring_service import (
    IdentityCalibrator,
    LinearCalibrator,
    ScoringService,
    agregar_entrada,
    normalizar_dimension,
)
from app.services.calibration_service import CalibrationService


# --- Lógica del ScoringService ---------------------------------------------
@pytest.mark.smoke
def test_score_en_rango_con_media_ponderada() -> None:
    service = ScoringService()
    entrada = EntradaIndice(
        comunidadId="c1",
        semana=1,
        dimensiones=[
            DimensionEntrada(nombre="estres", valor=8, minimo=0, maximo=10, peso=2),
            DimensionEntrada(nombre="ansiedad", valor=2, minimo=0, maximo=10, peso=1),
        ],
    )
    result = service.score(entrada)
    # normalizados: 0.8 y 0.2; ponderado = (0.8*2 + 0.2*1)/3 = 0.6
    assert result.score == pytest.approx(0.6, abs=1e-9)
    assert 0.0 <= result.score <= 1.0


@pytest.mark.smoke
def test_score_acota_valores_fuera_de_rango_a_0_1() -> None:
    service = ScoringService()
    # Valores muy por encima/por debajo del rango → siguen produciendo score en [0,1].
    alto = service.score(
        EntradaIndice(dimensiones=[DimensionEntrada(nombre="x", valor=999, minimo=0, maximo=10)])
    )
    bajo = service.score(
        EntradaIndice(dimensiones=[DimensionEntrada(nombre="x", valor=-999, minimo=0, maximo=10)])
    )
    assert alto.score == 1.0
    assert bajo.score == 0.0


@pytest.mark.smoke
def test_score_sin_dimensiones_es_cero() -> None:
    service = ScoringService()
    result = service.score(EntradaIndice())
    assert result.score == 0.0
    assert result.evidenciaIds == []


@pytest.mark.smoke
def test_normalizar_dimension_rango_degenerado() -> None:
    # maximo <= minimo: se interpreta el valor directamente, acotado.
    assert normalizar_dimension(DimensionEntrada(nombre="x", valor=0.5, minimo=5, maximo=5)) == 0.5
    assert normalizar_dimension(DimensionEntrada(nombre="x", valor=3, minimo=5, maximo=5)) == 1.0


@pytest.mark.smoke
def test_pesos_no_positivos_usan_media_simple() -> None:
    service = ScoringService()
    entrada = EntradaIndice(
        dimensiones=[
            DimensionEntrada(nombre="a", valor=1, minimo=0, maximo=1, peso=0),
            DimensionEntrada(nombre="b", valor=0, minimo=0, maximo=1, peso=0),
        ]
    )
    # Sin pesos positivos → media simple = 0.5
    assert service.score(entrada).score == pytest.approx(0.5, abs=1e-9)


@pytest.mark.smoke
def test_evidencia_colectiva_union_ordenada_sin_duplicados() -> None:
    service = ScoringService()
    entrada = EntradaIndice(
        evidenciaIds=["e0"],
        dimensiones=[
            DimensionEntrada(nombre="a", valor=1, evidenciaIds=["e1", "e2"]),
            DimensionEntrada(nombre="b", valor=1, evidenciaIds=["e2", "e3"]),
        ],
    )
    assert service.score(entrada).evidenciaIds == ["e0", "e1", "e2", "e3"]


@pytest.mark.smoke
def test_calibrador_inyectable_se_aplica_y_acota() -> None:
    # Calibrador que dispara fuera de rango: el servicio debe acotar a [0,1].
    service = ScoringService(calibrator=LinearCalibrator(pendiente=10.0, intercepto=0.0))
    entrada = EntradaIndice(dimensiones=[DimensionEntrada(nombre="a", valor=0.5, minimo=0, maximo=1)])
    # raw=0.5 → 10*0.5=5.0 → acotado a 1.0
    assert service.score(entrada).score == 1.0


@pytest.mark.smoke
def test_score_es_determinista() -> None:
    service = ScoringService()
    entrada = EntradaIndice(dimensiones=[DimensionEntrada(nombre="a", valor=0.3)])
    assert service.score(entrada) == service.score(entrada)


# --- Lógica del CalibrationService -----------------------------------------
def _muestra(valor: float, objetivo: float | None) -> MuestraCorpus:
    return MuestraCorpus(
        entrada=EntradaIndice(dimensiones=[DimensionEntrada(nombre="a", valor=valor, minimo=0, maximo=1)]),
        objetivo=objetivo,
    )


@pytest.mark.smoke
def test_calibrar_ajusta_lineal_y_reduce_error() -> None:
    service = CalibrationService()
    # objetivo = raw/2 (perfectamente lineal) → la calibración debe reducir el error.
    corpus = ReferenciaCorpus(
        analisisId="a1",
        muestras=[_muestra(0.0, 0.0), _muestra(0.4, 0.2), _muestra(1.0, 0.5)],
    )
    result = service.calibrar(corpus)
    assert isinstance(result.calibrador, LinearCalibrator)
    assert result.metricas["numMuestras"] == 3.0
    assert result.metricas["numEtiquetadas"] == 3.0
    assert result.metricas["cobertura"] == 1.0
    # El error calibrado es <= error crudo (la calibración ajusta hacia el objetivo).
    assert result.metricas["mae"] <= result.metricas["maeCrudo"] + 1e-9
    assert result.metricas["rmse"] == pytest.approx(0.0, abs=1e-6)


@pytest.mark.smoke
def test_calibrar_sin_objetivos_conserva_identidad() -> None:
    service = CalibrationService()
    corpus = ReferenciaCorpus(muestras=[_muestra(0.3, None), _muestra(0.7, None)])
    result = service.calibrar(corpus)
    assert isinstance(result.calibrador, IdentityCalibrator)
    assert result.metricas["numMuestras"] == 2.0
    assert result.metricas["numEtiquetadas"] == 0.0
    assert "mae" not in result.metricas


@pytest.mark.smoke
def test_calibrar_corpus_vacio() -> None:
    service = CalibrationService()
    result = service.calibrar(ReferenciaCorpus())
    assert result.metricas["numMuestras"] == 0.0
    assert result.metricas["cobertura"] == 0.0
    assert result.version.startswith("cal-")


@pytest.mark.smoke
def test_version_determinista_para_mismo_corpus() -> None:
    service = CalibrationService()
    corpus = ReferenciaCorpus(analisisId="a1", muestras=[_muestra(0.2, 0.1), _muestra(0.8, 0.9)])
    v1 = service.calibrar(corpus).version
    v2 = service.calibrar(corpus).version
    assert v1 == v2
    # Un corpus distinto produce (con alta probabilidad) una versión distinta.
    otro = ReferenciaCorpus(analisisId="a2", muestras=[_muestra(0.2, 0.1)])
    assert service.calibrar(otro).version != v1


@pytest.mark.smoke
def test_calibrador_fijo_calibra_score_dentro_de_rango() -> None:
    # Integra calibración → scoring: el calibrador ajustado mantiene el score en [0,1].
    cal = CalibrationService().calibrar(
        ReferenciaCorpus(muestras=[_muestra(0.0, 0.1), _muestra(1.0, 0.9)])
    )
    scoring = ScoringService(calibrator=cal.calibrador)
    entrada = EntradaIndice(dimensiones=[DimensionEntrada(nombre="a", valor=0.5)])
    score = scoring.score(entrada).score
    assert 0.0 <= score <= 1.0


# --- Contrato HTTP de POST /score-calibrado --------------------------------
@pytest.fixture
def scoring_client(app: FastAPI) -> TestClient:
    app.dependency_overrides[get_scoring_service] = lambda: ScoringService()
    app.dependency_overrides[get_calibration_service] = lambda: CalibrationService()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_scoring_service, None)
    app.dependency_overrides.pop(get_calibration_service, None)


@pytest.mark.contract
def test_post_score_calibrado_returns_contract_shape(scoring_client: TestClient) -> None:
    response = scoring_client.post(
        "/score-calibrado",
        json={
            "entradaIndice": {
                "comunidadId": "c1",
                "semana": 3,
                "dimensiones": [
                    {"nombre": "estres", "valor": 7, "minimo": 0, "maximo": 10, "peso": 2,
                     "evidenciaIds": ["ev1", "ev2"]},
                    {"nombre": "ansiedad", "valor": 3, "minimo": 0, "maximo": 10,
                     "evidenciaIds": ["ev2", "ev3"]},
                ],
            }
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"score", "evidenciaIds"}
    assert isinstance(body["score"], (int, float))
    assert 0.0 <= body["score"] <= 1.0
    assert body["evidenciaIds"] == ["ev1", "ev2", "ev3"]


@pytest.mark.contract
def test_post_score_calibrado_clamps_out_of_range(scoring_client: TestClient) -> None:
    response = scoring_client.post(
        "/score-calibrado",
        json={"entradaIndice": {"dimensiones": [
            {"nombre": "x", "valor": 5000, "minimo": 0, "maximo": 10}
        ]}},
    )
    assert response.status_code == 200
    assert response.json()["score"] == 1.0


@pytest.mark.contract
def test_post_score_calibrado_empty_entrada(scoring_client: TestClient) -> None:
    response = scoring_client.post("/score-calibrado", json={"entradaIndice": {}})
    assert response.status_code == 200
    body = response.json()
    assert body == {"score": 0.0, "evidenciaIds": []}


# --- Contrato HTTP de POST /calibrar ---------------------------------------
@pytest.mark.contract
def test_post_calibrar_returns_contract_shape(scoring_client: TestClient) -> None:
    response = scoring_client.post(
        "/calibrar",
        json={
            "referenciaCorpus": {
                "analisisId": "a1",
                "numSemanas": 4,
                "muestras": [
                    {"entrada": {"dimensiones": [{"nombre": "a", "valor": 0.2}]}, "objetivo": 0.1},
                    {"entrada": {"dimensiones": [{"nombre": "a", "valor": 0.8}]}, "objetivo": 0.9},
                ],
            }
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"version", "metricas"}
    assert isinstance(body["version"], str) and body["version"]
    assert isinstance(body["metricas"], dict)
    assert all(isinstance(v, (int, float)) for v in body["metricas"].values())
    assert body["metricas"]["numMuestras"] == 2.0


@pytest.mark.contract
def test_post_calibrar_empty_corpus(scoring_client: TestClient) -> None:
    response = scoring_client.post("/calibrar", json={"referenciaCorpus": {}})
    assert response.status_code == 200
    body = response.json()
    assert body["version"].startswith("cal-")
    assert body["metricas"]["numMuestras"] == 0.0


@pytest.mark.contract
def test_post_score_calibrado_invalid_body_returns_422(scoring_client: TestClient) -> None:
    # Falta 'entradaIndice' → error de validación de pydantic/FastAPI.
    response = scoring_client.post("/score-calibrado", json={})
    assert response.status_code == 422
