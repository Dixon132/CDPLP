"""Servicios del Servicio_IA (lógica de cada capacidad analítica)."""

from .embedding_service import (
    DEFAULT_EMBEDDING_MODEL,
    MODEL_DIMENSIONS,
    EmbeddingResult,
    EmbeddingService,
    Encoder,
)
from .vision_service import (
    DEFAULT_VISION_ENGINE,
    TextDescriptionVisionAnalyzer,
    VisionAnalysis,
    VisionAnalyzer,
    VisionService,
)
from .relevancia_service import (
    Classifier,
    RelevanciaResult,
    RelevanciaService,
)
from .nlp_service import (
    EmocionTexto,
    EntidadTexto,
    NlpAnalysis,
    NlpAnalyzer,
    NlpService,
)
from .scoring_service import (
    Calibrator,
    IdentityCalibrator,
    LinearCalibrator,
    ScoreResult,
    ScoringService,
)
from .calibration_service import CalibrationResult, CalibrationService
from .clustering_service import Clusterer, ClusteringService, ClusterResult
from .anomaly_service import AnomalyDetector, AnomalyResult, AnomalyService
from .trend_service import TrendEstimator, TrendResult, TrendService

__all__ = [
    "EmbeddingService",
    "EmbeddingResult",
    "Encoder",
    "DEFAULT_EMBEDDING_MODEL",
    "MODEL_DIMENSIONS",
    "VisionService",
    "VisionAnalysis",
    "VisionAnalyzer",
    "TextDescriptionVisionAnalyzer",
    "DEFAULT_VISION_ENGINE",
    "RelevanciaService",
    "RelevanciaResult",
    "Classifier",
    "NlpService",
    "NlpAnalyzer",
    "NlpAnalysis",
    "EmocionTexto",
    "EntidadTexto",
    "ClusteringService",
    "ClusterResult",
    "Clusterer",
    "AnomalyService",
    "AnomalyResult",
    "AnomalyDetector",
    "TrendService",
    "TrendResult",
    "TrendEstimator",
    "ScoringService",
    "ScoreResult",
    "Calibrator",
    "IdentityCalibrator",
    "LinearCalibrator",
    "CalibrationService",
    "CalibrationResult",
]
