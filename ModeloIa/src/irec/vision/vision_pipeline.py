from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from src.irec.config import settings
from src.irec.vision.ocr_extractor import heuristic_ocr_hint, is_ocr_available
from src.irec.vision.image_captioner import heuristic_scene_context, is_captioning_available
from src.irec.vision.visual_classifier import classify_scene, is_educational_scene
from src.irec.vision.multimodal_fusion import enrich_record_with_multimodal, get_multimodal_signals

logger = logging.getLogger(__name__)


class VisionPipeline:
    """Orchestrates vision-related analysis on preprocessed records.

    This pipeline works on TEXT metadata from images, NOT on actual
    image files. OCR and captioning on real images require the
    corresponding libraries (easyocr, transformers).

    Steps:
    1. Detect multimodal signals (what modalities exist)
    2. Heuristic OCR hints (text references to images)
    3. Heuristic scene context (from text metadata)
    4. Visual scene classification (from text signals)
    5. Multimodal text fusion (combine all text sources)
    6. Educational scene relevance flag
    """

    def __init__(self) -> None:
        self._ocr_available = is_ocr_available()
        self._captioning_available = is_captioning_available()

        if not self._ocr_available:
            logger.info("OCR disabled (easyocr not installed)")
        if not self._captioning_available:
            logger.info("Captioning disabled (transformers not installed)")

        self.stats = {
            "total_processed": 0,
            "ocr_hints_found": 0,
            "scene_context_found": 0,
            "educational_scenes": 0,
            "multimodal_rich": 0,
        }

    def analyze_record(self, record: dict[str, Any]) -> dict[str, Any]:
        """Analyze a single record for vision-related signals.

        Args:
            record: Preprocessed record dict.

        Returns:
            Record with vision analysis fields added.
        """
        result = dict(record)

        text = (
            record.get("anonymized_text")
            or record.get("cleaned_text")
            or record.get("text_content", "")
        )

        # 1. Multimodal signals
        signals = get_multimodal_signals(result)
        result["multimodal_signals"] = signals
        if sum(signals.values()) >= 3:
            self.stats["multimodal_rich"] += 1

        # 2. OCR hints (heuristic)
        ocr_hint = heuristic_ocr_hint(text)
        if ocr_hint:
            result["ocr_hint"] = ocr_hint
            self.stats["ocr_hints_found"] += 1

        # 3. Scene context (heuristic)
        scene = heuristic_scene_context(text)
        if scene:
            result["scene_context_heuristic"] = scene
            self.stats["scene_context_found"] += 1

        # 4. Visual classification (from text signals)
        # Combine all available text sources for classification
        combined_text = (
            text
            + " "
            + (record.get("ocr_text") or "")
            + " "
            + (record.get("image_caption") or "")
            + " "
            + (record.get("scene_description") or "")
            + " "
            + (scene or "")
        )
        scene_class = classify_scene(combined_text)
        result["scene_classification"] = scene_class["category"]
        result["scene_confidence"] = scene_class["confidence"]

        # 5. Educational relevance
        result["is_educational_scene"] = is_educational_scene(scene_class)
        if result["is_educational_scene"]:
            self.stats["educational_scenes"] += 1

        # 6. Multimodal fusion
        enriched = enrich_record_with_multimodal(result)
        result["enriched_text"] = enriched["enriched_text"]

        self.stats["total_processed"] += 1
        return result

    def analyze_batch(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Analyze a batch of records.

        Args:
            records: List of preprocessed record dicts.

        Returns:
            Records with vision analysis fields added.
        """
        logger.info("Running vision analysis on %d records", len(records))
        analyzed = [self.analyze_record(rec) for rec in records]

        logger.info(
            "Vision analysis complete: %d records | ocr_hints=%d | scenes=%d | "
            "edu_scenes=%d | multimodal_rich=%d",
            self.stats["total_processed"],
            self.stats["ocr_hints_found"],
            self.stats["scene_context_found"],
            self.stats["educational_scenes"],
            self.stats["multimodal_rich"],
        )
        return analyzed

    def process_file(
        self,
        input_path: Path,
        output_path: Optional[Path] = None,
    ) -> Path:
        """Load preprocessed JSON, run vision analysis, save results."""
        logger.info("Loading data for vision analysis: %s", input_path)

        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = data.get("records", data if isinstance(data, list) else [])
        analyzed = self.analyze_batch(records)

        if output_path is None:
            platform = input_path.stem.replace("_preprocessed", "").replace("_nlp", "")
            output_path = (
                settings.data_dir
                / "processed"
                / "vision"
                / f"{platform}_vision.json"
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)

        output_data = {
            "metadata": {
                "analyzed_at": datetime.utcnow().isoformat(),
                "source_file": str(input_path),
                "statistics": self.stats,
                "ocr_available": self._ocr_available,
                "captioning_available": self._captioning_available,
            },
            "records": analyzed,
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)

        logger.info("Saved %d vision-analyzed records to %s", len(analyzed), output_path)
        return output_path

    def get_stats(self) -> dict[str, int]:
        """Return current pipeline statistics."""
        return dict(self.stats)
