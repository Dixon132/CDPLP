from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# Pattern to split CamelCase or PascalCase
CAMEL_SPLIT_PATTERN = re.compile(r"(?<=[a-záéíóúñü])(?=[A-ZÁÉÍÓÚÑÜ])|(?<=[A-ZÁÉÍÓÚÑÜ])(?=[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü])")
# Combined separators: underscore, hyphen, dot
SEPARATOR_PATTERN = re.compile(r"[_\-\.]+")


def process_hashtags(hashtags: list[str]) -> list[str]:
    """Normalize a list of hashtags: split compound tags, lowercase.

    Example:
        ["#NoPuedoMas", "#SemanaDeParciales", "#VidaUniversitaria"]
        → ["no puedo mas", "semana de parciales", "vida universitaria"]

    Args:
        hashtags: Raw hashtag strings (with or without # prefix).

    Returns:
        List of normalized, human-readable tag strings.
    """
    result: list[str] = []
    seen: set[str] = set()

    for tag in hashtags:
        if not tag:
            continue

        # Strip # prefix
        clean = tag.lstrip("#").strip()
        if not clean:
            continue

        # Split on common separators
        parts = SEPARATOR_PATTERN.split(clean)

        normalized_parts: list[str] = []
        for part in parts:
            if not part:
                continue
            # Split CamelCase / PascalCase
            sub_parts = CAMEL_SPLIT_PATTERN.split(part)
            normalized_parts.extend(p.lower() for p in sub_parts if p)

        normalized = " ".join(normalized_parts).strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)

    return result


def extract_hashtags_from_text(text: str) -> list[str]:
    """Extract hashtags directly from raw text.

    Args:
        text: Text potentially containing #hashtags.

    Returns:
        List of hashtag strings without # prefix.
    """
    return re.findall(r"#(\w+)", text)


def hashtags_to_text(hashtags: list[str]) -> str:
    """Convert normalized hashtags back to a searchable text string.

    Args:
        hashtags: Normalized hashtag strings (already processed).

    Returns:
        Space-separated string of hashtag words.
    """
    return " ".join(hashtags)
