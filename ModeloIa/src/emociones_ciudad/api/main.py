from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from emociones_ciudad.api.routes import metrics, alerts

app = FastAPI(title="API de Análisis Emocional", version="1.0.0")

# 🔥 CORS (OBLIGATORIO)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # React / Vite
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metrics.router)
app.include_router(alerts.router)
