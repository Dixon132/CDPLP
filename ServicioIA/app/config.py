"""Configuración (settings) del Servicio_IA.

Lee la configuración desde variables de entorno y/o un archivo ``.env``:

- ``DATABASE_URL``: cadena de conexión a la BD PostgreSQL + pgvector dedicada.
- ``MODEL_CACHE``: directorio de caché para los modelos descargados.
- ``DEVICE``: dispositivo de inferencia (``cuda`` o ``cpu``).

Incluye además los nombres de los modelos por capacidad y un límite de VRAM
para acotar la carga simultánea de modelos en GPU.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings del servicio, poblados desde el entorno / ``.env``."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        # Evita el choque del prefijo protegido ``model_`` de pydantic.
        protected_namespaces=(),
    )

    # --- Conexión a datos ---
    database_url: str = Field(
        default="postgresql://gds:gds@localhost:5432/gds",
        alias="DATABASE_URL",
    )

    # --- Modelos / dispositivo ---
    model_cache: str = Field(default="./.model_cache", alias="MODEL_CACHE")
    device: str = Field(default="cpu", alias="DEVICE")

    # Límite de VRAM (en GiB) para acotar la carga simultánea de modelos en GPU.
    # 0 o negativo significa "sin límite explícito".
    vram_limit_gb: float = Field(default=0.0, alias="VRAM_LIMIT_GB")

    # Nombres de modelos por capacidad (Sentence Transformers / Transformers).
    embedding_models: tuple[str, ...] = (
        "BAAI/bge-m3",
        "BAAI/bge-large-en-v1.5",
        "sentence-transformers/all-MiniLM-L6-v2",
    )

    @property
    def use_cuda(self) -> bool:
        """Indica si el dispositivo configurado solicita GPU."""
        return self.device.strip().lower().startswith("cuda")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Devuelve una instancia cacheada de :class:`Settings`."""
    return Settings()
