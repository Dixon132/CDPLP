"""Schemas pydantic del contrato HTTP de ``POST /vision`` (Vision_Engine).

Contrato (design.md, tabla de endpoints del ``Servicio_IA``):

- Petición: ``{ image_description }``
- Respuesta: ``{ scene, objects[], emotion_context }``

El ``Vision_Engine`` existe desde v1 procesando ``image_description`` textual y
deriva su salida **exclusivamente de la descripción** (sin plantillas por
defecto ni respuestas vacías), con un contrato estable preparado para procesar
imágenes reales a futuro (LLaVA, Qwen2-VL, Florence-2, BLIP-2, EasyOCR)
(Req. 15.1, 37.2).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class VisionRequest(BaseModel):
    """Petición de ``POST /vision``: ``{ image_description }``.

    ``image_description`` es la descripción visual textual (simulada por Gemini
    en v1) generada por el ``Modulo_Simulacion``. Es obligatoria y no puede ser
    vacía: el ``Vision_Engine`` deriva su salida exclusivamente de ella.
    """

    image_description: str = Field(
        description="Descripción visual textual de la imagen a analizar.",
    )


class VisionResponse(BaseModel):
    """Respuesta de ``POST /vision``: ``{ scene, objects[], emotion_context }``."""

    scene: str = Field(
        description="Descripción de la escena derivada del image_description.",
    )
    objects: list[str] = Field(
        default_factory=list,
        description="Objetos/entidades visuales derivados de la descripción.",
    )
    emotion_context: str = Field(
        description="Contexto emocional derivado de la descripción.",
    )
