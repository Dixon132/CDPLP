from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from src.irec.config import settings
from src.irec.community.association_scorer import get_community_summary, has_education_context

logger = logging.getLogger(__name__)


class CommunityPipeline:
    """Associates digital content with educational communities.

    Uses probabilistic matching based on institution names, acronyms,
    faculties, campus references, hashtags, and linguistic signals.

    IMPORTANT: All associations are PROBABILISTIC. The system never
    asserts with certainty that a user belongs to an institution.
    """

    def __init__(self) -> None:
        self.stats = {
            "total_analyzed": 0,
            "with_edu_context": 0,
            "high_association": 0,
            "medium_association": 0,
            "low_association": 0,
            "no_association": 0,
        }

    def analyze_record(self, record: dict[str, Any]) -> dict[str, Any]:
        """Analyze community association for a single record.

        Args:
            record: NLP-processed record dict.

        Returns:
            Record with community association fields added.
        """
        result = dict(record)

        # Use enriched text if available, otherwise anonymized/cleaned text
        text = (
            record.get("enriched_text")
            or record.get("anonymized_text")
            or record.get("cleaned_text")
            or record.get("text_content", "")
        )

        summary = get_community_summary(text)

        result["has_education_context"] = summary["has_education_context"]
        result["edu_signals_count"] = summary["generic_signals_count"]
        result["community_institutions"] = summary["top_institutions"]
        result["association_level"] = summary["association_level"]

        # Update stats
        level = summary["association_level"]
        if level == "high":
            self.stats["high_association"] += 1
        elif level == "medium":
            self.stats["medium_association"] += 1
        elif level == "low":
            self.stats["low_association"] += 1
        else:
            self.stats["no_association"] += 1

        if summary["has_education_context"]:
            self.stats["with_edu_context"] += 1

        self.stats["total_analyzed"] += 1
        return result

    def analyze_batch(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Analyze community association for a batch of records."""
        logger.info("Running community association on %d records", len(records))
        analyzed = [self.analyze_record(rec) for rec in records]

        logger.info(
            "Community analysis: %d records | high=%d med=%d low=%d none=%d",
            self.stats["total_analyzed"],
            self.stats["high_association"],
            self.stats["medium_association"],
            self.stats["low_association"],
            self.stats["no_association"],
        )
        return analyzed

    def process_file(
        self,
        input_path: Path,
        output_path: Optional[Path] = None,
    ) -> Path:
        """Load NLP JSON, run community analysis, save results."""
        logger.info("Loading data for community analysis: %s", input_path)

        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = data.get("records", data if isinstance(data, list) else [])
        analyzed = self.analyze_batch(records)

        if output_path is None:
            platform = input_path.stem.replace("_preprocessed", "").replace("_nlp", "")
            output_path = (
                settings.data_dir
                / "processed"
                / "community_association"
                / f"{platform}_community.json"
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)

        output_data = {
            "metadata": {
                "analyzed_at": datetime.utcnow().isoformat(),
                "source_file": str(input_path),
                "statistics": self.stats,
            },
            "records": analyzed,
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)

        logger.info("Saved %d community-analyzed records to %s", len(analyzed), output_path)
        return output_path

    def get_stats(self) -> dict[str, int]:
        """Return current pipeline statistics."""
        return dict(self.stats)
