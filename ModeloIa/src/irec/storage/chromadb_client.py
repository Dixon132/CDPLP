from __future__ import annotations

import logging
from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from src.irec.config import settings

logger = logging.getLogger(__name__)

_client: Optional[chromadb.PersistentClient] = None


def get_chroma_client() -> chromadb.PersistentClient:
    """Get or create the ChromaDB persistent client."""
    global _client
    if _client is None:
        persist_dir = settings.chroma_persist_dir
        _client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info("ChromaDB client initialized | path=%s", persist_dir)
    return _client


def get_or_create_collection(
    name: str,
    metadata: Optional[dict] = None,
) -> chromadb.Collection:
    """Get or create a named collection."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=name,
        metadata=metadata,
    )
