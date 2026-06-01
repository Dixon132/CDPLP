from __future__ import annotations

import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def compute_text_hash(text: str) -> str:
    """Compute a SHA256 hash of the normalized text for exact duplicate detection."""
    return hashlib.sha256(text.strip().lower().encode()).hexdigest()


def find_exact_duplicates(
    records: list[dict], text_key: str = "text_content"
) -> dict[str, list[int]]:
    """Find groups of exact duplicate records by text hash.

    Args:
        records: List of record dicts (must contain text_key field).
        text_key: Key of the text field to compare.

    Returns:
        Dict mapping hash → list of indices that share that text.
    """
    hash_map: dict[str, list[int]] = {}

    for i, record in enumerate(records):
        text = record.get(text_key, "")
        if not text:
            continue
        h = compute_text_hash(text)
        if h not in hash_map:
            hash_map[h] = []
        hash_map[h].append(i)

    # Return only groups with duplicates
    return {h: indices for h, indices in hash_map.items() if len(indices) > 1}


def find_near_duplicates_cosine(
    texts: list[str],
    threshold: float = 0.95,
) -> list[tuple[int, int, float]]:
    """Find near-duplicate text pairs using TF-IDF cosine similarity.

    Args:
        texts: List of text strings.
        threshold: Minimum cosine similarity to consider as near-duplicate.

    Returns:
        List of (index_a, index_b, similarity_score) tuples.
    """
    if len(texts) < 2:
        return []

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
    except ImportError:
        logger.warning("scikit-learn not available for near-duplicate detection")
        return []

    vectorizer = TfidfVectorizer(
        lowercase=True,
        analyzer="char_wb",
        ngram_range=(3, 5),
        min_df=1,
    )

    try:
        tfidf = vectorizer.fit_transform(texts)
        sim_matrix = cosine_similarity(tfidf)
    except Exception as e:
        logger.error("Failed to compute similarity matrix: %s", e)
        return []

    pairs: list[tuple[int, int, float]] = []
    n = len(texts)

    for i in range(n):
        for j in range(i + 1, n):
            score = sim_matrix[i][j]
            if score >= threshold:
                pairs.append((i, j, float(score)))

    return pairs


def deduplicate_records(
    records: list[dict],
    text_key: str = "text_content",
    keep: str = "first",
) -> list[dict]:
    """Remove duplicate records, keeping only one per duplicate group.

    Args:
        records: List of record dicts.
        text_key: Key of the text field to deduplicate on.
        keep: Which record to keep ('first', 'last', 'longest').

    Returns:
        Deduplicated list of records.
    """
    seen: set[str] = set()
    result: list[dict] = []
    duplicates_removed = 0

    for record in records:
        text = record.get(text_key, "")
        h = compute_text_hash(text) if text else f"empty_{id(record)}"

        if h in seen:
            duplicates_removed += 1
            continue

        seen.add(h)
        result.append(record)

    if duplicates_removed > 0:
        logger.info(
            "Removed %d exact duplicates (kept %d records)",
            duplicates_removed, len(result),
        )

    return result
