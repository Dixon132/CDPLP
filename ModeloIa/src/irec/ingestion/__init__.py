from __future__ import annotations

from src.irec.ingestion.base_loader import BasePlatformLoader
from src.irec.ingestion.reddit_loader import RedditLoader
from src.irec.ingestion.youtube_loader import YouTubeLoader
from src.irec.ingestion.instagram_loader import InstagramLoader
from src.irec.ingestion.tiktok_loader import TikTokLoader
from src.irec.ingestion.facebook_loader import FacebookLoader
from src.irec.ingestion.orchestrator import (
    LOADER_REGISTRY,
    generate_ingestion_report,
    get_loader,
    ingest_all,
    ingest_platform,
)

__all__ = [
    "BasePlatformLoader",
    "RedditLoader",
    "YouTubeLoader",
    "InstagramLoader",
    "TikTokLoader",
    "FacebookLoader",
    "LOADER_REGISTRY",
    "get_loader",
    "ingest_platform",
    "ingest_all",
    "generate_ingestion_report",
]
