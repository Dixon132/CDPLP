from __future__ import annotations

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/communities", tags=["communities"])


@router.get("/analyze")
async def analyze_community_text(text: str) -> dict:
    """Analyze community association for a given text."""
    from src.irec.community.association_scorer import get_community_summary
    return get_community_summary(text)


@router.get("/institutions")
async def list_institutions() -> dict:
    """List all registered educational institutions."""
    from src.irec.community.institution_matcher import INSTITUTION_REGISTRY
    return {
        "count": len(INSTITUTION_REGISTRY),
        "institutions": [
            {"id": inst["id"], "name": inst["name"], "type": inst["type"]}
            for inst in INSTITUTION_REGISTRY
        ],
    }


@router.get("/signals")
async def list_education_signals() -> dict:
    """List all generic educational signals used for detection."""
    from src.irec.community.institution_matcher import GENERIC_EDUCATION_SIGNALS
    return {
        "count": len(GENERIC_EDUCATION_SIGNALS),
        "signals": GENERIC_EDUCATION_SIGNALS,
    }
