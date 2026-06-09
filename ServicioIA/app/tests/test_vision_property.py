# Feature: analisis-tendencias-riesgo-emocional, Property 21: Contrato estable del Vision_Engine derivado de la descripción
"""PBT (pytest + Hypothesis) de la Property 21 (tarea 6.9).

**Property 21: Contrato estable del Vision_Engine derivado de la descripción**

*Para toda* ``image_description`` no vacía, el ``Vision_Engine`` del
``Servicio_IA`` devuelve una estructura estable
``{ scene, objects[], emotion_context }`` derivada de la descripción, sin
plantillas por defecto ni respuestas vacías: ``scene`` es un texto no vacío,
``objects`` es una lista (de cadenas) y ``emotion_context`` es un texto no
vacío. Es el mismo contrato que usaría para imágenes reales a futuro.

**Validates: Requirements 15.1, 15.3, 37.2, 37.4**

Las descripciones se generan con estrategias de Hypothesis cubriendo texto
no-ASCII (acentos, ñ, emoji, alfabetos varios) y longitudes diversas. Los
perfiles deterministas (``dev``=50 / ``ci``=100) se registran en ``conftest.py``.
"""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from app.services.vision_service import (
    TextDescriptionVisionAnalyzer,
    VisionAnalysis,
    VisionService,
)

# --- Estrategia de generación de descripciones -----------------------------
# Texto no vacío (tras strip) que cubre: ASCII, acentos/ñ, símbolos, espacios
# internos, emoji y alfabetos no latinos; con longitudes variadas. Se filtra a
# entradas con al menos un carácter no en blanco, ya que el contrato exige una
# descripción no vacía (una descripción en blanco es entrada inválida).
_NON_ASCII = "áéíóúüñÁÉÍÓÚÜÑçßØ你好こんにちは€😀🌧️"

_image_description = st.one_of(
    # Texto Unicode general (incluye control chars, espacios, símbolos).
    st.text(min_size=1, max_size=200),
    # Texto sesgado hacia caracteres no-ASCII para forzar rutas Unicode.
    st.text(alphabet=_NON_ASCII + " .,!?", min_size=1, max_size=120),
    # Frases tipo descripción de escena (palabras de contenido reales).
    st.lists(
        st.sampled_from(
            [
                "estudiantes", "felices", "protesta", "lluvia", "calle",
                "niños", "tristeza", "celebración", "violencia", "patio",
                "happy", "crowd", "fear", "smile", "conflict", "城市", "café",
            ]
        ),
        min_size=1,
        max_size=30,
    ).map(lambda words: " ".join(words)),
).filter(lambda s: s.strip() != "")


def _assert_stable_contract(result: VisionAnalysis) -> None:
    """El resultado cumple el contrato estable del Vision_Engine."""
    assert isinstance(result, VisionAnalysis)
    # scene: texto no vacío derivado de la descripción (no plantilla vacía).
    assert isinstance(result.scene, str)
    assert result.scene.strip() != ""
    # objects: lista de cadenas (puede estar vacía si no hay tokens de contenido).
    assert isinstance(result.objects, list)
    assert all(isinstance(o, str) for o in result.objects)
    # emotion_context: texto no vacío (nunca None ni plantilla vacía).
    assert isinstance(result.emotion_context, str)
    assert result.emotion_context.strip() != ""


# --- Property 21 ------------------------------------------------------------
@given(image_description=_image_description)
def test_property21_vision_engine_contract_is_stable(image_description: str) -> None:
    """Property 21: el Vision_Engine siempre devuelve el contrato estable.

    Para cualquier ``image_description`` no vacía, el motor por defecto (texto
    v1) deriva ``{ scene, objects[], emotion_context }`` sin campos vacíos en
    ``scene``/``emotion_context`` ni plantillas por defecto.
    """
    service = VisionService(analyzer=TextDescriptionVisionAnalyzer())
    result = service.analyze(image_description)
    _assert_stable_contract(result)


@given(image_description=_image_description)
def test_property21_default_engine_contract_is_stable(image_description: str) -> None:
    """Property 21 sobre el Vision_Engine por defecto (factory, sin inyección)."""
    service = VisionService()
    result = service.analyze(image_description)
    _assert_stable_contract(result)


@given(image_description=_image_description)
def test_property21_contract_keys_are_exactly_the_three(image_description: str) -> None:
    """El contrato expone exactamente scene, objects y emotion_context."""
    service = VisionService(analyzer=TextDescriptionVisionAnalyzer())
    result = service.analyze(image_description)
    assert set(vars(result).keys()) == {"scene", "objects", "emotion_context"}
