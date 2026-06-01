from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": "cdplp-irec",
        "version": "0.1.0",
    }


@router.get("/ready")
async def readiness_check() -> dict:
    """Check if all subsystems are available."""
    checks = {
        "api": True,
        "ollama": _check_ollama(),
        "ocr_available": _check_ocr(),
        "embeddings_available": _check_embeddings(),
    }
    all_ready = all(checks.values())
    return {"ready": all_ready, "checks": checks}


def _check_ollama() -> bool:
    try:
        import ollama
        client = ollama.Client(host="http://localhost:11434")
        models = client.list()
        return len(models.get("models", [])) > 0
    except Exception:
        return False


def _check_ocr() -> bool:
    try:
        from src.irec.vision.ocr_extractor import is_ocr_available
        return is_ocr_available()
    except Exception:
        return False


def _check_embeddings() -> bool:
    try:
        from src.irec.nlp.embeddings_generator import is_embeddings_available
        return is_embeddings_available()
    except Exception:
        return False
