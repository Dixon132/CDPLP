"""Repositorios de acceso a datos del Servicio_IA (persistencia desacoplada)."""

from .pgvector_repo import (
    EmbeddingRecord,
    MemoriaSemanticaRepository,
    PgVectorRepository,
)

__all__ = [
    "EmbeddingRecord",
    "MemoriaSemanticaRepository",
    "PgVectorRepository",
]
