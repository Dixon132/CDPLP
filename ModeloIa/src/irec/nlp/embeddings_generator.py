from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

_HAS_SENTENCE_TRANSFORMERS = False
_embedding_model = None

try:
    from sentence_transformers import SentenceTransformer
    _HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    logger.warning(
        "sentence-transformers not installed. Embeddings will use fallback (TF-IDF)."
    )


# Default model for Spanish/English embeddings
DEFAULT_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"


def _get_model() -> Optional[object]:
    """Lazy-load the embedding model."""
    global _embedding_model
    if not _HAS_SENTENCE_TRANSFORMERS:
        return None

    if _embedding_model is None:
        try:
            logger.info("Loading embedding model: %s", DEFAULT_MODEL)
            _embedding_model = SentenceTransformer(DEFAULT_MODEL)
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error("Failed to load embedding model: %s", e)
            return None

    return _embedding_model


def generate_embeddings(
    texts: list[str],
    batch_size: int = 32,
) -> Optional[list[list[float]]]:
    """Generate semantic embeddings for a list of texts.

    Uses Sentence-BERT if available, otherwise returns None.

    Args:
        texts: List of text strings.
        batch_size: Batch size for encoding.

    Returns:
        List of embedding vectors (list of floats), or None if not available.
    """
    if not texts:
        return []

    model = _get_model()
    if model is None:
        logger.debug("No embedding model available, returning None")
        return None

    try:
        embeddings = model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return [emb.tolist() for emb in embeddings]
    except Exception as e:
        logger.error("Failed to generate embeddings: %s", e)
        return None


def generate_single_embedding(text: str) -> Optional[list[float]]:
    """Generate embedding for a single text."""
    result = generate_embeddings([text])
    if result:
        return result[0]
    return None


def is_embeddings_available() -> bool:
    """Check if embedding generation is available."""
    return _HAS_SENTENCE_TRANSFORMERS and _get_model() is not None
