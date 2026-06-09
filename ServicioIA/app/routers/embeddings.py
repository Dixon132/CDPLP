"""Router de embeddings: ``POST /embeddings``.

Contrato (design.md): petición ``{ textos[], modelo }`` → respuesta
``{ vectores: number[][], modelo, dim }`` (Req. 31.2, 36.1).

El :class:`EmbeddingService` se resuelve mediante una dependencia que lo lee de
``app.state`` (construyéndolo una sola vez y reutilizando el codificador real de
Sentence Transformers). En pruebas se sustituye con un doble determinista vía
``app.dependency_overrides`` sobre :func:`get_embedding_service`.

``POST /embeddings/search`` (Embeddings_Search) es la tarea 6.2 y se añade a
este mismo router por separado.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import (
    EmbeddingsRequest,
    EmbeddingsResponse,
    EmbeddingsSearchRequest,
    EmbeddingsSearchResponse,
    ResultadoSimilitud,
)
from ..repositories.pgvector_repo import (
    MemoriaSemanticaRepository,
    PgVectorRepository,
)
from ..services import EmbeddingService

router = APIRouter(tags=["embeddings"])


def get_embedding_service(request: Request) -> EmbeddingService:
    """Provee el :class:`EmbeddingService`, cacheándolo en ``app.state``.

    En producción construye el servicio con el codificador real (carga perezosa
    de Sentence Transformers). Las pruebas inyectan un doble determinista
    sobreescribiendo esta dependencia.
    """
    service: EmbeddingService | None = getattr(
        request.app.state, "embedding_service", None
    )
    if service is None:
        service = EmbeddingService()
        request.app.state.embedding_service = service
    return service


def get_memoria_semantica_repo(request: Request) -> MemoriaSemanticaRepository:
    """Provee el repositorio de ``Memoria_Semantica`` (``pgvector``).

    Lo construye una sola vez a partir del ``DATABASE_URL`` de los settings y lo
    cachea en ``app.state``. Las pruebas inyectan un repositorio doble (en
    memoria) sobreescribiendo esta dependencia.
    """
    repo: MemoriaSemanticaRepository | None = getattr(
        request.app.state, "memoria_semantica_repo", None
    )
    if repo is None:
        settings = getattr(request.app.state, "settings", None)
        database_url = getattr(settings, "database_url", None) if settings else None
        repo = PgVectorRepository(database_url or "postgresql://localhost/gds")
        request.app.state.memoria_semantica_repo = repo
    return repo


@router.post("/embeddings", response_model=EmbeddingsResponse)
def post_embeddings(
    payload: EmbeddingsRequest,
    service: EmbeddingService = Depends(get_embedding_service),
) -> EmbeddingsResponse:
    """Genera embeddings de ``textos`` con ``modelo`` (o el primario por defecto)."""
    try:
        result = service.embed(payload.textos, modelo=payload.modelo)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    return EmbeddingsResponse(
        vectores=result.vectores,
        modelo=result.modelo,
        dim=result.dim,
    )


@router.post("/embeddings/search", response_model=EmbeddingsSearchResponse)
def post_embeddings_search(
    payload: EmbeddingsSearchRequest,
    service: EmbeddingService = Depends(get_embedding_service),
    repo: MemoriaSemanticaRepository = Depends(get_memoria_semantica_repo),
) -> EmbeddingsSearchResponse:
    """``Embeddings_Search``: recupera contexto por similitud vectorial.

    Si se entrega ``vectorConsulta`` se usa directamente; si se entrega
    ``texto``, se vectoriza con :class:`EmbeddingService` antes de buscar. La
    recuperación se filtra por ``analisisId``/``comunidadId`` y se devuelve
    ordenada por similitud descendente, solo con resultados colectivos (sin
    diagnóstico individual) (Req. 36.3, 36.6, 39.4).
    """
    if payload.vectorConsulta:
        query_vector = payload.vectorConsulta
    else:
        try:
            embedded = service.embed([payload.texto or ""], modelo=payload.modelo)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
            ) from exc
        query_vector = embedded.vectores[0] if embedded.vectores else []

    resultados = repo.search(
        query_vector,
        k=payload.k,
        analisis_id=payload.filtro.analisisId,
        comunidad_id=payload.filtro.comunidadId,
    )

    return EmbeddingsSearchResponse(
        resultados=[
            ResultadoSimilitud(
                refId=item.record.id,
                similitud=item.similitud,
                refContenido=item.record.ref_contenido,
                semana=item.record.numero_semana,
            )
            for item in resultados
        ]
    )
