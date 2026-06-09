"""Pruebas del servicio de tendencias y del contrato de ``POST /tendencias``.

Cubre la tarea 6.5 (Req. 31.2):

- lógica del :class:`TrendService` (pendiente por mínimos cuadrados);
- contrato HTTP ``{ evolucion, zona? }`` → ``{ tendencias:[{dimension,
  direccion, magnitud}] }``.

Todo es determinista y ligero (sin numpy/pandas).
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.tendencias import get_trend_service
from app.services.trend_service import (
    DIRECCION_ASCENDENTE,
    DIRECCION_DESCENDENTE,
    DIRECCION_ESTABLE,
    TrendResult,
    TrendService,
)


# --- Lógica del TrendService ------------------------------------------------
@pytest.mark.smoke
def test_detecta_direcciones() -> None:
    service = TrendService()
    tendencias = service.detectar(
        {
            "ansiedad": [1.0, 2.0, 3.0, 4.0],
            "conflicto": [4.0, 3.0, 2.0, 1.0],
            "aislamiento": [2.0, 2.0, 2.0, 2.0],
        }
    )
    por_dim = {t.dimension: t for t in tendencias}
    assert por_dim["ansiedad"].direccion == DIRECCION_ASCENDENTE
    assert por_dim["conflicto"].direccion == DIRECCION_DESCENDENTE
    assert por_dim["aislamiento"].direccion == DIRECCION_ESTABLE
    assert all(isinstance(t, TrendResult) for t in tendencias)


@pytest.mark.smoke
def test_magnitud_es_pendiente_absoluta() -> None:
    service = TrendService()
    tendencias = service.detectar({"d": [0.0, 2.0, 4.0, 6.0]})
    assert tendencias[0].magnitud == pytest.approx(2.0)


@pytest.mark.smoke
def test_resultado_ordenado_por_dimension() -> None:
    service = TrendService()
    tendencias = service.detectar(
        {"zeta": [1.0, 2.0], "alfa": [1.0, 2.0], "mu": [1.0, 2.0]}
    )
    dims = [t.dimension for t in tendencias]
    assert dims == sorted(dims)


@pytest.mark.smoke
def test_serie_de_un_punto_es_estable() -> None:
    service = TrendService()
    tendencias = service.detectar({"d": [5.0]})
    assert tendencias[0].direccion == DIRECCION_ESTABLE
    assert tendencias[0].magnitud == 0.0


@pytest.mark.smoke
def test_empty_evolucion_returns_empty() -> None:
    service = TrendService()
    assert service.detectar({}) == []


@pytest.mark.smoke
def test_is_deterministic() -> None:
    service = TrendService()
    evolucion = {"a": [1.0, 3.0, 2.0, 5.0], "b": [9.0, 8.0, 7.0]}
    assert service.detectar(evolucion) == service.detectar(evolucion)


@pytest.mark.smoke
def test_invalid_evolucion_raises() -> None:
    service = TrendService()
    with pytest.raises(ValueError):
        service.detectar({"a": "no es serie"})  # type: ignore[dict-item]


@pytest.mark.smoke
def test_injectable_estimator_is_used() -> None:
    class _FakeEstimator:
        def slope(self, serie: list[float]) -> float:
            return 5.0  # siempre ascendente, magnitud 5

    service = TrendService(estimator_factory=lambda: _FakeEstimator())
    tendencias = service.detectar({"d": [0.0, 0.0]})
    assert tendencias[0].direccion == DIRECCION_ASCENDENTE
    assert tendencias[0].magnitud == pytest.approx(5.0)


# --- Contrato HTTP de POST /tendencias --------------------------------------
def _make_service() -> TrendService:
    return TrendService()


@pytest.fixture
def tendencias_client(app: FastAPI) -> TestClient:
    app.dependency_overrides[get_trend_service] = _make_service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_trend_service, None)


@pytest.mark.contract
def test_post_tendencias_returns_contract_shape(tendencias_client: TestClient) -> None:
    response = tendencias_client.post(
        "/tendencias",
        json={
            "evolucion": {
                "ansiedad": [1.0, 2.0, 3.0],
                "conflicto": [3.0, 2.0, 1.0],
            },
            "zona": "Zona Centro",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"tendencias"}
    assert isinstance(body["tendencias"], list)
    assert body["tendencias"]
    for tendencia in body["tendencias"]:
        assert set(tendencia.keys()) == {"dimension", "direccion", "magnitud"}
        assert isinstance(tendencia["dimension"], str)
        assert tendencia["direccion"] in {"ascendente", "descendente", "estable"}
        assert isinstance(tendencia["magnitud"], (int, float))


@pytest.mark.contract
def test_post_tendencias_empty_is_ok(tendencias_client: TestClient) -> None:
    response = tendencias_client.post("/tendencias", json={"evolucion": {}})
    assert response.status_code == 200
    assert response.json() == {"tendencias": []}
