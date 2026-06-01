from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from src.irec.config import settings
from src.irec.preprocessing.text_cleaner import clean_text, is_empty_or_noise
from src.irec.preprocessing.emoji_normalizer import normalize_emoji
from src.irec.preprocessing.hashtag_processor import process_hashtags
from src.irec.preprocessing.language_detector import detect_language_with_confidence
from src.irec.preprocessing.duplicate_detector import deduplicate_records
from src.irec.preprocessing.spam_filter import filter_spam, classify_spam
from src.irec.preprocessing.date_normalizer import normalize_timestamp
from src.irec.privacy.anonymizer import anonymize_text, hash_user_identifier
from src.irec.schemas import ProcessingStatus, SocialDigitalRecord

logger = logging.getLogger(__name__)


class PreprocessingPipeline:
    """Orchestrates the full preprocessing workflow:

    1. Spam filtering
    2. Text cleaning (URLs, mentions, whitespace)
    3. Emoji normalization (😭 → emoji_llanto)
    4. Hashtag processing (#NoPuedoMas → "no puedo mas")
    5. Language detection (precise)
    6. PII detection + anonymization
    7. Deduplication
    8. Date normalization
    """

    def __init__(self) -> None:
        self.stats = {
            "total_input": 0,
            "spam_removed": 0,
            "empty_removed": 0,
            "duplicates_removed": 0,
            "pii_detected": 0,
            "total_output": 0,
        }

    def process_records(
        self,
        records: list[dict[str, Any]],
        skip_spam_filter: bool = False,
        skip_dedup: bool = False,
    ) -> list[dict[str, Any]]:
        """Run the full preprocessing pipeline on a list of record dicts.

        Args:
            records: Raw record dicts (from ingestion).
            skip_spam_filter: If True, don't filter spam.
            skip_dedup: If True, don't deduplicate.

        Returns:
            List of cleaned, anonymized record dicts.
        """
        self.stats["total_input"] = len(records)
        logger.info("Starting preprocessing on %d records", len(records))

        # Step 1: Spam filter
        if not skip_spam_filter:
            records, spam_records = filter_spam(records)
            self.stats["spam_removed"] = len(spam_records)

        # Process each record
        processed: list[dict[str, Any]] = []
        for i, record in enumerate(records):
            try:
                result = self._process_single(record)
                if result is not None:
                    processed.append(result)
                else:
                    self.stats["empty_removed"] += 1
            except Exception as e:
                logger.error("Error processing record %d: %s", i, e)
                continue

        # Step 6: Deduplication
        if not skip_dedup:
            before = len(processed)
            processed = deduplicate_records(processed)
            self.stats["duplicates_removed"] = before - len(processed)

        self.stats["total_output"] = len(processed)
        logger.info(
            "Preprocessing complete: %d in -> %d out (spam:%d, empty:%d, dups:%d)",
            self.stats["total_input"],
            self.stats["total_output"],
            self.stats["spam_removed"],
            self.stats["empty_removed"],
            self.stats["duplicates_removed"],
        )

        return processed

    def process_file(
        self,
        input_path: Path,
        output_path: Optional[Path] = None,
    ) -> Path:
        """Load standardized JSON, preprocess, save to processed JSON.

        Args:
            input_path: Path to standardized JSON file.
            output_path: Path to save preprocessed output.

        Returns:
            Path to the saved output file.
        """
        logger.info("Loading standardized data from %s", input_path)

        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = data.get("records", data if isinstance(data, list) else [])
        processed = self.process_records(records)

        if output_path is None:
            platform = input_path.stem.replace("_standardized", "")
            output_path = (
                settings.data_dir
                / "processed"
                / "nlp"
                / f"{platform}_preprocessed.json"
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)

        output_data = {
            "metadata": {
                "preprocessed_at": datetime.utcnow().isoformat(),
                "source_file": str(input_path),
                "statistics": self.stats,
            },
            "records": processed,
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)

        logger.info("Saved %d preprocessed records to %s", len(processed), output_path)
        return output_path

    def _process_single(self, record: dict[str, Any]) -> Optional[dict[str, Any]]:
        """Process a single record through all cleaning steps.

        Returns the cleaned record dict, or None if the record
        should be discarded (empty/noise text after cleaning).
        """
        result = dict(record)  # shallow copy

        text = record.get("text_content", "")

        # Step 2: Clean text
        cleaned = clean_text(text)
        result["cleaned_text"] = cleaned

        # Step 3: Normalize emojis (on original text, before lowercasing destroys them)
        emojified = normalize_emoji(text)
        result["emoji_normalized_text"] = emojified

        # Step 4: Process hashtags
        hashtags = record.get("hashtags", [])
        if hashtags:
            result["hashtags_processed"] = process_hashtags(hashtags)

        # Step 5: Detect language
        lang, confidence = detect_language_with_confidence(cleaned)
        result["language"] = lang
        result["language_confidence"] = round(confidence, 3)

        # Step 6: PII detection + anonymization
        anonymized, pii_findings = anonymize_text(cleaned)
        result["anonymized_text"] = anonymized
        if pii_findings:
            self.stats["pii_detected"] += 1
            result["pii_detected"] = True
            result["pii_summary"] = [f["category"] for f in pii_findings]

        # Step 7: Date normalization
        ts = record.get("timestamp")
        if ts:
            try:
                if isinstance(ts, str):
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                date_info = normalize_timestamp(ts)
                result.update({
                    "date_normalized": date_info["date"],
                    "week_number": date_info["week_number"],
                    "year_month": date_info["year_month"],
                    "year_week": date_info["year_week"],
                })
            except Exception:
                pass

        # Hash user ID if present
        if record.get("pseudo_user_id") and not record["pseudo_user_id"].startswith("pseudo_"):
            result["pseudo_user_id"] = hash_user_identifier(record["pseudo_user_id"])

        # Mark as processed
        result["processing_status"] = "processed"

        # Discard if text is effectively empty after cleaning
        if is_empty_or_noise(anonymized) and is_empty_or_noise(cleaned):
            return None

        return result

    def get_stats(self) -> dict[str, int]:
        """Return current preprocessing statistics."""
        return dict(self.stats)
