"""Pruebas del servicio de clustering y del contrato de ``POST /clustering``.

Cubre la tarea 6.5 (Req. 14.3, 31.2):

- lógica del :class:`ClusteringService` (KMeans determinista en Python puro);
- contrato HTTP ``{ vectores: number[][] }`` → ``{ clusters:[{clusterId,
  miembros[], etiqueta}] }``.

Todo es determinista y ligero (sin numpy/scikit-learn, sin pesos ni GPU).
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.clustering import get_clustering_service
from app.services.clustering_service import ClusterResult, ClusteringService


# --- Lógica del ClusteringService -------------------------------------------
@pytest.mark.smoke
def test_agrupa_dos_grupos_bien_separados() -> None:
    service = ClusteringService()
    vectores = [
        [0.0, 0.0],
        [0.1, 0.1],
        [10.0, 10.0],
        [10.1, 9.9],
    ]
    clusters = service.agrupar(vectores, k=2)
    assert len(clusters) == 2
    # Cada punto pertenece a exactamente un cluster; cobertura total.
    todos = sorted(i for c in clusters for i in c.miembros)
    assert todos == [0, 1, 2, 3]
    # Los dos puntos cercanos caen juntos.
    grupos = [set(c.miembros) for c in clusters]
    assert {0, 1} in grupos
    assert {2, 3} in grupos


@pytest.mark.smoke
def test_clusters_cubren_todos_los_indices_sin_solape() -> None:
    service = ClusteringService()
    vectores = [[float(i)] for i in range(7)]
    clusters = service.agrupar(vectores)
    miembros = [i for c in clusters for i in c.miembros]
    assert sorted(miembros) == list(range(7))
    assert len(miembros) == len(set(miembros))  # sin solape


@pytest.mark.smoke
def test_cluster_ids_son_compactos_y_ordenados() -> None:
    service = ClusteringService()
    clusters = service.agrupar([[0.0], [0.0], [5.0], [5.0]], k=2)
    ids = [c.clusterId for c in clusters]
    assert ids == list(range(len(clusters)))
    assert all(c.etiqueta == f"cluster_{c.clusterId}" for c in clusters)


@pytest.mark.smoke
def test_empty_returns_no_clusters() -> None:
    service = ClusteringService()
    assert service.agrupar([]) == []


@pytest.mark.smoke
def test_k_capped_to_n() -> None:
    service = ClusteringService()
    clusters = service.agrupar([[1.0], [2.0]], k=10)
    assert len(clusters) <= 2


@pytest.mark.smoke
def test_is_deterministic() -> None:
    service = ClusteringService()
    vectores = [[0.0, 1.0], [0.2, 0.9], [9.0, 9.0], [8.8, 9.1]]
    assert service.agrupar(vectores, k=2) == service.agrupar(vectores, k=2)


@pytest.mark.smoke
def test_ragged_matrix_raises() -> None:
    service = ClusteringService()
    with pytest.raises(ValueError):
        service.agrupar([[1.0, 2.0], [3.0]])


@pytest.mark.smoke
def test_non_matrix_raises() -> None:
    service = ClusteringService()
    with pytest.raises(ValueError):
        service.agrupar("no soy matriz")  # type: ignore[arg-type]


@pytest.mark.smoke
def test_injectable_clusterer_is_used() -> None:
    class _FakeClusterer:
        def __init__(self, k: int) -> None:
            self._k = k

        def fit_predict(self, vectores: list[list[float]]) -> list[int]:
            # Etiqueta alterna 0,1,0,1... de forma determinista.
            return [i % 2 for i in range(len(vectores))]

    service = ClusteringService(clusterer_factory=lambda k: _FakeClusterer(k))
    clusters = service.agrupar([[1.0], [2.0], [3.0], [4.0]], k=2)
    assert len(clusters) == 2
    assert all(isinstance(c, ClusterResult) for c in clusters)
    grupos = [set(c.miembros) for c in clusters]
    assert {0, 2} in grupos and {1, 3} in grupos


# --- Contrato HTTP de POST /clustering --------------------------------------
def _make_service() -> ClusteringService:
    return ClusteringService()


@pytest.fixture
def clustering_client(app: FastAPI) -> TestClient:
    app.dependency_overrides[get_clustering_service] = _make_service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_clustering_service, None)


@pytest.mark.contract
def test_post_clustering_returns_contract_shape(clustering_client: TestClient) -> None:
    response = clustering_client.post(
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
        assert isinstance(cluster["etiqueta"], str)


@pytest.mark.contract
def test_post_clustering_empty_is_ok(clustering_client: TestClient) -> None:
    response = clustering_client.post("/clustering", json={"vectores": []})
    assert response.status_code == 200
    assert response.json() == {"clusters": []}


@pytest.mark.contract
def test_post_clustering_ragged_returns_400(clustering_client: TestClient) -> None:
    response = clustering_client.post(
        "/clustering", json={"vectores": [[1.0, 2.0], [3.0]]}
    )
    assert response.status_code == 400
