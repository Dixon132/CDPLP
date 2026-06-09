"""Pruebas del servicio de embeddings y del contrato de ``POST /embeddings``.

Cubre la tarea 6.1:

- contrato HTTP ``{ textos[], modelo }`` → ``{ vectores: number[][], modelo, dim }``;
- lógica del :class:`EmbeddingService` (modelo por defecto, dimensiones,
  validación de modelo, lista vacía);
- persistencia/lectura de la ``Memoria_Semantica`` vía
  :class:`PgVectorRepository` con una conexión doble (sin PostgreSQL real).

Todo usa **dobles deterministas** del codificador y de la conexión, coherente
con el harness (sin descargar pesos ni usar GPU). El contrato amplio de routers
es la tarea 6.8 y la PBT de acumulación es la 6.11.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.repositories.pgvector_repo import (
    EmbeddingRecord,
    PgVectorRepository,
    SimilarityResult,
)
from app.routers.embeddings import (
    get_embedding_service,
    get_memoria_semantica_repo,
)
from app.services.embedding_service import EmbeddingResult, EmbeddingService

# --- Dobles deterministas ---------------------------------------------------
TEST_MODEL = "test-double/tiny-embedding"
TEST_DIM = 8


class _TinyEncoder:
    """Codificador doble: vectores deterministas de dimensión fija, sin pesos."""

    def __init__(self, dim: int = TEST_DIM) -> None:
        self._dim = dim

    def encode(self, textos: list[str]) -> list[list[float]]:
        vectores: list[list[float]] = []
        for texto in textos:
            base = sum(ord(ch) for ch in texto)
            vectores.append([float((base + i) % 13) / 13.0 for i in range(self._dim)])
        return vectores


def _make_service() -> EmbeddingService:
    """Servicio de embeddings con el codificador doble y el modelo de prueba."""
    return EmbeddingService(
        default_model=TEST_MODEL,
        encoder_factory=lambda name: _TinyEncoder(TEST_DIM),
        dimensions={TEST_MODEL: TEST_DIM},
    )


# --- Lógica del EmbeddingService -------------------------------------------
@pytest.mark.smoke
def test_embed_returns_one_vector_per_text_with_declared_dim() -> None:
    service = _make_service()
    result = service.embed(["hola", "mundo", "gds"])
    assert isinstance(result, EmbeddingResult)
    assert result.modelo == TEST_MODEL
    assert result.dim == TEST_DIM
    assert len(result.vectores) == 3
    assert all(len(v) == TEST_DIM for v in result.vectores)


@pytest.mark.smoke
def test_embed_is_deterministic() -> None:
    service = _make_service()
    assert service.embed(["repetible"]).vectores == service.embed(["repetible"]).vectores


@pytest.mark.smoke
def test_embed_empty_list_returns_no_vectors_but_declared_dim() -> None:
    service = _make_service()
    result = service.embed([])
    assert result.vectores == []
    assert result.dim == TEST_DIM
    assert result.modelo == TEST_MODEL


@pytest.mark.smoke
def test_unsupported_model_raises_value_error() -> None:
    service = _make_service()
    with pytest.raises(ValueError):
        service.embed(["x"], modelo="modelo/inexistente")


@pytest.mark.smoke
def test_default_models_have_expected_dimensions() -> None:
    # El servicio real declara bge-m3 (1024, primario), bge-large (1024) y MiniLM (384).
    service = EmbeddingService(encoder_factory=lambda name: _TinyEncoder())
    assert service.dimension_for("BAAI/bge-m3") == 1024
    assert service.dimension_for("BAAI/bge-large-en-v1.5") == 1024
    assert service.dimension_for("all-MiniLM-L6-v2") == 384


# --- Contrato HTTP de POST /embeddings -------------------------------------
@pytest.fixture
def embeddings_client(app: FastAPI) -> TestClient:
    """``TestClient`` con el servicio de embeddings doble inyectado."""
    app.dependency_overrides[get_embedding_service] = _make_service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_embedding_service, None)


@pytest.mark.contract
def test_post_embeddings_returns_contract_shape(embeddings_client: TestClient) -> None:
    response = embeddings_client.post(
        "/embeddings", json={"textos": ["alfa", "beta"], "modelo": TEST_MODEL}
    )
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"vectores", "modelo", "dim"}
    assert body["modelo"] == TEST_MODEL
    assert body["dim"] == TEST_DIM
    assert isinstance(body["vectores"], list)
    assert len(body["vectores"]) == 2
    assert all(isinstance(v, list) and len(v) == TEST_DIM for v in body["vectores"])
    assert all(isinstance(x, float) for v in body["vectores"] for x in v)


@pytest.mark.contract
def test_post_embeddings_uses_default_model_when_omitted(
    embeddings_client: TestClient,
) -> None:
    response = embeddings_client.post("/embeddings", json={"textos": ["solo"]})
    assert response.status_code == 200
    body = response.json()
    assert body["modelo"] == TEST_MODEL
    assert len(body["vectores"]) == 1


@pytest.mark.contract
def test_post_embeddings_rejects_unsupported_model(
    embeddings_client: TestClient,
) -> None:
    response = embeddings_client.post(
        "/embeddings", json={"textos": ["x"], "modelo": "no/existe"}
    )
    assert response.status_code == 400


# --- Repositorio pgvector (Memoria_Semantica) con conexión doble ------------
class _FakeCursor:
    def __init__(self, store: list[tuple]) -> None:
        self._store = store
        self._result: list[tuple] = []

    def __enter__(self) -> "_FakeCursor":
        return self

    def __exit__(self, *exc) -> None:
        return None

    def executemany(self, sql: str, params) -> None:
        self._store.extend(params)

    def execute(self, sql: str, params) -> None:
        if sql.startswith("SELECT COUNT"):
            self._result = [(len(self._store),)]
        else:
            self._result = list(self._store)

    def fetchall(self) -> list[tuple]:
        return self._result

    def fetchone(self):
        return self._result[0] if self._result else None


class _FakeConnection:
    def __init__(self, store: list[tuple]) -> None:
        self._store = store
        self.committed = False
        self.closed = False

    def cursor(self) -> _FakeCursor:
        return _FakeCursor(self._store)

    def commit(self) -> None:
        self.committed = True

    def close(self) -> None:
        self.closed = True


@pytest.mark.smoke
def test_pgvector_repo_saves_and_counts_accumulating() -> None:
    store: list[tuple] = []
    repo = PgVectorRepository(
        "postgresql://test:test@localhost:5432/test",
        connection_factory=lambda url: _FakeConnection(store),
    )

    saved = repo.save(
        [
            EmbeddingRecord(
                vector=[0.1] * TEST_DIM,
                modelo=TEST_MODEL,
                dim=TEST_DIM,
                ref_contenido="frag-1",
                analisis_id="a1",
                comunidad_id="c1",
                numero_semana=1,
            )
        ]
    )
    assert saved == 1
    assert repo.count() == 1

    # Acumula sin borrar los previos (Req. 36.2).
    repo.save(
        [
            EmbeddingRecord(
                vector=[0.2] * TEST_DIM,
                modelo=TEST_MODEL,
                dim=TEST_DIM,
                ref_contenido="frag-2",
                analisis_id="a1",
                numero_semana=2,
            )
        ]
    )
    assert repo.count() == 2


@pytest.mark.smoke
def test_pgvector_repo_fetch_round_trips_record_fields() -> None:
    store: list[tuple] = []
    repo = PgVectorRepository(
        "postgresql://test:test@localhost:5432/test",
        connection_factory=lambda url: _FakeConnection(store),
    )
    record = EmbeddingRecord(
        vector=[0.5] * TEST_DIM,
        modelo=TEST_MODEL,
        dim=TEST_DIM,
        ref_contenido="frag-x",
        analisis_id="a9",
        comunidad_id="c9",
        institucion_id="i9",
        resultado_id="r9",
        numero_semana=7,
    )
    repo.save([record])

    fetched = repo.fetch()
    assert len(fetched) == 1
    got = fetched[0]
    assert got.id == record.id
    assert got.analisis_id == "a9"
    assert got.comunidad_id == "c9"
    assert got.institucion_id == "i9"
    assert got.resultado_id == "r9"
    assert got.numero_semana == 7
    assert got.ref_contenido == "frag-x"
    assert got.modelo == TEST_MODEL
    assert got.dim == TEST_DIM
    assert got.vector == [0.5] * TEST_DIM


@pytest.mark.smoke
def test_pgvector_repo_save_empty_is_noop() -> None:
    repo = PgVectorRepository(
        "postgresql://test:test@localhost:5432/test",
        connection_factory=lambda url: _FakeConnection([]),
    )
    assert repo.save([]) == 0


# --- Embeddings_Search: repositorio (similitud + orden, tarea 6.2) ----------
def _record(
    rid: str,
    vector: list[float],
    *,
    ref: str,
    semana: int | None = None,
    analisis_id: str | None = None,
    comunidad_id: str | None = None,
) -> EmbeddingRecord:
    return EmbeddingRecord(
        id=rid,
        vector=vector,
        modelo=TEST_MODEL,
        dim=len(vector),
        ref_contenido=ref,
        numero_semana=semana,
        analisis_id=analisis_id,
        comunidad_id=comunidad_id,
    )


def _seeded_repo(records: list[EmbeddingRecord]) -> PgVectorRepository:
    store: list[tuple] = []
    repo = PgVectorRepository(
        "postgresql://test:test@localhost:5432/test",
        connection_factory=lambda url: _FakeConnection(store),
    )
    repo.save(records)
    return repo


@pytest.mark.smoke
def test_search_orders_by_descending_similarity() -> None:
    # Vector de consulta alineado con r-near y opuesto a r-far.
    near = [1.0, 0.0, 0.0, 0.0]
    mid = [1.0, 1.0, 0.0, 0.0]
    far = [-1.0, 0.0, 0.0, 0.0]
    repo = _seeded_repo(
        [
            _record("r-far", far, ref="frag-far"),
            _record("r-near", near, ref="frag-near"),
            _record("r-mid", mid, ref="frag-mid"),
        ]
    )

    resultados = repo.search([1.0, 0.0, 0.0, 0.0], k=3)

    assert [r.record.id for r in resultados] == ["r-near", "r-mid", "r-far"]
    # Similitud estrictamente decreciente y dentro del rango [-1, 1].
    sims = [r.similitud for r in resultados]
    assert sims == sorted(sims, reverse=True)
    assert all(-1.0 <= s <= 1.0 for s in sims)
    assert resultados[0].similitud == pytest.approx(1.0)


@pytest.mark.smoke
def test_search_respects_top_k_limit() -> None:
    repo = _seeded_repo(
        [
            _record("a", [1.0, 0.0], ref="fa"),
            _record("b", [0.9, 0.1], ref="fb"),
            _record("c", [0.0, 1.0], ref="fc"),
        ]
    )
    resultados = repo.search([1.0, 0.0], k=2)
    assert len(resultados) == 2
    assert resultados[0].record.id == "a"


@pytest.mark.smoke
def test_search_non_positive_k_returns_empty() -> None:
    repo = _seeded_repo([_record("a", [1.0, 0.0], ref="fa")])
    assert repo.search([1.0, 0.0], k=0) == []


# --- Contrato HTTP de POST /embeddings/search -------------------------------
class _FakeMemoriaRepo:
    """Repositorio doble en memoria para el contrato de ``/embeddings/search``.

    Calcula similitud coseno, filtra por análisis/comunidad y ordena
    descendente, sin tocar PostgreSQL ni pgvector.
    """

    def __init__(self, records: list[EmbeddingRecord]) -> None:
        self._records = list(records)
        self.last_query: list[float] | None = None
        self.last_filtro: tuple[str | None, str | None] | None = None

    def search(
        self,
        query_vector,
        *,
        k: int = 5,
        analisis_id: str | None = None,
        comunidad_id: str | None = None,
    ) -> list[SimilarityResult]:
        self.last_query = list(query_vector)
        self.last_filtro = (analisis_id, comunidad_id)
        candidatos = [
            r
            for r in self._records
            if (analisis_id is None or r.analisis_id == analisis_id)
            and (comunidad_id is None or r.comunidad_id == comunidad_id)
        ]

        def _cos(a: list[float], b: list[float]) -> float:
            dot = sum(x * y for x, y in zip(a, b))
            na = sum(x * x for x in a) ** 0.5
            nb = sum(y * y for y in b) ** 0.5
            return dot / (na * nb) if na and nb else 0.0

        scored = [
            SimilarityResult(record=r, similitud=_cos(self.last_query, r.vector))
            for r in candidatos
        ]
        scored.sort(key=lambda s: (-s.similitud, s.record.id))
        return scored[:k]


_SEARCH_RECORDS = [
    EmbeddingRecord(
        id="near",
        vector=[1.0, 0.0],
        modelo=TEST_MODEL,
        dim=2,
        ref_contenido="frag-cercano",
        numero_semana=3,
        analisis_id="a1",
        comunidad_id="c1",
    ),
    EmbeddingRecord(
        id="far",
        vector=[0.0, 1.0],
        modelo=TEST_MODEL,
        dim=2,
        ref_contenido="frag-lejano",
        numero_semana=2,
        analisis_id="a1",
        comunidad_id="c2",
    ),
]


@pytest.fixture
def search_client(app: FastAPI) -> TestClient:
    """``TestClient`` con servicio de embeddings y repo de memoria dobles."""
    fake_repo = _FakeMemoriaRepo(_SEARCH_RECORDS)
    app.dependency_overrides[get_embedding_service] = _make_service
    app.dependency_overrides[get_memoria_semantica_repo] = lambda: fake_repo
    with TestClient(app) as test_client:
        test_client.fake_repo = fake_repo  # type: ignore[attr-defined]
        yield test_client
    app.dependency_overrides.pop(get_embedding_service, None)
    app.dependency_overrides.pop(get_memoria_semantica_repo, None)


@pytest.mark.contract
def test_search_with_vector_returns_contract_shape_ordered(
    search_client: TestClient,
) -> None:
    response = search_client.post(
        "/embeddings/search",
        json={"vectorConsulta": [1.0, 0.0], "k": 5, "filtro": {"analisisId": "a1"}},
    )
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"resultados"}
    assert isinstance(body["resultados"], list)
    assert len(body["resultados"]) == 2
    primero = body["resultados"][0]
    assert set(primero.keys()) == {"refId", "similitud", "refContenido", "semana"}
    # Ordenado por similitud descendente: el vector alineado va primero.
    assert primero["refId"] == "near"
    sims = [r["similitud"] for r in body["resultados"]]
    assert sims == sorted(sims, reverse=True)


@pytest.mark.contract
def test_search_with_texto_embeds_query_first(search_client: TestClient) -> None:
    response = search_client.post(
        "/embeddings/search",
        json={"texto": "hola comunidad", "k": 1},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["resultados"]) == 1
    # El texto se vectorizó (dim del modelo doble) antes de buscar.
    assert search_client.fake_repo.last_query is not None
    assert len(search_client.fake_repo.last_query) == TEST_DIM


@pytest.mark.contract
def test_search_filters_by_comunidad(search_client: TestClient) -> None:
    response = search_client.post(
        "/embeddings/search",
        json={"vectorConsulta": [1.0, 0.0], "filtro": {"comunidadId": "c2"}},
    )
    assert response.status_code == 200
    body = response.json()
    assert [r["refId"] for r in body["resultados"]] == ["far"]
    assert search_client.fake_repo.last_filtro == (None, "c2")


@pytest.mark.contract
def test_search_requires_vector_or_texto(search_client: TestClient) -> None:
    response = search_client.post("/embeddings/search", json={"k": 3})
    assert response.status_code == 422
