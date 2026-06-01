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


class YouTubeLoader(BasePlatformLoader):
    """Transforms raw YouTube API-like data into SocialDigitalRecord.

    YouTube raw format:
    {
      "kind": "youtube#video",
      "id": "video_id",
      "snippet": {
        "title": "...",
        "description": "...",
        "channelTitle": "...",
        "publishedAt": "YYYY-MM-DDTHH:MM:SSZ"
      },
      "statistics": {
        "viewCount": "1000",
        "likeCount": "50",
        "commentCount": "10"
      },
      "comments": [
        {
          "id": "comment_id",
          "snippet": {
            "authorDisplayName": "...",
            "textDisplay": "...",
            "likeCount": 5,
            "publishedAt": "...",
            "parentId": "video_id"
          },
          "replies": [...]   // same structure, 0-3 items
        }
      ]
    }
    """

    platform = Platform.YOUTUBE

    def parse_item(
        self, item: dict[str, Any], index: int
    ) -> list[SocialDigitalRecord]:
        records: list[SocialDigitalRecord] = []

        video_id = item.get("id", f"yt_{index}")
        snippet = item.get("snippet", {})
        statistics = item.get("statistics", {})

        # Build video description as a "post"
        title = snippet.get("title", "")
        description = snippet.get("description", "")
        channel = snippet.get("channelTitle", "")

        video_text = f"{title}\n{description}".strip()
        language = _detect_language(video_text)

        video_record = SocialDigitalRecord(
            platform=Platform.YOUTUBE,
            source_type=SourceType.DESCRIPTION,
            original_content_id=video_id,
            pseudo_user_id=_hash_user_id(channel),
            text_content=video_text,
            title=title,
            description=description,
            timestamp=_safe_parse_timestamp(snippet.get("publishedAt")),
            language=language,
            media_type=MediaType.VIDEO,
            engagement_metrics=EngagementMetrics(
                likes=int(statistics.get("likeCount", 0)),
                replies=int(statistics.get("commentCount", 0)),
                score=int(statistics.get("viewCount", 0)),
            ),
            community_hints=[channel] if channel else [],
            raw_metadata={
                "video_id": video_id,
                "channel_title": channel,
                "category": snippet.get("categoryId"),
            },
            processing_status=ProcessingStatus.PENDING,
        )
        records.append(video_record)

        # Parse comments
        comments = item.get("comments", [])
        for ci, comment_item in enumerate(comments):
            comment_records = self._parse_comment_with_replies(
                comment_item, video_record.record_id, video_id, ci
            )
            records.extend(comment_records)

        return records

    def _parse_comment_with_replies(
        self,
        item: dict[str, Any],
        parent_record_id: str,
        video_id: str,
        index: int,
    ) -> list[SocialDigitalRecord]:
        records: list[SocialDigitalRecord] = []

        snippet = item.get("snippet", item)
        author = snippet.get("authorDisplayName", "unknown")
        if author in ("Usuario eliminado", "Unknown", None, ""):
            author = f"deleted_yt_{index}"

        text = snippet.get("textDisplay", "")
        if not text or text.strip() == "":
            return records

        language = _detect_language(text)

        comment = SocialDigitalRecord(
            platform=Platform.YOUTUBE,
            source_type=SourceType.COMMENT,
            original_content_id=item.get("id"),
            pseudo_user_id=_hash_user_id(author),
            parent_content_id=parent_record_id,
            thread_id=video_id,
            text_content=text,
            timestamp=_safe_parse_timestamp(snippet.get("publishedAt")),
            language=language,
            media_type=MediaType.TEXT,
            engagement_metrics=EngagementMetrics(
                likes=snippet.get("likeCount", 0),
            ),
            raw_metadata={"video_id": video_id},
            processing_status=ProcessingStatus.PENDING,
        )
        records.append(comment)

        # Replies
        replies = item.get("replies", [])
        if isinstance(replies, list):
            for ri, reply_item in enumerate(replies):
                reply_snippet = reply_item.get("snippet", reply_item)
                reply_author = reply_snippet.get("authorDisplayName", "unknown")
                if reply_author in ("Usuario eliminado", "Unknown", None, ""):
                    reply_author = f"deleted_yt_{index}_{ri}"

                reply_text = reply_snippet.get("textDisplay", "")
                if not reply_text or reply_text.strip() == "":
                    continue

                reply_lang = _detect_language(reply_text)

                reply = SocialDigitalRecord(
                    platform=Platform.YOUTUBE,
                    source_type=SourceType.REPLY,
                    original_content_id=reply_item.get("id"),
                    pseudo_user_id=_hash_user_id(reply_author),
                    parent_content_id=comment.record_id,
                    thread_id=video_id,
                    text_content=reply_text,
                    timestamp=_safe_parse_timestamp(reply_snippet.get("publishedAt")),
                    language=reply_lang,
                    media_type=MediaType.TEXT,
                    engagement_metrics=EngagementMetrics(
                        likes=reply_snippet.get("likeCount", 0),
                    ),
                    raw_metadata={"video_id": video_id},
                    processing_status=ProcessingStatus.PENDING,
                )
                records.append(reply)

        return records
