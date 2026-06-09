"""Pruebas del Filtro_Relevancia (servicio + contrato de ``POST /relevancia``).

Cubre la tarea 6.7:

- lógica del :class:`RelevanciaService` (clasificación señal/ruido determinista,
  partición sin solape, orden preservado, lista vacía, clasificador inyectable);
- contrato HTTP ``{ items:[{refId, texto}] }`` → ``{ contributivos[], noContributivos[] }``,
  el MISMO que cumple el fallback determinista TS (interchangeables, Req. 34.6).

Usa **dobles deterministas** del clasificador para la inyección, coherente con el
harness (sin red ni GPU).
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.relevancia import Contributividad
from app.routers.relevancia import get_relevancia_service
from app.services.relevancia_service import (
    Clasificacion,
    ItemEntrada,
    RelevanciaService,
)


# --- Lógica del RelevanciaService (heurística por defecto) ------------------
@pytest.mark.smoke
def test_texto_con_palabras_es_contributivo() -> None:
    service = RelevanciaService()
    result = service.clasificar([ItemEntrada(refId="post", texto="hay basura acumulada")])
    assert len(result.contributivos) == 1
    assert result.noContributivos == []
    assert result.contributivos[0].refId == "post"
    assert result.contributivos[0].contributividad == Contributividad.CONTRIBUTIVO


@pytest.mark.smoke
def test_texto_vacio_es_no_contributivo() -> None:
    service = RelevanciaService()
    result = service.clasificar([ItemEntrada(refId="c0", texto="   ")])
    assert result.contributivos == []
    assert len(result.noContributivos) == 1
    assert result.noContributivos[0].contributividad == Contributividad.NO_CONTRIBUTIVO
    assert "vacio" in result.noContributivos[0].motivo


@pytest.mark.smoke
def test_solo_marcadores_es_no_contributivo() -> None:
    service = RelevanciaService()
    result = service.clasificar([ItemEntrada(refId="c1", texto="#hashtag @mencion")])
    assert result.contributivos == []
    assert len(result.noContributivos) == 1
    assert "marcadores" in result.noContributivos[0].motivo


@pytest.mark.smoke
def test_simbolos_sin_letras_es_no_contributivo() -> None:
    service = RelevanciaService()
    result = service.clasificar([ItemEntrada(refId="c2", texto="123 !!! ...")])
    assert result.contributivos == []
    assert len(result.noContributivos) == 1
    assert "simbolico" in result.noContributivos[0].motivo


@pytest.mark.smoke
def test_particion_sin_solape_preserva_orden() -> None:
    service = RelevanciaService()
    items = [
        ItemEntrada(refId="post", texto="contenido informativo real"),
        ItemEntrada(refId="comment:0", texto="#solo @marcadores"),
        ItemEntrada(refId="comment:1", texto="otro comentario util"),
    ]
    result = service.clasificar(items)

    todos = result.contributivos + result.noContributivos
    # Partición sin solape: cada refId aparece exactamente una vez.
    assert sorted(i.refId for i in todos) == ["comment:0", "comment:1", "post"]
    assert [i.refId for i in result.contributivos] == ["post", "comment:1"]
    assert [i.refId for i in result.noContributivos] == ["comment:0"]


@pytest.mark.smoke
def test_lista_vacia_devuelve_dos_listas_vacias() -> None:
    service = RelevanciaService()
    result = service.clasificar([])
    assert result.contributivos == []
    assert result.noContributivos == []


@pytest.mark.smoke
def test_es_determinista() -> None:
    service = RelevanciaService()
    items = [ItemEntrada(refId="post", texto="texto repetible")]
    primera = service.clasificar(items)
    segunda = service.clasificar(items)
    assert primera.contributivos[0].motivo == segunda.contributivos[0].motivo


@pytest.mark.smoke
def test_classifier_factory_inyectable() -> None:
    class _SiempreContributivo:
        def classify(self, texto: str) -> Clasificacion:
            return Clasificacion(Contributividad.CONTRIBUTIVO, "doble: siempre senal")

    service = RelevanciaService(classifier_factory=_SiempreContributivo)
    result = service.clasificar([ItemEntrada(refId="x", texto="")])
    assert len(result.contributivos) == 1
    assert result.contributivos[0].motivo == "doble: siempre senal"


# --- Contrato HTTP de POST /relevancia -------------------------------------
@pytest.fixture
def relevancia_client(app: FastAPI) -> TestClient:
    """``TestClient`` con el servicio de relevancia (heurística determinista)."""
    app.dependency_overrides[get_relevancia_service] = RelevanciaService
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_relevancia_service, None)


@pytest.mark.contract
def test_post_relevancia_returns_contract_shape(relevancia_client: TestClient) -> None:
    response = relevancia_client.post(
        "/relevancia",
        json={
            "items": [
                {"refId": "post", "texto": "vecinos preocupados por la seguridad"},
                {"refId": "comment:0", "texto": "#hashtag @mencion"},
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"contributivos", "noContributivos"}
    assert isinstance(body["contributivos"], list)
    assert isinstance(body["noContributivos"], list)

    assert len(body["contributivos"]) == 1
    assert len(body["noContributivos"]) == 1

    contributivo = body["contributivos"][0]
    assert set(contributivo.keys()) == {"refId", "contributividad", "motivo"}
    assert contributivo["refId"] == "post"
    assert contributivo["contributividad"] == "CONTRIBUTIVO"

    no_contributivo = body["noContributivos"][0]
    assert no_contributivo["refId"] == "comment:0"
    assert no_contributivo["contributividad"] == "NO_CONTRIBUTIVO"


@pytest.mark.contract
def test_post_relevancia_empty_items(relevancia_client: TestClient) -> None:
    response = relevancia_client.post("/relevancia", json={"items": []})
    assert response.status_code == 200
    body = response.json()
    assert body == {"contributivos": [], "noContributivos": []}


@pytest.mark.contract
def test_post_relevancia_partition_is_complete(relevancia_client: TestClient) -> None:
    items = [
        {"refId": "post", "texto": "denuncia formal ante la comunidad"},
        {"refId": "comment:0", "texto": "   "},
        {"refId": "comment:1", "texto": "estoy de acuerdo con todo"},
    ]
    response = relevancia_client.post("/relevancia", json={"items": items})
    assert response.status_code == 200
    body = response.json()

    refids = [i["refId"] for i in body["contributivos"]] + [
        i["refId"] for i in body["noContributivos"]
    ]
    # Cada item aparece exactamente una vez (partición sin solape).
    assert sorted(refids) == ["comment:0", "comment:1", "post"]
