"""Router de scoring/calibración: ``POST /score-calibrado`` y ``POST /calibrar``.

Contrato (design.md, tabla de endpoints del ``Servicio_IA``):

- ``POST /score-calibrado``: ``{ entradaIndice }`` → ``{ score:[0..1], evidenciaIds[] }``
  (Req. 31.2, 31.7). El ``score`` está **garantizado en [0,1]** y acompañado de
  evidencia colectiva trazable; nunca diagnóstico individual.
- ``POST /calibrar``: ``{ referenciaCorpus }`` → ``{ version, metricas }``
  (Req. 31.3, 31.4, 36.4). Calibra la ``Capa_ML`` con el `Corpus_Longitudinal`
  dentro del propio ``Servicio_IA``.

El :class:`ScoringService` y el :class:`CalibrationService` se resuelven mediante
dependencias que los cachean en ``app.state`` (construidos una sola vez). En
pruebas se sustituyen con dobles deterministas vía ``app.dependency_overrides``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import (
    CalibrarRequest,
    CalibrarResponse,
    ScoreCalibradoRequest,
    ScoreCalibradoResponse,
)
from ..services import CalibrationService, ScoringService

router = APIRouter(tags=["scoring"])


def get_scoring_service(request: Request) -> ScoringService:
    """Provee el :class:`ScoringService`, cacheándolo en ``app.state``."""
    service: ScoringService | None = getattr(
        request.app.state, "scoring_service", None
    )
    if service is None:
        service = ScoringService()
        request.app.state.scoring_service = service
    return service


def get_calibration_service(request: Request) -> CalibrationService:
    """Provee el :class:`CalibrationService`, cacheándolo en ``app.state``."""
    service: CalibrationService | None = getattr(
        request.app.state, "calibration_service", None
    )
    if service is None:
        service = CalibrationService()
        request.app.state.calibration_service = service
    return service


@router.post("/score-calibrado", response_model=ScoreCalibradoResponse)
def post_score_calibrado(
    payload: ScoreCalibradoRequest,
    service: ScoringService = Depends(get_scoring_service),
) -> ScoreCalibradoResponse:
    """Calcula el score calibrado del Indice_Riesgo en [0,1] (colectivo, con evidencia)."""
    try:
        result = service.score(payload.entradaIndice)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    return ScoreCalibradoResponse(
        score=result.score,
        evidenciaIds=result.evidenciaIds,
    )


@router.post("/calibrar", response_model=CalibrarResponse)
def post_calibrar(
    payload: CalibrarRequest,
    service: CalibrationService = Depends(get_calibration_service),
) -> CalibrarResponse:
    """Calibra la Capa_ML con el Corpus_Longitudinal y devuelve version + metricas."""
    try:
        result = service.calibrar(payload.referenciaCorpus)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    return CalibrarResponse(version=result.version, metricas=result.metricas)
