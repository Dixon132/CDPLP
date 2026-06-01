from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.irec.api.routes import (
    analyses_routes,
    analytics_routes,
    community_routes,
    evolution_routes,
    generation_routes,
    health_routes,
    ingestion_routes,
    institutions_routes,
    irec_routes,
    report_routes,
)
from src.irec.config import settings, setup_logging

setup_logging()

app = FastAPI(
    title="CDPLP - IREC API",
    description=(
        "Sistema de detección de tendencias digitales de riesgo emocional "
        "en comunidades educativas mediante inteligencia artificial. "
        "API REST para análisis de sentimiento, emociones, temas, riesgo "
        "y cálculo del Índice de Riesgo Emocional Comunitario (IREC)."
    ),
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_routes.router)
app.include_router(analyses_routes.router)
app.include_router(analytics_routes.router)
app.include_router(ingestion_routes.router)
app.include_router(institutions_routes.router)
app.include_router(irec_routes.router)
app.include_router(community_routes.router)
app.include_router(report_routes.router)
app.include_router(evolution_routes.router)
app.include_router(generation_routes.router)
