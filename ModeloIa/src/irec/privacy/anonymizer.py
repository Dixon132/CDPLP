from __future__ import annotations

import hashlib
import logging
import re
from typing import Optional

from src.irec.privacy.pii_detector import PIICategory, detect_pii

logger = logging.getLogger(__name__)

# Replacement tokens for each PII category
PII_TOKEN_MAP = {
    PIICategory.EMAIL: "[CORREO]",
    PIICategory.PHONE: "[TELEFONO]",
    PIICategory.CREDIT_CARD: "[TARJETA]",
    PIICategory.URL: "[URL]",
    PIICategory.IP: "[IP]",
    PIICategory.DOCUMENT: "[DOCUMENTO]",
    PIICategory.FULL_NAME: "[PERSONA]",
}


def anonymize_text(text: str) -> tuple[str, list[dict]]:
    """Anonymize PII in text by replacing with category tokens.

    Replaces emails → [CORREO], phones → [TELEFONO], names → [PERSONA], etc.

    Args:
        text: Text potentially containing PII.

    Returns:
        Tuple of (anonymized_text, list_of_findings).
    """
    if not text:
        return text, []

    findings = detect_pii(text)
    if not findings:
        return text, []

    # Sort findings by start position (reverse order to preserve indices)
    findings.sort(key=lambda f: f["start"], reverse=True)
    anonymized = text

    for finding in findings:
        token = PII_TOKEN_MAP.get(finding["category"], "[PII]")
        start, end = finding["start"], finding["end"]
        anonymized = anonymized[:start] + token + anonymized[end:]

    return anonymized, list(reversed(findings))


def hash_user_identifier(value: str, salt: str = "cdplp_irec_2026") -> str:
    """Create a non-reversible hash of a user identifier.

    Args:
        value: Original user identifier.
        salt: Application-specific salt.

    Returns:
        Pseudonymous hash string.
    """
    return f"pseudo_{hashlib.sha256(f'{salt}:{value}'.encode()).hexdigest()[:12]}"


def mask_entities(
    text: str,
    entities: list[str],
    mask_token: str = "[ENTIDAD]",
) -> str:
    """Mask specific entities in text.

    Args:
        text: Text to mask.
        entities: List of entity strings to mask.
        mask_token: Token to replace entities with.

    Returns:
        Masked text.
    """
    masked = text
    for entity in sorted(entities, key=len, reverse=True):
        # Escape regex special chars
        escaped = re.escape(entity)
        masked = re.sub(escaped, mask_token, masked)
    return masked


def strip_location_precision(location: str) -> str:
    """Generalize a location string to protect privacy.

    Examples:
        "Av. Siempre Viva 742, Springfield" → "Springfield"
        "Calle 123 #45-67, Bogotá" → "Bogotá"

    Args:
        location: Specific location string.

    Returns:
        Generalized location (city/region only).
    """
    if not location:
        return location

    parts = [p.strip() for p in location.split(",")]
    if len(parts) > 1:
        return parts[-1]
    return location
