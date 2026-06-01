from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Emoji-to-label mapping for common emotional emojis
# Format: emoji_char → semantic_label
EMOJI_LABEL_MAP: dict[str, str] = {
    # Tristeza / llanto
    "😭": "emoji_llanto",
    "😢": "emoji_llanto",
    "😥": "emoji_tristeza",
    "😰": "emoji_ansiedad",
    "😓": "emoji_cansancio",
    "😞": "emoji_tristeza",
    "😔": "emoji_tristeza",
    "😟": "emoji_preocupacion",
    "😕": "emoji_confusion",
    "🥺": "emoji_suplica",
    "😿": "emoji_tristeza",
    "💔": "emoji_corazon_roto",
    # Ira / frustración
    "😡": "emoji_ira",
    "😠": "emoji_enojo",
    "🤬": "emoji_enojo_intenso",
    "💢": "emoji_ira",
    # Miedo / ansiedad
    "😨": "emoji_miedo",
    "😱": "emoji_shock",
    "😖": "emoji_angustia",
    "😣": "emoji_estres",
    "😩": "emoji_agotamiento",
    "😫": "emoji_agotamiento",
    "🥵": "emoji_sobrecarga",
    # Cansancio
    "😴": "emoji_sueno",
    "🥱": "emoji_cansancio",
    "😪": "emoji_cansancio",
    # Vergüenza
    "😳": "emoji_verguenza",
    "😬": "emoji_incomodidad",
    # Muerte metafórica / humor negro
    "💀": "emoji_muerte_metaforica",
    "☠️": "emoji_muerte_metaforica",
    # Positivos / protectores
    "😂": "emoji_risa",
    "🤣": "emoji_risa_intensa",
    "😊": "emoji_felicidad",
    "😄": "emoji_alegria",
    "🥰": "emoji_amor",
    "❤️": "emoji_amor",
    "💪": "emoji_fuerza",
    "🙏": "emoji_gratitud",
    "✨": "emoji_esperanza",
    "🌟": "emoji_esperanza",
    "💖": "emoji_apoyo",
    "🤗": "emoji_apoyo",
    "🫂": "emoji_abrazo",
    # Sarcasmo / humor
    "🙃": "emoji_sarcasmo",
    "🫠": "emoji_derretido",
    "🤡": "emoji_payaso",
    # Estudio / academia
    "📚": "emoji_estudio",
    "📝": "emoji_estudio",
    "🎓": "emoji_graduacion",
    "📖": "emoji_estudio",
    "✍️": "emoji_escritura",
    "💻": "emoji_computadora",
    "☕": "emoji_cafe",
}


def normalize_emoji(text: str) -> str:
    """Replace emojis with their semantic labels.

    Example:
        "no puedo más 😭😭" → "no puedo más emoji_llanto emoji_llanto"

    Args:
        text: Text possibly containing emojis.

    Returns:
        Text with emojis replaced by labels.
    """
    if not text:
        return ""

    result = []
    for char in text:
        if char in EMOJI_LABEL_MAP:
            result.append(f" {EMOJI_LABEL_MAP[char]} ")
        else:
            result.append(char)

    return "".join(result)


def extract_emotion_emojis(text: str) -> list[str]:
    """Extract only emotional-category emojis from text.

    Returns:
        List of emoji label strings found in the text.
    """
    labels: list[str] = []
    for char in text:
        if char in EMOJI_LABEL_MAP:
            labels.append(EMOJI_LABEL_MAP[char])
    return labels


def count_emoji_categories(text: str) -> dict[str, int]:
    """Count emojis by emotion category.

    Returns:
        Dict with counts per category.
    """
    categories: dict[str, int] = {}
    for char in text:
        if char in EMOJI_LABEL_MAP:
            label = EMOJI_LABEL_MAP[char]
            cat = label.split("_")[1] if "_" in label else "other"
            categories[cat] = categories.get(cat, 0) + 1
    return categories
