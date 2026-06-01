from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse

from src.irec.config import settings
from src.irec.schemas.analysis import AnalysisCreate, AnalysisUpdate

router = APIRouter(prefix="/api/analyses", tags=["analyses"])

ANALYSES_FILE = settings.data_dir / "analytics" / "analyses_history.json"
ANALYSIS_LOGS_DIR = settings.data_dir / "analytics" / "logs"


def _load_analyses() -> list[dict]:
    if ANALYSES_FILE.exists():
        with open(ANALYSES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_analyses(data: list[dict]) -> None:
    ANALYSES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ANALYSES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)


def _log_analysis(analysis_id: str, message: str, step: str = "info") -> None:
    ANALYSIS_LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = ANALYSIS_LOGS_DIR / f"{analysis_id}.json"
    
    logs = []
    if log_file.exists():
        with open(log_file, "r", encoding="utf-8") as f:
            logs = json.load(f)
    
    logs.append({
        "timestamp": datetime.utcnow().isoformat(),
        "step": step,
        "message": message,
    })
    
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)


@router.get("")
async def list_analyses() -> dict:
    analyses = _load_analyses()
    return {
        "count": len(analyses),
        "analyses": sorted(analyses, key=lambda a: a.get("created_at", ""), reverse=True),
    }


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str) -> dict:
    for a in _load_analyses():
        if a["id"] == analysis_id:
            return a
    raise HTTPException(status_code=404, detail="Analysis not found")


@router.post("")
async def save_analysis(payload: AnalysisCreate) -> dict:
    analyses = _load_analyses()
    analysis = {
        "id": str(uuid.uuid4())[:8],
        "name": payload.name,
        "description": payload.description,
        "status": "created",
        "institution_ids": payload.institution_ids,
        "radius_km": payload.radius_km,
        "date_range_start": payload.date_range_start,
        "date_range_end": payload.date_range_end,
        "mode": payload.mode,
        "analysis_type": payload.analysis_type,
        "platforms": payload.platforms,
        "irec_value": 0.0,
        "irec_level": "sin_tendencia",
        "pipeline_metrics": {},
        "result_data": {},
        "created_at": datetime.utcnow().isoformat(),
        "started_at": None,
        "completed_at": None,
        "error_message": None,
    }
    analyses.append(analysis)
    _save_analyses(analyses)
    _log_analysis(analysis["id"], "Análisis creado", "created")
    return analysis


@router.put("/{analysis_id}")
async def update_analysis(analysis_id: str, payload: AnalysisUpdate) -> dict:
    analyses = _load_analyses()
    for i, a in enumerate(analyses):
        if a["id"] == analysis_id:
            update_data = payload.dict(exclude_unset=True)
            
            if a["status"] not in ["created", "configured"]:
                for key in ["institution_ids", "radius_km", "date_range_start", 
                           "date_range_end", "mode", "analysis_type", "platforms"]:
                    update_data.pop(key, None)
            
            for key, value in update_data.items():
                a[key] = value
            
            a["updated_at"] = datetime.utcnow().isoformat()
            _save_analyses(analyses)
            return a
    raise HTTPException(status_code=404, detail="Analysis not found")


@router.post("/{analysis_id}/start")
async def start_analysis(analysis_id: str, background_tasks: BackgroundTasks) -> dict:
    analyses = _load_analyses()
    analysis = None
    
    for a in analyses:
        if a["id"] == analysis_id:
            analysis = a
            break
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    if analysis["status"] not in ["created", "configured"]:
        raise HTTPException(status_code=400, detail="Analysis cannot be started from current state")
    
    analysis["status"] = "running"
    analysis["started_at"] = datetime.utcnow().isoformat()
    _save_analyses(analyses)
    _log_analysis(analysis_id, "Ejecución iniciada", "started")
    
    background_tasks.add_task(run_pipeline, analysis_id)
    
    return {"status": "started", "analysis_id": analysis_id}


async def run_pipeline(analysis_id: str) -> None:
    import asyncio
    
    try:
        _log_analysis(analysis_id, "Iniciando pipeline", "pipeline")
        
        steps = [
            ("generate", "Generando datos"),
            ("ingest", "Ingesta y normalización"),
            ("clean", "Limpieza y anonimización"),
            ("nlp", "Análisis NLP"),
            ("vision", "Visión computacional"),
            ("community", "Asociación comunitaria"),
            ("irec", "Cálculo IREC"),
        ]
        
        for step_key, step_label in steps:
            _log_analysis(analysis_id, f"Iniciando: {step_label}", step_key)
            await asyncio.sleep(3)
            _log_analysis(analysis_id, f"Completado: {step_label}", step_key)
        
        analyses = _load_analyses()
        for a in analyses:
            if a["id"] == analysis_id:
                a["status"] = "completed"
                a["completed_at"] = datetime.utcnow().isoformat()
                a["irec_value"] = 62.5
                a["irec_level"] = "moderada"
                a["pipeline_metrics"] = {
                    "total_received": 1250,
                    "matched_by_filters": 890,
                    "clean_records": 845,
                    "with_edu_context": 623,
                    "high_association": 412,
                }
                a["result_data"] = {
                    "irec": [{
                        "irec_value": 62.5,
                        "irec_level": "moderada",
                        "breakdown": {
                            "stress_score": 18.5,
                            "burnout_score": 15.2,
                            "anxiety_score": 12.8,
                            "hopelessness_score": 8.5,
                            "isolation_score": 7.5,
                        },
                        "explanation": "Nivel moderado de riesgo emocional detectado. Estrés académico es el factor predominante."
                    }],
                }
                break
        
        _save_analyses(analyses)
        _log_analysis(analysis_id, "Pipeline completado exitosamente", "completed")
        
    except Exception as e:
        _log_analysis(analysis_id, f"Error: {str(e)}", "error")
        analyses = _load_analyses()
        for a in analyses:
            if a["id"] == analysis_id:
                a["status"] = "error"
                a["error_message"] = str(e)
                break
        _save_analyses(analyses)


@router.post("/{analysis_id}/stop")
async def stop_analysis(analysis_id: str) -> dict:
    analyses = _load_analyses()
    for a in analyses:
        if a["id"] == analysis_id:
            if a["status"] != "running":
                raise HTTPException(status_code=400, detail="Analysis is not running")
            a["status"] = "stopped"
            _save_analyses(analyses)
            _log_analysis(analysis_id, "Análisis detenido por el usuario", "stopped")
            return {"status": "stopped", "analysis_id": analysis_id}
    raise HTTPException(status_code=404, detail="Analysis not found")


@router.get("/{analysis_id}/logs")
async def stream_logs(analysis_id: str):
    async def event_generator():
        import asyncio
        
        last_index = 0
        while True:
            log_file = ANALYSIS_LOGS_DIR / f"{analysis_id}.json"
            
            if log_file.exists():
                with open(log_file, "r", encoding="utf-8") as f:
                    logs = json.load(f)
                
                if len(logs) > last_index:
                    for log in logs[last_index:]:
                        yield f"data: {json.dumps(log)}\n\n"
                    last_index = len(logs)
            
            analyses = _load_analyses()
            analysis = next((a for a in analyses if a["id"] == analysis_id), None)
            
            if analysis and analysis["status"] in ["completed", "error", "stopped"]:
                break
            
            await asyncio.sleep(1)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: str) -> dict:
    analyses = _load_analyses()
    filtered = [a for a in analyses if a["id"] != analysis_id]
    _save_analyses(filtered)
    
    log_file = ANALYSIS_LOGS_DIR / f"{analysis_id}.json"
    if log_file.exists():
        log_file.unlink()
    
    return {"status": "deleted", "id": analysis_id}
