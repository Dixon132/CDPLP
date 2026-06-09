"""Schemas pydantic (contrato HTTP) del Servicio_IA."""

from .embeddings import EmbeddingsRequest, EmbeddingsResponse
from .embeddings import (
    EmbeddingsSearchRequest,
    EmbeddingsSearchResponse,
    FiltroBusqueda,
    ResultadoSimilitud,
)
from .health import HealthResponse
from .vision import VisionRequest, VisionResponse
from .nlp import (
    ConversacionalNLP,
    EmocionNLP,
    EntidadNLP,
    NlpRequest,
    NlpResponse,
    SemanticoNLP,
    TemaNLP,
)
from .relevancia import (
    Contributividad,
    ItemClasificado,
    ItemRelevancia,
    RelevanciaRequest,
    RelevanciaResponse,
)
from .clustering import Cluster, ClusteringRequest, ClusteringResponse
from .anomalias import Anomalia, AnomaliasRequest, AnomaliasResponse
from .tendencias import Tendencia, TendenciasRequest, TendenciasResponse
from .scoring import (
    CalibrarRequest,
    CalibrarResponse,
    DimensionEntrada,
    EntradaIndice,
    MuestraCorpus,
    ReferenciaCorpus,
    ScoreCalibradoRequest,
    ScoreCalibradoResponse,
)

__all__ = [
    "HealthResponse",
    "EmbeddingsRequest",
    "EmbeddingsResponse",
    "EmbeddingsSearchRequest",
    "EmbeddingsSearchResponse",
    "FiltroBusqueda",
    "ResultadoSimilitud",
    "VisionRequest",
    "VisionResponse",
    "NlpRequest",
    "NlpResponse",
    "SemanticoNLP",
    "ConversacionalNLP",
    "EmocionNLP",
    "TemaNLP",
    "EntidadNLP",
    "RelevanciaRequest",
    "RelevanciaResponse",
    "ItemRelevancia",
    "ItemClasificado",
    "Contributividad",
    "ClusteringRequest",
    "ClusteringResponse",
    "Cluster",
    "AnomaliasRequest",
    "AnomaliasResponse",
    "Anomalia",
    "TendenciasRequest",
    "TendenciasResponse",
    "Tendencia",
    "ScoreCalibradoRequest",
    "ScoreCalibradoResponse",
    "CalibrarRequest",
    "CalibrarResponse",
    "EntradaIndice",
    "DimensionEntrada",
    "ReferenciaCorpus",
    "MuestraCorpus",
]
