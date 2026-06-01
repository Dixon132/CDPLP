from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

_HAS_TRANSFORMERS = False
_caption_model = None
_caption_processor = None

try:
    from transformers import pipeline
    _HAS_TRANSFORMERS = True
except ImportError:
    logger.warning("transformers not installed. Image captioning will be unavailable.")


def _get_caption_pipeline():
    """Lazy-load image-to-text pipeline."""
    global _caption_model
    if not _HAS_TRANSFORMERS:
        return None

    if _caption_model is None:
        try:
            logger.info("Loading image captioning model...")
            _caption_model = pipeline(
                "image-to-text",
                model="nlpconnect/vit-gpt2-image-captioning",
            )
            logger.info("Image captioning model loaded")
        except Exception as e:
            logger.error("Failed to load captioning model: %s", e)
            return None

    return _caption_model


def generate_image_caption(image_path: str) -> Optional[str]:
    """Generate a textual description of an image.

    IMPORTANT: This describes SCENES, not people. It does NOT perform
    facial recognition or individual identification.

    Args:
        image_path: Path to the image file.

    Returns:
        English caption string, or None if unavailable.
    """
    model = _get_caption_pipeline()
    if model is None:
        logger.debug("Captioning unavailable")
        return None

    try:
        results = model(image_path)
        if results and isinstance(results, list):
            caption = results[0].get("generated_text", "")
            if caption:
                logger.debug("Caption generated: %s", caption[:80])
                return caption
        return None
    except Exception as e:
        logger.error("Caption generation failed: %s", e)
        return None


def generate_image_caption_bytes(image_bytes: bytes) -> Optional[str]:
    """Generate caption from image bytes."""
    model = _get_caption_pipeline()
    if model is None:
        return None

    try:
        from PIL import Image
        from io import BytesIO
        img = Image.open(BytesIO(image_bytes))
        results = model(img)
        if results and isinstance(results, list):
            return results[0].get("generated_text", "")
        return None
    except Exception as e:
        logger.error("Caption from bytes failed: %s", e)
        return None


def is_captioning_available() -> bool:
    """Check if image captioning is available."""
    return _HAS_TRANSFORMERS and _get_caption_pipeline() is not None


def heuristic_scene_context(text: str) -> Optional[str]:
    """Heuristic: extract scene context from text metadata.

    Some posts include descriptions like "estudiando en la biblioteca",
    "en el campus", "clase de matemáticas", etc.

    Args:
        text: Post text (may include image descriptions).

    Returns:
        Scene context string if found, None otherwise.
    """
    scene_contexts = [
        "biblioteca", "campus", "aula", "salón", "clase",
        "laboratorio", "cafetería", "auditorio", "pasillo",
        "estudiando", "estudio", "escritorio", "laptop",
        "computadora", "libros", "apuntes", "cuaderno",
        "pizarra", "pizarrón", "proyector", "pantalla",
    ]
    text_lower = text.lower()
    found = [ctx for ctx in scene_contexts if ctx in text_lower]
    if found:
        return "posible_escena: " + ", ".join(found[:3])
    return None
