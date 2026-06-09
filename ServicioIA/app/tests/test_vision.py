"""Pruebas del ``Vision_Engine`` y del contrato de ``POST /vision``.

Cubre la tarea 6.4:

- contrato HTTP ``{ image_description }`` → ``{ scene, objects[], emotion_context }``;
- lógica de :class:`VisionService` / :class:`TextDescriptionVisionAnalyzer`
  (derivación real de la descripción, sin plantillas vacías; Req. 15.1, 37.2);
- inyección de un analizador doble determinista vía la *factory* del servicio.

La PBT del contrato estable del ``Vision_Engine`` (Property 21) es la tarea 6.9
y se implementa por separado.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.vision import get_vision_service
from app.services.vision_service import (
    TextDescriptionVisionAnalyzer,
    VisionAnalysis,
    VisionService,
)


# --- Lógica del Vision_Engine (analizador de texto v1) ----------------------
@pytest.mark.smoke
def test_analyze_returns_structure_derived_from_description() -> None:
    service = VisionService(analyzer=TextDescriptionVisionAnalyzer())
    result = service.analyze(
        "Estudiantes felices celebran en el patio del colegio con pancartas."
    )
    assert isinstance(result, VisionAnalysis)
    # La escena se deriva del texto (no es una plantilla fija).
    assert "estudiantes" in result.scene.lower()
    # Los objetos provienen de palabras de contenido reales de la descripción.
    assert "estudiantes" in result.objects
    assert "patio" in result.objects
    assert "pancartas" in result.objects
    # Las palabras vacías no aparecen como objetos.
    assert "en" not in result.objects
    assert "el" not in result.objects
    # El contexto emocional refleja la señal positiva detectada ("felices").
    assert "positivo" in result.emotion_context


@pytest.mark.smoke
def test_analyze_detects_negative_emotion_context() -> None:
    service = VisionService(analyzer=TextDescriptionVisionAnalyzer())
    result = service.analyze("Una protesta con manifestantes enojados y violencia.")
    assert "negativo" in result.emotion_context
    assert "manifestantes" in result.objects


@pytest.mark.smoke
def test_analyze_neutral_when_no_emotion_signals_is_not_empty() -> None:
    service = VisionService(analyzer=TextDescriptionVisionAnalyzer())
    result = service.analyze("Una mesa de madera con tres libros y un cuaderno.")
    # Sin señales emocionales explícitas: deriva un contexto neutral, no vacío.
    assert result.emotion_context.strip() != ""
    assert "neutral" in result.emotion_context
    assert "libros" in result.objects


@pytest.mark.smoke
def test_analyze_objects_are_unique_preserving_order() -> None:
    service = VisionService(analyzer=TextDescriptionVisionAnalyzer())
    result = service.analyze("Perro perro gato perro gato pájaro.")
    assert result.objects == ["perro", "gato", "pájaro"]


@pytest.mark.smoke
def test_analyze_never_returns_empty_fields_for_real_description() -> None:
    service = VisionService(analyzer=TextDescriptionVisionAnalyzer())
    result = service.analyze("Plaza concurrida al atardecer.")
    assert result.scene.strip() != ""
    assert len(result.objects) > 0
    assert result.emotion_context.strip() != ""


@pytest.mark.smoke
def test_analyze_rejects_empty_description() -> None:
    service = VisionService(analyzer=TextDescriptionVisionAnalyzer())
    with pytest.raises(ValueError):
        service.analyze("   ")


@pytest.mark.smoke
def test_default_service_uses_text_engine() -> None:
    # Sin analizador explícito, usa el Vision_Engine de texto por defecto (v1).
    service = VisionService()
    result = service.analyze("Imagen de prueba con un balón.")
    assert "balón" in result.objects


# --- Contrato HTTP de POST /vision -----------------------------------------
class _StubAnalyzer:
    """Analizador doble determinista (contrato estable, sin modelos pesados)."""

    def analyze(self, image_description: str) -> VisionAnalysis:
        tokens = [t for t in image_description.split() if t.isalpha()]
        return VisionAnalysis(
            scene=f"escena: {image_description.strip()}",
            objects=tokens,
            emotion_context="tono neutral; doble de prueba",
        )


def _make_stub_service() -> VisionService:
    return VisionService(analyzer=_StubAnalyzer())


@pytest.fixture
def vision_client(app: FastAPI) -> TestClient:
    """``TestClient`` con un ``VisionService`` doble inyectado."""
    app.dependency_overrides[get_vision_service] = _make_stub_service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_vision_service, None)


@pytest.mark.contract
def test_post_vision_returns_contract_shape(vision_client: TestClient) -> None:
    response = vision_client.post(
        "/vision", json={"image_description": "dos amigos en la cancha"}
    )
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"scene", "objects", "emotion_context"}
    assert isinstance(body["scene"], str)
    assert isinstance(body["objects"], list)
    assert all(isinstance(o, str) for o in body["objects"])
    assert isinstance(body["emotion_context"], str)
    assert body["scene"] != ""
    assert body["emotion_context"] != ""


@pytest.mark.contract
def test_post_vision_real_engine_derives_from_description(app: FastAPI) -> None:
    # Sin override: ejercita el Vision_Engine real (texto v1) end-to-end.
    with TestClient(app) as client:
        response = client.post(
            "/vision",
            json={"image_description": "Niños tristes bajo la lluvia en la calle."},
        )
    assert response.status_code == 200
    body = response.json()
    assert "lluvia" in body["objects"]
    assert "negativo" in body["emotion_context"]


@pytest.mark.contract
def test_post_vision_rejects_empty_description(app: FastAPI) -> None:
    with TestClient(app) as client:
        response = client.post("/vision", json={"image_description": "   "})
    assert response.status_code == 400


@pytest.mark.contract
def test_post_vision_requires_image_description_field(app: FastAPI) -> None:
    with TestClient(app) as client:
        response = client.post("/vision", json={})
    assert response.status_code == 422
