"""Routers de FastAPI del Servicio_IA, organizados por capacidad."""

from . import anomalias, clustering, embeddings, health, nlp, relevancia, scoring, tendencias, vision

__all__ = [
    "health",
    "embeddings",
    "nlp",
    "relevancia",
    "vision",
    "clustering",
    "anomalias",
    "tendencias",
    "scoring",
]
