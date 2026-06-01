from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    # --- Application ---
    app_name: str = "irec"
    app_version: str = "0.1.0"
    debug: bool = True
    log_level: str = "INFO"

    # --- PostgreSQL ---
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "cdplp_irec"
    postgres_user: str = "postgres"
    postgres_password: str = "changeme"

    # --- ChromaDB ---
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_persist_dir: str = "./data/chroma"

    # --- Ollama ---
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "mistral"
    ollama_temperature: float = 0.7
    ollama_max_tokens: int = 2048

    # --- API ---
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # --- Reddit API (future) ---
    reddit_client_id: Optional[str] = None
    reddit_client_secret: Optional[str] = None
    reddit_user_agent: str = "CDPLP-IREC/0.1.0"

    # --- YouTube API (future) ---
    youtube_api_key: Optional[str] = None

    # --- Computed Paths ---
    @property
    def base_dir(self) -> Path:
        return Path(__file__).resolve().parent.parent.parent.parent

    @property
    def data_dir(self) -> Path:
        return self.base_dir / "data"

    @property
    def models_dir(self) -> Path:
        return self.base_dir / "models"

    @property
    def prompts_dir(self) -> Path:
        return self.base_dir / "prompts"

    @property
    def logs_dir(self) -> Path:
        return self.base_dir / "logs"

    @property
    def postgres_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def postgres_sync_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
