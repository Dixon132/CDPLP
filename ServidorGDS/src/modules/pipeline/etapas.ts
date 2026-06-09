/**
 * Etapas concretas del `Pipeline_Analisis` (tarea 9.2).
 *
 * Implementa los manejadores de las etapas que **transforman** el
 * `Contrato_Normalizado` al inicio del pipeline:
 *
 * - `LIMPIEZA`: elimina ruido tipografico (caracteres de control, anchura cero),
 *   colapsa espacios en blanco y recorta los campos de texto y los hashtags.
 * - `NORMALIZACION`: normaliza Unicode (NFC) los textos y canoniza los hashtags
 *   (minusculas, prefijo `#`, sin duplicados ni vacios).
 * - `ANONIMIZACION`: delega en el `Servicio_Anonimizacion` para reemplazar los
 *   identificadores de `Usuario_Sintetico` por seudonimos hash **antes** de
 *   cualquier etapa de analisis o almacenamiento (Req. 13.5, 23.1).
 *
 * El resto de etapas (NLP, vision, temporal, patrones, indice, explicacion) se
 * mantienen como manejadores inyectables/placeholder hasta sus tareas (11+/13+):
 * `crearManejadoresEtapa` acepta `adicionales` para inyectarlos.
 *
 * Diseno: design.md > "Pipeline de analisis" (etapas 3-5) y
 * "Servicios del pipeline (interfaces estables)".
 * _Requirements: 13.1, 13.4, 13.5_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import type { ServicioAnonimizacion } from "../analisis/interfaces";
import type { MemoriaSemantica } from "../ai-engine/memoriaSemantica";
import {
    EtapaPipeline,
    OrquestadorPipeline,
    type LoggerPipeline,
    type ManejadoresEtapa,
} from "./pipeline";
import {
    crearManejadorEmbeddings,
    type ContextoEmbeddings,
} from "./etapaEmbeddings";
import {
    crearManejadoresAnalisis,
    type ResultadosAnalisis,
    type ServiciosAnalisis,
} from "./etapasAnalisis";

// --- LIMPIEZA --------------------------------------------------------------

/** Caracteres de control (excepto tab `\t`, salto `\n` y retorno `\r`). */
const REGEX_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
/** Caracteres de anchura cero / BOM. */
const REGEX_ANCHURA_CERO = /[\u200B-\u200D\uFEFF]/g;
/** Cualquier secuencia de espacios en blanco (incluye saltos de linea). */
const REGEX_ESPACIOS = /\s+/g;

/**
 * Limpia un texto: elimina caracteres de control y de anchura cero, colapsa los
 * espacios en blanco a un solo espacio y recorta los extremos. Determinista.
 */
export function limpiarTexto(texto: string): string {
    return texto
        .replace(REGEX_CONTROL, "")
        .replace(REGEX_ANCHURA_CERO, "")
        .replace(REGEX_ESPACIOS, " ")
        .trim();
}

/**
 * Devuelve una copia del contrato con sus campos de texto limpios.
 *
 * Limpia `post.texto`, `comments[].texto`, `image_description` y cada hashtag,
 * descartando los hashtags que queden vacios tras la limpieza. No altera los
 * identificadores (`autorId`/`enRespuestaA`): la seudonimizacion es tarea de la
 * etapa `ANONIMIZACION`. No muta el contrato original.
 */
export function limpiarContrato(contrato: ContratoNormalizado): ContratoNormalizado {
    return {
        ...contrato,
        post: { ...contrato.post, texto: limpiarTexto(contrato.post.texto) },
        comments: contrato.comments.map((c) => ({
            ...c,
            texto: limpiarTexto(c.texto),
        })),
        image_description: limpiarTexto(contrato.image_description),
        hashtags: contrato.hashtags
            .map((h) => limpiarTexto(h))
            .filter((h) => h.length > 0),
    };
}

// --- NORMALIZACION ---------------------------------------------------------

/** Normaliza un texto a la forma de composicion canonica Unicode (NFC). */
export function normalizarTexto(texto: string): string {
    return texto.normalize("NFC");
}

/**
 * Canoniza un hashtag: NFC, recorta, elimina almohadillas iniciales, pasa a
 * minusculas y antepone un unico `#`. Un hashtag sin contenido devuelve `"#"`,
 * que `normalizarHashtags` descarta.
 */
export function normalizarHashtag(hashtag: string): string {
    const nucleo = hashtag.normalize("NFC").trim().replace(/^#+/, "").toLowerCase();
    return `#${nucleo}`;
}

/**
 * Normaliza una lista de hashtags: canoniza cada uno, descarta los vacios y
 * elimina duplicados preservando el orden de primera aparicion.
 */
export function normalizarHashtags(hashtags: string[]): string[] {
    const vistos = new Set<string>();
    const resultado: string[] = [];
    for (const h of hashtags) {
        const n = normalizarHashtag(h);
        if (n === "#" || vistos.has(n)) {
            continue;
        }
        vistos.add(n);
        resultado.push(n);
    }
    return resultado;
}

/**
 * Devuelve una copia del contrato normalizado: textos en NFC y hashtags
 * canonizados (minusculas, prefijo `#`, sin duplicados ni vacios). No muta el
 * contrato original.
 */
export function normalizarContrato(contrato: ContratoNormalizado): ContratoNormalizado {
    return {
        ...contrato,
        post: { ...contrato.post, texto: normalizarTexto(contrato.post.texto) },
        comments: contrato.comments.map((c) => ({
            ...c,
            texto: normalizarTexto(c.texto),
        })),
        image_description: normalizarTexto(contrato.image_description),
        hashtags: normalizarHashtags(contrato.hashtags),
    };
}

// --- Fabrica de manejadores ------------------------------------------------

/** Configuracion de la etapa de anonimizacion (servicio + salt). */
export interface ConfigAnonimizacion {
    servicio: ServicioAnonimizacion;
    salt: string;
}

/**
 * Configuracion de la etapa final `EMBEDDINGS` (tarea 9.3): la
 * `Memoria_Semantica` (capacidad de indexar de la tarea 9.1) y el contexto
 * trazable de la semana. Cuando se omite, la etapa `EMBEDDINGS` queda como
 * placeholder inyectable por `adicionales` (p. ej. la persistencia
 * transaccional la coordina `procesarSemana`, tarea 16.1).
 */
export interface ConfigEmbeddings {
    memoria: MemoriaSemantica;
    contexto: ContextoEmbeddings;
}

/** Configuracion de las etapas de analisis (servicios IA->fallback + acumulador). */
export interface ConfigAnalisis {
    /** Servicios estables (FiltroRelevancia/ServicioNLP/ServicioVision), resueltos IA->fallback. */
    servicios: ServiciosAnalisis;
    /** Acumulador donde las etapas de analisis escriben sus resultados. */
    acumulador: ResultadosAnalisis;
}

/** Opciones para construir el conjunto de manejadores del pipeline. */
export interface OpcionesManejadoresEtapa {
    /** Servicio y salt para la etapa `ANONIMIZACION` (Req. 13.5, 23.1). */
    anonimizacion: ConfigAnonimizacion;
    /**
     * Configuracion de las etapas de analisis (`FILTRO_RELEVANCIA`, `NLP`,
     * `VISION`) cableadas a los servicios de IA (resueltos IA->fallback por el
     * proxy de degradacion). Si se provee, el `Filtro_Relevancia` se ejecuta tras
     * la anonimizacion y antes del NLP, y el NLP recibe solo el contenido
     * contributivo (Req. 13.1, 34.2, 34.4). Si se omite, estas etapas quedan
     * inyectables por `adicionales`.
     */
    analisis?: ConfigAnalisis;
    /**
     * Configuracion de la etapa final `EMBEDDINGS` (Req. 36.1). Si se provee, se
     * cablea un manejador que, tras la explicacion, indexa los embeddings del
     * contenido analizado en la `Memoria_Semantica`.
     */
    embeddings?: ConfigEmbeddings;
    /**
     * Manejadores adicionales/placeholder para las etapas de analisis aun no
     * cableadas (TEMPORAL, PATRONES, INDICE, EXPLICACION), inyectables en sus
     * respectivas tareas (12.3/13+).
     */
    adicionales?: ManejadoresEtapa;
}

/**
 * Construye los manejadores de etapa del `Pipeline_Analisis` cableando las
 * etapas transformadoras (limpieza, normalizacion y anonimizacion), las etapas
 * de analisis (`FILTRO_RELEVANCIA`, `NLP`, `VISION`) si se configura `analisis`,
 * la etapa final `EMBEDDINGS` (si se configura) y dejando inyectables el resto
 * de etapas de analisis (`adicionales`: TEMPORAL/PATRONES/INDICE/EXPLICACION).
 *
 * La etapa `ANONIMIZACION` se cablea al `Servicio_Anonimizacion`, garantizando
 * que el contrato que reciben las etapas de analisis posteriores ya esta
 * seudonimizado (Req. 13.5, 23.1). Las etapas `FILTRO_RELEVANCIA`/`NLP`/`VISION`
 * se cablean a los servicios estables (resueltos IA->fallback por el proxy de
 * degradacion): el filtro corre tras la anonimizacion y antes del NLP, y el NLP
 * recibe solo el contenido contributivo (Req. 34.2, 34.4). La etapa `EMBEDDINGS`
 * se cablea a la `Memoria_Semantica` (tarea 9.1) para acumular los embeddings
 * del contenido analizado en `pgvector` tras la explicacion (Req. 36.1).
 *
 * Los `adicionales` se aplican al final, de modo que el llamador puede
 * sobreescribir cualquier etapa cableada (incl. `EMBEDDINGS`) cuando la
 * persistencia transaccional la coordine `procesarSemana` (tarea 16.1).
 */
export function crearManejadoresEtapa(
    opciones: OpcionesManejadoresEtapa,
): ManejadoresEtapa {
    const { anonimizacion, analisis, embeddings, adicionales = {} } = opciones;
    const manejadores: ManejadoresEtapa = {
        [EtapaPipeline.LIMPIEZA]: (contrato) => limpiarContrato(contrato),
        [EtapaPipeline.NORMALIZACION]: (contrato) => normalizarContrato(contrato),
        [EtapaPipeline.ANONIMIZACION]: (contrato) =>
            anonimizacion.servicio.anonimizar(contrato, anonimizacion.salt),
    };
    if (analisis) {
        Object.assign(
            manejadores,
            crearManejadoresAnalisis(analisis.servicios, analisis.acumulador),
        );
    }
    if (embeddings) {
        manejadores[EtapaPipeline.EMBEDDINGS] = crearManejadorEmbeddings(
            embeddings.memoria,
            embeddings.contexto,
        );
    }
    return { ...manejadores, ...adicionales };
}

/**
 * Crea un `OrquestadorPipeline` con las etapas transformadoras ya cableadas
 * (limpieza, normalizacion, anonimizacion) y las etapas de analisis inyectables.
 * Atajo de uso comun para el `Controlador_Ciclo` (tarea 17).
 */
export function crearPipelineAnalisis(
    opciones: OpcionesManejadoresEtapa,
    logger?: LoggerPipeline,
): OrquestadorPipeline {
    return new OrquestadorPipeline(crearManejadoresEtapa(opciones), logger);
}
