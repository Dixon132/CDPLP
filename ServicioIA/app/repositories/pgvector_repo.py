"""Acceso a ``pgvector`` para la ``Memoria_Semantica`` (tabla ``gds_embedding``).

Persiste y lee los vectores de embeddings de la ``Memoria_Semantica`` en la BD
PostgreSQL + ``pgvector`` dedicada, con referencias trazables a su
``Semana_Simulada``, ``Comunidad_Digital``/``Institucion``, ``Analisis`` y
``Resultado`` de origen (Req. 36.1, 36.5).

El acceso a la BD vive **detrás de un repositorio** con una *factoría de
conexión* inyectable, de modo que en pruebas se pueda sustituir por una
conexión en memoria/doble sin requerir un PostgreSQL real ni los drivers
pesados (``psycopg``/``pgvector``), que se importan de forma perezosa.

El esquema de ``gds_embedding`` (design.md) es::

    id PK, analisis_id FK, comunidad_id FK, institucion_id FK, resultado_id FK,
    numero_semana int, ref_contenido str, modelo str, dim int, vector vector(1024)

La indexación **acumula sin borrar** vectores previos (Req. 36.2); la
acumulación monotónica y la recuperación ordenada se verifican como propiedad en
la tarea 6.11.
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable, Protocol, Sequence

TABLE = "gds_embedding"


@dataclass
class SimilarityResult:
    """Un resultado de ``Embeddings_Search``: el vector recuperado y su similitud.

    ``similitud`` es la **similitud coseno** entre el vector de consulta y el
    vector almacenado, en el rango ``[-1, 1]`` (Req. 36.6). Los resultados se
    devuelven ordenados por similitud **descendente** y siempre referencian
    contenido colectivo trazable, nunca un diagnóstico individual.
    """

    record: "EmbeddingRecord"
    similitud: float


@dataclass
class EmbeddingRecord:
    """Una fila de la ``Memoria_Semantica`` en ``gds_embedding``.

    Las referencias trazables (``analisis_id``, ``comunidad_id``,
    ``institucion_id``, ``resultado_id``, ``numero_semana``) anclan cada vector a
    su origen (Req. 36.5). ``id`` se autogenera si no se provee.
    """

    vector: list[float]
    modelo: str
    dim: int
    ref_contenido: str
    analisis_id: str | None = None
    comunidad_id: str | None = None
    institucion_id: str | None = None
    resultado_id: str | None = None
    numero_semana: int | None = None
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


class MemoriaSemanticaRepository(Protocol):
    """Contrato de persistencia/lectura de la ``Memoria_Semantica``."""

    def save(self, records: Iterable[EmbeddingRecord]) -> int:
        """Persiste (acumulando, sin borrar) los vectores; devuelve cuántos."""
        ...

    def fetch(
        self,
        *,
        analisis_id: str | None = None,
        comunidad_id: str | None = None,
    ) -> list[EmbeddingRecord]:
        """Lee vectores, opcionalmente filtrados por análisis/comunidad."""
        ...

    def count(self, *, analisis_id: str | None = None) -> int:
        """Cuenta vectores almacenados, opcionalmente por análisis."""
        ...

    def search(
        self,
        query_vector: Sequence[float],
        *,
        k: int = 5,
        analisis_id: str | None = None,
        comunidad_id: str | None = None,
    ) -> list[SimilarityResult]:
        """Recupera por similitud vectorial, ordenado desc., filtrado y top-``k``."""
        ...


def _default_connection_factory(database_url: str) -> Any:
    """Abre una conexión PostgreSQL y registra el tipo ``vector`` de pgvector.

    Importación perezosa de ``psycopg``/``pgvector`` para no exigir los drivers
    al importar el módulo (las pruebas inyectan una factoría doble).
    """
    import psycopg  # import perezoso
    from pgvector.psycopg import register_vector  # import perezoso

    conn = psycopg.connect(database_url)
    register_vector(conn)
    return conn


def _cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    """Similitud coseno entre dos vectores, en ``[-1, 1]``.

    Devuelve ``0.0`` cuando alguno de los vectores es nulo (norma cero) o cuando
    las dimensiones no coinciden, evitando divisiones por cero y comparaciones
    entre espacios incompatibles.
    """
    if len(a) != len(b) or not a:
        return 0.0
    dot = math.fsum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(math.fsum(x * x for x in a))
    norm_b = math.sqrt(math.fsum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


class PgVectorRepository:
    """Repositorio de ``Memoria_Semantica`` sobre ``pgvector``.

    La conexión se obtiene mediante ``connection_factory`` (por defecto
    ``psycopg`` + ``pgvector``), permitiendo sustituirla en pruebas.
    """

    def __init__(
        self,
        database_url: str,
        *,
        connection_factory: Callable[[str], Any] | None = None,
        table: str = TABLE,
    ) -> None:
        self._database_url = database_url
        self._connection_factory = connection_factory or _default_connection_factory
        self._table = table

    def _connect(self) -> Any:
        return self._connection_factory(self._database_url)

    def save(self, records: Iterable[EmbeddingRecord]) -> int:
        """Inserta los vectores en ``gds_embedding`` acumulando los previos."""
        rows = list(records)
        if not rows:
            return 0

        sql = (
            f"INSERT INTO {self._table} "
            "(id, analisis_id, comunidad_id, institucion_id, resultado_id, "
            "numero_semana, ref_contenido, modelo, dim, vector) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        )
        params = [
            (
                r.id,
                r.analisis_id,
                r.comunidad_id,
                r.institucion_id,
                r.resultado_id,
                r.numero_semana,
                r.ref_contenido,
                r.modelo,
                r.dim,
                r.vector,
            )
            for r in rows
        ]

        conn = self._connect()
        try:
            with conn.cursor() as cur:
                cur.executemany(sql, params)
            conn.commit()
        finally:
            conn.close()
        return len(rows)

    def fetch(
        self,
        *,
        analisis_id: str | None = None,
        comunidad_id: str | None = None,
    ) -> list[EmbeddingRecord]:
        """Lee vectores, filtrando opcionalmente por análisis y/o comunidad."""
        clauses: list[str] = []
        params: list[Any] = []
        if analisis_id is not None:
            clauses.append("analisis_id = %s")
            params.append(analisis_id)
        if comunidad_id is not None:
            clauses.append("comunidad_id = %s")
            params.append(comunidad_id)
        where = f" WHERE {' AND '.join(clauses)}" if clauses else ""

        sql = (
            "SELECT id, analisis_id, comunidad_id, institucion_id, resultado_id, "
            "numero_semana, ref_contenido, modelo, dim, vector "
            f"FROM {self._table}{where}"
        )

        conn = self._connect()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                fetched = cur.fetchall()
        finally:
            conn.close()

        return [self._row_to_record(row) for row in fetched]

    def count(self, *, analisis_id: str | None = None) -> int:
        """Cuenta los vectores almacenados, opcionalmente por análisis."""
        where = " WHERE analisis_id = %s" if analisis_id is not None else ""
        params = [analisis_id] if analisis_id is not None else []
        sql = f"SELECT COUNT(*) FROM {self._table}{where}"

        conn = self._connect()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                row = cur.fetchone()
        finally:
            conn.close()
        return int(row[0]) if row else 0

    def search(
        self,
        query_vector: Sequence[float],
        *,
        k: int = 5,
        analisis_id: str | None = None,
        comunidad_id: str | None = None,
    ) -> list[SimilarityResult]:
        """``Embeddings_Search``: recupera contexto por similitud vectorial.

        Recupera los vectores de la ``Memoria_Semantica`` (filtrando por
        ``analisis_id``/``comunidad_id`` cuando se indican), los puntúa por
        **similitud coseno** frente a ``query_vector``, y devuelve los ``k`` más
        similares **ordenados por similitud descendente** (Req. 36.3, 36.6,
        39.4).

        Los registros de ``gds_embedding`` referencian contenido **colectivo**
        trazable (``analisis``/``comunidad``/``institucion``/``semana``); el
        resultado nunca expone diagnóstico individual (Req. 36.6).

        La recuperación filtrada se delega al SQL de :meth:`fetch` (que aprovecha
        ``pgvector``); el ranking por similitud y el recorte top-``k`` se aplican
        de forma determinista en este repositorio.
        """
        if k <= 0:
            return []

        query = [float(x) for x in query_vector]
        candidatos = self.fetch(analisis_id=analisis_id, comunidad_id=comunidad_id)

        puntuados = [
            SimilarityResult(record=record, similitud=_cosine_similarity(query, record.vector))
            for record in candidatos
        ]
        # Orden por similitud descendente (mayor similitud primero); ``id`` como
        # desempate estable para resultados reproducibles.
        puntuados.sort(key=lambda r: (-r.similitud, r.record.id))
        return puntuados[:k]

    @staticmethod
    def _row_to_record(row: Any) -> EmbeddingRecord:
        """Convierte una fila (tupla) de ``gds_embedding`` en un ``EmbeddingRecord``."""
        return EmbeddingRecord(
            id=row[0],
            analisis_id=row[1],
            comunidad_id=row[2],
            institucion_id=row[3],
            resultado_id=row[4],
            numero_semana=row[5],
            ref_contenido=row[6],
            modelo=row[7],
            dim=row[8],
            vector=[float(x) for x in row[9]],
        )
