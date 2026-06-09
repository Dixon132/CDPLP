"""Pruebas estructurales (SMOKE) del ``Servicio_IA`` — Tarea 27.4.

Evidencia técnica ejecutable (Req. 26.1, 26.2) de los invariantes de
arquitectura y aislamiento que conciernen al componente Python (Req. 41.3,
41.4):

  1. **Salud expuesta**: el servicio expone ``GET /health`` (liveness del
     cerebro analítico — Req. 35.5). Se verifica con el ``TestClient`` y el
     doble de modelos del ``conftest`` (sin red ni GPU).
  2. **Contenerización propia**: el ``Servicio_IA`` tiene su propio
     ``Dockerfile`` que arranca ``uvicorn`` en el puerto 8000.
  3. **No expuesto públicamente**: en el ``docker-compose`` de la raíz, el
     servicio ``servicio-ia`` usa ``expose`` (red interna) y **no** publica
     ``ports`` al host (Req. 35).
  4. **Aislamiento de la BD del colegio**: el código de ``app/`` no incrusta las
     credenciales ni el nombre de la BD del colegio, ni referencia el módulo
     IREC anterior (Req. 1.4, 25.3).

Son aserciones deterministas y no interactivas, sin servidores vivos.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# app/tests/ -> app/ -> ServicioIA/ -> raíz del repositorio (monorepo).
SERVICE_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = SERVICE_ROOT.parent


@pytest.mark.smoke
def test_health_endpoint_is_exposed(client: TestClient) -> None:
    """El ``Servicio_IA`` expone ``GET /health`` y responde 200 (Req. 35.5)."""
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()


@pytest.mark.smoke
def test_servicio_ia_has_own_dockerfile() -> None:
    """El componente tiene su propio Dockerfile que arranca uvicorn:8000."""
    dockerfile = SERVICE_ROOT / "Dockerfile"
    assert dockerfile.is_file()
    contenido = dockerfile.read_text(encoding="utf-8")
    assert "uvicorn" in contenido
    assert "app.main:app" in contenido
    assert "8000" in contenido


@pytest.mark.smoke
def test_compose_keeps_servicio_ia_internal() -> None:
    """En el compose de la raíz, servicio-ia no publica `ports` (Req. 35)."""
    compose = REPO_ROOT / "docker-compose.yml"
    assert compose.is_file()
    texto = compose.read_text(encoding="utf-8")

    # Aísla el bloque YAML del servicio `servicio-ia` hasta el siguiente
    # servicio (indentación de 2 espacios) para acotar la aserción.
    inicio = texto.index("\n  servicio-ia:")
    resto = texto[inicio + 1 :]
    siguiente = re.search(r"\n {2}[a-z0-9_-]+:", resto)
    bloque = resto if siguiente is None else resto[: siguiente.start()]

    assert re.search(r"\n\s+expose:", bloque), "servicio-ia debe usar `expose`"
    assert not re.search(
        r"\n\s+ports:", bloque
    ), "servicio-ia NO debe publicar `ports` (solo red interna)"


def _archivos_py(raiz: Path) -> list[Path]:
    """Recolecta los ``.py`` de ``app/`` excluyendo las pruebas y cachés."""
    resultados: list[Path] = []
    for ruta in raiz.rglob("*.py"):
        partes = set(ruta.parts)
        if "tests" in partes or "__pycache__" in partes or ".venv" in partes:
            continue
        resultados.append(ruta)
    return resultados


@pytest.mark.smoke
def test_source_does_not_embed_colegio_db_or_irec() -> None:
    """El código de `app/` no incrusta la BD del colegio ni referencia IREC."""
    marcadores = [
        re.compile(r"diego:diego135", re.IGNORECASE),  # credenciales del colegio
        re.compile(r"5432/cOL\b"),  # nombre de la BD del colegio
        re.compile(r"(^|[/\\@])irec([/\\]|$)", re.IGNORECASE),  # módulo IREC
    ]
    ficheros = _archivos_py(SERVICE_ROOT / "app")
    assert ficheros, "no se encontró código fuente que analizar"

    infracciones: list[str] = []
    for fichero in ficheros:
        contenido = fichero.read_text(encoding="utf-8")
        for marcador in marcadores:
            if marcador.search(contenido):
                infracciones.append(f"{fichero.name}: {marcador.pattern}")
    assert infracciones == []
