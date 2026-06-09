"""Pruebas de la observabilidad del Servicio_IA (Servicio_Observabilidad).

Verifica:

- el logging estructurado JSON con redacción de claves sensibles (no se
  registran secretos en claro; Req. 23, 41.1);
- la inicialización de Sentry guardada por ``SENTRY_DSN``: no-op sin DSN
  (dev/test/CI) y activa con DSN (Req. 41.2).
"""

from __future__ import annotations

import json
import logging

import pytest

from app.observability import (
    JsonLogFormatter,
    configurar_logging,
    inicializar_sentry,
)


def test_logging_estructurado_es_json_con_service() -> None:
    """El formateador emite una línea JSON con el nombre del servicio."""
    record = logging.LogRecord(
        name="servicio-ia",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="hola",
        args=(),
        exc_info=None,
    )
    salida = JsonLogFormatter().format(record)
    payload = json.loads(salida)

    assert payload["service"] == "servicio-ia"
    assert payload["level"] == "INFO"
    assert payload["message"] == "hola"


def test_logging_redacta_claves_sensibles() -> None:
    """Las claves sensibles se redactan y nunca se registran en claro."""
    record = logging.LogRecord(
        name="servicio-ia",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="evento",
        args=(),
        exc_info=None,
    )
    record.extra_fields = {  # type: ignore[attr-defined]
        "password": "super-secreto",
        "token": "abc123",
        "salt": "xyz",
        "usuario": "ana",
        "anidado": {"jwt": "qqq", "ok": 1},
    }

    payload = json.loads(JsonLogFormatter().format(record))

    assert payload["password"] == "[Redacted]"
    assert payload["token"] == "[Redacted]"
    assert payload["salt"] == "[Redacted]"
    assert payload["usuario"] == "ana"
    assert payload["anidado"]["jwt"] == "[Redacted]"
    assert payload["anidado"]["ok"] == 1
    # Ningún secreto aparece en la cadena serializada.
    assert "super-secreto" not in payload_text(payload)
    assert "abc123" not in payload_text(payload)


def payload_text(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False)


def test_configurar_logging_respeta_log_level(monkeypatch: pytest.MonkeyPatch) -> None:
    """``LOG_LEVEL`` controla el nivel del logger raíz."""
    monkeypatch.setenv("LOG_LEVEL", "WARNING")
    configurar_logging()
    assert logging.getLogger().level == logging.WARNING


def test_sentry_es_noop_sin_dsn(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sin ``SENTRY_DSN`` la inicialización de Sentry es no-op."""
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    assert inicializar_sentry() is False


def test_sentry_es_noop_con_dsn_en_blanco(monkeypatch: pytest.MonkeyPatch) -> None:
    """Un ``SENTRY_DSN`` en blanco también deja la captura como no-op."""
    monkeypatch.setenv("SENTRY_DSN", "   ")
    assert inicializar_sentry() is False
