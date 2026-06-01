from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# Patterns for PII detection
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_PATTERN = re.compile(
    r"(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}"
)
CREDIT_CARD_PATTERN = re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b")
URL_PATTERN = re.compile(r"https?://[^\s]+")
IP_PATTERN = re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b")
DOCUMENT_ID_PATTERN = re.compile(
    r"\b(DNI|C\.?C\.?|pasaporte|ID)[\s:#]*[\d\w]+\b",
    re.IGNORECASE,
)
FULL_NAME_PATTERN = re.compile(
    r"\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?\b"
)


class PIICategory:
    EMAIL = "email"
    PHONE = "phone"
    CREDIT_CARD = "credit_card"
    URL = "personal_url"
    IP = "ip_address"
    DOCUMENT = "document_id"
    FULL_NAME = "full_name"


def detect_pii(text: str) -> list[dict]:
    """Detect personally identifiable information in text.

    Args:
        text: Text to scan for PII.

    Returns:
        List of dicts with {category, value, start, end}.
    """
    findings: list[dict] = []

    # Emails
    for match in EMAIL_PATTERN.finditer(text):
        findings.append({
            "category": PIICategory.EMAIL,
            "value": match.group(),
            "start": match.start(),
            "end": match.end(),
        })

    # Phones
    for match in PHONE_PATTERN.finditer(text):
        phone = match.group().strip()
        # Filter short matches that are likely not phones
        if len(re.sub(r"\D", "", phone)) >= 7:
            findings.append({
                "category": PIICategory.PHONE,
                "value": phone,
                "start": match.start(),
                "end": match.end(),
            })

    # Credit cards
    for match in CREDIT_CARD_PATTERN.finditer(text):
        findings.append({
            "category": PIICategory.CREDIT_CARD,
            "value": match.group(),
            "start": match.start(),
            "end": match.end(),
        })

    # Document IDs
    for match in DOCUMENT_ID_PATTERN.finditer(text):
        findings.append({
            "category": PIICategory.DOCUMENT,
            "value": match.group(),
            "start": match.start(),
            "end": match.end(),
        })

    # IP addresses
    for match in IP_PATTERN.finditer(text):
        findings.append({
            "category": PIICategory.IP,
            "value": match.group(),
            "start": match.start(),
            "end": match.end(),
        })

    # Full names (high false positive rate; use with caution)
    # Only flag if there's context suggesting it's a person
    name_context = re.findall(
        r"(?:profesor|profesora|doctor|doctora|licenciado|licenciada|ingeniero|ingeniera)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)",
        text,
    )
    for name in name_context:
        findings.append({
            "category": PIICategory.FULL_NAME,
            "value": name,
            "start": text.find(name),
            "end": text.find(name) + len(name),
        })

    return findings


def has_pii(text: str, min_confidence: float = 0.0) -> bool:
    """Quick check if text contains any PII.

    Args:
        text: Text to check.
        min_confidence: Ignored (all regex detections are high confidence).

    Returns:
        True if PII detected.
    """
    if not text:
        return False
    return bool(
        EMAIL_PATTERN.search(text)
        or PHONE_PATTERN.search(text)
        or DOCUMENT_ID_PATTERN.search(text)
    )
