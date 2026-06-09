# Feature: analisis-tendencias-riesgo-emocional, Property 42: Acumulación de la Memoria_Semantica y recuperación ordenada por similitud
"""PBT de la Property 42 — acumulación monotónica y recuperación ordenada.

Tarea 6.11. Valida, sobre el :class:`PgVectorRepository` con una **conexión en
memoria doble** (sin PostgreSQL/pgvector reales), las tres garantías de la
``Memoria_Semantica`` para *cualquier* secuencia de `Semana_Simulada` cerradas:

1. **Acumulación monotónica** (Req. 36.2): guardar más `EmbeddingRecord` nunca
   reduce el ``count()`` ni elimina vectores previos; el corpus crece de forma
   monotónica y conserva todos los ``id`` ya almacenados.
2. **Trazabilidad** (Req. 36.5): cada vector almacenado conserva intactas sus
   referencias trazables (``analisis_id``/``comunidad_id``/``institucion_id``/
   ``resultado_id``/``numero_semana`` y ``ref_contenido``).
3. **Orden por similitud descendente** (Req. 36.6, 39.4): toda consulta de
   ``Embeddings_Search`` devuelve resultados ordenados por similitud de mayor a
   menor, dentro del rango ``[-1, 1]``.

Validates: Requirements 36.1, 36.2, 36.5, 36.6, 39.4

Property 42: Acumulación de la Memoria_Semantica y recuperación ordenada por similitud.

Todo es determinista (sin pesos reales ni GPU), coherente con el harness y los
perfiles deterministas de Hypothesis registrados en ``conftest.py``.
"""

from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.repositories.pgvector_repo import EmbeddingRecord, PgVectorRepository

# Dimensión pequeña fija para mantener las pruebas baratas y deterministas.
DIM = 4
TEST_MODEL = "test-double/tiny-embedding"
DB_URL = "postgresql://test:test@localhost:5432/test"


# --- Conexión en memoria doble (sin PostgreSQL ni pgvector) -----------------
class _FakeCursor:
    """Cursor doble: traduce el SQL del repo a operaciones sobre una lista."""

    def __init__(self, store: list[tuple]) -> None:
        self._store = store
        self._result: list[tuple] = []

    def __enter__(self) -> "_FakeCursor":
        return self

    def __exit__(self, *exc) -> None:
        return None

    def executemany(self, sql: str, params) -> None:
        # INSERT acumulativo: añade sin borrar lo previo (Req. 36.2).
        self._store.extend(params)

    def execute(self, sql: str, params) -> None:
        if sql.startswith("SELECT COUNT"):
            rows = self._filtered(sql, params)
            self._result = [(len(rows),)]
        else:
            self._result = self._filtered(sql, params)

    def _filtered(self, sql: str, params) -> list[tuple]:
        """Aplica los filtros WHERE analisis_id/comunidad_id que arma el repo."""
        rows = list(self._store)
        if "WHERE" not in sql:
            return rows
        valores = list(params)
        # El repo emite las cláusulas en orden: analisis_id, luego comunidad_id.
        if "analisis_id = %s" in sql:
            analisis_id = valores.pop(0)
            rows = [r for r in rows if r[1] == analisis_id]
        if "comunidad_id = %s" in sql:
            comunidad_id = valores.pop(0)
            rows = [r for r in rows if r[2] == comunidad_id]
        return rows

    def fetchall(self) -> list[tuple]:
        return self._result

    def fetchone(self):
        return self._result[0] if self._result else None


class _FakeConnection:
    """Conexión doble en memoria que persiste filas en una lista compartida."""

    def __init__(self, store: list[tuple]) -> None:
        self._store = store

    def cursor(self) -> _FakeCursor:
        return _FakeCursor(self._store)

    def commit(self) -> None:
        return None

    def close(self) -> None:
        return None


def _make_repo() -> PgVectorRepository:
    """Repositorio real con conexión doble en memoria (estado por instancia)."""
    store: list[tuple] = []
    return PgVectorRepository(DB_URL, connection_factory=lambda url: _FakeConnection(store))


# --- Estrategias inteligentes del espacio de entrada ------------------------
# Componentes de vector finitos y de magnitud moderada (evita NaN/inf y
# subnormales que distorsionarían la similitud coseno).
_componentes = st.floats(
    allow_nan=False,
    allow_infinity=False,
    min_value=-100.0,
    max_value=100.0,
    allow_subnormal=False,
)

_vectores = st.lists(_componentes, min_size=DIM, max_size=DIM)

# Referencias trazables: identificadores cortos opcionales y semana acotada.
_ref_id = st.none() | st.text(min_size=1, max_size=8)


@st.composite
def _registros(draw: st.DrawFn) -> EmbeddingRecord:
    """Genera un `EmbeddingRecord` con vector de dimensión fija y refs trazables."""
    return EmbeddingRecord(
        vector=draw(_vectores),
        modelo=TEST_MODEL,
        dim=DIM,
        ref_contenido=draw(st.text(min_size=1, max_size=16)),
        analisis_id=draw(_ref_id),
        comunidad_id=draw(_ref_id),
        institucion_id=draw(_ref_id),
        resultado_id=draw(_ref_id),
        numero_semana=draw(st.none() | st.integers(min_value=1, max_value=520)),
    )


# Secuencia de "semanas cerradas": cada elemento es el lote de embeddings de una
# `Semana_Simulada`. Al menos una semana; las semanas pueden ser lotes vacíos.
_secuencia_semanas = st.lists(
    st.lists(_registros(), min_size=0, max_size=4),
    min_size=1,
    max_size=5,
)


# --- Property 42 ------------------------------------------------------------
@pytest.mark.property
@given(semanas=_secuencia_semanas)
def test_acumulacion_monotonica_conserva_vectores_previos(
    semanas: list[list[EmbeddingRecord]],
) -> None:
    """Req. 36.2: el corpus crece monotónicamente y nunca borra vectores previos."""
    repo = _make_repo()

    conteo_previo = 0
    ids_previos: set[str] = set()
    total_esperado = 0

    for lote in semanas:
        guardados = repo.save(lote)
        assert guardados == len(lote)
        total_esperado += len(lote)

        conteo_actual = repo.count()
        # Monotónico: nunca decrece y refleja el acumulado total.
        assert conteo_actual >= conteo_previo
        assert conteo_actual == total_esperado

        # No se elimina ningún vector previamente almacenado.
        ids_actuales = {r.id for r in repo.fetch()}
        assert ids_previos.issubset(ids_actuales)

        conteo_previo = conteo_actual
        ids_previos = ids_actuales


@pytest.mark.property
@given(semanas=_secuencia_semanas)
def test_cada_vector_conserva_sus_referencias_trazables(
    semanas: list[list[EmbeddingRecord]],
) -> None:
    """Req. 36.5: cada vector almacenado conserva intactas sus refs trazables."""
    repo = _make_repo()
    esperados: dict[str, EmbeddingRecord] = {}
    for lote in semanas:
        repo.save(lote)
        for r in lote:
            esperados[r.id] = r

    almacenados = {r.id: r for r in repo.fetch()}
    assert set(almacenados) == set(esperados)

    for rid, original in esperados.items():
        got = almacenados[rid]
        assert got.analisis_id == original.analisis_id
        assert got.comunidad_id == original.comunidad_id
        assert got.institucion_id == original.institucion_id
        assert got.resultado_id == original.resultado_id
        assert got.numero_semana == original.numero_semana
        assert got.ref_contenido == original.ref_contenido
        assert got.vector == original.vector


@pytest.mark.property
@given(semanas=_secuencia_semanas, consulta=_vectores, k=st.integers(min_value=1, max_value=10))
def test_search_devuelve_resultados_ordenados_por_similitud(
    semanas: list[list[EmbeddingRecord]],
    consulta: list[float],
    k: int,
) -> None:
    """Req. 36.6, 39.4: `Embeddings_Search` ordena por similitud descendente."""
    repo = _make_repo()
    total = 0
    for lote in semanas:
        repo.save(lote)
        total += len(lote)

    resultados = repo.search(consulta, k=k)

    # Recorte top-k respetado.
    assert len(resultados) <= k
    assert len(resultados) <= total

    sims = [r.similitud for r in resultados]
    # Orden descendente por similitud (de mayor a menor).
    assert sims == sorted(sims, reverse=True)
    # Similitud coseno siempre dentro del rango definido [-1, 1].
    assert all(-1.0 <= s <= 1.0 for s in sims)
    # Cada resultado referencia un vector realmente almacenado (trazable).
    ids_almacenados = {r.id for r in repo.fetch()}
    assert all(r.record.id in ids_almacenados for r in resultados)
