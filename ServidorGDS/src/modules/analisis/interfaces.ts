/**
 * Interfaces estables de la `Capa_Analisis` (servicios del pipeline).
 *
 * Estas interfaces permiten sustituir las implementaciones concretas (mock,
 * heuristica, microservicio Python) sin tocar el `Pipeline_Analisis`.
 *
 * Diseno: design.md > "Servicios del pipeline (interfaces estables)".
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import { Contributividad } from "../evidencias/interfaces";

/**
 * Distincion senal/ruido del `Filtro_Relevancia` (Req. 34.1).
 *
 * Se REEXPORTA el enum compartido definido en `../evidencias/interfaces` para
 * que el `Filtro_Relevancia` (modulo `analisis`) y el `Sistema_Evidencias`
 * (modulo `evidencias`) converjan en un UNICO contrato, tal como exige la nota
 * de diseno del enum (Req. 34.5).
 */
export { Contributividad };

/**
 * Item clasificado por el `Filtro_Relevancia`: una publicacion o comentario del
 * `Contrato_Normalizado` ya anonimizado, con su marca senal/ruido y el motivo.
 */
export interface ItemClasificado {
    /** Id estable y posicional del post/comentario (`post`, `comment:0`, ...). */
    refId: string;
    /** Clasificacion senal (contributivo) vs ruido (no-contributivo) (Req. 34.1). */
    contributividad: Contributividad;
    /** Razon legible de la clasificacion (senal vs ruido). */
    motivo: string;
}

/**
 * Resultado del `Filtro_Relevancia`: particion (sin solape) de los items del
 * contrato en contributivos (alimentan NLP->indice) y no-contributivos
 * (conservados y marcados, NO eliminados) (Req. 34.2, 34.3).
 */
export interface ResultadoFiltroRelevancia {
    /** Subconjunto contributivo que alimenta NLP->indice (Req. 34.2). */
    contributivos: ItemClasificado[];
    /** No-contributivo conservado y marcado, NO eliminado (Req. 34.3). */
    noContributivos: ItemClasificado[];
}

/**
 * `Filtro_Relevancia` (senal vs ruido), interfaz estable.
 *
 * Clasifica cada publicacion/comentario del contrato YA anonimizado como
 * `Contenido_Contributivo` o `Contenido_No_Contributivo`. Se ejecuta DESPUES de
 * la anonimizacion y ANTES del NLP dentro del `Pipeline_Analisis` (Req. 34.1,
 * 34.4). La interfaz es reemplazable por una implementacion basada en la
 * `Capa_ML` o un microservicio Python sin acoplar el pipeline (Req. 34.6).
 */
export interface FiltroRelevancia {
    clasificar(contrato: ContratoNormalizado): Promise<ResultadoFiltroRelevancia>;
}

/**
 * `Servicio_Anonimizacion` (privacidad por diseno).
 *
 * Reemplaza identificadores de `Usuario_Sintetico` por seudonimos hash
 * irreversibles y consistentes, antes de cualquier etapa de analisis o
 * almacenamiento (Req. 13.5, 23.1, 23.2, 23.4).
 */
export interface ServicioAnonimizacion {
    /** Seudonimo SHA-256(salt + id); irreversible y consistente (Req. 23.2, 23.4). */
    seudonimo(idSintetico: string, salt: string): string;
    /** Anonimiza todo el contrato antes del analisis (Req. 13.5, 23.1). */
    anonimizar(contrato: ContratoNormalizado, salt: string): ContratoNormalizado;
}
