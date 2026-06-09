/**
 * `AnalizadorPipeline` - adaptador del `Pipeline_Analisis` para `procesarSemana`
 * (tarea 16.1).
 *
 * Implementa el puerto {@link AnalizadorSemana} cableando el motor analitico YA
 * existente (modulo `pipeline`) al `procesarSemana` transaccional. Por cada
 * `Semana_Simulada` construye un acumulador de resultados de analisis FRESCO
 * ({@link crearResultadosAnalisis}), arma los manejadores de etapa contra ese
 * acumulador ({@link crearManejadoresEtapa}: anonimizacion -> filtro -> NLP ->
 * vision -> ... y las etapas adicionales TEMPORAL/PATRONES/INDICE/EXPLICACION
 * inyectadas) y ejecuta el `OrquestadorPipeline` desde la primera etapa no
 * completada (reanudacion idempotente, Req. 13.4).
 *
 * Importante: la etapa final `EMBEDDINGS` NO se cablea aqui. En el bucle de
 * aprendizaje, `procesarSemana` persiste el resultado de la semana y los
 * embeddings de la `Memoria_Semantica` DENTRO de una unica transaccion atomica
 * (Req. 36.1, 25.5); por eso el indexado de embeddings lo coordina
 * `procesarSemana` (con la `Memoria_Semantica` ligada a `tx`), no la etapa del
 * pipeline. La etapa `EMBEDDINGS` queda como no-op aqui y se marca completada.
 *
 * Diseno: design.md > "Pipeline de analisis" y "Motor de ciclos" > "Unico punto
 * de entrada por semana".
 * _Requirements: 13.1, 13.2, 13.4, 13.5_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import {
    crearManejadoresEtapa,
    type ConfigAnalisis,
    type ConfigAnonimizacion,
} from "../pipeline/etapas";
import {
    crearResultadosAnalisis,
    type ServiciosAnalisis,
} from "../pipeline/etapasAnalisis";
import {
    OrquestadorPipeline,
    type EstadoPipeline,
    type LoggerPipeline,
    type ManejadoresEtapa,
} from "../pipeline/pipeline";
import type {
    AnalizadorSemana,
    ResultadoAnalisisSemana,
} from "./procesarSemana";

/** Dependencias del `AnalizadorPipeline` (servicios del pipeline + anonimizacion). */
export interface OpcionesAnalizadorPipeline {
    /** Servicio y salt de la etapa `ANONIMIZACION` (precondicion, Req. 13.5). */
    anonimizacion: ConfigAnonimizacion;
    /** Servicios IA->fallback de `FILTRO_RELEVANCIA`/`NLP`/`VISION` (Req. 34.4). */
    servicios: ServiciosAnalisis;
    /**
     * Manejadores de las etapas de analisis restantes (TEMPORAL, PATRONES,
     * INDICE, EXPLICACION), inyectados por sus respectivas tareas. La etapa
     * `EMBEDDINGS` se omite a proposito: su persistencia transaccional la
     * coordina `procesarSemana` (Req. 36.1). Si no se proveen, esas etapas son
     * no-op (placeholder) e igualmente se marcan completadas.
     */
    etapasAdicionales?: ManejadoresEtapa;
    /** Logger de incidencias del pipeline (registro de etapa fallida, Req. 13.4). */
    logger?: LoggerPipeline;
}

/**
 * Adaptador que satisface {@link AnalizadorSemana} ejecutando el
 * `Pipeline_Analisis` con un acumulador fresco por semana.
 */
export class AnalizadorPipeline implements AnalizadorSemana {
    constructor(private readonly opciones: OpcionesAnalizadorPipeline) { }

    async analizar(
        contrato: ContratoNormalizado,
        estado?: EstadoPipeline,
    ): Promise<ResultadoAnalisisSemana> {
        // Acumulador FRESCO por semana: las etapas de analisis escriben aqui.
        const acumulador = crearResultadosAnalisis();

        const analisisConfig: ConfigAnalisis = {
            servicios: this.opciones.servicios,
            acumulador,
        };

        const manejadores = crearManejadoresEtapa({
            anonimizacion: this.opciones.anonimizacion,
            analisis: analisisConfig,
            // EMBEDDINGS se omite: lo coordina procesarSemana (transaccional).
            ...(this.opciones.etapasAdicionales
                ? { adicionales: this.opciones.etapasAdicionales }
                : {}),
        });

        const orquestador = new OrquestadorPipeline(manejadores, this.opciones.logger);
        const resultado = estado
            ? await orquestador.procesar(contrato, estado)
            : await orquestador.procesar(contrato);

        return { resultado, analisis: acumulador };
    }
}
