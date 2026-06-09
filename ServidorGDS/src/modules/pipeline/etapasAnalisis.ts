/**
 * Etapas de ANALISIS del `Pipeline_Analisis` y su integracion con los servicios
 * de IA (cliente HTTP del `Servicio_IA`) con FALLBACK determinista TS (tarea 12.2).
 *
 * Implementa los manejadores de las etapas `FILTRO_RELEVANCIA`, `NLP` y `VISION`
 * cableados a las INTERFACES ESTABLES `Filtro_Relevancia`, `Servicio_NLP` y
 * `Servicio_Vision`. En produccion estas interfaces se inyectan resueltas POR
 * DISPONIBILIDAD a traves del proxy de degradacion (primario = cliente HTTP del
 * `Servicio_IA` en Python; fallback = implementacion determinista TS), de modo
 * que el pipeline consume IA->fallback sin conocer la implementacion concreta
 * (Req. 14.5, 15.4, 34.6, 35.3, 35.4).
 *
 * Garantias de orden (Req. 13.1, 13.5, 34.4):
 * - La `ANONIMIZACION` precede SIEMPRE a estas etapas: por construccion del
 *   `ORDEN_ETAPAS`, el contrato que reciben estos manejadores ya esta
 *   seudonimizado (la `Capa_Analisis` nunca ve identificadores reales).
 * - El `FILTRO_RELEVANCIA` se ejecuta tras la anonimizacion y ANTES del NLP; el
 *   NLP recibe UNICAMENTE el `Contenido_Contributivo` (la senal), excluyendo el
 *   `Contenido_No_Contributivo` del analisis (Req. 34.2). El contenido
 *   no-contributivo NO se elimina: el resultado completo del filtro (con ambos
 *   subconjuntos marcados) se acumula en {@link ResultadosAnalisis} para su
 *   persistencia/trazabilidad posterior (Req. 34.3), que coordina `procesarSemana`.
 *
 * Reanudacion (Req. 13.4): estos manejadores son idempotentes y sin estado
 * propio (escriben en un acumulador inyectado). Si una etapa falla, el
 * `OrquestadorPipeline` detiene el ciclo, registra la etapa fallida y permite
 * reintentar desde ella sin repetir las etapas ya completadas.
 *
 * Diseno: design.md > "Pipeline de analisis", "Contrato HTTP del `Servicio_IA`"
 * y "Bucle de aprendizaje" (Analizar: NLP/vision delegando en el `Servicio_IA`
 * con fallback TS).
 * _Requirements: 13.1, 13.4, 13.5, 34.4_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import type {
    FiltroRelevancia,
    ResultadoFiltroRelevancia,
} from "../analisis/interfaces";
import type { ResultadoNLP, ServicioNLP } from "../analisis/servicioNLP";
import type { ResultadoVision, ServicioVision } from "../analisis/servicioVision";
import { EtapaPipeline, type ManejadoresEtapa } from "./pipeline";

/**
 * Servicios de IA (tras interfaces estables) que consumen las etapas de
 * analisis. En produccion se inyectan resueltos por el proxy de degradacion
 * (cliente HTTP del `Servicio_IA` -> fallback determinista TS) bajo los tokens
 * DI `FILTRO_RELEVANCIA`, `SERVICIO_NLP` y `SERVICIO_VISION` (Req. 35.2, 35.3).
 */
export interface ServiciosAnalisis {
    /** `Filtro_Relevancia` (senal vs ruido), antes del NLP (Req. 34.1, 34.4). */
    filtroRelevancia: FiltroRelevancia;
    /** `Servicio_NLP` (semantico, emocional, tematico, causal, conversacional). */
    servicioNLP: ServicioNLP;
    /** `Servicio_Vision` (`Vision_Engine`) derivado de `image_description`. */
    servicioVision: ServicioVision;
}

/**
 * Acumulador MUTABLE de las salidas de las etapas de analisis de una
 * `Semana_Simulada`. Los manejadores escriben aqui su resultado; el llamador
 * (`procesarSemana`, tarea 16.1) lee el acumulador tras `procesar` para
 * persistir el resultado de la semana (incluido el no-contributivo marcado,
 * Req. 34.3) y alimentar el indice/explicacion/evidencias.
 *
 * Los campos son opcionales porque, en una reanudacion parcial, solo se
 * repueblan las etapas que se vuelven a ejecutar; el orquestador garantiza que
 * NLP/VISION solo corren tras `FILTRO_RELEVANCIA` (orden de `ORDEN_ETAPAS`).
 */
export interface ResultadosAnalisis {
    /** Particion contributivo/no-contributivo del `Filtro_Relevancia` (Req. 34.1). */
    filtro?: ResultadoFiltroRelevancia;
    /** Resultado del `Servicio_NLP` sobre el contenido contributivo (Req. 14.1-14.4). */
    nlp?: ResultadoNLP;
    /** Resultado del `Servicio_Vision` derivado de `image_description` (Req. 15.1). */
    vision?: ResultadoVision;
}

/** Crea un acumulador de resultados de analisis vacio. */
export function crearResultadosAnalisis(): ResultadosAnalisis {
    return {};
}

/**
 * Construye, a partir del contrato ya anonimizado y del resultado del
 * `Filtro_Relevancia`, un contrato que contiene UNICAMENTE el
 * `Contenido_Contributivo` para alimentar el NLP (Req. 34.2).
 *
 * - Los comentarios NO contributivos se excluyen (no alimentan el NLP).
 * - Si el `post` no es contributivo, se conserva su estructura (el contrato
 *   exige un `post`) pero su texto se vacia, de modo que el NLP no lo analice;
 *   asi se excluye su senal sin romper la forma del contrato.
 * - No muta el contrato original: el contenido no-contributivo se conserva
 *   intacto en el contrato del pipeline para trazabilidad/evidencia (Req. 34.3).
 *
 * El emparejamiento usa los `refId` estables y posicionales del filtro
 * (`post`, `comment:0`, ...), coherentes con el resto de la `Capa_Analisis`.
 */
export function construirContratoContributivo(
    contrato: ContratoNormalizado,
    filtro: ResultadoFiltroRelevancia,
): ContratoNormalizado {
    const contributivos = new Set(filtro.contributivos.map((i) => i.refId));
    const postEsContributivo = contributivos.has("post");

    const comments = contrato.comments.filter((_, i) =>
        contributivos.has(`comment:${i}`),
    );

    return {
        ...contrato,
        post: postEsContributivo
            ? { ...contrato.post }
            : { ...contrato.post, texto: "" },
        comments,
    };
}

/**
 * Construye los manejadores de las etapas de analisis (`FILTRO_RELEVANCIA`,
 * `NLP`, `VISION`) cableados a los `servicios` de IA (resueltos IA->fallback por
 * el proxy de degradacion) y a un `acumulador` de resultados.
 *
 * Comportamiento por etapa:
 * - `FILTRO_RELEVANCIA`: clasifica el contrato anonimizado en contributivo /
 *   no-contributivo y guarda la particion completa en `acumulador.filtro`
 *   (Req. 34.1). NO transforma el contrato (devuelve `void`): el contenido
 *   no-contributivo se conserva para trazabilidad (Req. 34.3).
 * - `NLP`: analiza UNICAMENTE el contenido contributivo (excluye el ruido,
 *   Req. 34.2) y guarda el resultado en `acumulador.nlp` (Req. 14.1-14.4). Si por
 *   alguna razon no hay resultado de filtro disponible, analiza el contrato
 *   completo (degradacion conservadora sin perder senal).
 * - `VISION`: si la `image_description` no esta vacia, deriva
 *   `{ scene, objects[], emotion_context }` y lo guarda en `acumulador.vision`
 *   (Req. 15.1). Si esta vacia, se omite (el `Vision_Engine` exige una
 *   descripcion real, sin plantillas vacias).
 *
 * Ninguna etapa transforma el `Contrato_Normalizado` que se propaga por el
 * pipeline: el contrato final conserva todo el contenido (contributivo y no)
 * para su persistencia/trazabilidad.
 */
export function crearManejadoresAnalisis(
    servicios: ServiciosAnalisis,
    acumulador: ResultadosAnalisis,
): ManejadoresEtapa {
    return {
        [EtapaPipeline.FILTRO_RELEVANCIA]: async (contrato) => {
            acumulador.filtro = await servicios.filtroRelevancia.clasificar(contrato);
        },
        [EtapaPipeline.NLP]: async (contrato) => {
            const entrada = acumulador.filtro
                ? construirContratoContributivo(contrato, acumulador.filtro)
                : contrato;
            acumulador.nlp = await servicios.servicioNLP.analizar(entrada);
        },
        [EtapaPipeline.VISION]: async (contrato) => {
            if (contrato.image_description.trim().length > 0) {
                acumulador.vision = await servicios.servicioVision.analizar(
                    contrato.image_description,
                );
            }
        },
    };
}
