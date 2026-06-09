"""Observabilidad del Servicio_IA (Servicio_Observabilidad).

Provee:

- **Logging estructurado** (JSON) sobre la librería estándar ``logging``, sin
  dependencias pesadas, con redacción de claves sensibles para no registrar
  secretos (Req. 23, 41.1).
- **Captura de errores con Sentry**, **guardada por la variable de entorno
  ``SENTRY_DSN``**: cuando no hay DSN (dev/test/CI) la inicialización es no-op,
  de modo que el servicio arranca y ``pytest`` corre sin requerir Sentry
  (Req. 41.2). La importación de ``sentry_sdk`` es perezosa y tolerante a su
  ausencia.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

# Claves sensibles que nunca deben aparecer en claro en los logs.
_CLAVES_SENSIBLES = {
    "password",
    "pass",
    "token",
    "access_token",
    "refresh_token",
    "jwt",
    "authorization",
    "secret",
    "api_key",
    "apikey",
    "salt",
    "dsn",
    "database_url",
}

_REDACTADO = "[Redacted]"


def _redactar(valor: Any) -> Any:
    """Redacta recursivamente claves sensibles de dicts/listas."""
    if isinstance(valor, dict):
        return {
            k: (_REDACTADO if k.lower() in _CLAVES_SENSIBLES else _redactar(v))
            for k, v in valor.items()
        }
    if isinstance(valor, (list, tuple)):
        return [_redactar(v) for v in valor]
    return valor


class JsonLogFormatter(logging.Formatter):
    """Formatea cada registro como una línea JSON estructurada."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "service": "servicio-ia",
            "message": record.getMessage(),
        }
        # Campos extra no estándar adjuntos al registro (redactados).
        extra = getattr(record, "extra_fields", None)
        if isinstance(extra, dict):
            payload.update(_redactar(extra))
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configurar_logging(nivel: str | None = None) -> logging.Logger:
    """Configura el logging estructurado JSON del servicio.

    El nivel se toma de ``LOG_LEVEL`` (``INFO`` por defecto). Idempotente: no
    duplica handlers si ya se configuró.
    """
    nivel_efectivo = (nivel or os.getenv("LOG_LEVEL") or "INFO").upper()
    root = logging.getLogger()
    root.setLevel(nivel_efectivo)

    # Reemplaza handlers por uno estructurado (evita duplicados en reload).
    ya_estructurado = any(
        isinstance(h.formatter, JsonLogFormatter) for h in root.handlers
    )
    if not ya_estructurado:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonLogFormatter())
        root.handlers = [handler]

    return logging.getLogger("servicio-ia")


def inicializar_sentry() -> bool:
    """Inicializa Sentry si hay ``SENTRY_DSN``; si no, es no-op.

    Devuelve ``True`` si Sentry quedó activo, ``False`` en caso contrario
    (incluida la ausencia de la dependencia ``sentry_sdk``).
    """
    dsn = (os.getenv("SENTRY_DSN") or "").strip()
    if not dsn:
        return False

    try:  # Importación perezosa y tolerante a ausencia de la dependencia.
        import sentry_sdk
    except ImportError:  # pragma: no cover - depende del entorno de despliegue
        logging.getLogger("servicio-ia").warning(
            "SENTRY_DSN definido pero sentry_sdk no esta instalado; captura desactivada",
        )
        return False

    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0") or 0),
        send_default_pii=False,
    )
    return True


def configurar_observabilidad() -> logging.Logger:
    """Configura logging estructurado e inicializa Sentry (guardado por env)."""
    logger = configurar_logging()
    inicializar_sentry()
    return logger
