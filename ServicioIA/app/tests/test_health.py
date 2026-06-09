"""Prueba de contrato de ``GET /health`` (tarea 5.3).

Verifica el contrato HTTP del endpoint de salud:

- responde ``200 OK``;
- la respuesta contiene ``status``, ``modelos`` (lista de modelos cargados) y
  ``device``;
- los modelos reportados reflejan el **doble de test del cargador de modelos**
  registrado en ``conftest.py`` (modelos pequeños/falsos, sin pesos reales ni
  GPU), por lo que ``device`` es ``"cpu"`` y ``status`` es ``"ok"``.

Relacionado con la observabilidad del estado del ``Servicio_IA`` (Req. 35.5):
el endpoint expone de forma consultable que el servicio está disponible y qué
modelos quedaron cargados al arranque.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

# Reutiliza la lista de modelos del doble de test definida en conftest, para que
# la aserción quede acoplada a la fuente de verdad del harness, no a literales.
from conftest import FAKE_MODELS


@pytest.mark.contract
def test_health_returns_200(client: TestClient) -> None:
    """``GET /health`` responde ``200 OK``."""
    response = client.get("/health")
    assert response.status_code == 200


@pytest.mark.contract
def test_health_response_has_contract_keys(client: TestClient) -> None:
    """La respuesta contiene ``status``, ``modelos`` (lista) y ``device``."""
    body = client.get("/health").json()

    assert set(body.keys()) == {"status", "modelos", "device"}
    assert isinstance(body["status"], str)
    assert isinstance(body["modelos"], list)
    assert all(isinstance(name, str) for name in body["modelos"])
    assert isinstance(body["device"], str)


@pytest.mark.contract
def test_health_reports_test_double_models_and_state(client: TestClient) -> None:
    """Los modelos y el estado reflejan el cargador doble del conftest."""
    body = client.get("/health").json()

    # El doble de test carga modelos pequeños/falsos en CPU y todos listos,
    # por lo que el servicio debe reportarse como disponible ("ok").
    assert body["status"] == "ok"
    assert body["device"] == "cpu"
    # Los modelos cargados son exactamente los registrados por el doble de test.
    assert body["modelos"] == list(FAKE_MODELS)
