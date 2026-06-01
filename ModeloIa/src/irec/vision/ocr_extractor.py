from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_HAS_EASYOCR = False
_ocr_reader = None

try:
    import easyocr
    _HAS_EASYOCR = True
except ImportError:
    logger.warning("easyocr not installed. OCR will be unavailable.")


def _get_reader():
    """Lazy-load EasyOCR reader for Spanish + English."""
    global _ocr_reader
    if not _HAS_EASYOCR:
        return None

    if _ocr_reader is None:
        try:
            logger.info("Loading EasyOCR reader (es, en)...")
            _ocr_reader = easyocr.Reader(["es", "en"], gpu=False)
            logger.info("EasyOCR reader loaded")
        except Exception as e:
            logger.error("Failed to load EasyOCR: %s", e)
            return None

    return _ocr_reader


def extract_text_from_image(image_path: str | Path) -> Optional[str]:
    """Extract text from an image using OCR.

    Args:
        image_path: Path to the image file.

    Returns:
        Extracted text string, or None if OCR is unavailable or fails.
    """
    reader = _get_reader()
    if reader is None:
        logger.debug("OCR unavailable, skipping text extraction")
        return None

    image_path = Path(image_path)
    if not image_path.exists():
        logger.warning("Image not found: %s", image_path)
        return None

    try:
        results = reader.readtext(str(image_path), detail=0)
        if results:
            text = " ".join(results).strip()
            logger.debug("OCR extracted %d chars from %s", len(text), image_path.name)
            return text
        return None
    except Exception as e:
        logger.error("OCR failed for %s: %s", image_path, e)
        return None


def extract_text_from_bytes(image_bytes: bytes) -> Optional[str]:
    """Extract text from image bytes using OCR.

    Args:
        image_bytes: Raw image bytes.

    Returns:
        Extracted text string, or None.
    """
    reader = _get_reader()
    if reader is None:
        return None

    try:
        results = reader.readtext(image_bytes, detail=0)
        if results:
            return " ".join(results).strip()
        return None
    except Exception as e:
        logger.error("OCR from bytes failed: %s", e)
        return None


def is_ocr_available() -> bool:
    """Check if OCR functionality is available."""
    return _HAS_EASYOCR and _get_reader() is not None


def heuristic_ocr_hint(text: str) -> Optional[str]:
    """Heuristic: check if text content references an image with text.

    Many social media posts say things like "miren esta imagen", 
    "en la foto dice...", "caption:", etc. This gives a hint that 
    there might be text in an associated image.

    Args:
        text: Post text content.

    Returns:
        Hint string if text references an image, None otherwise.
    """
    hint_patterns = [
        "en la imagen", "en la foto", "en el screenshot", "en la captura",
        "miren esto", "mira esto", "vean esto", "les comparto",
        "así dice", "dice esto", "caption", "la foto muestra",
    ]
    text_lower = text.lower()
    for pattern in hint_patterns:
        if pattern in text_lower:
            return f"possible_image_text"
    return None
