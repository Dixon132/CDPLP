from __future__ import annotations

from src.irec.preprocessing.text_cleaner import clean_text, is_empty_or_noise
from src.irec.preprocessing.emoji_normalizer import EMOJI_LABEL_MAP, normalize_emoji
from src.irec.preprocessing.hashtag_processor import process_hashtags
from src.irec.preprocessing.language_detector import detect_language, detect_language_with_confidence
from src.irec.preprocessing.duplicate_detector import deduplicate_records
from src.irec.preprocessing.spam_filter import classify_spam, filter_spam
from src.irec.preprocessing.date_normalizer import normalize_timestamp
from src.irec.preprocessing.pipeline import PreprocessingPipeline

__all__ = [
    "clean_text",
    "is_empty_or_noise",
    "normalize_emoji",
    "EMOJI_LABEL_MAP",
    "process_hashtags",
    "detect_language",
    "detect_language_with_confidence",
    "deduplicate_records",
    "classify_spam",
    "filter_spam",
    "normalize_timestamp",
    "PreprocessingPipeline",
]
