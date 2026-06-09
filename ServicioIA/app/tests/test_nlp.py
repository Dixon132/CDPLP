"""Pruebas del servicio de NLP y del contrato de ``POST /nlp``.

Cubre la tarea 6.3 (Req. 14.1–14.4):

- lógica del :class:`NlpService` (semántico, emocional, temático/agrupamiento,
  NER, causas/eventos, conversacional e interpretación de tendencias);
- contrato HTTP ``{ contenido[] }`` → ``{ semantico, emocion, temas[],
  entidades[], causas[], eventos[], tendenciasTexto }``.

Todo usa un **analizador doble determinista** (sin Transformers/spaCy/NLTK
reales, sin descargar pesos ni usar GPU), coherente con el harness. El contrato
amplio de routers es la tarea 6.8.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.nlp import get_nlp_service
from app.services.nlp_service import (
    EmocionTexto,
    EntidadTexto,
    NlpAnalysis,
    NlpService,
)


# --- Analizador doble determinista ------------------------------------------
class _FakeAnalyzer:
    """Doble determinista de :class:`NlpAnalyzer` sin modelos pesados.

    - emociones: 'estres' si el texto menciona 'examen', si no 'tranquilo';
    - entidades: detecta tokens capitalizados como entidad ``MISC``;
    - tokenizar: minúsculas, solo palabras alfabéticas.
    """

    def emociones(self, textos: list[str]) -> list[EmocionTexto]:
        salida: list[EmocionTexto] = []
        for texto in textos:
            if "examen" in texto.lower():
                salida.append(
                    EmocionTexto("estres", 0.9, {"estres": 0.9, "tranquilo": 0.1})
                )
            else:
                salida.append(
                    EmocionTexto("tranquilo", 0.8, {"tranquilo": 0.8, "estres": 0.2})
                )
        return salida

    def entidades(self, textos: list[str]) -> list[list[EntidadTexto]]:
        salida: list[list[EntidadTexto]] = []
        for texto in textos:
            ents = [
                EntidadTexto(texto=palabra, tipo="MISC")
                for palabra in texto.split()
                if palabra.istitle()
            ]
            salida.append(ents)
        return salida

    def tokenizar(self, texto: str) -> list[str]:
        return [tok.lower() for tok in texto.split() if tok.isalpha()]


def _make_service() -> NlpService:
    return NlpService(analyzer_factory=lambda: _FakeAnalyzer())


# --- Lógica del NlpService --------------------------------------------------
@pytest.mark.smoke
def test_analizar_returns_full_analysis_shape() -> None:
    service = _make_service()
    result = service.analizar(
        [
            "Hoy tuvimos examen de matematicas porque el profe adelanto todo",
            "El examen estuvo dificil debido a poco tiempo",
            "Despues fuimos a la feria muy contentos",
        ]
    )
    assert isinstance(result, NlpAnalysis)
    # 14.1 semántico + emocional + temático
    assert result.semantico.conversacional.numIntervenciones == 3
    assert result.semantico.terminosClave  # términos clave no vacíos
    assert result.emocion.etiqueta in {"estres", "tranquilo"}
    assert pytest.approx(sum(result.emocion.distribucion.values()), abs=1e-6) == 1.0
    assert result.temas  # agrupamiento temático
    # 14.2 causas y eventos
    assert any("porque" in c.lower() for c in result.causas)
    assert "examen" in result.eventos or "feria" in result.eventos
    # 14.4 interpretación de tendencias
    assert result.tendenciasTexto


@pytest.mark.smoke
def test_emocion_dominante_es_estres_cuando_predomina_examen() -> None:
    service = _make_service()
    result = service.analizar(["examen hoy", "examen manana", "examen final"])
    assert result.emocion.etiqueta == "estres"
    assert result.emocion.puntuacion > 0.5


@pytest.mark.smoke
def test_causas_detecta_conectores_causales() -> None:
    service = _make_service()
    result = service.analizar(
        ["estoy cansado porque dormi poco", "todo bien hoy sin novedad"]
    )
    assert result.causas == ["estoy cansado porque dormi poco"]


@pytest.mark.smoke
def test_eventos_detecta_palabras_clave() -> None:
    service = _make_service()
    result = service.analizar(["manana hay paro y marcha en el centro"])
    assert "paro" in result.eventos
    assert "marcha" in result.eventos


@pytest.mark.smoke
def test_temas_pesos_suman_proporcion_valida() -> None:
    service = _make_service()
    result = service.analizar(
        ["examen examen examen", "feria feria", "viaje viaje viaje"]
    )
    assert result.temas
    assert all(0.0 <= t.peso <= 1.0 for t in result.temas)
    # Cada fragmento se asigna a un tema → la suma de pesos es ~1 (redondeo a 4 dec.).
    assert sum(t.peso for t in result.temas) == pytest.approx(1.0, abs=1e-3)


@pytest.mark.smoke
def test_entidades_son_unicas() -> None:
    service = _make_service()
    result = service.analizar(["Maria fue al Centro", "Maria volvio del Centro"])
    pares = [(e.texto, e.tipo) for e in result.entidades]
    assert len(pares) == len(set(pares))
    assert ("Maria", "MISC") in pares


@pytest.mark.smoke
def test_empty_content_returns_neutral_analysis() -> None:
    service = _make_service()
    result = service.analizar([])
    assert result.emocion.etiqueta == "neutral"
    assert result.temas == []
    assert result.entidades == []
    assert result.causas == []
    assert result.eventos == []
    assert result.semantico.conversacional.numIntervenciones == 0


@pytest.mark.smoke
def test_blank_strings_treated_as_empty() -> None:
    service = _make_service()
    result = service.analizar(["   ", ""])
    assert result.semantico.conversacional.numIntervenciones == 0
    assert result.emocion.etiqueta == "neutral"


@pytest.mark.smoke
def test_non_list_content_raises_value_error() -> None:
    service = _make_service()
    with pytest.raises(ValueError):
        service.analizar("no soy una lista")  # type: ignore[arg-type]


@pytest.mark.smoke
def test_analizar_is_deterministic() -> None:
    service = _make_service()
    contenido = ["examen de fisica porque toca", "feria del libro manana"]
    primero = service.analizar(contenido)
    segundo = service.analizar(contenido)
    assert primero == segundo


# --- Contrato HTTP de POST /nlp ---------------------------------------------
@pytest.fixture
def nlp_client(app: FastAPI) -> TestClient:
    """``TestClient`` con el servicio de NLP doble inyectado."""
    app.dependency_overrides[get_nlp_service] = _make_service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_nlp_service, None)


@pytest.mark.contract
def test_post_nlp_returns_contract_shape(nlp_client: TestClient) -> None:
    response = nlp_client.post(
        "/nlp",
        json={
            "contenido": [
                "Hoy hubo examen porque el profe adelanto el tema",
                "La feria del colegio estuvo muy divertida",
            ]
        },
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
    assert set(body["semantico"].keys()) == {
        "resumen",
        "terminosClave",
        "conversacional",
    }
    assert set(body["emocion"].keys()) == {"etiqueta", "puntuacion", "distribucion"}
    assert isinstance(body["temas"], list)
    assert isinstance(body["entidades"], list)
    assert isinstance(body["causas"], list)
    assert isinstance(body["eventos"], list)
    assert isinstance(body["tendenciasTexto"], str)


@pytest.mark.contract
def test_post_nlp_empty_content_is_ok(nlp_client: TestClient) -> None:
    response = nlp_client.post("/nlp", json={"contenido": []})
    assert response.status_code == 200
    body = response.json()
    assert body["emocion"]["etiqueta"] == "neutral"
    assert body["temas"] == []
