"""Pruebas del servicio de anomalías y del contrato de ``POST /anomalias``.

Cubre la tarea 6.5 (Req. 31.2):

- lógica del :class:`AnomalyService` (detección por z-score determinista);
- contrato HTTP ``{ serie: number[][], zona? }`` → ``{ anomalias:[{refId,
  score, descripcion}] }``.

Todo es determinista y ligero (sin numpy/scikit-learn, sin pesos ni GPU).
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.anomalias import get_anomaly_service
from app.services.anomaly_service import AnomalyResult, AnomalyService


# --- Lógica del AnomalyService ----------------------------------------------
@pytest.mark.smoke
def test_detecta_punto_atipico() -> None:
    # Serie estable salvo un valor muy alto en la posición 5.
    serie = [[1.0], [1.1], [0.9], [1.0], [1.05], [50.0], [1.0]]
    service = AnomalyService(umbral=2.0)
    anomalias = service.detectar(serie)
    assert any(a.refId == 5 for a in anomalias)
    assert all(isinstance(a, AnomalyResult) for a in anomalias)


@pytest.mark.smoke
def test_sin_anomalias_cuando_serie_uniforme() -> None:
    service = AnomalyService(umbral=3.0)
    assert service.detectar([[5.0], [5.0], [5.0], [5.0]]) == []


@pytest.mark.smoke
def test_empty_serie_returns_empty() -> None:
    service = AnomalyService()
    assert service.detectar([]) == []


@pytest.mark.smoke
def test_zona_aparece_en_descripcion() -> None:
    serie = [[0.0], [0.0], [0.0], [0.0], [100.0]]
    service = AnomalyService(umbral=1.5)
    anomalias = service.detectar(serie, zona="Zona Norte")
    assert anomalias
    assert all("Zona Norte" in a.descripcion for a in anomalias)


@pytest.mark.smoke
def test_anomalias_ordenadas_por_refid() -> None:
    serie = [[100.0], [0.0], [0.1], [0.0], [120.0], [0.0]]
    service = AnomalyService(umbral=1.0)
    anomalias = service.detectar(serie)
    refids = [a.refId for a in anomalias]
    assert refids == sorted(refids)


@pytest.mark.smoke
def test_is_deterministic() -> None:
    serie = [[1.0], [1.0], [1.0], [9.0]]
    service = AnomalyService(umbral=1.5)
    assert service.detectar(serie) == service.detectar(serie)


@pytest.mark.smoke
def test_ragged_serie_raises() -> None:
    service = AnomalyService()
    with pytest.raises(ValueError):
        service.detectar([[1.0, 2.0], [3.0]])


@pytest.mark.smoke
def test_non_matrix_raises() -> None:
    service = AnomalyService()
    with pytest.raises(ValueError):
        service.detectar("no soy serie")  # type: ignore[arg-type]


@pytest.mark.smoke
def test_injectable_detector_is_used() -> None:
    class _FakeDetector:
        def score(self, serie: list[list[float]]) -> list[tuple[bool, float]]:
            # Marca anómalo solo el último punto, con score fijo.
            return [(i == len(serie) - 1, float(i)) for i in range(len(serie))]

    service = AnomalyService(detector_factory=lambda: _FakeDetector())
    anomalias = service.detectar([[0.0], [0.0], [0.0]])
    assert len(anomalias) == 1
    assert anomalias[0].refId == 2


# --- Contrato HTTP de POST /anomalias ---------------------------------------
def _make_service() -> AnomalyService:
    return AnomalyService(umbral=2.0)


@pytest.fixture
def anomalias_client(app: FastAPI) -> TestClient:
    app.dependency_overrides[get_anomaly_service] = _make_service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_anomaly_service, None)


@pytest.mark.contract
def test_post_anomalias_returns_contract_shape(anomalias_client: TestClient) -> None:
    response = anomalias_client.post(
        "/anomalias",
        json={
            "serie": [[1.0], [1.0], [1.0], [1.0], [50.0], [1.0]],
            "zona": "Zona Sur",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"anomalias"}
    assert isinstance(body["anomalias"], list)
    assert body["anomalias"]
    for anomalia in body["anomalias"]:
        assert set(anomalia.keys()) == {"refId", "score", "descripcion"}
        assert isinstance(anomalia["refId"], int)
        assert isinstance(anomalia["score"], (int, float))
        assert isinstance(anomalia["descripcion"], str)


@pytest.mark.contract
def test_post_anomalias_empty_is_ok(anomalias_client: TestClient) -> None:
    response = anomalias_client.post("/anomalias", json={"serie": []})
    assert response.status_code == 200
    assert response.json() == {"anomalias": []}


@pytest.mark.contract
def test_post_anomalias_ragged_returns_400(anomalias_client: TestClient) -> None:
    response = anomalias_client.post(
        "/anomalias", json={"serie": [[1.0, 2.0], [3.0]]}
    )
    assert response.status_code == 400
