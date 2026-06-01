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


class FacebookLoader(BasePlatformLoader):
    """Transforms raw Facebook-like data into SocialDigitalRecord.

    Facebook raw format:
    {
      "platform": "facebook",
      "post_id": "fb_xxxxx",
      "source_type": "group" or "page",
      "source_name": "...",
      "post_text": "..." or "",
      "post_type": "status" | "photo" | "link" | "video",
      "author_type": "user" | "page" | "anonymous",
      "created_time": "YYYY-MM-DDTHH:MM:SS+0000",
      "reactions": {
        "like": number, "love": number, "care": number,
        "haha": number, "wow": number, "sad": number, "angry": number
      },
      "shares_count": number,
      "comments_count": number,
      "comments": [...],
      "educational_context": "..." or null (35% null)
    }

    Key real-world behaviors:
    - 30% have no comments
    - 20% are from institutional pages (not students)
    - Reactions include 6 types, not just "likes"
    """

    platform = Platform.FACEBOOK

    def parse_item(
        self, item: dict[str, Any], index: int
    ) -> list[SocialDigitalRecord]:
        records: list[SocialDigitalRecord] = []

        post_id = item.get("post_id", f"fb_{index}")
        post_text = item.get("post_text") or ""
        source_name = item.get("source_name", "")
        reactions = item.get("reactions", {})

        language = _detect_language(post_text)

        # Total engagement = sum of all reaction types + shares
        total_engagement = sum(
            int(v) for v in reactions.values() if isinstance(v, (int, float))
        )

        community_hints = []
        if item.get("educational_context"):
            community_hints.append(item["educational_context"])
        if source_name:
            community_hints.append(source_name)

        post = SocialDigitalRecord(
            platform=Platform.FACEBOOK,
            source_type=SourceType.POST,
            original_content_id=post_id,
            pseudo_user_id=_hash_user_id(
                source_name if item.get("author_type") == "anonymous" else f"fb_user_{index}"
            ),
            text_content=post_text,
            timestamp=_safe_parse_timestamp(item.get("created_time")),
            language=language,
            media_type=MediaType.TEXT,
            media_url_reference=post_id,
            engagement_metrics=EngagementMetrics(
                likes=reactions.get("like", 0) + reactions.get("love", 0),
                replies=item.get("comments_count", 0),
                shares=item.get("shares_count", 0),
            ),
            community_hints=community_hints,
            raw_metadata={
                "source_name": source_name,
                "source_type": item.get("source_type"),
                "post_type": item.get("post_type"),
                "author_type": item.get("author_type"),
                "reactions": reactions,
                "total_engagement": total_engagement,
            },
            processing_status=ProcessingStatus.PENDING,
        )
        records.append(post)

        # Parse comments
        comments = item.get("comments", [])
        for ci, comment in enumerate(comments):
            if not isinstance(comment, dict):
                continue
            comment_author = comment.get("author_name", f"fb_commenter_{index}_{ci}")
            comment_text = comment.get("message", "")
            if not comment_text or comment_text.strip() == "":
                continue

            comment_lang = _detect_language(comment_text)

            rec = SocialDigitalRecord(
                platform=Platform.FACEBOOK,
                source_type=SourceType.COMMENT,
                original_content_id=None,
                pseudo_user_id=_hash_user_id(comment_author),
                parent_content_id=post.record_id,
                thread_id=post_id,
                text_content=comment_text,
                timestamp=_safe_parse_timestamp(comment.get("created_time")),
                language=comment_lang,
                media_type=MediaType.TEXT,
                engagement_metrics=EngagementMetrics(
                    likes=comment.get("reactions_count", 0),
                ),
                raw_metadata={"post_id": post_id},
                processing_status=ProcessingStatus.PENDING,
            )
            records.append(rec)

        # Parse replies to comments
        for ci, comment in enumerate(comments):
            if not isinstance(comment, dict):
                continue
            replies = comment.get("replies", [])
            if not isinstance(replies, list):
                continue
            for ri, reply in enumerate(replies):
                if not isinstance(reply, dict):
                    continue
                reply_author = reply.get("author_name", f"fb_replier_{index}_{ci}_{ri}")
                reply_text = reply.get("message", "")
                if not reply_text or reply_text.strip() == "":
                    continue

                reply_lang = _detect_language(reply_text)

                # Find parent comment record_id — use thread_id + index
                rec = SocialDigitalRecord(
                    platform=Platform.FACEBOOK,
                    source_type=SourceType.REPLY,
                    pseudo_user_id=_hash_user_id(reply_author),
                    parent_content_id=post.record_id,
                    thread_id=post_id,
                    text_content=reply_text,
                    timestamp=_safe_parse_timestamp(reply.get("created_time")),
                    language=reply_lang,
                    media_type=MediaType.TEXT,
                    raw_metadata={"post_id": post_id},
                    processing_status=ProcessingStatus.PENDING,
                )
                records.append(rec)

        return records
