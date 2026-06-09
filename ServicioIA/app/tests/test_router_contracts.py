"""Contrato consolidado de routers del Servicio_IA (tarea 6.8).

Verifica la **forma** (request/response *shape*) de los cinco endpoints
analíticos usando **dobles de modelos** (sin pesos reales ni GPU), conforme a la
tabla de contratos HTTP del ``design.md``:

==============  ==========================  =================================================================
Endpoint        Petición                    Respuesta
==============  ==========================  =================================================================
``/nlp``        ``{ contenido[] }``         ``{ semantico, emocion, temas[], entidades[], causas[], eventos[], tendenciasTexto }``
``/clustering`` ``{ vectores }``            ``{ clusters:[{clusterId, miembros[], etiqueta}] }``
``/anomalias``  ``{ serie, zona? }``        ``{ anomalias:[{refId, score, descripcion}] }``
``/tendencias`` ``{ evolucion, zona? }``    ``{ tendencias:[{dimension, direccion, magnitud}] }``
``/relevancia`` ``{ items:[{refId,texto}]}` ``{ contributivos[], noContributivos[] }``
==============  ==========================  =================================================================

A diferencia de las pruebas por endpoint (que validan también la lógica de cada
servicio), esta suite es el **contrato de routers** transversal: cada endpoint
acepta su petición documentada y devuelve su respuesta documentada con un único
``TestClient`` y dobles deterministas inyectados vía ``app.dependency_overrides``.

Req. 14.1, 14.2, 31.2, 34.1.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.relevancia import Contributividad
from app.routers.anomalias import get_anomaly_service
from app.routers.clustering import get_clustering_service
from app.routers.nlp import get_nlp_service
from app.routers.relevancia import get_relevancia_service
from app.routers.tendencias import get_trend_service
from app.services.anomaly_service import AnomalyService
from app.services.clustering_service import ClusteringService
from app.services.nlp_service import EmocionTexto, EntidadTexto, NlpService
from app.services.relevancia_service import Clasificacion, RelevanciaService
from app.services.trend_service import TrendService


# --- Dobles de modelos deterministas ----------------------------------------
# Cada doble sustituye SOLO la primitiva dependiente de modelo del servicio
# (analizador NLP, clusterer, detector, estimador, clasificador), de modo que el
# router se ejerce de extremo a extremo sin descargar pesos ni usar GPU.
class _FakeNlpAnalyzer:
    """Doble determinista del :class:`NlpAnalyzer` (sin Transformers/spaCy/NLTK)."""

    def emociones(self, textos: list[str]) -> list[EmocionTexto]:
        return [
            EmocionTexto("estres", 0.9, {"estres": 0.9, "tranquilo": 0.1})
            if "examen" in t.lower()
            else EmocionTexto("tranquilo", 0.8, {"tranquilo": 0.8, "estres": 0.2})
            for t in textos
        ]

    def entidades(self, textos: list[str]) -> list[list[EntidadTexto]]:
        return [
            [EntidadTexto(texto=p, tipo="MISC") for p in t.split() if p.istitle()]
            for t in textos
        ]

    def tokenizar(self, texto: str) -> list[str]:
        return [tok.lower() for tok in texto.split() if tok.isalpha()]


class _FakeClusterer:
    """Doble del clusterer: etiqueta alterna 0,1,0,1... de forma determinista."""

    def __init__(self, k: int) -> None:
        self._k = max(1, k)

    def fit_predict(self, vectores: list[list[float]]) -> list[int]:
        return [i % self._k for i in range(len(vectores))]


class _FakeDetector:
    """Doble del detector: marca anómalo el último punto con score determinista."""

    def score(self, serie: list[list[float]]) -> list[tuple[bool, float]]:
        n = len(serie)
        return [(i == n - 1, float(i)) for i in range(n)]


class _FakeEstimator:
    """Doble del estimador de pendiente: siempre ascendente, magnitud fija."""

    def slope(self, serie: list[float]) -> float:
        return 3.0


class _FakeClassifier:
    """Doble del clasificador de relevancia: texto con letras → contributivo."""

    def classify(self, texto: str) -> Clasificacion:
        if any(ch.isalpha() for ch in texto):
            return Clasificacion(Contributividad.CONTRIBUTIVO, "doble: señal")
        return Clasificacion(Contributividad.NO_CONTRIBUTIVO, "doble: ruido")


def _make_nlp_service() -> NlpService:
    return NlpService(analyzer_factory=_FakeNlpAnalyzer)


def _make_clustering_service() -> ClusteringService:
    return ClusteringService(clusterer_factory=lambda k: _FakeClusterer(k))


def _make_anomaly_service() -> AnomalyService:
    return AnomalyService(detector_factory=_FakeDetector)


def _make_trend_service() -> TrendService:
    return TrendService(estimator_factory=_FakeEstimator)


def _make_relevancia_service() -> RelevanciaService:
    return RelevanciaService(classifier_factory=_FakeClassifier)


# --- Fixture: un único cliente con TODOS los dobles inyectados ---------------
@pytest.fixture
def contracts_client(app: FastAPI) -> TestClient:
    """``TestClient`` con los cinco servicios sustituidos por dobles de modelos."""
    app.dependency_overrides[get_nlp_service] = _make_nlp_service
    app.dependency_overrides[get_clustering_service] = _make_clustering_service
    app.dependency_overrides[get_anomaly_service] = _make_anomaly_service
    app.dependency_overrides[get_trend_service] = _make_trend_service
    app.dependency_overrides[get_relevancia_service] = _make_relevancia_service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# --- /nlp -------------------------------------------------------------------
@pytest.mark.contract
def test_nlp_router_contract_shape(contracts_client: TestClient) -> None:
    """``/nlp`` acepta ``{ contenido[] }`` y devuelve la forma documentada."""
    response = contracts_client.post(
        "/nlp",
        json={"contenido": ["Hoy hubo examen porque el profe adelanto el tema"]},
    )
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {
        "semantico",
        "emocion",
        "temas",
        "entidades",
        "causas",
        "eventos",
        "tendenciasTexto",
    }
    assert set(body["semantico"].keys()) == {"resumen", "terminosClave", "conversacional"}
    assert set(body["emocion"].keys()) == {"etiqueta", "puntuacion", "distribucion"}
    assert isinstance(body["temas"], list)
    assert isinstance(body["entidades"], list)
    assert isinstance(body["causas"], list)
    assert isinstance(body["eventos"], list)
    assert isinstance(body["tendenciasTexto"], str)


# --- /clustering ------------------------------------------------------------
@pytest.mark.contract
def test_clustering_router_contract_shape(contracts_client: TestClient) -> None:
    """``/clustering`` acepta ``{ vectores }`` y devuelve ``{ clusters:[...] }``."""
    response = contracts_client.post(
        "/clustering",
        json={"vectores": [[0.0, 0.0], [0.1, 0.0], [9.0, 9.0], [9.1, 9.0]], "k": 2},
    )
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"clusters"}
    assert isinstance(body["clusters"], list)
    assert body["clusters"]
    for cluster in body["clusters"]:
        assert set(cluster.keys()) == {"clusterId", "miembros", "etiqueta"}
        assert isinstance(cluster["clusterId"], int)
        assert isinstance(cluster["miembros"], list)
        assert all(isinstance(m, int) for m in cluster["miembros"])
        assert isinstance(cluster["etiqueta"], str)


# --- /anomalias -------------------------------------------------------------
@pytest.mark.contract
def test_anomalias_router_contract_shape(contracts_client: TestClient) -> None:
    """``/anomalias`` acepta ``{ serie, zona? }`` y devuelve ``{ anomalias:[...] }``."""
    response = contracts_client.post(
        "/anomalias",
        json={"serie": [[1.0], [1.0], [1.0], [50.0]], "zona": "Zona Sur"},
    )
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"anomalias"}
    assert isinstance(body["anomalias"], list)
    assert body["anomalias"]
    for anomalia in body["anomalias"]:
        assert set(anomalia.keys()) == {"refId", "score", "descripcion"}
        assert isinstance(anomalia["refId"], int)
        assert isinstance(anomalia["score"], (int, float))
        assert isinstance(anomalia["descripcion"], str)


@pytest.mark.contract
def test_anomalias_router_accepts_optional_zona_omitted(
    contracts_client: TestClient,
) -> None:
    """``zona`` es opcional en la petición de ``/anomalias``."""
    response = contracts_client.post("/anomalias", json={"serie": [[1.0], [9.0]]})
    assert response.status_code == 200
    assert set(response.json().keys()) == {"anomalias"}


# --- /tendencias ------------------------------------------------------------
@pytest.mark.contract
def test_tendencias_router_contract_shape(contracts_client: TestClient) -> None:
    """``/tendencias`` acepta ``{ evolucion, zona? }`` y devuelve ``{ tendencias:[...] }``."""
    response = contracts_client.post(
        "/tendencias",
        json={
            "evolucion": {"ansiedad": [1.0, 2.0, 3.0], "conflicto": [3.0, 2.0, 1.0]},
            "zona": "Zona Centro",
        },
    )
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"tendencias"}
    assert isinstance(body["tendencias"], list)
    assert body["tendencias"]
    for tendencia in body["tendencias"]:
        assert set(tendencia.keys()) == {"dimension", "direccion", "magnitud"}
        assert isinstance(tendencia["dimension"], str)
        assert tendencia["direccion"] in {"ascendente", "descendente", "estable"}
        assert isinstance(tendencia["magnitud"], (int, float))


@pytest.mark.contract
def test_tendencias_router_accepts_optional_zona_omitted(
    contracts_client: TestClient,
) -> None:
    """``zona`` es opcional en la petición de ``/tendencias``."""
    response = contracts_client.post(
        "/tendencias", json={"evolucion": {"d": [1.0, 2.0]}}
    )
    assert response.status_code == 200
    assert set(response.json().keys()) == {"tendencias"}


# --- /relevancia ------------------------------------------------------------
@pytest.mark.contract
def test_relevancia_router_contract_shape(contracts_client: TestClient) -> None:
    """``/relevancia`` acepta ``{ items:[{refId,texto}] }`` y devuelve la partición."""
    response = contracts_client.post(
        "/relevancia",
        json={
            "items": [
                {"refId": "post", "texto": "vecinos preocupados por la seguridad"},
                {"refId": "comment:0", "texto": "123 !!!"},
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"contributivos", "noContributivos"}
    assert isinstance(body["contributivos"], list)
    assert isinstance(body["noContributivos"], list)
    for item in body["contributivos"] + body["noContributivos"]:
        assert set(item.keys()) == {"refId", "contributividad", "motivo"}
        assert isinstance(item["refId"], str)
        assert item["contributividad"] in {"CONTRIBUTIVO", "NO_CONTRIBUTIVO"}
        assert isinstance(item["motivo"], str)


# --- Contrato transversal: los cinco endpoints en un solo recorrido ---------
@pytest.mark.contract
def test_all_router_contracts_respond_with_documented_top_level_keys(
    contracts_client: TestClient,
) -> None:
    """Recorrido consolidado: cada router responde 200 con sus claves de nivel superior."""
    casos = [
        ("/nlp", {"contenido": ["texto de prueba"]},
         {"semantico", "emocion", "temas", "entidades", "causas", "eventos", "tendenciasTexto"}),
        ("/clustering", {"vectores": [[0.0], [1.0]]}, {"clusters"}),
        ("/anomalias", {"serie": [[1.0], [9.0]]}, {"anomalias"}),
        ("/tendencias", {"evolucion": {"d": [1.0, 2.0]}}, {"tendencias"}),
        ("/relevancia", {"items": [{"refId": "post", "texto": "hola mundo"}]},
         {"contributivos", "noContributivos"}),
    ]
    for ruta, payload, claves in casos:
        response = contracts_client.post(ruta, json=payload)
        assert response.status_code == 200, f"{ruta} devolvió {response.status_code}"
        assert set(response.json().keys()) == claves, f"forma inesperada en {ruta}"
