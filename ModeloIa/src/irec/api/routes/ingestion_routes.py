from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/ingest", tags=["ingestion"])


class WeeklyDataPayload(BaseModel):
    """Payload for submitting a week's worth of new data."""
    records: list[dict]
    institution_name: Optional[str] = None
    zone: Optional[str] = None
    zone_range_km: Optional[float] = None


class AnalysisRequest(BaseModel):
    """Request to start a new analysis for specific communities."""
    institutions: list[str] = []          # ej: ["Universidad Nacional", "UTEC"]
    zones: list[str] = []                 # ej: ["Miraflores", "Centro"]
    zone_range_km: float = 5.0            # radio en km
    analysis_name: str = "analisis_1"     # nombre para guardar resultados


@router.post("/weekly")
async def ingest_weekly_data(payload: WeeklyDataPayload) -> dict:
    """Submit new weekly data for processing.

    Optionally filter by institution, zone, and range.
    """
    from src.irec.temporal.weekly_processor import ingest_new_week

    if not payload.records:
        raise HTTPException(status_code=400, detail="No records provided")

    # Filter records by community criteria
    filtered = _filter_by_community(
        payload.records,
        institution_name=payload.institution_name,
        zone=payload.zone,
        zone_range_km=payload.zone_range_km,
    )

    result = ingest_new_week(filtered if filtered else payload.records)
    result["filtering"] = {
        "institution": payload.institution_name,
        "zone": payload.zone,
        "range_km": payload.zone_range_km,
        "total_received": len(payload.records),
        "total_matched": len(filtered) if filtered else len(payload.records),
    }
    return result


@router.post("/start-analysis")
async def start_analysis(request: AnalysisRequest) -> dict:
    """Start a new analysis for specific communities with zone/range filters.

    From the frontend, the user selects:
    - institutions: which universities/colleges to monitor
    - zones: geographic zones to filter by
    - zone_range_km: radius in km for zone matching
    - analysis_name: label for this analysis run

    The system will:
    1. Start with existing data (or trigger generation if none)
    2. Filter records by institution + zone + range
    3. Run full pipeline on filtered data
    4. Return initial results
    """
    import json
    from pathlib import Path
    from src.irec.config import settings
    from src.irec.preprocessing import PreprocessingPipeline
    from src.irec.nlp import NLPPipeline
    from src.irec.vision import VisionPipeline
    from src.irec.community import CommunityPipeline
    from src.irec.risk import RiskPipeline

    # Load any available processed data
    processed_dir = settings.data_dir / "processed" / "nlp"
    all_records = []

    if processed_dir.exists():
        for f in sorted(processed_dir.glob("*_nlp.json")):
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                    all_records.extend(data.get("records", []))
            except Exception:
                continue

    # If no data, generate synthetic filtered data
    if not all_records:
        all_records = _generate_filtered_data(
            institutions=request.institutions,
            zones=request.zones,
            count=30,
        )

    # Filter by community criteria
    filtered = _filter_records_by_criteria(
        all_records,
        institutions=request.institutions,
        zones=request.zones,
        range_km=request.zone_range_km,
    )

    if not filtered:
        return {
            "status": "no_data",
            "message": "No records matched the criteria. Try broader filters or generate more data.",
            "filters_applied": {
                "institutions": request.institutions,
                "zones": request.zones,
                "range_km": request.zone_range_km,
            },
        }

    # Run full pipeline
    preproc = PreprocessingPipeline()
    clean = preproc.process_records(filtered)

    nlp = NLPPipeline()
    analyzed = nlp.analyze_batch(clean)

    vision = VisionPipeline()
    with_vision = vision.analyze_batch(analyzed)

    community_pipe = CommunityPipeline()
    with_community = community_pipe.analyze_batch(with_vision)

    # Tag with community info
    for rec in with_community:
        if not rec.get("community_institutions") and request.institutions:
            rec["community_institutions"] = [
                {"institution_id": f"frontend_{i}", "institution_name": i}
                for i in request.institutions
            ]
        if not rec.get("community_id"):
            rec["community_id"] = request.institutions[0] if request.institutions else "unknown"

    risk = RiskPipeline(window_days=7)
    irec_results = risk.analyze(with_community)

    return {
        "status": "completed",
        "analysis_name": request.analysis_name,
        "filters": {
            "institutions": request.institutions,
            "zones": request.zones,
            "range_km": request.zone_range_km,
        },
        "pipeline": {
            "total_received": len(all_records),
            "matched_by_filters": len(filtered),
            "clean_records": len(clean),
            "with_edu_context": community_pipe.stats.get("with_edu_context", 0),
            "high_association": community_pipe.stats.get("high_association", 0),
        },
        "irec": irec_results,
        "alerts": risk.stats["alerts_triggered"],
    }


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------

def _filter_by_community(
    records: list[dict],
    institution_name: Optional[str] = None,
    zone: Optional[str] = None,
    zone_range_km: Optional[float] = None,
) -> list[dict]:
    """Filter records by community criteria."""
    if not institution_name and not zone:
        return records

    filtered = []
    for rec in records:
        text = str(rec.get("text_content", "")).lower()

        # Institution filter
        inst_match = True
        if institution_name:
            inst_lower = institution_name.lower()
            inst_match = (
                inst_lower in text
                or any(inst_lower in str(h).lower() for h in rec.get("hashtags", []))
                or any(inst_lower in str(h).lower() for h in rec.get("community_hints", []))
            )

        # Zone filter
        zone_match = True
        if zone:
            zone_lower = zone.lower()
            zone_match = zone_lower in text

        if inst_match and zone_match:
            # Add filtering metadata
            rec["filtered_by_institution"] = institution_name
            rec["filtered_by_zone"] = zone
            filtered.append(rec)

    return filtered


def _filter_records_by_criteria(
    records: list[dict],
    institutions: list[str],
    zones: list[str],
    range_km: float = 5.0,
) -> list[dict]:
    """Filter records matching institution and/or zone criteria."""
    if not institutions and not zones:
        return records

    filtered = []
    for rec in records:
        text = str(rec.get("text_content", rec.get("cleaned_text", rec.get("anonymized_text", "")))).lower()
        hashtags = [str(h).lower() for h in rec.get("hashtags", [])]
        community_hints = [str(h).lower() for h in rec.get("community_hints", [])]
        community_institutions = [
            inst.get("institution_name", "").lower()
            for inst in rec.get("community_institutions", [])
        ]

        # Institution filter
        inst_match = not institutions  # True if no filter
        if institutions:
            for inst in institutions:
                inst_lower = inst.lower()
                if (
                    inst_lower in text
                    or any(inst_lower in h for h in hashtags)
                    or any(inst_lower in h for h in community_hints)
                    or any(inst_lower in ci for ci in community_institutions)
                ):
                    inst_match = True
                    break

        # Zone filter
        zone_match = not zones
        if zones:
            for zone in zones:
                zone_lower = zone.lower()
                if zone_lower in text or any(zone_lower in h for h in community_hints):
                    zone_match = True
                    break

        if inst_match and zone_match:
            filtered.append(rec)

    return filtered


def _generate_filtered_data(
    institutions: list[str],
    zones: list[str],
    count: int = 30,
) -> list[dict]:
    """Generate synthetic data biased toward specific institutions/zones with variety."""
    import random
    from datetime import datetime, timedelta

    records = []
    base_date = datetime.utcnow() - timedelta(days=7)
    institution = institutions[0] if institutions else "Universidad Nacional"
    zone = zones[0] if zones else "Campus Central"

    # Diverse templates with placeholders
    templates = [
        # Academic stress
        ("no puedo mas con los parciales de {carrera} en {inst}", ["estres_academico"]),
        ("llevo {n} dias sin dormir por las tareas de {inst}", ["estres_academico", "insomnio_cansancio"]),
        ("otra semana de examenes en {inst}, estoy {estado}", ["estres_academico", "examenes"]),
        ("siento que no voy a poder con este semestre en {inst}", ["estres_academico", "ansiedad_rendimiento"]),
        ("la presion en {inst} es demasiada, necesito un respiro", ["estres_academico"]),
        ("{carrera} me esta consumiendo, no se si pueda seguir", ["desmotivacion_academica"]),
        ("este semestre en {inst} esta imposible, muchas tareas", ["sobrecarga_tareas"]),
        ("no duermo por las entregas de {inst}, estoy agotado", ["estres_academico", "insomnio_cansancio"]),
        # Isolation
        ("me siento solo en {inst}, nadie me habla en clases", ["aislamiento_social", "soledad_aislamiento"]),
        ("no tengo amigos en {inst}, todos tienen sus grupos", ["aislamiento_social"]),
        ("cada dia es igual en {inst}, solo voy a clases y me voy", ["aislamiento_social"]),
        ("no encajo con nadie en mi facultad de {inst}", ["aislamiento_social"]),
        # Burnout
        ("estoy quemado con {inst}, ya no doy mas", ["agotamiento_emocional", "burnout_estudiantil"]),
        ("sin energia para seguir en {inst}, necesito vacaciones", ["agotamiento_emocional"]),
        ("el burnout en {inst} es real, todos estamos igual", ["agotamiento_emocional"]),
        # Economic
        ("la matricula de {inst} esta carisima, no se si pueda pagar", ["problemas_economicos"]),
        ("trabajo y estudio en {inst} y no alcanza el dinero", ["problemas_economicos"]),
        # Positive
        ("hoy me fue bien en el examen de {inst}, que alivio", ["esperanza"]),
        ("mis companeros de {inst} me ayudaron con el proyecto", ["apoyo_social"]),
        ("por fin entendi esa materia dificil en {inst}", ["esperanza"]),
        ("hoy fue un buen dia en {inst}, todo salio bien", []),
        ("me gusta mi carrera en {inst}, aunque a veces sea dificil", ["pertenencia"]),
        # General
        ("alguien mas en {inst} siente que este ciclo esta pesado", ["estres_academico"]),
        ("consejos para sobrevivir a parciales en {inst}", ["examenes"]),
        ("horarios de {inst} son un desastre este semestre", ["problemas_administrativos"]),
        ("el profesor de {carrera} en {inst} no explica nada", ["problemas_docentes"]),
        ("grupo de estudio para {carrera} en {inst}, alguien se une", ["apoyo_social"]),
        ("recomendaciones de cafeterias cerca de {inst} para estudiar", []),
        ("alguien sabe cuando son las inscripciones en {inst}", []),
        ("eventos culturales esta semana en {inst}", []),
    ]

    carreras = ["ingenieria", "medicina", "derecho", "psicologia", "arquitectura", "administracion", "sistemas", "contaduria"]
    estados = ["agotado", "desvelado", "estresado", "preocupado", "cansado", "saturado"]

    for i in range(count):
        template, risks = random.choice(templates)
        text = template.format(
            inst=institution,
            zona=zone,
            carrera=random.choice(carreras),
            n=random.randint(2, 7),
            estado=random.choice(estados),
        )
        text += f" cerca de {zone}"

        records.append({
            "text_content": text,
            "timestamp": (base_date + timedelta(hours=random.randint(0, 168))).isoformat(),
            "community_hints": [institution, zone],
            "hashtags": random.sample([
                f"#{institution.replace(' ', '')}", f"#{zone.replace(' ', '')}",
                "#universidad", "#estres", "#parciales", "#vidau", "#estudiantes",
                "#agotamiento", "#parciales", "#findesemana",
            ], k=random.randint(1, 3)),
            "pseudo_user_id": f"user_{random.randint(1000, 9999)}",
            "association_level": "high",
            "community_institutions": [
                {"institution_id": f"frontend_{institution}", "institution_name": institution}
            ],
        })

    return records


@router.get("/history")
async def get_history(weeks: int = 52) -> dict:
    """Get accumulated weekly history with chart data."""
    from src.irec.temporal.weekly_processor import get_weekly_history
    return get_weekly_history(limit=weeks)


@router.get("/status")
async def get_status() -> dict:
    """Get current processing status."""
    from src.irec.temporal.weekly_processor import load_history
    history = load_history()

    return {
        "active": history["started_at"] is not None,
        "started_at": history["started_at"],
        "weeks_processed": history["current_week"],
        "months_aggregated": len(history.get("months", [])),
        "total_records": history["total_records_processed"],
        "current_phase": (
            f"Semana {history['current_week']} - "
            f"{'Mes ' + str(len(history['months'])) if history['months'] else 'Primer mes en progreso'}"
        ),
    }


@router.get("/learning")
async def get_learning_state() -> dict:
    """Get the adaptive learning state (how the system has improved)."""
    from src.irec.risk.adaptive_learner import AdaptiveLearner
    learner = AdaptiveLearner()
    return learner.get_learning_summary()
