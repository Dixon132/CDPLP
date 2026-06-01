from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


def fuse_multimodal_text(
    text_content: str = "",
    title: Optional[str] = None,
    description: Optional[str] = None,
    hashtags: Optional[list[str]] = None,
    ocr_text: Optional[str] = None,
    image_caption: Optional[str] = None,
    scene_description: Optional[str] = None,
) -> str:
    """Combine all text sources into a single enriched text for analysis.

    This is the multimodal fusion step: text + OCR + caption + scene
    become one unified analyzable text string.

    Order matters: most relevant content first.

    Args:
        text_content: Main text (post body, comment, caption).
        title: Post title (if any).
        description: Video/audio description.
        hashtags: List of hashtag strings.
        ocr_text: Text extracted from image.
        image_caption: Auto-generated image description.
        scene_description: Scene context from text metadata.

    Returns:
        Single enriched text string for NLP pipeline.
    """
    parts: list[str] = []

    if title and title.strip():
        parts.append(title.strip())

    if text_content and text_content.strip():
        parts.append(text_content.strip())

    if description and description.strip():
        parts.append(description.strip())

    if ocr_text and ocr_text.strip():
        parts.append(f"[OCR: {ocr_text.strip()}]")

    if image_caption and image_caption.strip():
        parts.append(f"[Imagen: {image_caption.strip()}]")

    if scene_description and scene_description.strip():
        parts.append(f"[Escena: {scene_description.strip()}]")

    if hashtags:
        parts.append(" ".join(f"#{h}" for h in hashtags))

    return " ".join(parts).strip()


def enrich_record_with_multimodal(record: dict[str, Any]) -> dict[str, Any]:
    """Enrich a record dict with multimodal fused text.

    Takes a preprocessed record and creates an `enriched_text` field
    that combines all text sources.

    Args:
        record: Preprocessed record dict.

    Returns:
        Record with added `enriched_text` field.
    """
    result = dict(record)

    # Use anonymized/cleaned text as base
    text = (
        record.get("anonymized_text")
        or record.get("cleaned_text")
        or record.get("text_content", "")
    )

    enriched = fuse_multimodal_text(
        text_content=text,
        title=record.get("title"),
        description=record.get("description"),
        hashtags=record.get("hashtags_processed") or record.get("hashtags"),
        ocr_text=record.get("ocr_text"),
        image_caption=record.get("image_caption"),
        scene_description=record.get("scene_description"),
    )

    result["enriched_text"] = enriched
    return result


def get_multimodal_signals(record: dict[str, Any]) -> dict:
    """Extract multimodal signal indicators from a record.

    Returns a summary of what multimodal data is available.

    Args:
        record: Record dict.

    Returns:
        Dict with boolean flags for each modality.
    """
    return {
        "has_text": bool(record.get("text_content")),
        "has_title": bool(record.get("title")),
        "has_description": bool(record.get("description")),
        "has_hashtags": bool(record.get("hashtags") or record.get("hashtags_processed")),
        "has_ocr": bool(record.get("ocr_text")),
        "has_caption": bool(record.get("image_caption")),
        "has_scene": bool(record.get("scene_description")),
    }
