from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/institutions", tags=["institutions"])


class InstitutionCreate(BaseModel):
    name: str
    acronym: str = ""
    type: str = "publica"
    latitude: float = 0.0
    longitude: float = 0.0
    address: str = ""
    faculties: list[str] = []


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    acronym: Optional[str] = None
    type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    faculties: Optional[list[str]] = None


@router.get("")
async def list_institutions(active_only: bool = False) -> dict:
    """List all registered institutions with coordinates."""
    from src.irec.community.institution_store import get_all
    institutions = get_all(active_only=active_only)
    return {"count": len(institutions), "institutions": institutions}


@router.get("/{inst_id}")
async def get_institution(inst_id: str) -> dict:
    """Get a single institution by ID."""
    from src.irec.community.institution_store import get_by_id
    inst = get_by_id(inst_id)
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return inst


@router.post("")
async def create_institution(data: InstitutionCreate) -> dict:
    """Create a new institution with coordinates."""
    from src.irec.community.institution_store import create
    return create(data.model_dump())


@router.put("/{inst_id}")
async def update_institution(inst_id: str, data: InstitutionUpdate) -> dict:
    """Update an institution."""
    from src.irec.community.institution_store import update
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    result = update(inst_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Institution not found")
    return result


@router.delete("/{inst_id}")
async def delete_institution(inst_id: str) -> dict:
    """Deactivate an institution (soft delete)."""
    from src.irec.community.institution_store import delete
    if not delete(inst_id):
        raise HTTPException(status_code=404, detail="Institution not found")
    return {"status": "deactivated", "id": inst_id}
