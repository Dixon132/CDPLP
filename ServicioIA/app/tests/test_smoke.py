"""Smoke test del harness de pruebas (tarea 5.2).

Prueba **mínima** que demuestra que el harness funciona de extremo a extremo:

- las *fixtures* construyen la app con el **doble de test del cargador de
  modelos** (modelos pequeños/falsos, sin pesos reales ni GPU);
- el ``TestClient`` levanta el ``lifespan`` y responde HTTP;
- Hypothesis está configurado y ejecuta de forma determinista.

El contrato real de ``/health`` se prueba en la tarea 5.3.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from hypothesis import given
from hypothesis import strategies as st

from app.model_registry import ModelRegistry


@pytest.mark.smoke
def test_app_fixture_is_fastapi(app: FastAPI) -> None:
    """La fixture ``app`` produce una instancia FastAPI."""
    assert isinstance(app, FastAPI)


@pytest.mark.smoke
def test_test_double_loader_registers_fake_models(
    model_loader, test_settings
) -> None:
    """El cargador doble registra modelos pequeños/falsos en CPU, sin pesos."""
    registry: ModelRegistry = model_loader(test_settings)
    assert registry.device == "cpu"
    assert len(registry) > 0
    assert registry.all_ready
    # Los nombres son dobles de test, no modelos reales descargables.
    assert all(name.startswith("test-double/") for name in registry.names())


@pytest.mark.smoke
def test_client_can_reach_app(client: TestClient) -> None:
    """El ``TestClient`` arranca el ``lifespan`` y la app responde HTTP."""
    response = client.get("/health")
    assert response.status_code == 200


@pytest.mark.property
@given(value=st.integers())
def test_hypothesis_harness_runs_deterministically(value: int) -> None:
    """Property trivial: confirma que Hypothesis está cableado y es estable."""
    assert value + 0 == value
