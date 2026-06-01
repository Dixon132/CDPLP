from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from src.irec.config import settings

logger = logging.getLogger(__name__)

INSTITUTIONS_FILE = settings.data_dir / "standardized" / "institutions.json"

# Default institutions with coordinates
DEFAULT_INSTITUTIONS = [
    {
        "id": "inst_001",
        "name": "Universidad Nacional",
        "acronym": "UNAL",
        "type": "publica",
        "latitude": -16.5000,
        "longitude": -68.1500,
        "address": "Av. Universitaria #100, La Paz",
        "faculties": ["Ingeniería", "Medicina", "Derecho", "Ciencias", "Economía"],
        "active": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "inst_002",
        "name": "Universidad Tecnológica",
        "acronym": "UTEC",
        "type": "publica",
        "latitude": -16.5100,
        "longitude": -68.1300,
        "address": "Calle Tecnología #200, La Paz",
        "faculties": ["Ingeniería de Sistemas", "Industrial", "Civil", "Electrónica"],
        "active": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "inst_003",
        "name": "Universidad del Valle",
        "acronym": "UNIVALLE",
        "type": "privada",
        "latitude": -16.5200,
        "longitude": -68.1100,
        "address": "Zona Sur, Calle Valle #300, La Paz",
        "faculties": ["Administración", "Marketing", "Contaduría", "Derecho"],
        "active": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "inst_004",
        "name": "Instituto Superior Tecnológico",
        "acronym": "IST",
        "type": "tecnico",
        "latitude": -16.5300,
        "longitude": -68.0900,
        "address": "Av. Técnica #400, El Alto",
        "faculties": ["Electrónica", "Mecánica", "Informática", "Redes"],
        "active": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "inst_005",
        "name": "Universidad Católica",
        "acronym": "UCAT",
        "type": "privada",
        "latitude": -16.5050,
        "longitude": -68.1200,
        "address": "Campus San Miguel, La Paz",
        "faculties": ["Teología", "Filosofía", "Educación", "Psicología"],
        "active": True,
        "created_at": datetime.utcnow().isoformat(),
    },
]


def _load() -> list[dict]:
    if INSTITUTIONS_FILE.exists():
        with open(INSTITUTIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    # Initialize with defaults
    _save(DEFAULT_INSTITUTIONS)
    return DEFAULT_INSTITUTIONS


def _save(data: list[dict]) -> None:
    INSTITUTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(INSTITUTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_all(active_only: bool = False) -> list[dict]:
    data = _load()
    if active_only:
        return [i for i in data if i.get("active", True)]
    return data


def get_by_id(inst_id: str) -> Optional[dict]:
    for i in _load():
        if i["id"] == inst_id:
            return i
    return None


def create(institution: dict) -> dict:
    data = _load()
    import uuid
    institution["id"] = institution.get("id", f"inst_{uuid.uuid4().hex[:8]}")
    institution["created_at"] = datetime.utcnow().isoformat()
    institution["active"] = True
    data.append(institution)
    _save(data)
    return institution


def update(inst_id: str, updates: dict) -> Optional[dict]:
    data = _load()
    for i in data:
        if i["id"] == inst_id:
            i.update(updates)
            i["updated_at"] = datetime.utcnow().isoformat()
            _save(data)
            return i
    return None


def delete(inst_id: str) -> bool:
    data = _load()
    for i in data:
        if i["id"] == inst_id:
            i["active"] = False
            i["deactivated_at"] = datetime.utcnow().isoformat()
            _save(data)
            return True
    return False
