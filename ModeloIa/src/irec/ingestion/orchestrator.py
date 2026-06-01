from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from src.irec.config import settings
from src.irec.ingestion.base_loader import BasePlatformLoader
from src.irec.ingestion.reddit_loader import RedditLoader
from src.irec.ingestion.youtube_loader import YouTubeLoader
from src.irec.ingestion.instagram_loader import InstagramLoader
from src.irec.ingestion.tiktok_loader import TikTokLoader
from src.irec.ingestion.facebook_loader import FacebookLoader
from src.irec.schemas import Platform, SocialDigitalRecord

logger = logging.getLogger(__name__)

# Registry of all available loaders
LOADER_REGISTRY: dict[str, type[BasePlatformLoader]] = {
    "reddit": RedditLoader,
    "youtube": YouTubeLoader,
    "instagram": InstagramLoader,
    "tiktok": TikTokLoader,
    "facebook": FacebookLoader,
}


def get_loader(platform: str) -> BasePlatformLoader:
    """Factory: return the appropriate loader for a platform."""
    loader_cls = LOADER_REGISTRY.get(platform)
    if loader_cls is None:
        raise ValueError(
            f"Unknown platform: {platform}. Valid: {list(LOADER_REGISTRY.keys())}"
        )
    return loader_cls()


def ingest_platform(
    platform: str,
    input_path: Optional[Path] = None,
    output_path: Optional[Path] = None,
) -> list[SocialDigitalRecord]:
    """Ingest raw data for a single platform.

    Args:
        platform: Platform name (reddit, youtube, instagram, tiktok, facebook).
        input_path: Path to raw JSON file. Auto-detected if None.
        output_path: Path to save standardized output. Auto-generated if None.

    Returns:
        List of SocialDigitalRecord objects.
    """
    loader = get_loader(platform)

    if input_path is None:
        input_path = _auto_detect_input(platform)

    if not input_path.exists():
        raise FileNotFoundError(
            f"Raw data not found for {platform}: {input_path}. "
            f"Run 'python main.py generate --platform {platform}' first."
        )

    records = loader.load_file(input_path)
    loader.save_standardized(records, output_path)
    return records


def ingest_all() -> dict[str, list[SocialDigitalRecord]]:
    """Ingest raw data from all platforms that have generated data.

    Returns:
        Dictionary mapping platform name to list of SocialDigitalRecord.
    """
    results: dict[str, list[SocialDigitalRecord]] = {}
    total_records = 0

    for platform_name in LOADER_REGISTRY:
        try:
            records = ingest_platform(platform_name)
            results[platform_name] = records
            total_records += len(records)
            logger.info(
                "Ingested %s: %d records", platform_name, len(records)
            )
        except FileNotFoundError:
            logger.warning(
                "Skipping %s: no raw data found. Generate with --platform %s first.",
                platform_name, platform_name,
            )
            results[platform_name] = []
        except Exception as e:
            logger.error("Failed to ingest %s: %s", platform_name, e)
            results[platform_name] = []

    logger.info(
        "Ingestion complete: %d total records across %d platforms",
        total_records,
        sum(1 for r in results.values() if r),
    )
    return results


def generate_ingestion_report(results: dict[str, list[SocialDigitalRecord]]) -> Path:
    """Generate a summary report of the ingestion process."""
    report_path = settings.data_dir / "standardized" / "ingestion_report.json"

    report = {
        "generated_at": datetime.utcnow().isoformat(),
        "platforms": {},
        "total_records": 0,
    }

    for platform_name, records in results.items():
        status_counts = {
            "pending": 0,
            "processed": 0,
            "error": 0,
            "validated": 0,
            "discarded": 0,
        }
        languages: dict[str, int] = {}
        source_types: dict[str, int] = {}

        for rec in records:
            status = rec.processing_status.value if hasattr(rec.processing_status, 'value') else str(rec.processing_status)
            status_counts[status] = status_counts.get(status, 0) + 1
            languages[rec.language] = languages.get(rec.language, 0) + 1
            st = rec.source_type.value if hasattr(rec.source_type, 'value') else str(rec.source_type)
            source_types[st] = source_types.get(st, 0) + 1

        report["platforms"][platform_name] = {
            "record_count": len(records),
            "status_distribution": status_counts,
            "languages": languages,
            "source_types": source_types,
        }
        report["total_records"] += len(records)

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)

    logger.info("Ingestion report saved to %s", report_path)
    return report_path


def _auto_detect_input(platform: str) -> Path:
    """Auto-detect the raw JSON file for a platform."""
    filename_map = {
        "reddit": "reddit_raw.json",
        "youtube": "youtube_raw.json",
        "instagram": "instagram_raw.json",
        "tiktok": "tiktok_raw.json",
        "facebook": "facebook_raw.json",
    }
    dir_map = {
        "reddit": "synthetic_reddit",
        "youtube": "synthetic_youtube",
        "instagram": "synthetic_instagram",
        "tiktok": "synthetic_tiktok",
        "facebook": "synthetic_facebook",
    }
    return settings.data_dir / "raw" / dir_map.get(platform, f"synthetic_{platform}") / filename_map.get(platform, f"{platform}_raw.json")
