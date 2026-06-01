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


class InstagramLoader(BasePlatformLoader):
    """Transforms raw Instagram-like data into SocialDigitalRecord.

    Instagram raw format:
    {
      "platform": "instagram",
      "post_id": "ig_xxxxx",
      "owner_username": "...",
      "accessible": true,
      "caption": "..." or null,
      "hashtags": ["#tag1"] or [],
      "timestamp": "YYYY-MM-DD HH:MM:SS",
      "location": "..." or null,
      "like_count": number,
      "comment_count": number,
      "is_ad": false,
      "media_type": "image",
      "ocr_text": "..." or null,
      "image_description": "..." or null,
      "comments": [...],
      "educational_context": "..." or null
    }

    Key real-world behaviors:
    - 25% have no caption (only image)
    - 40% have no comments
    - 15% are ads (is_ad: true)
    - 50% have no OCR text in image
    - 60% have no location
    """

    platform = Platform.INSTAGRAM

    def parse_item(
        self, item: dict[str, Any], index: int
    ) -> list[SocialDigitalRecord]:
        records: list[SocialDigitalRecord] = []

        # Skip inaccessible posts
        if not item.get("accessible", True):
            return records

        # Skip ads (marked for separate analysis if needed)
        is_ad = item.get("is_ad", False)
        status = ProcessingStatus.PENDING if not is_ad else ProcessingStatus.DISCARDED

        owner = item.get("owner_username", f"ig_user_{index}")
        caption = item.get("caption") or ""
        hashtags = item.get("hashtags", [])
        ocr = item.get("ocr_text") or ""
        img_desc = item.get("image_description") or ""

        # Build enriched text
        text_parts = [caption]
        if hashtags:
            text_parts.append(" ".join(f"#{h}" for h in hashtags))
        if ocr:
            text_parts.append(ocr)
        if img_desc:
            text_parts.append(img_desc)
        full_text = " ".join(p for p in text_parts if p).strip()
        language = _detect_language(full_text)

        community_hints = []
        if item.get("educational_context"):
            community_hints.append(item["educational_context"])
        if item.get("location"):
            community_hints.append(item["location"])

        post = SocialDigitalRecord(
            platform=Platform.INSTAGRAM,
            source_type=SourceType.CAPTION,
            original_content_id=item.get("post_id"),
            pseudo_user_id=_hash_user_id(owner),
            text_content=full_text,
            hashtags=hashtags,
            ocr_text=ocr if ocr else None,
            image_caption=img_desc if img_desc else None,
            timestamp=_safe_parse_timestamp(item.get("timestamp")),
            language=language,
            media_type=MediaType.IMAGE if ocr or img_desc else MediaType.TEXT,
            media_url_reference=item.get("post_id"),
            engagement_metrics=EngagementMetrics(
                likes=item.get("like_count", 0),
                replies=item.get("comment_count", 0),
            ),
            community_hints=community_hints,
            raw_metadata={
                "owner": owner,
                "is_ad": is_ad,
                "location": item.get("location"),
            },
            processing_status=status,
        )
        records.append(post)

        # Parse comments
        comments = item.get("comments", [])
        for ci, comment in enumerate(comments):
            if not isinstance(comment, dict):
                continue
            comment_author = comment.get("username", f"ig_commenter_{index}_{ci}")
            comment_text = comment.get("text", "")
            if not comment_text or comment_text.strip() == "":
                continue

            comment_lang = _detect_language(comment_text)

            rec = SocialDigitalRecord(
                platform=Platform.INSTAGRAM,
                source_type=SourceType.COMMENT,
                original_content_id=None,
                pseudo_user_id=_hash_user_id(comment_author),
                parent_content_id=post.record_id,
                thread_id=post.original_content_id,
                text_content=comment_text,
                timestamp=_safe_parse_timestamp(comment.get("timestamp")),
                language=comment_lang,
                media_type=MediaType.TEXT,
                raw_metadata={"post_id": item.get("post_id")},
                processing_status=ProcessingStatus.PENDING,
            )
            records.append(rec)

        return records
