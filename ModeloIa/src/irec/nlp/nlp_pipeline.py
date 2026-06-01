from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from src.irec.config import settings
from src.irec.nlp.sentiment_analyzer import analyze_sentiment
from src.irec.nlp.emotion_detector import detect_emotions_detailed
from src.irec.nlp.topic_classifier import classify_topic, get_topic_labels
from src.irec.nlp.risk_indicator_detector import detect_risk_indicators
from src.irec.nlp.embeddings_generator import generate_embeddings, is_embeddings_available

logger = logging.getLogger(__name__)


class NLPPipeline:
    """Orchestrates all NLP analysis tasks:

    1. Sentiment analysis
    2. Emotion detection
    3. Topic classification
    4. Risk indicator detection
    5. Embedding generation (optional, requires sentence-transformers)
    """

    def __init__(self) -> None:
        self._embeddings_enabled = is_embeddings_available()
        if not self._embeddings_enabled:
            logger.info("Embeddings disabled (sentence-transformers not installed)")

        self.stats = {
            "total_analyzed": 0,
            "embeddings_generated": 0,
        }

    def analyze_record(self, record: dict[str, Any]) -> dict[str, Any]:
        """Run all NLP analysis on a single record.

        Uses anonymized_text if available, otherwise cleaned_text, otherwise text_content.

        Args:
            record: Preprocessed record dict.

        Returns:
            Record dict with NLP analysis fields added.
        """
        result = dict(record)

        # Choose best text source
        text = (
            record.get("anonymized_text")
            or record.get("cleaned_text")
            or record.get("text_content", "")
        )

        if not text.strip():
            result["nlp_error"] = "empty_text"
            return result

        # 1. Sentiment
        try:
            sentiment = analyze_sentiment(text)
            result["sentiment_label"] = sentiment["label"]
            result["sentiment_score"] = sentiment["score"]
            result["sentiment_confidence"] = sentiment["confidence"]
        except Exception as e:
            logger.error("Sentiment analysis failed: %s", e)
            result["sentiment_label"] = "error"

        # 2. Emotions
        try:
            emotions = detect_emotions_detailed(text)
            result["dominant_emotion"] = emotions["dominant_emotion"]
            result["dominant_family"] = emotions["dominant_family"]
            result["emotion_scores"] = emotions["scores"]
        except Exception as e:
            logger.error("Emotion detection failed: %s", e)

        # 3. Topics
        try:
            topics = classify_topic(text, top_n=3)
            result["topics"] = get_topic_labels(topics)
            result["topic_scores"] = {t["topic"]: t["score"] for t in topics}
        except Exception as e:
            logger.error("Topic classification failed: %s", e)
            result["topics"] = []

        # 4. Risk indicators
        try:
            risk = detect_risk_indicators(text)
            result["risk_scores"] = risk["risk_scores"]
            result["overall_risk_score"] = risk["overall_risk_score"]
            result["risk_level"] = risk["risk_level"]
            result["active_risks"] = risk["active_risks"]
            result["protective_signals"] = risk["protective_signals"]
            result["family_scores"] = risk.get("family_scores", {})
        except Exception as e:
            logger.error("Risk detection failed: %s", e)

        self.stats["total_analyzed"] += 1

        return result

    def analyze_batch(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Run NLP analysis on a batch of records.

        Args:
            records: List of preprocessed record dicts.

        Returns:
            Records with NLP analysis fields added.
        """
        logger.info("Analyzing %d records with NLP pipeline", len(records))

        analyzed = [self.analyze_record(rec) for rec in records]

        # Generate embeddings for all texts in batch (if available)
        if self._embeddings_enabled:
            texts = [
                r.get("anonymized_text") or r.get("cleaned_text") or r.get("text_content", "")
                for r in analyzed
            ]
            valid_texts = [t for t in texts if t.strip()]

            if valid_texts:
                try:
                    embeddings = generate_embeddings(valid_texts)
                    if embeddings:
                        emb_idx = 0
                        for record in analyzed:
                            text = (
                                record.get("anonymized_text")
                                or record.get("cleaned_text")
                                or record.get("text_content", "")
                            )
                            if text.strip() and emb_idx < len(embeddings):
                                record["embedding"] = embeddings[emb_idx]
                                emb_idx += 1
                        self.stats["embeddings_generated"] = emb_idx
                except Exception as e:
                    logger.error("Batch embedding generation failed: %s", e)

        logger.info(
            "NLP analysis complete: %d records, %d embeddings",
            self.stats["total_analyzed"],
            self.stats["embeddings_generated"],
        )

        return analyzed

    def process_file(
        self,
        input_path: Path,
        output_path: Optional[Path] = None,
    ) -> Path:
        """Load preprocessed JSON, run NLP analysis, save results.

        Args:
            input_path: Path to preprocessed JSON file.
            output_path: Path to save NLP-processed output.

        Returns:
            Path to the saved output file.
        """
        logger.info("Loading preprocessed data from %s", input_path)

        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = data.get("records", data if isinstance(data, list) else [])
        analyzed = self.analyze_batch(records)

        if output_path is None:
            platform = input_path.stem.replace("_preprocessed", "")
            output_path = (
                settings.data_dir
                / "processed"
                / "nlp"
                / f"{platform}_nlp.json"
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)

        output_data = {
            "metadata": {
                "analyzed_at": datetime.utcnow().isoformat(),
                "source_file": str(input_path),
                "statistics": self.stats,
                "embeddings_enabled": self._embeddings_enabled,
            },
            "records": analyzed,
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)

        logger.info("Saved %d NLP-analyzed records to %s", len(analyzed), output_path)
        return output_path

    def get_stats(self) -> dict[str, int]:
        """Return current pipeline statistics."""
        return dict(self.stats)
