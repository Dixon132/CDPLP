"""Servicio de embeddings (Sentence Transformers) del Servicio_IA.

Genera representaciones vectoriales de texto para alimentar la
``Memoria_Semantica`` (``pgvector``) y el ``Embeddings_Search`` (Req. 31.2,
36.1). Soporta los tres modelos declarados:

- ``BAAI/bge-m3`` — **primario**, 1024 dimensiones.
- ``BAAI/bge-large-en-v1.5`` — 1024 dimensiones.
- ``all-MiniLM-L6-v2`` — 384 dimensiones.

Diseño orientado a pruebas: la *carga* del codificador real (Sentence
Transformers) está detrás de un ``encoder_factory`` inyectable, de modo que las
pruebas puedan sustituirlo por un **doble determinista** que no descarga pesos
ni usa GPU, de forma coherente con el doble del cargador de modelos del
``conftest``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Protocol, runtime_checkable

# Modelo primario y dimensiones conocidas por nombre de modelo. Se aceptan tanto
# el nombre corto como el prefijado con ``sentence-transformers/``.
DEFAULT_EMBEDDING_MODEL = "BAAI/bge-m3"

MODEL_DIMENSIONS: dict[str, int] = {
    "BAAI/bge-m3": 1024,
    "BAAI/bge-large-en-v1.5": 1024,
    "all-MiniLM-L6-v2": 384,
    "sentence-transformers/all-MiniLM-L6-v2": 384,
}


@runtime_checkable
class Encoder(Protocol):
    """Codificador de texto a vectores (contrato mínimo, inyectable)."""

    def encode(self, textos: list[str]) -> list[list[float]]:
        """Devuelve un vector (lista de floats) por cada texto de entrada."""
        ...


@dataclass(frozen=True)
class EmbeddingResult:
    """Resultado de una operación de embeddings: vectores, modelo y dimensión."""

    vectores: list[list[float]]
    modelo: str
    dim: int


class _SentenceTransformerEncoder:
    """Adaptador del modelo real de Sentence Transformers al contrato ``Encoder``.

    La importación de la librería pesada es perezosa (ocurre al construir el
    codificador, no al importar el módulo), de modo que el servicio y las
    pruebas no requieren ``sentence-transformers`` ni GPU para cargarse.
    """

    def __init__(self, model_name: str) -> None:
        from sentence_transformers import SentenceTransformer  # import perezoso

        self._model = SentenceTransformer(model_name)

    def encode(self, textos: list[str]) -> list[list[float]]:
        vectores = self._model.encode(
            list(textos),
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return [[float(x) for x in vector] for vector in vectores]


def default_encoder_factory(model_name: str) -> Encoder:
    """Construye el codificador real para ``model_name`` (Sentence Transformers)."""
    return _SentenceTransformerEncoder(model_name)


class EmbeddingService:
    """Genera embeddings por modelo, cacheando los codificadores construidos."""

    def __init__(
        self,
        *,
        default_model: str = DEFAULT_EMBEDDING_MODEL,
        encoder_factory: Callable[[str], Encoder] | None = None,
        dimensions: dict[str, int] | None = None,
    ) -> None:
        self._default_model = default_model
        self._encoder_factory = encoder_factory or default_encoder_factory
        self._dimensions = dict(dimensions or MODEL_DIMENSIONS)
        self._encoders: dict[str, Encoder] = {}

    def supported_models(self) -> list[str]:
        """Modelos con dimensión conocida (los declarados por el servicio)."""
        return list(self._dimensions.keys())

    def _resolve_model(self, modelo: str | None) -> str:
        """Resuelve el modelo a usar y valida que esté soportado."""
        name = (modelo or self._default_model).strip()
        if name not in self._dimensions:
            soportados = ", ".join(sorted(self._dimensions))
            raise ValueError(
                f"Modelo de embeddings no soportado: '{name}'. "
                f"Modelos disponibles: {soportados}."
            )
        return name

    def dimension_for(self, modelo: str | None = None) -> int:
        """Dimensión declarada del modelo (resolviendo el primario por defecto)."""
        return self._dimensions[self._resolve_model(modelo)]

    def _encoder_for(self, modelo: str) -> Encoder:
        """Devuelve (cacheado) el codificador del modelo, construyéndolo una vez."""
        encoder = self._encoders.get(modelo)
        if encoder is None:
            encoder = self._encoder_factory(modelo)
            self._encoders[modelo] = encoder
        return encoder

    def embed(self, textos: list[str], modelo: str | None = None) -> EmbeddingResult:
        """Genera embeddings para ``textos`` con el modelo indicado o el primario.

        Mantiene el orden de entrada (un vector por texto). Con una lista vacía
        no invoca el codificador y devuelve ``vectores=[]`` con la dimensión
        declarada del modelo.
        """
        if not isinstance(textos, list) or not all(
            isinstance(texto, str) for texto in textos
        ):
            raise ValueError("'textos' debe ser una lista de cadenas de texto.")

        nombre_modelo = self._resolve_model(modelo)
        dim_declarada = self._dimensions[nombre_modelo]

        if not textos:
            return EmbeddingResult(vectores=[], modelo=nombre_modelo, dim=dim_declarada)

        vectores = self._encoder_for(nombre_modelo).encode(textos)
        vectores = [[float(x) for x in vector] for vector in vectores]

        # La dimensión real proviene de los vectores generados; se respalda en la
        # dimensión declarada cuando no hay vectores.
        dim = len(vectores[0]) if vectores else dim_declarada
        return EmbeddingResult(vectores=vectores, modelo=nombre_modelo, dim=dim)
