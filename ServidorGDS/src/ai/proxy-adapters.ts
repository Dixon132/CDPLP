/**
 * Adaptadores proxy-backed de las interfaces estables del `Servicio_IA` (tarea 8.3).
 *
 * Cada interfaz estable (`Servicio_NLP`, `Servicio_Vision`, `Filtro_Relevancia`,
 * `Capa_ML`) se materializa como un OBJETO ADAPTADOR cuyos metodos DELEGAN, uno
 * a uno, a traves de un {@link ProxyDegradacionServicioIA}. El proxy decide en
 * TIEMPO DE LLAMADA entre la implementacion PRIMARIA (cliente HTTP del
 * `Servicio_IA` en Python, tarea 8.1) y el FALLBACK determinista TS
 * (tareas 3.3/3.4) segun la disponibilidad reportada por la
 * {@link SondaServicioIaHttp} (tarea 8.2).
 *
 * Asi, el `Pipeline_Analisis` depende UNICAMENTE de las interfaces estables (via
 * los tokens DI `SERVICIO_NLP`, `SERVICIO_VISION`, `FILTRO_RELEVANCIA`,
 * `CAPA_ML`): la implementacion concreta (HTTP vs fallback) se resuelve por
 * disponibilidad sin cambios de codigo y sin que el pipeline conozca al proxy
 * (Req. 31.6, 35.4).
 *
 * Diseno: design.md > "Contrato HTTP del `Servicio_IA`" y "Aislamiento y
 * reemplazabilidad".
 * _Requirements: 31.6, 35.4_
 */
import type { FiltroRelevancia, ResultadoFiltroRelevancia } from "../modules/analisis/interfaces";
import type { ResultadoNLP, ServicioNLP } from "../modules/analisis/servicioNLP";
import type { ResultadoVision, ServicioVision } from "../modules/analisis/servicioVision";
import type { ContratoNormalizado } from "../modules/contracts/contratoNormalizado";
import type {
    Anomalia,
    CapaML,
    EntradaIndice,
    EvolucionTemporal,
    ReferenciaCorpus,
    ResultadoCalibracion,
    ResultadoClustering,
    ScoreCalibrado,
    Tendencia,
    ZonaGeografica,
} from "../modules/ml/capaML";
import type { ProxyDegradacionServicioIA } from "./health/proxy-degradacion";

/**
 * Adapta un {@link ProxyDegradacionServicioIA} sobre `Servicio_NLP` al contrato
 * estable {@link ServicioNLP}: cada metodo se ejecuta con degradacion segura.
 */
export function crearAdaptadorServicioNlp(
    proxy: ProxyDegradacionServicioIA<ServicioNLP>,
): ServicioNLP {
    return {
        analizar(contrato: ContratoNormalizado): Promise<ResultadoNLP> {
            return proxy.ejecutar((impl) => impl.analizar(contrato));
        },
    };
}

/**
 * Adapta un {@link ProxyDegradacionServicioIA} sobre `Servicio_Vision` al
 * contrato estable {@link ServicioVision} con degradacion segura por llamada.
 */
export function crearAdaptadorServicioVision(
    proxy: ProxyDegradacionServicioIA<ServicioVision>,
): ServicioVision {
    return {
        analizar(imageDescription: string): Promise<ResultadoVision> {
            return proxy.ejecutar((impl) => impl.analizar(imageDescription));
        },
    };
}

/**
 * Adapta un {@link ProxyDegradacionServicioIA} sobre `Filtro_Relevancia` al
 * contrato estable {@link FiltroRelevancia} con degradacion segura por llamada.
 */
export function crearAdaptadorFiltroRelevancia(
    proxy: ProxyDegradacionServicioIA<FiltroRelevancia>,
): FiltroRelevancia {
    return {
        clasificar(contrato: ContratoNormalizado): Promise<ResultadoFiltroRelevancia> {
            return proxy.ejecutar((impl) => impl.clasificar(contrato));
        },
    };
}

/**
 * Adapta un {@link ProxyDegradacionServicioIA} sobre `Capa_ML` al contrato
 * estable {@link CapaML}: cada operacion (embeddings, clustering, anomalias,
 * tendencias, score calibrado y calibracion) se ejecuta con degradacion segura.
 */
export function crearAdaptadorCapaMl(
    proxy: ProxyDegradacionServicioIA<CapaML>,
): CapaML {
    return {
        embeddings(textos: string[]): Promise<number[][]> {
            return proxy.ejecutar((impl) => impl.embeddings(textos));
        },
        clustering(vectores: number[][]): Promise<ResultadoClustering[]> {
            return proxy.ejecutar((impl) => impl.clustering(vectores));
        },
        anomalias(serie: number[][], zona?: ZonaGeografica): Promise<Anomalia[]> {
            return proxy.ejecutar((impl) => impl.anomalias(serie, zona));
        },
        tendencias(
            evolucion: EvolucionTemporal,
            zona?: ZonaGeografica,
        ): Promise<Tendencia[]> {
            return proxy.ejecutar((impl) => impl.tendencias(evolucion, zona));
        },
        scoreRiesgoCalibrado(entrada: EntradaIndice): Promise<ScoreCalibrado> {
            return proxy.ejecutar((impl) => impl.scoreRiesgoCalibrado(entrada));
        },
        calibrar(corpus: ReferenciaCorpus): Promise<ResultadoCalibracion> {
            return proxy.ejecutar((impl) => impl.calibrar(corpus));
        },
    };
}
