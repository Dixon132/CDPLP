from __future__ import annotations

import logging
from typing import Any

from src.irec.ingestion.base_loader import (
    BasePlatformLoader,
    _detect_language,
    _hash_user_id,
    _safe_parse_timestamp,
)
from src.irec.schemas import (
    EngagementMetrics,
    MediaType,
    Platform,
    ProcessingStatus,
    SocialDigitalRecord,
    SourceType,
)

logger = logging.getLogger(__name__)


class TikTokLoader(BasePlatformLoader):
    """Transforms raw TikTok-like data into SocialDigitalRecord.

    TikTok raw format:
    {
      "platform": "tiktok",
      "video_id": "tt_xxxxx",
      "author_username": "...",
      "caption": "..." (short, lots of hashtags),
      "hashtags": ["#fyp", ...],
      "create_time": timestamp_unix,
      "statistics": {
        "play_count": number,
        "like_count": number,
        "comment_count": number,
        "share_count": number
      },
      "music_title": "...",
      "ocr_text": "..." or null (60% null),
      "scene_description": "...",
      "hashtag_challenge": "..." or null,
      "comments": [...],
      "educational_context": "..." or null (45% null)
    }

    Key real-world behaviors:
    - 35% have no comments
    - 50% of comments are just emojis or 1-3 words
    - 60% have no OCR text on screen
    - 40% is trending/meme content (not educational)
    """

    platform = Platform.TIKTOK

    def parse_item(
        self, item: dict[str, Any], index: int
    ) -> list[SocialDigitalRecord]:
        records: list[SocialDigitalRecord] = []

        video_id = item.get("video_id", f"tt_{index}")
        author = item.get("author_username", f"tt_user_{index}")
        caption = item.get("caption") or ""
        hashtags = item.get("hashtags", [])
        ocr_text = item.get("ocr_text") or ""
        scene_desc = item.get("scene_description") or ""
        stats = item.get("statistics", {})

        # Build enriched text
        text_parts = [caption]
        if hashtags:
            text_parts.append(" ".join(f"#{h}" for h in hashtags))
        if ocr_text:
            text_parts.append(ocr_text)
        if scene_desc:
            text_parts.append(scene_desc)
        full_text = " ".join(p for p in text_parts if p).strip()
        language = _detect_language(full_text)

        community_hints = []
        if item.get("educational_context"):
            community_hints.append(item["educational_context"])
        if item.get("hashtag_challenge"):
            community_hints.append(item["hashtag_challenge"])

        post = SocialDigitalRecord(
            platform=Platform.TIKTOK,
            source_type=SourceType.CAPTION,
            original_content_id=video_id,
            pseudo_user_id=_hash_user_id(author),
            text_content=full_text,
            hashtags=hashtags,
            ocr_text=ocr_text if ocr_text else None,
            scene_description=scene_desc if scene_desc else None,
            timestamp=_safe_parse_timestamp(item.get("create_time")),
            language=language,
            media_type=MediaType.VIDEO,
            media_url_reference=video_id,
            engagement_metrics=EngagementMetrics(
                likes=int(stats.get("like_count", 0)),
                replies=int(stats.get("comment_count", 0)),
                shares=int(stats.get("share_count", 0)),
            ),
            community_hints=community_hints,
            raw_metadata={
                "author": author,
                "music": item.get("music_title"),
                "challenge": item.get("hashtag_challenge"),
                "play_count": stats.get("play_count"),
            },
            processing_status=ProcessingStatus.PENDING,
        )
        records.append(post)

        # Parse comments
        comments = item.get("comments", [])
        for ci, comment in enumerate(comments):
            if not isinstance(comment, dict):
                continue
            comment_author = comment.get("username", f"tt_commenter_{index}_{ci}")
            comment_text = comment.get("text", "")
            if not comment_text or comment_text.strip() == "":
                continue

            comment_lang = _detect_language(comment_text)

            rec = SocialDigitalRecord(
                platform=Platform.TIKTOK,
                source_type=SourceType.COMMENT,
                original_content_id=None,
                pseudo_user_id=_hash_user_id(comment_author),
                parent_content_id=post.record_id,
                thread_id=video_id,
                text_content=comment_text,
                timestamp=_safe_parse_timestamp(comment.get("timestamp")),
                language=comment_lang,
                media_type=MediaType.TEXT,
                engagement_metrics=EngagementMetrics(
                    likes=comment.get("likes", 0),
                ),
                raw_metadata={"video_id": video_id},
                processing_status=ProcessingStatus.PENDING,
            )
            records.append(rec)

        return records
