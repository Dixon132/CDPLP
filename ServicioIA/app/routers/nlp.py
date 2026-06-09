"""Router de NLP: ``POST /nlp``.

Contrato (design.md): petición ``{ contenido[] }`` (texto **anonimizado** y
**contributivo**) → respuesta ``{ semantico, emocion, temas[], entidades[],
causas[], eventos[], tendenciasTexto }`` (Req. 14.1–14.4).

El :class:`NlpService` se resuelve mediante una dependencia que lo cachea en
``app.state``. En producción construye el servicio con el analizador real
(Transformers + spaCy + NLTK, carga perezosa). Las pruebas inyectan un doble
determinista sobreescribiendo :func:`get_nlp_service` vía
``app.dependency_overrides`` (sin descargar pesos ni usar GPU).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import (
    ConversacionalNLP,
    EmocionNLP,
    EntidadNLP,
    NlpRequest,
    NlpResponse,
    SemanticoNLP,
    TemaNLP,
)
from ..services import NlpService

router = APIRouter(tags=["nlp"])


def get_nlp_service(request: Request) -> NlpService:
    """Provee el :class:`NlpService`, cacheándolo en ``app.state``."""
    service: NlpService | None = getattr(request.app.state, "nlp_service", None)
    if service is None:
        service = NlpService()
        request.app.state.nlp_service = service
    return service


@router.post("/nlp", response_model=NlpResponse)
def post_nlp(
    payload: NlpRequest,
    service: NlpService = Depends(get_nlp_service),
) -> NlpResponse:
    """Analiza ``contenido`` contributivo y devuelve el resultado NLP colectivo."""
    try:
        result = service.analizar(payload.contenido)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    return NlpResponse(
        semantico=SemanticoNLP(
            resumen=result.semantico.resumen,
            terminosClave=result.semantico.terminosClave,
            conversacional=ConversacionalNLP(
                numIntervenciones=result.semantico.conversacional.numIntervenciones,
                longitudPromedio=result.semantico.conversacional.longitudPromedio,
                diversidadLexica=result.semantico.conversacional.diversidadLexica,
            ),
        ),
        emocion=EmocionNLP(
            etiqueta=result.emocion.etiqueta,
            puntuacion=result.emocion.puntuacion,
            distribucion=result.emocion.distribucion,
        ),
        temas=[
            TemaNLP(etiqueta=t.etiqueta, peso=t.peso, miembros=t.miembros)
            for t in result.temas
        ],
        entidades=[
            EntidadNLP(texto=e.texto, tipo=e.tipo) for e in result.entidades
        ],
        causas=result.causas,
        eventos=result.eventos,
        tendenciasTexto=result.tendenciasTexto,
    )
