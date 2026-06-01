from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# Regex patterns for cleaning
URL_PATTERN = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
MENTION_PATTERN = re.compile(r"@\w+")
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
MULTIPLE_SPACES = re.compile(r"\s+")
SPECIAL_CHARS_PATTERN = re.compile(r"[^\w\s@#.,!?¿¡:;\(\)\[\]\-–—\"'«»/%&$€áéíóúñÁÉÍÓÚÑüÜ]+")
NEWLINE_PATTERN = re.compile(r"[\r\n]+")
REPEATED_CHARS = re.compile(r"(.)\1{3,}")  # 4+ repeated chars (e.g. "nooooooo")


def clean_text(
    text: str,
    remove_urls: bool = True,
    remove_mentions: bool = False,
    normalize_mentions: bool = True,
    remove_html: bool = True,
    normalize_whitespace: bool = True,
    normalize_newlines: bool = True,
    normalize_repeated_chars: bool = True,
    lowercase: bool = True,
) -> str:
    """Clean and normalize social media text.

    Args:
        text: Raw text to clean.
        remove_urls: If True, remove URLs entirely.
        remove_mentions: If True, remove @mentions. If False and normalize_mentions,
            replace @mentions with [USUARIO] token.
        normalize_mentions: Replace @username with [USUARIO] placeholder.
        remove_html: Strip HTML/XML tags.
        normalize_whitespace: Collapse multiple spaces into one.
        normalize_newlines: Replace newlines with spaces.
        normalize_repeated_chars: Normalize "noooooo" -> "noo".
        lowercase: Convert to lowercase.

    Returns:
        Cleaned text string.
    """
    if not text or not text.strip():
        return ""

    cleaned = text.strip()

    # Remove HTML tags
    if remove_html:
        cleaned = HTML_TAG_PATTERN.sub(" ", cleaned)

    # Handle URLs
    if remove_urls:
        cleaned = URL_PATTERN.sub(" ", cleaned)

    # Handle @mentions
    if remove_mentions:
        cleaned = MENTION_PATTERN.sub(" ", cleaned)
    elif normalize_mentions:
        cleaned = MENTION_PATTERN.sub("[USUARIO]", cleaned)

    # Normalize repeated characters (keep max 2)
    if normalize_repeated_chars:
        cleaned = REPEATED_CHARS.sub(r"\1\1", cleaned)

    # Normalize whitespace
    if normalize_whitespace:
        cleaned = MULTIPLE_SPACES.sub(" ", cleaned)

    # Normalize newlines
    if normalize_newlines:
        cleaned = NEWLINE_PATTERN.sub(" ", cleaned)

    # Lowercase
    if lowercase:
        cleaned = cleaned.lower()

    # Final trim
    cleaned = cleaned.strip()

    return cleaned


def extract_urls(text: str) -> list[str]:
    """Extract all URLs from text."""
    return URL_PATTERN.findall(text)


def extract_mentions(text: str) -> list[str]:
    """Extract all @mentions from text."""
    return [m.lstrip("@") for m in MENTION_PATTERN.findall(text)]


def is_empty_or_noise(text: str, min_length: int = 3, min_words: int = 2) -> bool:
    """Check if text is effectively empty or just noise.

    Args:
        text: Text to check.
        min_length: Minimum character length.
        min_words: Minimum number of words.

    Returns:
        True if text should be considered empty/noise.
    """
    if not text or not text.strip():
        return True

    cleaned = clean_text(text)
    if len(cleaned) < min_length:
        return True

    words = [w for w in cleaned.split() if len(w) > 1]
    if len(words) < min_words:
        return True

    return False
