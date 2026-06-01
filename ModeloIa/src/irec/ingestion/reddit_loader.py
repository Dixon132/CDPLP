from __future__ import annotations

import logging
from datetime import datetime
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


class RedditLoader(BasePlatformLoader):
    """Transforms raw Reddit API-like data into SocialDigitalRecord.

    Reddit raw format:
    {
      "kind": "t3",       ← post
      "data": {
        "subreddit": "...",
        "title": "...",
        "selftext": "...",
        "author": "..." or "[deleted]",
        "created_utc": 1716500000,
        "score": 23,
        "num_comments": 5,
        "link_flair_text": "..." or null,
        "replies": [       ← nested comments
          {
            "kind": "t1",
            "data": {
              "author": "...",
              "body": "...",
              "score": 5,
              "parent_id": "t3_xxx",
              "replies": [...]   ← further nesting
            }
          }
        ]
      }
    }
    """

    platform = Platform.REDDIT

    def parse_item(
        self, item: dict[str, Any], index: int
    ) -> list[SocialDigitalRecord]:
        records: list[SocialDigitalRecord] = []

        data = item.get("data", item)
        kind = item.get("kind", "t3")

        if kind == "t3":
            # Main post
            post = self._build_post_record(data, index)
            records.append(post)

            # Parse nested comments
            replies = data.get("replies", [])
            if isinstance(replies, dict):
                # Reddit wraps replies in {"kind": "Listing", "data": {"children": [...]}}
                replies = replies.get("data", {}).get("children", replies)
            if isinstance(replies, list):
                for ci, comment_item in enumerate(replies):
                    comment_records = self._parse_comment_tree(
                        comment_item, post.record_id, post.record_id, 0, f"{index}_{ci}"
                    )
                    records.extend(comment_records)
        elif kind == "t1":
            # Standalone comment (unlikely at top level but handle it)
            rec = self._build_comment_record(data, None, None, 0, index)
            records.append(rec)

        return records

    def _build_post_record(
        self, data: dict[str, Any], index: int
    ) -> SocialDigitalRecord:
        author = data.get("author", "unknown")
        if author in ("[deleted]", "[removed]", None, ""):
            author = f"deleted_{index}"

        text = data.get("selftext", "")
        if text in ("[removed]", "[deleted]"):
            text = ""
            status = ProcessingStatus.DISCARDED
        else:
            status = ProcessingStatus.PENDING

        title = data.get("title", "")
        full_text = f"{title}\n{text}".strip()
        language = _detect_language(full_text)

        return SocialDigitalRecord(
            platform=Platform.REDDIT,
            source_type=SourceType.POST,
            pseudo_user_id=_hash_user_id(author),
            text_content=full_text,
            title=title,
            timestamp=_safe_parse_timestamp(data.get("created_utc")),
            language=language,
            media_type=MediaType.TEXT,
            engagement_metrics=EngagementMetrics(
                likes=data.get("score", 0),
                replies=data.get("num_comments", 0),
                score=data.get("score", 0),
            ),
            community_hints=[data.get("subreddit", "")] if data.get("subreddit") else [],
            raw_metadata={
                "subreddit": data.get("subreddit"),
                "flair": data.get("link_flair_text"),
                "permalink": data.get("permalink"),
            },
            processing_status=status,
        )

    def _build_comment_record(
        self,
        data: dict[str, Any],
        post_id: str | None,
        parent_id: str | None,
        depth: int,
        sub_index: int,
    ) -> SocialDigitalRecord:
        author = data.get("author", "unknown")
        if author in ("[deleted]", "[removed]", None, ""):
            author = f"deleted_{sub_index}"

        body = data.get("body", "")
        if body in ("[removed]", "[deleted]"):
            body = ""
            status = ProcessingStatus.DISCARDED
        else:
            status = ProcessingStatus.PENDING

        language = _detect_language(body)

        return SocialDigitalRecord(
            platform=Platform.REDDIT,
            source_type=SourceType.COMMENT if depth == 0 else SourceType.REPLY,
            pseudo_user_id=_hash_user_id(author),
            parent_content_id=parent_id,
            thread_id=post_id,
            text_content=body,
            timestamp=_safe_parse_timestamp(data.get("created_utc")),
            language=language,
            media_type=MediaType.TEXT,
            engagement_metrics=EngagementMetrics(
                likes=data.get("score", 0),
                score=data.get("score", 0),
            ),
            raw_metadata={"depth": depth},
            processing_status=status,
        )

    def _parse_comment_tree(
        self,
        item: dict[str, Any],
        post_id: str,
        parent_id: str,
        depth: int,
        path: str,
    ) -> list[SocialDigitalRecord]:
        records: list[SocialDigitalRecord] = []

        data = item.get("data", item)
        rec = self._build_comment_record(data, post_id, parent_id, depth, 0)
        records.append(rec)

        # Recurse into replies
        replies = data.get("replies", [])
        if isinstance(replies, dict):
            replies = replies.get("data", {}).get("children", [])
        if isinstance(replies, list):
            for ri, reply_item in enumerate(replies):
                records.extend(
                    self._parse_comment_tree(
                        reply_item, post_id, rec.record_id, depth + 1, f"{path}_{ri}"
                    )
                )

        return records
