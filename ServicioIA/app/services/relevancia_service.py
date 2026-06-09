"""Servicio del ``Filtro_Relevancia`` (clasificador PRIMARIO) del Servicio_IA.

Separa señal vs ruido: clasifica cada item (post/comentario) ya anonimizado como
**contributivo** o **no-contributivo**, devolviendo una PARTICIÓN sin solape que
conserva el orden de entrada (Req. 34.1, 34.6). El contenido no-contributivo se
marca, NO se elimina.

Replica EXACTAMENTE el contrato y la heurística determinista del fallback TS
(``ServidorGDS/src/modules/analisis/filtroRelevancia.ts``), de modo que ambas
implementaciones son intercambiables sin tocar el ``Pipeline_Analisis``:

**Criterio base (señal vs ruido).** No usa diccionario de palabras "relevantes";
deriva la clasificación de features ESTRUCTURALES del texto (palabras informativas
frente a contenido vacío, simbólico o compuesto solo por marcadores como
hashtags/menciones). Heurística conservadora y determinista.

Diseño orientado a pruebas: la *clasificación por item* está detrás de un
``classifier_factory`` inyectable, de modo que las pruebas (o una futura
implementación basada en la ``Capa_ML``) puedan sustituir el clasificador por un
**doble determinista** sin descargar pesos ni usar GPU, coherente con el resto
del servicio.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, Protocol, runtime_checkable

from ..models.relevancia import Contributividad

# Número mínimo de letras de un token para considerarlo "palabra informativa"
# (espejo de ``MIN_LONGITUD_PALABRA`` en el fallback TS).
MIN_LONGITUD_PALABRA = 2

# Marcadores: hashtags (#...) y menciones (@...) seguidos de no-espacios.
_RE_MARCADORES = re.compile(r"[#@]\S+", re.UNICODE)
# Palabras informativas: secuencias de >= MIN_LONGITUD_PALABRA letras Unicode.
# ``[^\W\d_]`` = caracteres de palabra que no son dígitos ni '_', es decir letras
# (incluye acentos y no-ASCII), espejo de ``\p{L}`` del fallback TS.
_RE_PALABRAS = re.compile(rf"[^\W\d_]{{{MIN_LONGITUD_PALABRA},}}", re.UNICODE)


def quitar_marcadores(texto: str) -> str:
    """Reemplaza hashtags y menciones por espacios (no aportan señal informativa)."""
    return _RE_MARCADORES.sub(" ", texto)


def contar_palabras_informativas(texto: str) -> int:
    """Cuenta palabras informativas (>= 2 letras) tras retirar marcadores."""
    return len(_RE_PALABRAS.findall(quitar_marcadores(texto)))


def tiene_marcadores(texto: str) -> bool:
    """Indica si el texto contiene al menos un hashtag o mención."""
    return _RE_MARCADORES.search(texto) is not None


@dataclass(frozen=True)
class Clasificacion:
    """Resultado de clasificar un item: etiqueta + motivo."""

    contributividad: Contributividad
    motivo: str


@runtime_checkable
class Classifier(Protocol):
    """Clasificador de un item por su texto (contrato mínimo, inyectable)."""

    def classify(self, texto: str) -> Clasificacion:
        """Clasifica ``texto`` como contributivo/no-contributivo con su motivo."""
        ...


class _HeuristicClassifier:
    """Clasificador determinista base (espejo de ``clasificarItem`` del fallback TS)."""

    def classify(self, texto: str) -> Clasificacion:
        recortado = texto.strip()

        if not recortado:
            return Clasificacion(
                contributividad=Contributividad.NO_CONTRIBUTIVO,
                motivo="contenido vacio: sin texto",
            )

        palabras = contar_palabras_informativas(recortado)
        if palabras == 0:
            motivo = (
                "solo marcadores (hashtags/menciones) sin texto informativo"
                if tiene_marcadores(recortado)
                else "sin palabras informativas (contenido simbolico/ruido)"
            )
            return Clasificacion(
                contributividad=Contributividad.NO_CONTRIBUTIVO,
                motivo=motivo,
            )

        return Clasificacion(
            contributividad=Contributividad.CONTRIBUTIVO,
            motivo=f"senal textual suficiente ({palabras} palabra(s) informativa(s))",
        )


def default_classifier_factory() -> Classifier:
    """Construye el clasificador heurístico determinista por defecto."""
    return _HeuristicClassifier()


@dataclass(frozen=True)
class ItemEntrada:
    """Item plano a clasificar: ``{ refId, texto }``."""

    refId: str
    texto: str


@dataclass(frozen=True)
class ItemResultado:
    """Item clasificado: ``{ refId, contributividad, motivo }``."""

    refId: str
    contributividad: Contributividad
    motivo: str


@dataclass(frozen=True)
class RelevanciaResult:
    """Partición sin solape de items en contributivos / no-contributivos."""

    contributivos: list[ItemResultado]
    noContributivos: list[ItemResultado]


class RelevanciaService:
    """Clasifica items en contributivo/no-contributivo (Filtro_Relevancia primario)."""

    def __init__(
        self,
        *,
        classifier_factory: Callable[[], Classifier] | None = None,
    ) -> None:
        factory = classifier_factory or default_classifier_factory
        self._classifier: Classifier = factory()

    def clasificar(self, items: list[ItemEntrada]) -> RelevanciaResult:
        """Clasifica todos los ``items`` repartiéndolos en una partición sin solape.

        Cada item aparece exactamente una vez, en ``contributivos`` o en
        ``noContributivos``, conservando el orden de entrada (Req. 34.1, 34.2,
        34.3). Una lista vacía produce dos listas vacías.
        """
        contributivos: list[ItemResultado] = []
        no_contributivos: list[ItemResultado] = []

        for item in items:
            clas = self._classifier.classify(item.texto)
            resultado = ItemResultado(
                refId=item.refId,
                contributividad=clas.contributividad,
                motivo=clas.motivo,
            )
            if clas.contributividad == Contributividad.CONTRIBUTIVO:
                contributivos.append(resultado)
            else:
                no_contributivos.append(resultado)

        return RelevanciaResult(
            contributivos=contributivos,
            noContributivos=no_contributivos,
        )
