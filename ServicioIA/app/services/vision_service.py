"""Servicio de visión computacional (``Vision_Engine``) del Servicio_IA.

El ``Vision_Engine`` existe **desde v1** dentro del ``Servicio_IA`` y procesa el
campo ``image_description`` (texto simulado por Gemini) devolviendo una
estructura estable ``{ scene, objects[], emotion_context }`` (Req. 15.1, 37.2).

Principios de diseño (Req. 15.3, 37.2, 37.3):

- **Derivación real, sin plantillas vacías:** la salida se deriva
  *exclusivamente* del ``image_description`` recibido (escena, objetos y
  contexto emocional reales del texto). Nunca devuelve respuestas vacías ni
  cadenas/plantillas fijas independientes de la entrada.
- **Contrato estable preparado para imágenes reales:** el motor analiza detrás
  de un :class:`VisionAnalyzer` **inyectable**. En v1 el analizador por defecto
  trabaja sobre texto; a futuro puede inyectarse un analizador de imágenes
  reales (LLaVA, Qwen2-VL, Florence-2, BLIP-2, EasyOCR) que transforme la imagen
  en una explicación de texto con **el mismo contrato**, sin tocar el pipeline.
- **Orientado a pruebas:** la construcción del analizador real (modelos pesados)
  vive detrás de una *factory* inyectable, de modo que las pruebas usen un doble
  determinista sin descargar pesos ni usar GPU.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, Protocol, runtime_checkable

# Nombre del motor por defecto en v1 (analizador de descripción textual).
DEFAULT_VISION_ENGINE = "text-description-v1"

# Palabras vacías (ES/EN) que no son objetos/entidades visuales relevantes.
_STOPWORDS: frozenset[str] = frozenset(
    {
        # Español
        "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del",
        "al", "a", "en", "con", "por", "para", "sin", "sobre", "tras", "y", "o",
        "u", "e", "que", "se", "su", "sus", "le", "les", "lo", "es", "son",
        "está", "estan", "están", "muy", "más", "mas", "menos", "como", "pero",
        "ni", "no", "si", "sí", "ya", "este", "esta", "estos", "estas", "ese",
        "esa", "esos", "esas", "donde", "cuando", "porque", "hay", "ser", "fue",
        "han", "hacia", "desde", "entre", "todo", "toda", "todos", "todas",
        # Inglés
        "the", "a", "an", "of", "in", "on", "with", "by", "for", "and", "or",
        "to", "is", "are", "was", "were", "be", "been", "this", "that", "these",
        "those", "there", "here", "from", "into", "over", "under", "at", "as",
        "it", "its", "their", "his", "her", "they", "very", "more", "less",
        "but", "not", "no", "yes", "all", "some", "any", "has", "have", "had",
    }
)

# Léxico emocional (ES/EN) → categoría de emoción. Permite derivar el
# ``emotion_context`` a partir de señales presentes en la descripción.
_EMOTION_LEXICON: dict[str, str] = {
    # alegría / positivo
    "alegría": "alegría", "alegria": "alegría", "alegre": "alegría",
    "feliz": "alegría", "felicidad": "alegría", "contento": "alegría",
    "contenta": "alegría", "sonrisa": "alegría", "sonriendo": "alegría",
    "risa": "alegría", "celebración": "alegría", "celebracion": "alegría",
    "happy": "alegría", "joy": "alegría", "smile": "alegría",
    "smiling": "alegría", "cheerful": "alegría",
    # tristeza
    "triste": "tristeza", "tristeza": "tristeza", "llanto": "tristeza",
    "llorando": "tristeza", "lágrimas": "tristeza", "lagrimas": "tristeza",
    "deprimido": "tristeza", "sad": "tristeza", "crying": "tristeza",
    "tears": "tristeza", "sorrow": "tristeza",
    # enojo
    "enojo": "enojo", "enojado": "enojo", "enojada": "enojo", "ira": "enojo",
    "furioso": "enojo", "furia": "enojo", "rabia": "enojo", "molesto": "enojo",
    "angry": "enojo", "anger": "enojo", "rage": "enojo", "furious": "enojo",
    # miedo
    "miedo": "miedo", "temor": "miedo", "asustado": "miedo", "asustada": "miedo",
    "pánico": "miedo", "panico": "miedo", "terror": "miedo", "fear": "miedo",
    "scared": "miedo", "afraid": "miedo", "panic": "miedo",
    # sorpresa
    "sorpresa": "sorpresa", "asombro": "sorpresa", "sorprendido": "sorpresa",
    "sorprendida": "sorpresa", "surprise": "sorpresa", "surprised": "sorpresa",
    "amazed": "sorpresa",
    # asco
    "asco": "asco", "disgusto": "asco", "repugnancia": "asco",
    "disgust": "asco", "disgusted": "asco",
    # tensión / conflicto
    "tensión": "tensión", "tension": "tensión", "conflicto": "tensión",
    "protesta": "tensión", "enfrentamiento": "tensión", "disputa": "tensión",
    "violencia": "tensión", "conflict": "tensión", "protest": "tensión",
    "clash": "tensión", "violence": "tensión",
    # calma / neutral positivo
    "calma": "calma", "tranquilo": "calma", "tranquila": "calma",
    "tranquilidad": "calma", "paz": "calma", "sereno": "calma",
    "calm": "calma", "peaceful": "calma", "serene": "calma",
}

# Polaridad por categoría emocional, para resumir el tono general.
_EMOTION_POLARITY: dict[str, str] = {
    "alegría": "positivo",
    "calma": "positivo",
    "sorpresa": "neutral",
    "tristeza": "negativo",
    "enojo": "negativo",
    "miedo": "negativo",
    "asco": "negativo",
    "tensión": "negativo",
}

_TOKEN_RE = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")
_SENTENCE_SPLIT_RE = re.compile(r"[.!?\n]+")


@dataclass(frozen=True)
class VisionAnalysis:
    """Resultado del ``Vision_Engine``: escena, objetos y contexto emocional."""

    scene: str
    objects: list[str]
    emotion_context: str


@runtime_checkable
class VisionAnalyzer(Protocol):
    """Analizador visual inyectable (contrato estable del ``Vision_Engine``).

    En v1 el analizador por defecto deriva la salida del ``image_description``
    textual. A futuro, un analizador de imágenes reales (LLaVA/Qwen2-VL/
    Florence-2/BLIP-2/EasyOCR) implementa este mismo contrato transformando la
    imagen en una explicación de texto, sin requerir cambios aguas arriba.
    """

    def analyze(self, image_description: str) -> VisionAnalysis:
        """Deriva ``{ scene, objects[], emotion_context }`` de la descripción."""
        ...


def _normalize_whitespace(text: str) -> str:
    """Colapsa espacios en blanco repetidos a un único espacio."""
    return " ".join(text.split())


def _derive_scene(description: str) -> str:
    """Deriva la escena: primera oración significativa de la descripción.

    Se basa en el contenido real del texto (no en una plantilla). Si la
    descripción tiene varias oraciones, se toma la primera como resumen de la
    escena; en caso contrario, la descripción normalizada completa.
    """
    normalized = _normalize_whitespace(description)
    for fragment in _SENTENCE_SPLIT_RE.split(normalized):
        candidate = fragment.strip()
        if candidate:
            return candidate
    return normalized


def _derive_objects(description: str) -> list[str]:
    """Deriva los objetos/entidades visuales: tokens de contenido únicos.

    Filtra palabras vacías y muy cortas, y elimina duplicados conservando el
    orden de aparición. Refleja los elementos realmente mencionados en la
    descripción (no una lista fija).
    """
    objects: list[str] = []
    seen: set[str] = set()
    for match in _TOKEN_RE.findall(description):
        token = match.lower()
        if len(token) < 3 or token in _STOPWORDS:
            continue
        if token in seen:
            continue
        seen.add(token)
        objects.append(token)
    return objects


def _emotion_for_token(token: str) -> str | None:
    """Resuelve la categoría emocional de un token con normalización ligera.

    Maneja flexiones frecuentes del español (plural/género) sin depender de un
    lematizador pesado: prueba el token tal cual y variantes sin sufijos de
    plural (``-s``, ``-es``, ``-ces`` → ``-z`` como en *felices→feliz*).
    """
    candidatos = [token]
    if token.endswith("ces"):
        candidatos.append(token[:-3] + "z")
    if token.endswith("es"):
        candidatos.append(token[:-2])
    if token.endswith("s"):
        candidatos.append(token[:-1])
    for candidato in candidatos:
        categoria = _EMOTION_LEXICON.get(candidato)
        if categoria is not None:
            return categoria
    return None


def _derive_emotion_context(description: str) -> str:
    """Deriva el contexto emocional a partir de señales del texto.

    Detecta categorías emocionales presentes en la descripción y resume su
    polaridad. Cuando no hay señales emocionales explícitas, devuelve una
    descripción derivada del propio texto (tono neutral observado), nunca una
    plantilla vacía o ajena a la entrada.
    """
    detected: list[str] = []
    for match in _TOKEN_RE.findall(description):
        categoria = _emotion_for_token(match.lower())
        if categoria and categoria not in detected:
            detected.append(categoria)

    if not detected:
        return "tono neutral; sin señales emocionales explícitas en la descripción"

    polaridades = {_EMOTION_POLARITY[c] for c in detected}
    if polaridades == {"positivo"}:
        tono = "positivo"
    elif polaridades == {"negativo"}:
        tono = "negativo"
    elif "negativo" in polaridades and "positivo" in polaridades:
        tono = "mixto"
    else:
        tono = "neutral"

    emociones = ", ".join(detected)
    return f"tono {tono}; emociones detectadas: {emociones}"


class TextDescriptionVisionAnalyzer:
    """Analizador por defecto (v1): deriva la salida del texto ``image_description``.

    No descarga modelos ni usa GPU; es determinista y deriva la escena, los
    objetos y el contexto emocional **del contenido real** de la descripción.
    """

    name = DEFAULT_VISION_ENGINE

    def analyze(self, image_description: str) -> VisionAnalysis:
        return VisionAnalysis(
            scene=_derive_scene(image_description),
            objects=_derive_objects(image_description),
            emotion_context=_derive_emotion_context(image_description),
        )


def default_analyzer_factory() -> VisionAnalyzer:
    """Construye el analizador por defecto del ``Vision_Engine`` (texto v1).

    A futuro, una factory alternativa puede construir un analizador de imágenes
    reales detrás del mismo contrato sin cambios aguas arriba.
    """
    return TextDescriptionVisionAnalyzer()


class VisionService:
    """``Vision_Engine``: deriva ``{ scene, objects[], emotion_context }``.

    Delega el análisis en un :class:`VisionAnalyzer` inyectable (texto en v1,
    imágenes reales a futuro). Valida que ``image_description`` no sea vacío para
    garantizar una derivación real, nunca una respuesta vacía (Req. 15.3, 37.2).
    """

    def __init__(
        self,
        *,
        analyzer: VisionAnalyzer | None = None,
        analyzer_factory: Callable[[], VisionAnalyzer] | None = None,
    ) -> None:
        if analyzer is not None:
            self._analyzer = analyzer
        else:
            factory = analyzer_factory or default_analyzer_factory
            self._analyzer = factory()

    def analyze(self, image_description: str) -> VisionAnalysis:
        """Analiza la descripción visual y devuelve la estructura del contrato.

        Lanza :class:`ValueError` si la descripción está vacía o en blanco: el
        ``Vision_Engine`` deriva su salida exclusivamente de la descripción y no
        produce respuestas vacías ni plantillas por defecto.
        """
        if not isinstance(image_description, str) or not image_description.strip():
            raise ValueError(
                "'image_description' es obligatorio y no puede estar vacío: el "
                "Vision_Engine deriva su salida exclusivamente de la descripción."
            )
        return self._analyzer.analyze(image_description)
