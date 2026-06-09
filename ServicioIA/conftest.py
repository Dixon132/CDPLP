"""Configuración global de pruebas del Servicio_IA (pytest + Hypothesis).

Este ``conftest.py`` vive en la raíz del proyecto para que:

- el paquete ``app`` sea importable desde las pruebas (pytest inserta este
  directorio en ``sys.path``);
- se registren **perfiles deterministas de Hypothesis** aptos para CI
  (sin aleatoriedad entre ejecuciones, sin ``deadline`` que cause flakiness);
- las pruebas dispongan de *fixtures* que construyen la app FastAPI con un
  **doble de test del cargador de modelos** (modelos pequeños/falsos), evitando
  descargar pesos reales o usar GPU. Esto mantiene el coste bajo y la ejecución
  determinista (Req. 26.1, 26.2, 41.5).
"""

from __future__ import annotations

import os
import warnings
from typing import Callable, Iterator

import pytest
from fastapi import FastAPI

# Starlette emite un DeprecationWarning al importar ``TestClient`` con httpx.
# Es ruido de un tercero: lo silenciamos en el momento de importar para que el
# filtro estricto de avisos del harness no lo convierta en error.
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    from fastapi.testclient import TestClient

from hypothesis import HealthCheck, Verbosity, settings

from app.config import Settings
from app.main import create_app
from app.model_registry import LoadedModel, ModelRegistry

# --- Perfiles de Hypothesis -------------------------------------------------
# Modelos/dobles pequeños + ejecución determinista: derandomize fija la semilla
# entre ejecuciones, y desactivamos deadlines para evitar flakiness en CI.
settings.register_profile(
    "dev",
    max_examples=50,
    deadline=None,
    derandomize=True,
    print_blob=True,
    suppress_health_check=[HealthCheck.too_slow],
)
settings.register_profile(
    "ci",
    max_examples=100,
    deadline=None,
    derandomize=True,
    print_blob=True,
    verbosity=Verbosity.normal,
    suppress_health_check=[HealthCheck.too_slow],
)
# Perfil por defecto: determinista y barato salvo override por env var.
settings.load_profile(os.getenv("HYPOTHESIS_PROFILE", "dev"))


# --- Dobles de test del cargador de modelos ---------------------------------
# Nombres de modelos pequeños/falsos: NO se descargan pesos ni se usa GPU.
FAKE_MODELS: tuple[str, ...] = (
    "test-double/tiny-embedding",
    "test-double/tiny-nlp",
)


def fake_model_loader(settings_obj: Settings) -> ModelRegistry:
    """Cargador doble: registra modelos diminutos/falsos de forma determinista.

    Sustituye al cargador real en pruebas para que el arranque sea instantáneo,
    sin red ni GPU, y con un registro de modelos predecible.
    """
    registry = ModelRegistry(device="cpu")
    for name in FAKE_MODELS:
        registry.add(LoadedModel(name=name, kind="embedding", ready=True))
    return registry


# --- Fixtures ---------------------------------------------------------------
@pytest.fixture
def test_settings() -> Settings:
    """Settings deterministas para pruebas (CPU, BD local ficticia)."""
    return Settings(
        DATABASE_URL="postgresql://test:test@localhost:5432/test",
        MODEL_CACHE="./.model_cache_test",
        DEVICE="cpu",
    )


@pytest.fixture
def model_loader() -> Callable[[Settings], ModelRegistry]:
    """Expone el cargador doble para que las pruebas puedan reutilizarlo."""
    return fake_model_loader


@pytest.fixture
def app(
    test_settings: Settings,
    model_loader: Callable[[Settings], ModelRegistry],
) -> FastAPI:
    """App FastAPI construida con el doble de modelos (sin pesos reales)."""
    return create_app(settings=test_settings, model_loader=model_loader)


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    """``TestClient`` con el ciclo ``lifespan`` activo (carga los dobles)."""
    with TestClient(app) as test_client:
        yield test_client
