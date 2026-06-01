from __future__ import annotations

from src.irec.vision.ocr_extractor import (
    extract_text_from_bytes,
    extract_text_from_image,
    heuristic_ocr_hint,
    is_ocr_available,
)
from src.irec.vision.image_captioner import (
    generate_image_caption,
    heuristic_scene_context,
    is_captioning_available,
)
from src.irec.vision.visual_classifier import classify_scene, is_educational_scene
from src.irec.vision.multimodal_fusion import (
    enrich_record_with_multimodal,
    fuse_multimodal_text,
    get_multimodal_signals,
)
from src.irec.vision.vision_pipeline import VisionPipeline

__all__ = [
    "extract_text_from_image",
    "extract_text_from_bytes",
    "heuristic_ocr_hint",
    "is_ocr_available",
    "generate_image_caption",
    "heuristic_scene_context",
    "is_captioning_available",
    "classify_scene",
    "is_educational_scene",
    "fuse_multimodal_text",
    "enrich_record_with_multimodal",
    "get_multimodal_signals",
    "VisionPipeline",
]
