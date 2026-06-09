/**
 * `Servicio_NLP` - Analisis de Lenguaje Natural avanzado (Req. 14, 16.1).
 *
 * El aporte del `Servicio_NLP` NO se limita al analisis de sentimiento: produce
 * analisis semantico, deteccion emocional, clasificacion tematica, extraccion de
 * causas/eventos/detonantes, agrupamiento tematico, analisis conversacional e
 * interpretacion de tendencias sobre el `Contrato_Normalizado` (Req. 14.1-14.4).
 *
 * Se expone tras una INTERFAZ ESTABLE ({@link ServicioNLP}) reemplazable por un
 * microservicio Python (Transformers/embeddings) sin tocar el `Pipeline_Analisis`
 * (Req. 14.5, D4). Aqui se implementa una IMPLEMENTACION BASE DETERMINISTA
 * ({@link ServicioNLPBase}) apta para pruebas: pura, sin ML real ni red.
 *
 * **Principio clave (Req. 16.1): comprension contextual, NO reglas lexicas fijas.**
 * Esta implementacion NO mapea palabras concretas a etiquetas fijas
 * (p. ej. "triste" -> tristeza). En su lugar deriva todas las conclusiones de
 * features HOLISTICAS del contenido considerado como un todo:
 * - los temas EMERGEN del propio corpus por co-ocurrencia de terminos salientes
 *   (no de un diccionario tematico fijo);
 * - las stopwords se derivan ESTADISTICAMENTE por frecuencia de documento
 *   (terminos demasiado comunes en el corpus), no de una lista fija;
 * - las senales emocionales se derivan de la estructura del discurso
 *   (intensidad de puntuacion, elongacion, mayusculas, densidad de respuestas,
 *   contencion conversacional, dispersion entre mensajes), no de lexicos
 *   palabra->emocion;
 * - causas/eventos/detonantes se infieren de la saliencia contextual y de la
 *   estructura conversacional, admitiendo CERO elementos cuando no hay senal
 *   significativa (Req. 16.2).
 *
 * Toda la logica vive en funciones PURAS y DETERMINISTAS para ser directamente
 * testeable; la clase es un envoltorio delgado e inyectable en el pipeline.
 *
 * Diseno: design.md > "Servicios del pipeline (interfaces estables)" (`ServicioNLP`).
 * _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 16.1_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";

// ---------------------------------------------------------------------------
// Tipos del resultado del NLP (forma derivada de la intencion del diseno)
// ---------------------------------------------------------------------------

/** Termino saliente derivado de su frecuencia y dispersion en el corpus. */
export interface TerminoClave {
    /** Termino normalizado (minuscula). */
    termino: string;
    /** Frecuencia total en el corpus. */
    frecuencia: number;
    /** Numero de items (post/comentarios) en los que aparece. */
    dispersion: number;
    /** Peso contextual: combina frecuencia y dispersion (saliencia). */
    pesoContextual: number;
}

/** Analisis semantico AGREGADO del contenido (Req. 14.1). */
export interface AnalisisSemantico {
    /** Numero de items analizados (post + comentarios). */
    totalItems: number;
    /** Numero total de tokens del corpus. */
    totalTokens: number;
    /** Diversidad lexica (type-token ratio) en `[0,1]`. */
    diversidadLexica: number;
    /** Terminos clave salientes, ordenados por peso contextual descendente. */
    terminosClave: TerminoClave[];
}

/**
 * Senal emocional graduada derivada de features contextuales del discurso
 * (NO de un lexico palabra->emocion). Todos los valores son continuos.
 */
export interface SenalEmocional {
    /** Valencia contextual en `[-1,1]` (contencion/incertidumbre vs participacion). */
    valencia: number;
    /** Activacion/arousal en `[0,1]` (intensidad de puntuacion, elongacion, mayusculas). */
    activacion: number;
    /** Intensidad emocional global en `[0,1]`. */
    intensidad: number;
    /** Dispersion de la senal entre items en `[0,1]` (homogenea vs concentrada). */
    dispersion: number;
}

/** Deteccion emocional (Req. 14.1): senal + distribucion graduada por categoria. */
export interface DeteccionEmocional {
    senal: SenalEmocional;
    /**
     * Distribucion graduada (suma ~1) sobre categorias emocionales DERIVADAS de
     * features contextuales: `tension`, `entusiasmo`, `incertidumbre`, `neutral`.
     */
    distribucion: Readonly<Record<string, number>>;
}

/** Grupo tematico EMERGENTE del corpus por co-ocurrencia (Req. 14.3). */
export interface GrupoTematico {
    /** Id estable del grupo dentro del resultado. */
    id: string;
    /** Terminos salientes que caracterizan el tema (emergen del corpus). */
    terminos: string[];
    /** Ids de items (post/comentarios) que pertenecen al grupo. */
    itemRefs: string[];
    /** Peso relativo del grupo en `[0,1]` (cobertura de items). */
    peso: number;
}

/** Clasificacion tematica (Req. 14.1): los temas emergen del corpus. */
export interface ClasificacionTematica {
    grupos: GrupoTematico[];
}

/** Tipo de elemento causal extraido (Req. 14.2). */
export type TipoElementoCausal = "causa" | "evento" | "detonante";

/** Elemento causal inferido del contenido (causa, evento o detonante, Req. 14.2). */
export interface ElementoCausal {
    tipo: TipoElementoCausal;
    /** Descripcion legible del elemento. */
    descripcion: string;
    /** Ids de items que respaldan el elemento (trazabilidad). */
    soporteRefs: string[];
    /** Confianza en `[0,1]` derivada de la saliencia/dispersion. */
    confianza: number;
}

/** Interaccion individual dentro del analisis conversacional (Req. 14.3). */
export interface InteraccionConversacional {
    refId: string;
    /** Referencia (autorId) a la que responde, o `null` si es raiz. */
    enRespuestaA: string | null;
    /** Profundidad en la cadena de respuestas (0 = raiz). */
    profundidad: number;
}

/** Analisis conversacional de las interacciones (Req. 14.3). */
export interface AnalisisConversacional {
    interacciones: InteraccionConversacional[];
    /** Numero de hilos (cadenas raiz) detectados. */
    hilos: number;
    /** Profundidad maxima alcanzada en las cadenas de respuesta. */
    profundidadMaxima: number;
}

/** Direccion de una tendencia interpretada. */
export type DireccionTendencia = "ascendente" | "descendente" | "estable";

/** Interpretacion de tendencia a partir del contenido analizado (Req. 14.4). */
export interface InterpretacionTendencia {
    /** Descripcion legible de la tendencia. */
    descripcion: string;
    /** Direccion de la evolucion dentro de la semana. */
    direccion: DireccionTendencia;
    /** Magnitud de la tendencia en `[0,1]`. */
    magnitud: number;
}

/** Resultado completo del `Servicio_NLP` (Req. 14.1-14.4). */
export interface ResultadoNLP {
    semantico: AnalisisSemantico;
    emocional: DeteccionEmocional;
    tematico: ClasificacionTematica;
    /** Causas, eventos y detonantes (Req. 14.2). Puede estar vacio (Req. 16.2). */
    elementosCausales: ElementoCausal[];
    conversacional: AnalisisConversacional;
    /** Interpretacion de tendencias (Req. 14.4). */
    tendencias: InterpretacionTendencia[];
    /**
     * Marca explicita de que las conclusiones se derivan de comprension
     * contextual y NO de reglas lexicas fijas de palabra a etiqueta (Req. 16.1).
     */
    derivadoDeComprensionContextual: true;
}

/**
 * `Servicio_NLP` (interfaz estable del diseno).
 *
 * Reemplazable por un microservicio Python sin tocar el `Pipeline_Analisis`
 * (Req. 14.5). Recibe contenido ya anonimizado y, en el pipeline, ya filtrado
 * como contributivo (Req. 34.2).
 */
export interface ServicioNLP {
    /** Analiza el contrato y produce un {@link ResultadoNLP} (Req. 14.1-14.4). */
    analizar(contrato: ContratoNormalizado): Promise<ResultadoNLP>;
}

// ---------------------------------------------------------------------------
// Nucleo de calculo: funciones puras y deterministas
// ---------------------------------------------------------------------------

/** Item de texto unificado (post o comentario) con su referencia estable. */
interface ItemTexto {
    refId: string;
    texto: string;
    autorId: string;
    enRespuestaA: string | null;
    orden: number;
}

/** Acota un valor al intervalo cerrado `[lo, hi]`. */
function clamp(valor: number, lo: number, hi: number): number {
    if (!Number.isFinite(valor)) {
        return lo;
    }
    return Math.min(hi, Math.max(lo, valor));
}

/**
 * Aplana el contrato en una lista ordenada de {@link ItemTexto}: el `post`
 * primero (orden 0) y luego los `comments` en su orden de aparicion. Las
 * referencias `refId` son estables y posicionales (`post`, `comment:0`, ...).
 */
export function aplanarItems(contrato: ContratoNormalizado): ItemTexto[] {
    const items: ItemTexto[] = [
        {
            refId: "post",
            texto: contrato.post.texto,
            autorId: contrato.post.autorId,
            enRespuestaA: null,
            orden: 0,
        },
    ];
    contrato.comments.forEach((c, i) => {
        items.push({
            refId: `comment:${i}`,
            texto: c.texto,
            autorId: c.autorId,
            enRespuestaA: c.enRespuestaA ?? null,
            orden: i + 1,
        });
    });
    return items;
}

/**
 * Tokeniza un texto en terminos normalizados (minuscula) usando limites de
 * palabra Unicode, de modo que soporta acentos y caracteres no-ASCII del
 * espanol andino. Conserva tokens de longitud >= 3 para reducir ruido
 * estructural (no es una regla lexica de etiquetado).
 */
export function tokenizar(texto: string): string[] {
    const encontrados = texto.toLowerCase().match(/[\p{L}\p{N}]+/gu);
    if (!encontrados) {
        return [];
    }
    return encontrados.filter((t) => t.length >= 3);
}

/** Cuenta cuantas veces aparece un patron en el texto. */
function contarCoincidencias(texto: string, patron: RegExp): number {
    const m = texto.match(patron);
    return m ? m.length : 0;
}

/**
 * Calcula el {@link AnalisisSemantico}: totales, diversidad lexica y terminos
 * clave. Los terminos clave se derivan por saliencia contextual (frecuencia x
 * dispersion entre items) y se descartan las STOPWORDS derivadas
 * ESTADISTICAMENTE (terminos presentes en mas del 60% de los items), sin lista
 * fija (Req. 16.1).
 */
export function analizarSemantica(items: ItemTexto[]): AnalisisSemantico {
    const totalItems = items.length;
    const tokensPorItem = items.map((it) => tokenizar(it.texto));
    const totalTokens = tokensPorItem.reduce((acc, t) => acc + t.length, 0);

    const frecuencia = new Map<string, number>();
    const dispersion = new Map<string, number>();
    tokensPorItem.forEach((tokens) => {
        const enEsteItem = new Set<string>();
        for (const tok of tokens) {
            frecuencia.set(tok, (frecuencia.get(tok) ?? 0) + 1);
            enEsteItem.add(tok);
        }
        for (const tok of enEsteItem) {
            dispersion.set(tok, (dispersion.get(tok) ?? 0) + 1);
        }
    });

    const vocabulario = frecuencia.size;
    const diversidadLexica = totalTokens > 0 ? clamp(vocabulario / totalTokens, 0, 1) : 0;

    // Stopwords contextuales: presentes en demasiados items (poca discriminacion).
    const umbralStopword = Math.max(2, Math.ceil(totalItems * 0.6));

    const terminosClave: TerminoClave[] = [...frecuencia.entries()]
        .map(([termino, freq]) => {
            const disp = dispersion.get(termino) ?? 0;
            // Saliencia: frecuencia ponderada por dispersion logaritmica.
            const pesoContextual = freq * Math.log(1 + disp);
            return { termino, frecuencia: freq, dispersion: disp, pesoContextual };
        })
        .filter((t) => totalItems <= 1 || t.dispersion < umbralStopword)
        .sort((a, b) =>
            b.pesoContextual - a.pesoContextual || a.termino.localeCompare(b.termino),
        )
        .slice(0, 10);

    return { totalItems, totalTokens, diversidadLexica, terminosClave };
}

/**
 * Deriva la {@link DeteccionEmocional} de FEATURES CONTEXTUALES del discurso
 * (puntuacion intensa, elongacion, mayusculas, densidad de preguntas,
 * contencion conversacional y dispersion entre items), nunca de un lexico
 * palabra->emocion (Req. 16.1). Produce una senal continua y una distribucion
 * graduada normalizada sobre categorias emergentes.
 */
export function detectarEmocion(items: ItemTexto[]): DeteccionEmocional {
    const n = Math.max(1, items.length);

    const intensidades: number[] = [];
    let exclam = 0;
    let preguntas = 0;
    let elongacion = 0;
    let mayusRatioAcum = 0;
    let letrasTotales = 0;

    for (const it of items) {
        const texto = it.texto;
        const ex = contarCoincidencias(texto, /[!\u00a1]/g);
        const pr = contarCoincidencias(texto, /[?\u00bf]/g);
        const el = contarCoincidencias(texto, /(\p{L})\1\1+/gu);
        const letras = contarCoincidencias(texto, /\p{L}/gu);
        const mayus = contarCoincidencias(texto, /\p{Lu}/gu);
        const ratioMayus = letras > 0 ? mayus / letras : 0;

        exclam += ex;
        preguntas += pr;
        elongacion += el;
        letrasTotales += letras;
        mayusRatioAcum += ratioMayus;

        // Intensidad por item: combinacion acotada de marcadores estructurales.
        const longitud = Math.max(1, texto.length);
        const densidadIntensa = (ex + el) / longitud;
        const intensidadItem = clamp(densidadIntensa * 12 + ratioMayus, 0, 1);
        intensidades.push(intensidadItem);
    }

    const intensidad = clamp(
        intensidades.reduce((a, b) => a + b, 0) / n,
        0,
        1,
    );
    const activacion = clamp(
        (exclam + elongacion) / Math.max(1, letrasTotales) * 6 + mayusRatioAcum / n,
        0,
        1,
    );

    // Dispersion: desviacion (normalizada) de la intensidad entre items.
    const media = intensidad;
    const varianza =
        intensidades.reduce((a, v) => a + (v - media) * (v - media), 0) / n;
    const dispersion = clamp(Math.sqrt(varianza) * 2, 0, 1);

    // Contencion conversacional: densidad de respuestas (estructura, no lexico).
    const respuestas = items.filter((it) => it.enRespuestaA !== null).length;
    const contencion = clamp(respuestas / n, 0, 1);
    const incertidumbreSenal = clamp(preguntas / Math.max(1, letrasTotales) * 30, 0, 1);
    const autoresUnicos = new Set(items.map((it) => it.autorId)).size;
    const participacion = clamp(autoresUnicos / n, 0, 1);

    // Valencia contextual: participacion sube, contencion e incertidumbre bajan.
    const valencia = clamp(
        Math.tanh(participacion - contencion - incertidumbreSenal),
        -1,
        1,
    );

    // Distribucion graduada sobre categorias emergentes (features, no palabras).
    const crudo: Record<string, number> = {
        tension: contencion + intensidad + Math.max(0, -valencia),
        entusiasmo: activacion + Math.max(0, valencia),
        incertidumbre: incertidumbreSenal,
        neutral: clamp(1 - intensidad, 0, 1),
    };
    const total = Object.values(crudo).reduce((a, b) => a + b, 0) || 1;
    const distribucion: Record<string, number> = {};
    for (const [k, v] of Object.entries(crudo)) {
        distribucion[k] = v / total;
    }

    return {
        senal: { valencia, activacion, intensidad, dispersion },
        distribucion,
    };
}

/**
 * Agrupa items por co-ocurrencia de terminos salientes mediante union-find:
 * los TEMAS EMERGEN del corpus (Req. 14.3, 16.1), sin diccionario tematico fijo.
 * Dos items quedan en el mismo grupo si comparten al menos un termino saliente.
 */
export function clasificarTemas(
    items: ItemTexto[],
    terminosClave: TerminoClave[],
): ClasificacionTematica {
    const salientes = new Set(terminosClave.map((t) => t.termino));
    if (salientes.size === 0 || items.length === 0) {
        return { grupos: [] };
    }

    const terminosPorItem = items.map(
        (it) => new Set(tokenizar(it.texto).filter((tok) => salientes.has(tok))),
    );

    // Union-find sobre los indices de items.
    const padre = items.map((_, i) => i);
    const find = (x: number): number => {
        let r = x;
        while (padre[r] !== r) {
            r = padre[r];
        }
        let c = x;
        while (padre[c] !== c) {
            const sig = padre[c];
            padre[c] = r;
            c = sig;
        }
        return r;
    };
    const union = (a: number, b: number): void => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) {
            padre[Math.max(ra, rb)] = Math.min(ra, rb);
        }
    };

    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            let comparte = false;
            for (const t of terminosPorItem[i]) {
                if (terminosPorItem[j].has(t)) {
                    comparte = true;
                    break;
                }
            }
            if (comparte) {
                union(i, j);
            }
        }
    }

    // Agrupa solo items que tienen al menos un termino saliente.
    const grupoPorRaiz = new Map<number, number[]>();
    for (let i = 0; i < items.length; i++) {
        if (terminosPorItem[i].size === 0) {
            continue;
        }
        const r = find(i);
        const lista = grupoPorRaiz.get(r) ?? [];
        lista.push(i);
        grupoPorRaiz.set(r, lista);
    }

    const grupos: GrupoTematico[] = [...grupoPorRaiz.values()]
        .map((indices) => {
            const terminos = new Set<string>();
            for (const i of indices) {
                for (const t of terminosPorItem[i]) {
                    terminos.add(t);
                }
            }
            return {
                terminos: [...terminos].sort(),
                itemRefs: indices.map((i) => items[i].refId),
                peso: clamp(indices.length / items.length, 0, 1),
            };
        })
        .sort(
            (a, b) =>
                b.peso - a.peso || a.itemRefs[0].localeCompare(b.itemRefs[0]),
        )
        .map((g, idx) => ({ id: `tema:${idx}`, ...g }));

    return { grupos };
}

/**
 * Infiere {@link ElementoCausal} (causas, eventos, detonantes) a partir de la
 * estructura del contenido (Req. 14.2): los hashtags actuan como EVENTOS
 * explicitos del ecosistema; los terminos salientes muy concentrados como
 * DETONANTES; y los terminos que cruzan post y comentarios como CAUSAS que
 * conectan el tema raiz con la conversacion. Puede devolver `[]` cuando no hay
 * senal significativa (Req. 16.2).
 */
export function inferirElementosCausales(
    contrato: ContratoNormalizado,
    items: ItemTexto[],
    terminosClave: TerminoClave[],
): ElementoCausal[] {
    const elementos: ElementoCausal[] = [];
    const totalItems = Math.max(1, items.length);

    // Eventos: hashtags del ecosistema, con soporte en items que los mencionan.
    for (const hashtag of contrato.hashtags) {
        const termino = hashtag.replace(/^#/, "").toLowerCase();
        if (termino.length === 0) {
            continue;
        }
        const soporteRefs = items
            .filter((it) => tokenizar(it.texto).includes(termino))
            .map((it) => it.refId);
        elementos.push({
            tipo: "evento",
            descripcion: `Evento asociado al hashtag #${termino}`,
            soporteRefs,
            confianza: clamp(0.4 + soporteRefs.length / totalItems, 0, 1),
        });
    }

    const postTokens = new Set(tokenizar(contrato.post.texto));
    for (const t of terminosClave) {
        const itemsCon = items.filter((it) => tokenizar(it.texto).includes(t.termino));
        const refs = itemsCon.map((it) => it.refId);
        const cruzaPostYComentarios =
            postTokens.has(t.termino) && refs.some((r) => r !== "post");

        if (cruzaPostYComentarios) {
            // Causa: el termino conecta el post con la conversacion derivada.
            elementos.push({
                tipo: "causa",
                descripcion: `Tema "${t.termino}" conecta la publicacion con las respuestas`,
                soporteRefs: refs,
                confianza: clamp(t.dispersion / totalItems, 0, 1),
            });
        } else if (refs.length === 1 && t.frecuencia >= 2) {
            // Detonante: termino saliente concentrado en un unico item.
            elementos.push({
                tipo: "detonante",
                descripcion: `Termino "${t.termino}" concentrado en una intervencion`,
                soporteRefs: refs,
                confianza: clamp(t.frecuencia / (t.frecuencia + totalItems), 0, 1),
            });
        }
    }

    return elementos;
}

/**
 * Construye el {@link AnalisisConversacional} a partir de la estructura de
 * respuestas (`enRespuestaA` referencia al `autorId` de un item anterior).
 * Calcula la profundidad de cada interaccion, el numero de hilos raiz y la
 * profundidad maxima (Req. 14.3).
 */
export function analizarConversacion(items: ItemTexto[]): AnalisisConversacional {
    // Mapa autorId -> ultimo item anterior con ese autor (para resolver el padre).
    const profundidades = new Map<string, number>();
    const interacciones: InteraccionConversacional[] = [];
    let hilos = 0;
    let profundidadMaxima = 0;

    for (const it of items) {
        let profundidad = 0;
        if (it.enRespuestaA !== null && profundidades.has(it.enRespuestaA)) {
            profundidad = (profundidades.get(it.enRespuestaA) ?? 0) + 1;
        } else {
            hilos += 1;
        }
        profundidadMaxima = Math.max(profundidadMaxima, profundidad);
        profundidades.set(it.autorId, profundidad);
        interacciones.push({
            refId: it.refId,
            enRespuestaA: it.enRespuestaA,
            profundidad,
        });
    }

    return { interacciones, hilos, profundidadMaxima };
}

/**
 * Interpreta {@link InterpretacionTendencia} comparando la intensidad emocional
 * en la primera mitad de los items frente a la segunda mitad (evolucion DENTRO
 * de la semana, derivada de la distribucion del contenido, Req. 14.4). Acepta
 * un resultado vacio cuando no hay suficiente contenido para interpretar.
 */
export function interpretarTendencias(items: ItemTexto[]): InterpretacionTendencia[] {
    if (items.length < 2) {
        return [];
    }

    const intensidadDe = (it: ItemTexto): number => {
        const longitud = Math.max(1, it.texto.length);
        const ex = contarCoincidencias(it.texto, /[!\u00a1]/g);
        const el = contarCoincidencias(it.texto, /(\p{L})\1\1+/gu);
        return clamp(((ex + el) / longitud) * 12, 0, 1);
    };

    const mitad = Math.floor(items.length / 2);
    const primera = items.slice(0, mitad);
    const segunda = items.slice(mitad);
    const prom = (xs: ItemTexto[]): number =>
        xs.length === 0 ? 0 : xs.reduce((a, it) => a + intensidadDe(it), 0) / xs.length;

    const diff = prom(segunda) - prom(primera);
    const magnitud = clamp(Math.abs(diff), 0, 1);
    let direccion: DireccionTendencia = "estable";
    if (diff > 0.02) {
        direccion = "ascendente";
    } else if (diff < -0.02) {
        direccion = "descendente";
    }

    return [
        {
            descripcion:
                "Evolucion de la intensidad emocional a lo largo de la conversacion",
            direccion,
            magnitud,
        },
    ];
}

/**
 * Calcula el {@link ResultadoNLP} completo de forma PURA y DETERMINISTA a partir
 * del contrato (Req. 14.1-14.4). La misma entrada produce siempre la misma
 * salida; no muta el contrato ni tiene efectos secundarios.
 */
export function analizarContrato(contrato: ContratoNormalizado): ResultadoNLP {
    const items = aplanarItems(contrato);
    const semantico = analizarSemantica(items);
    const emocional = detectarEmocion(items);
    const tematico = clasificarTemas(items, semantico.terminosClave);
    const elementosCausales = inferirElementosCausales(
        contrato,
        items,
        semantico.terminosClave,
    );
    const conversacional = analizarConversacion(items);
    const tendencias = interpretarTendencias(items);

    return {
        semantico,
        emocional,
        tematico,
        elementosCausales,
        conversacional,
        tendencias,
        derivadoDeComprensionContextual: true,
    };
}

/**
 * Implementacion base DETERMINISTA del `Servicio_NLP` (interfaz estable).
 *
 * Envoltorio delgado y sin estado sobre {@link analizarContrato}: toda la
 * logica vive en funciones puras para mantener el calculo aislado, testeable y
 * reemplazable por un microservicio Python sin tocar el `Pipeline_Analisis`
 * (Req. 14.5). No realiza ML real ni llamadas de red.
 */
export class ServicioNLPBase implements ServicioNLP {
    analizar(contrato: ContratoNormalizado): Promise<ResultadoNLP> {
        return Promise.resolve(analizarContrato(contrato));
    }
}

/** Instancia reutilizable lista para inyectarse en el `Pipeline_Analisis`. */
export const servicioNLP = new ServicioNLPBase();
