/**
 * `Filtro_Relevancia` - separacion de senal vs ruido (Req. 34).
 *
 * Se intercala en el `Pipeline_Analisis` DESPUES de la etapa de anonimizacion y
 * ANTES del NLP (Req. 34.1, 34.4). Clasifica cada publicacion y comentario del
 * `Contrato_Normalizado` ya anonimizado como `Contenido_Contributivo` (senal,
 * alimenta NLP->indice) o `Contenido_No_Contributivo` (ruido). El contenido
 * no-contributivo NO se elimina: se MARCA y se conserva de forma persistente
 * para trazabilidad y evidencia (Req. 34.2, 34.3).
 *
 * Se expone tras una INTERFAZ ESTABLE ({@link FiltroRelevancia}) reemplazable por
 * una implementacion basada en la `Capa_ML` o un microservicio Python sin
 * acoplar el `Pipeline_Analisis` (Req. 34.6). Aqui se implementa una
 * IMPLEMENTACION BASE DETERMINISTA ({@link FiltroRelevanciaBase}): pura, sin ML
 * real ni red, apta para pruebas.
 *
 * **Criterio base (senal vs ruido).** El filtro NO consulta un diccionario de
 * palabras "relevantes"; deriva la clasificacion de features ESTRUCTURALES del
 * texto (presencia de palabras informativas frente a contenido vacio, puramente
 * simbolico o compuesto solo por marcadores como hashtags/menciones). Esta
 * heuristica base es deliberadamente conservadora y deterministica; la
 * sustitucion por la `Capa_ML` puede afinar la frontera senal/ruido sin cambiar
 * la firma de la interfaz.
 *
 * Diseno: design.md > "Servicios del pipeline (interfaces estables)" (`FiltroRelevancia`).
 * _Requirements: 34.1, 34.2, 34.3, 34.4, 34.6_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import {
    Contributividad,
    type FiltroRelevancia,
    type ItemClasificado,
    type ResultadoFiltroRelevancia,
} from "./interfaces";

/** Numero minimo de letras de un token para considerarlo "palabra informativa". */
export const MIN_LONGITUD_PALABRA = 2 as const;

/** Item plano (post/comentario) con su refId estable, listo para clasificar. */
export interface ItemContrato {
    /** Id estable y posicional (`post`, `comment:0`, ...). */
    refId: string;
    /** Texto anonimizado del item. */
    texto: string;
}

/**
 * Aplana el contrato en la lista ordenada de items a clasificar: el `post`
 * primero y luego los `comments` en orden de aparicion. Las referencias `refId`
 * son estables y posicionales (`post`, `comment:0`, ...), coherentes con el
 * resto de la `Capa_Analisis`.
 */
export function aplanarItemsContrato(contrato: ContratoNormalizado): ItemContrato[] {
    const items: ItemContrato[] = [{ refId: "post", texto: contrato.post.texto }];
    contrato.comments.forEach((c, i) => {
        items.push({ refId: `comment:${i}`, texto: c.texto });
    });
    return items;
}

/**
 * Elimina los marcadores (hashtags `#...` y menciones `@...`) de un texto, de
 * modo que un contenido compuesto SOLO por marcadores no aporte palabras
 * informativas y se clasifique como ruido.
 */
export function quitarMarcadores(texto: string): string {
    return texto.replace(/[#@]\S+/gu, " ");
}

/**
 * Cuenta las palabras informativas de un texto: secuencias de letras Unicode de
 * longitud >= {@link MIN_LONGITUD_PALABRA}, tras retirar hashtags y menciones.
 * Soporta acentos y caracteres no-ASCII del espanol andino.
 */
export function contarPalabrasInformativas(texto: string): number {
    const sinMarcadores = quitarMarcadores(texto);
    const re = new RegExp(`\\p{L}{${MIN_LONGITUD_PALABRA},}`, "gu");
    const coincidencias = sinMarcadores.match(re);
    return coincidencias ? coincidencias.length : 0;
}

/** Indica si un texto contiene al menos un marcador (hashtag o mencion). */
export function tieneMarcadores(texto: string): boolean {
    return /[#@]\S+/u.test(texto);
}

/**
 * Clasifica un unico item (post/comentario) ya anonimizado como
 * contributivo/no-contributivo y devuelve el motivo de la decision. Funcion
 * PURA y DETERMINISTA (misma entrada -> misma salida), nucleo testeable del
 * filtro (Req. 34.1).
 */
export function clasificarItem(item: ItemContrato): ItemClasificado {
    const recortado = item.texto.trim();

    if (recortado.length === 0) {
        return {
            refId: item.refId,
            contributividad: Contributividad.NO_CONTRIBUTIVO,
            motivo: "contenido vacio: sin texto",
        };
    }

    const palabras = contarPalabrasInformativas(recortado);
    if (palabras === 0) {
        const motivo = tieneMarcadores(recortado)
            ? "solo marcadores (hashtags/menciones) sin texto informativo"
            : "sin palabras informativas (contenido simbolico/ruido)";
        return {
            refId: item.refId,
            contributividad: Contributividad.NO_CONTRIBUTIVO,
            motivo,
        };
    }

    return {
        refId: item.refId,
        contributividad: Contributividad.CONTRIBUTIVO,
        motivo: `senal textual suficiente (${palabras} palabra(s) informativa(s))`,
    };
}

/**
 * Clasifica todos los items de un contrato y los reparte en una PARTICION sin
 * solape: cada item aparece exactamente una vez, en `contributivos` o en
 * `noContributivos`, conservando el orden de aparicion (Req. 34.1, 34.2, 34.3).
 * Funcion pura sobre el contrato anonimizado.
 */
export function clasificarContrato(contrato: ContratoNormalizado): ResultadoFiltroRelevancia {
    const contributivos: ItemClasificado[] = [];
    const noContributivos: ItemClasificado[] = [];

    for (const item of aplanarItemsContrato(contrato)) {
        const clasificado = clasificarItem(item);
        if (clasificado.contributividad === Contributividad.CONTRIBUTIVO) {
            contributivos.push(clasificado);
        } else {
            noContributivos.push(clasificado);
        }
    }

    return { contributivos, noContributivos };
}

/**
 * Implementacion base deterministica del `Filtro_Relevancia`. Es un envoltorio
 * delgado e inyectable sobre {@link clasificarContrato}; no almacena ni elimina
 * nada: devuelve la particion para que el pipeline alimente NLP solo con el
 * subconjunto contributivo y persista el no-contributivo marcado (Req. 34.6).
 */
export class FiltroRelevanciaBase implements FiltroRelevancia {
    clasificar(contrato: ContratoNormalizado): Promise<ResultadoFiltroRelevancia> {
        return Promise.resolve(clasificarContrato(contrato));
    }
}

/** Instancia reutilizable lista para inyectarse en el pipeline. */
export const filtroRelevancia: FiltroRelevancia = new FiltroRelevanciaBase();
