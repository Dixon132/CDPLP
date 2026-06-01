from __future__ import annotations

import hashlib
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from src.irec.config import settings
from src.irec.schemas import (
    EngagementMetrics,
    MediaType,
    Platform,
    ProcessingStatus,
    SocialDigitalRecord,
    SourceType,
)

logger = logging.getLogger(__name__)


def _hash_user_id(raw_author: str) -> str:
    """Generate a consistent pseudonymous ID from a raw author string."""
    return f"pseudo_{hashlib.sha256(raw_author.encode()).hexdigest()[:12]}"


def _safe_parse_timestamp(ts: Any) -> datetime:
    """Parse timestamp from various formats (Unix int, ISO string, etc.)."""
    if ts is None:
        return datetime.utcnow()

    if isinstance(ts, (int, float)):
        return datetime.utcfromtimestamp(ts)

    if isinstance(ts, str):
        # Try ISO formats
        for fmt in (
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S+00:00",
            "%Y-%m-%d %H:%M:%S",
        ):
            try:
                return datetime.strptime(ts.replace("+0000", "+00:00"), fmt)
            except ValueError:
                continue

    return datetime.utcnow()


def _extract_hashtags(text: Optional[str]) -> list[str]:
    """Extract hashtags from a text string."""
    if not text:
        return []
    import re
    return re.findall(r"#(\w+)", text)


def _detect_language(text: str) -> str:
    """Simple language detection heuristic (full detection comes in preprocessing)."""
    if not text:
        return "es"
    # Quick heuristic: count common English words vs Spanish words
    import re
    words = set(re.findall(r"\w+", text.lower()))
    en_markers = {"the", "is", "are", "was", "were", "have", "has", "been", "this", "that", "with", "for", "from", "and", "but", "not", "you", "your", "they", "their"}
    es_markers = {"el", "la", "los", "las", "es", "son", "fue", "fueron", "ha", "han", "estado", "este", "esta", "con", "para", "desde", "y", "pero", "no", "tu", "tus", "ellos", "sus", "que", "por", "del"}
    en_count = len(words & en_markers)
    es_count = len(words & es_markers)
    return "en" if en_count > es_count else "es"


def _build_enriched_fields(record: SocialDigitalRecord) -> None:
    """Extract hashtags from text_content if hashtags field is empty."""
    if not record.hashtags and record.text_content:
        record.hashtags = _extract_hashtags(record.text_content)
    if record.description and not record.hashtags:
        record.hashtags.extend(_extract_hashtags(record.description))


class BasePlatformLoader(ABC):
    """Abstract loader that transforms platform-specific raw data to SocialDigitalRecord."""

    platform: Platform

    def load_file(self, filepath: Path) -> list[SocialDigitalRecord]:
        """Load raw JSON file and convert all records."""
        logger.info("Loading raw data from %s", filepath)

        with open(filepath, "r", encoding="utf-8") as f:
            raw = json.load(f)

        records_raw = raw.get("records", raw if isinstance(raw, list) else [])
        if not records_raw:
            logger.warning("No records found in %s", filepath)
            return []

        standardized = []
        for i, item in enumerate(records_raw):
            try:
                records = self.parse_item(item, i)
                for rec in records:
                    _build_enriched_fields(rec)
                standardized.extend(records)
            except Exception as e:
                logger.error("Failed to parse item %d in %s: %s", i, filepath, e)
                continue

        logger.info(
            "Loaded %d raw items → %d SocialDigitalRecords from %s",
            len(records_raw), len(standardized), filepath,
        )
        return standardized

    @abstractmethod
    def parse_item(self, item: dict[str, Any], index: int) -> list[SocialDigitalRecord]:
        """Parse a raw item into one or more SocialDigitalRecords."""
        ...

    def save_standardized(
        self, records: list[SocialDigitalRecord], output_path: Optional[Path] = None
    ) -> Path:
        """Save standardized records to JSON."""
        if output_path is None:
            output_path = (
                settings.data_dir
                / "standardized"
                / f"{self.platform.value}_standardized.json"
            )
        output_path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "metadata": {
                "standardized_at": datetime.utcnow().isoformat(),
                "platform": self.platform.value,
                "record_count": len(records),
            },
            "records": [rec.model_dump(mode="json") for rec in records],
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

        logger.info("Saved %d standardized records to %s", len(records), output_path)
        return output_path
