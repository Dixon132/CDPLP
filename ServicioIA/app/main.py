"""Punto de entrada del Servicio_IA (FastAPI).

Crea la app, registra los routers y usa un ``lifespan`` que carga los modelos
**una sola vez** al arranque y los deja disponibles en ``app.state`` para los
routers (p. ej. ``GET /health``).

La carga de modelos es inyectable (parámetro ``model_loader`` de
:func:`create_app`) para que las pruebas puedan sustituirla por modelos
pequeños o dobles deterministas.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Callable

from fastapi import FastAPI

from .config import Settings, get_settings
from .model_registry import ModelRegistry, make_loader
from .observability import configurar_observabilidad
from .routers import health
from .routers import embeddings as embeddings_router
from .routers import nlp as nlp_router
from .routers import vision as vision_router
from .routers import relevancia as relevancia_router
from .routers import clustering as clustering_router
from .routers import anomalias as anomalias_router
from .routers import tendencias as tendencias_router
from .routers import scoring as scoring_router


def create_app(
    *,
    settings: Settings | None = None,
    model_loader: Callable[[Settings], ModelRegistry] | None = None,
) -> FastAPI:
    """Construye y configura la aplicación FastAPI del Servicio_IA."""
    app_settings = settings or get_settings()
    loader = make_loader(model_loader)

    # Observabilidad: logging estructurado + Sentry (no-op sin SENTRY_DSN).
    configurar_observabilidad()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Carga de modelos una única vez al arranque.
        app.state.settings = app_settings
        app.state.model_registry = loader(app_settings)
        try:
            yield
        finally:
            # Libera la referencia al registro al apagar el servicio.
            app.state.model_registry = None

    app = FastAPI(
        title="Servicio_IA — Plataforma_GDS",
        version="0.1.0",
        description="Cerebro analítico (embeddings, NLP, visión, clustering, "
        "anomalías, tendencias, scoring) consumido por el ServidorGDS.",
        lifespan=lifespan,
    )

    app.include_router(health.router)
    # Router de embeddings (POST /embeddings) — tarea 6.1.
    app.include_router(embeddings_router.router)
    # Router de NLP (POST /nlp) — tarea 6.3.
    app.include_router(nlp_router.router)
    # Router del Vision_Engine (POST /vision) — tarea 6.4.
    app.include_router(vision_router.router)
    # Router del Filtro_Relevancia (POST /relevancia) — tarea 6.7.
    app.include_router(relevancia_router.router)
    # Router de agrupamiento temático (POST /clustering) — tarea 6.5.
    app.include_router(clustering_router.router)
    # Router de detección de anomalías (POST /anomalias) — tarea 6.5.
    app.include_router(anomalias_router.router)
    # Router de detección de tendencias (POST /tendencias) — tarea 6.5.
    app.include_router(tendencias_router.router)
    # Router de scoring/calibración (POST /score-calibrado, POST /calibrar) — tarea 6.6.
    app.include_router(scoring_router.router)

    return app


# Instancia ASGI por defecto (uvicorn app.main:app).
app = create_app()
