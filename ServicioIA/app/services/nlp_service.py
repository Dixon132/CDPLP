"""Servicio de NLP del Servicio_IA (Transformers + spaCy + NLTK).

Implementa el ``Servicio_NLP`` (Req. 14.1–14.4) sobre contenido **anonimizado**
y **contributivo**:

- **14.1** análisis semántico, detección emocional y clasificación temática;
- **14.2** extracción de causas, eventos y detonantes;
- **14.3** agrupamiento temático y análisis conversacional;
- **14.4** interpretación de tendencias del texto.

La salida es siempre **colectiva**, nunca diagnóstico individual.

Diseño orientado a pruebas
--------------------------
El uso de los modelos pesados (pipelines de *Transformers* para emoción, NER de
*spaCy* y tokenización de *NLTK*) vive detrás de un :class:`NlpAnalyzer`
inyectable construido por un ``analyzer_factory``. En producción se usa el
analizador real (importación perezosa de las librerías pesadas); en pruebas se
inyecta un **doble determinista** que no descarga pesos ni usa GPU, coherente
con el doble del cargador de modelos del ``conftest``.

El analizador solo aporta las *primitivas* dependientes de modelo (emoción por
texto, entidades por texto y tokenización). La orquestación —agregación
emocional, agrupamiento temático, causas/eventos, métricas conversacionales y la
interpretación de tendencias— es **determinista** y, por tanto, testeable sin
modelos pesados.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Callable, Protocol, runtime_checkable

# --- Recursos lingüísticos deterministas (es-AND) ---------------------------
# Conectores causales: marcan fragmentos que expresan causa/detonante (Req. 14.2).
CAUSAL_CUES: tuple[str, ...] = (
    "porque",
    "debido a",
    "por culpa de",
    "ya que",
    "a causa de",
    "gracias a",
    "por eso",
    "dado que",
    "puesto que",
)

# Palabras clave de eventos del entorno educativo (Req. 14.2).
EVENT_CUES: tuple[str, ...] = (
    "examen",
    "examenes",
    "prueba",
    "parcial",
    "final",
    "entrega",
    "proyecto",
    "paro",
    "marcha",
    "bloqueo",
    "feria",
    "evaluacion",
    "evaluación",
    "reunion",
    "reunión",
    "partido",
    "fiesta",
    "viaje",
    "huelga",
)

# Stopwords mínimas en español para los términos clave / temas.
STOPWORDS_ES: frozenset[str] = frozenset(
    {
        "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "u",
        "de", "del", "a", "al", "en", "que", "se", "su", "sus", "lo", "le",
        "les", "me", "mi", "te", "tu", "es", "son", "fue", "ser", "por", "con",
        "para", "como", "más", "mas", "pero", "no", "si", "sí", "ya", "muy",
        "este", "esta", "esto", "ese", "esa", "eso", "yo", "él", "el", "ella",
        "nos", "ni", "porque", "cuando", "donde", "hay", "han", "he", "ha",
        "todo", "toda", "todos", "todas", "nada", "algo", "del", "uno",
    }
)

# Stopwords en inglés: el contenido sintético se genera en inglés para el modelo
# de emociones, por lo que los términos clave deben filtrar las palabras vacías
# inglesas (artículos, pronombres, auxiliares, conectores) para que los "temas"
# sean significativos y no ruido como "the, just, can, like".
STOPWORDS_EN: frozenset[str] = frozenset(
    {
        "the", "a", "an", "and", "or", "but", "if", "of", "at", "by", "for",
        "with", "about", "against", "between", "into", "through", "during",
        "to", "from", "up", "down", "in", "out", "on", "off", "over", "under",
        "again", "further", "then", "once", "here", "there", "when", "where",
        "why", "how", "all", "any", "both", "each", "few", "more", "most",
        "other", "some", "such", "no", "nor", "not", "only", "own", "same",
        "so", "than", "too", "very", "can", "will", "just", "should", "now",
        "is", "am", "are", "was", "were", "be", "been", "being", "have", "has",
        "had", "having", "do", "does", "did", "doing", "would", "could",
        "this", "that", "these", "those", "i", "you", "he", "she", "it", "we",
        "they", "them", "his", "her", "its", "our", "their", "my", "your",
        "me", "him", "us", "what", "which", "who", "whom", "as", "like", "even",
        "get", "got", "really", "much", "many", "lot", "one", "also", "still",
        "yeah", "okay", "ok", "im", "dont", "didnt", "cant", "thats", "gonna",
    }
)

# Conjunto combinado usado para filtrar términos clave en ambos idiomas.
STOPWORDS: frozenset[str] = STOPWORDS_ES | STOPWORDS_EN


@dataclass(frozen=True)
class EmocionTexto:
    """Emoción de un fragmento individual (primitiva del analizador)."""

    etiqueta: str
    puntuacion: float
    distribucion: dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class EntidadTexto:
    """Entidad nombrada de un fragmento (primitiva del analizador)."""

    texto: str
    tipo: str


@runtime_checkable
class NlpAnalyzer(Protocol):
    """Primitivas dependientes de modelo (Transformers/spaCy/NLTK), inyectables."""

    def emociones(self, textos: list[str]) -> list[EmocionTexto]:
        """Emoción por fragmento (pipeline de *Transformers*)."""
        ...

    def entidades(self, textos: list[str]) -> list[list[EntidadTexto]]:
        """Entidades nombradas por fragmento (NER de *spaCy*)."""
        ...

    def tokenizar(self, texto: str) -> list[str]:
        """Tokeniza un texto en palabras en minúscula (NLTK)."""
        ...


# --- Resultados de orquestación (dataclasses internas) ----------------------
@dataclass(frozen=True)
class Conversacional:
    numIntervenciones: int
    longitudPromedio: float
    diversidadLexica: float


@dataclass(frozen=True)
class Semantico:
    resumen: str
    terminosClave: list[str]
    conversacional: Conversacional


@dataclass(frozen=True)
class Emocion:
    etiqueta: str
    puntuacion: float
    distribucion: dict[str, float]


@dataclass(frozen=True)
class Tema:
    etiqueta: str
    peso: float
    miembros: list[int]


@dataclass(frozen=True)
class Entidad:
    texto: str
    tipo: str


@dataclass(frozen=True)
class NlpAnalysis:
    """Resultado completo del análisis NLP (espejo del contrato HTTP)."""

    semantico: Semantico
    emocion: Emocion
    temas: list[Tema]
    entidades: list[Entidad]
    causas: list[str]
    eventos: list[str]
    tendenciasTexto: str


class _TransformersSpacyNltkAnalyzer:
    """Analizador real: *Transformers* (emoción) + *spaCy* (NER) + *NLTK* (tokens).

    Las importaciones de las librerías pesadas son **perezosas** (ocurren al
    construir el analizador, no al importar el módulo), de modo que el servicio
    y las pruebas no requieren dichas librerías ni GPU para cargarse.
    """

    def __init__(
        self,
        *,
        emotion_model: str = "j-hartmann/emotion-english-distilroberta-base",
        spacy_model: str = "es_core_news_sm",
    ) -> None:  # pragma: no cover - requiere pesos reales
        from transformers import pipeline  # import perezoso
        import spacy  # import perezoso
        import nltk  # import perezoso

        try:
            nltk.data.find("tokenizers/punkt")
        except LookupError:
            nltk.download("punkt", quiet=True)

        # NLTK >= 3.9 reemplazó el recurso 'punkt' por 'punkt_tab' para
        # word_tokenize/sent_tokenize. Aseguramos ambos por compatibilidad.
        try:
            nltk.data.find("tokenizers/punkt_tab")
        except LookupError:
            nltk.download("punkt_tab", quiet=True)

        self._emotion = pipeline(
            "text-classification",
            model=emotion_model,
            top_k=None,
            truncation=True,
        )
        try:
            self._nlp = spacy.load(spacy_model)
        except OSError:
            from spacy.cli import download as spacy_download

            spacy_download(spacy_model)
            self._nlp = spacy.load(spacy_model)
        from nltk.tokenize import word_tokenize

        self._word_tokenize = word_tokenize

    def emociones(self, textos: list[str]) -> list[EmocionTexto]:  # pragma: no cover
        salida: list[EmocionTexto] = []
        for resultado in self._emotion(list(textos)):
            puntuaciones = {item["label"].lower(): float(item["score"]) for item in resultado}
            etiqueta = max(puntuaciones, key=puntuaciones.get)
            salida.append(
                EmocionTexto(
                    etiqueta=etiqueta,
                    puntuacion=puntuaciones[etiqueta],
                    distribucion=puntuaciones,
                )
            )
        return salida

    def entidades(self, textos: list[str]) -> list[list[EntidadTexto]]:  # pragma: no cover
        salida: list[list[EntidadTexto]] = []
        for doc in self._nlp.pipe(list(textos)):
            salida.append(
                [EntidadTexto(texto=ent.text, tipo=ent.label_) for ent in doc.ents]
            )
        return salida

    def tokenizar(self, texto: str) -> list[str]:  # pragma: no cover
        return [tok.lower() for tok in self._word_tokenize(texto) if tok.isalpha()]


def default_analyzer_factory() -> NlpAnalyzer:  # pragma: no cover - pesos reales
    """Construye el analizador real (Transformers + spaCy + NLTK)."""
    return _TransformersSpacyNltkAnalyzer()


class NlpService:
    """Orquesta el análisis NLP colectivo sobre contenido contributivo."""

    def __init__(
        self,
        *,
        analyzer_factory: Callable[[], NlpAnalyzer] | None = None,
        max_terminos: int = 8,
        max_temas: int = 5,
    ) -> None:
        self._analyzer_factory = analyzer_factory or default_analyzer_factory
        self._analyzer: NlpAnalyzer | None = None
        self._max_terminos = max_terminos
        self._max_temas = max_temas

    @property
    def analyzer(self) -> NlpAnalyzer:
        """Analizador (construido una sola vez, perezosamente)."""
        if self._analyzer is None:
            self._analyzer = self._analyzer_factory()
        return self._analyzer

    # --- API principal ------------------------------------------------------
    def analizar(self, contenido: list[str]) -> NlpAnalysis:
        """Analiza ``contenido`` y devuelve el resultado colectivo (Req. 14.1–14.4)."""
        if not isinstance(contenido, list) or not all(
            isinstance(c, str) for c in contenido
        ):
            raise ValueError("'contenido' debe ser una lista de cadenas de texto.")

        textos = [c.strip() for c in contenido if c and c.strip()]

        if not textos:
            return NlpAnalysis(
                semantico=Semantico(
                    resumen="Sin contenido contributivo para analizar.",
                    terminosClave=[],
                    conversacional=Conversacional(0, 0.0, 0.0),
                ),
                emocion=Emocion(etiqueta="neutral", puntuacion=0.0, distribucion={}),
                temas=[],
                entidades=[],
                causas=[],
                eventos=[],
                tendenciasTexto="No hay contenido suficiente para interpretar tendencias.",
            )

        tokens_por_texto = [self.analyzer.tokenizar(t) for t in textos]

        emocion = self._agregar_emocion(textos)
        semantico = self._analisis_semantico(tokens_por_texto)
        temas = self._agrupar_temas(tokens_por_texto)
        entidades = self._extraer_entidades(textos)
        causas = self._extraer_causas(textos)
        eventos = self._extraer_eventos(textos, tokens_por_texto)
        tendencias = self._interpretar_tendencias(emocion, temas, len(textos))

        return NlpAnalysis(
            semantico=semantico,
            emocion=emocion,
            temas=temas,
            entidades=entidades,
            causas=causas,
            eventos=eventos,
            tendenciasTexto=tendencias,
        )

    # --- Bloques de orquestación -------------------------------------------
    def _agregar_emocion(self, textos: list[str]) -> Emocion:
        """Agrega las emociones por fragmento en una emoción colectiva (Req. 14.1)."""
        por_texto = self.analyzer.emociones(textos)
        if not por_texto:
            return Emocion(etiqueta="neutral", puntuacion=0.0, distribucion={})

        acumulado: dict[str, float] = {}
        for emo in por_texto:
            dist = emo.distribucion or {emo.etiqueta: emo.puntuacion}
            for etiqueta, valor in dist.items():
                acumulado[etiqueta] = acumulado.get(etiqueta, 0.0) + float(valor)

        total = sum(acumulado.values())
        if total <= 0:
            return Emocion(etiqueta="neutral", puntuacion=0.0, distribucion={})

        distribucion = {k: v / total for k, v in acumulado.items()}
        dominante = max(distribucion, key=distribucion.get)
        return Emocion(
            etiqueta=dominante,
            puntuacion=distribucion[dominante],
            distribucion=distribucion,
        )

    def _analisis_semantico(self, tokens_por_texto: list[list[str]]) -> Semantico:
        """Resumen, términos clave y métricas conversacionales (Req. 14.1, 14.3)."""
        todos = [tok for tokens in tokens_por_texto for tok in tokens]
        contenido_tokens = [t for t in todos if t not in STOPWORDS and len(t) > 2]
        frecuencias = Counter(contenido_tokens)
        terminos = [term for term, _ in frecuencias.most_common(self._max_terminos)]

        num = len(tokens_por_texto)
        longitud_prom = (len(todos) / num) if num else 0.0
        diversidad = (len(set(todos)) / len(todos)) if todos else 0.0

        if terminos:
            resumen = (
                f"Análisis colectivo de {num} intervenciones; "
                f"temas predominantes: {', '.join(terminos[:3])}."
            )
        else:
            resumen = f"Análisis colectivo de {num} intervenciones."

        return Semantico(
            resumen=resumen,
            terminosClave=terminos,
            conversacional=Conversacional(
                numIntervenciones=num,
                longitudPromedio=round(longitud_prom, 4),
                diversidadLexica=round(diversidad, 4),
            ),
        )

    def _agrupar_temas(self, tokens_por_texto: list[list[str]]) -> list[Tema]:
        """Agrupamiento temático determinista por término dominante (Req. 14.3).

        Asigna cada fragmento al término de contenido más frecuente que contiene
        (priorizando los términos más frecuentes del conjunto). Es un
        agrupamiento simple, reproducible y suficiente para el contrato.
        """
        global_freq = Counter(
            tok
            for tokens in tokens_por_texto
            for tok in tokens
            if tok not in STOPWORDS and len(tok) > 2
        )
        if not global_freq:
            return []

        ranking = {term: i for i, (term, _) in enumerate(global_freq.most_common())}

        miembros_por_tema: dict[str, list[int]] = {}
        for idx, tokens in enumerate(tokens_por_texto):
            candidatos = [
                t for t in tokens if t in ranking
            ]
            if not candidatos:
                continue
            etiqueta = min(candidatos, key=lambda t: ranking[t])
            miembros_por_tema.setdefault(etiqueta, []).append(idx)

        total = len(tokens_por_texto)
        temas = [
            Tema(
                etiqueta=etiqueta,
                peso=round(len(miembros) / total, 4) if total else 0.0,
                miembros=miembros,
            )
            for etiqueta, miembros in miembros_por_tema.items()
        ]
        # Orden estable: por peso descendente y luego etiqueta.
        temas.sort(key=lambda t: (-t.peso, t.etiqueta))
        return temas[: self._max_temas]

    def _extraer_entidades(self, textos: list[str]) -> list[Entidad]:
        """Entidades nombradas únicas del conjunto (NER, Req. 14.1/14.2)."""
        por_texto = self.analyzer.entidades(textos)
        vistas: dict[tuple[str, str], Entidad] = {}
        for entidades in por_texto:
            for ent in entidades:
                clave = (ent.texto, ent.tipo)
                if clave not in vistas:
                    vistas[clave] = Entidad(texto=ent.texto, tipo=ent.tipo)
        return list(vistas.values())

    def _extraer_causas(self, textos: list[str]) -> list[str]:
        """Fragmentos que expresan causa/detonante por conectores (Req. 14.2)."""
        causas: list[str] = []
        for texto in textos:
            minus = texto.lower()
            if any(cue in minus for cue in CAUSAL_CUES):
                if texto not in causas:
                    causas.append(texto)
        return causas

    def _extraer_eventos(
        self, textos: list[str], tokens_por_texto: list[list[str]]
    ) -> list[str]:
        """Eventos del entorno educativo por palabras clave (Req. 14.2)."""
        eventos: list[str] = []
        for tokens in tokens_por_texto:
            for tok in tokens:
                if tok in EVENT_CUES and tok not in eventos:
                    eventos.append(tok)
        return eventos

    def _interpretar_tendencias(
        self, emocion: Emocion, temas: list[Tema], num: int
    ) -> str:
        """Interpretación en lenguaje natural de tendencias del texto (Req. 14.4)."""
        partes = [
            f"De las {num} publicaciones analizadas en la comunidad, la emoción "
            f"predominante fue '{emocion.etiqueta}' (presente en el {emocion.puntuacion:.0%} del contenido)."
        ]
        if temas:
            etiquetas = ", ".join(t.etiqueta for t in temas[:3])
            partes.append(f"Los temas con mayor presencia son: {etiquetas}.")
        else:
            partes.append("No se identificaron temas predominantes.")
        return " ".join(partes)
