/**
 * `Motor_Temporal` - etapa `TEMPORAL` del `Pipeline_Analisis` (Req. 16.2, 16.3,
 * 13.1, 33.3).
 *
 * Correlaciona los resultados de varias `Semana_Simulada` (semanas/meses) de una
 * misma `Institucion`/`Comunidad_Digital` para detectar su EVOLUCION en el
 * tiempo, anclada a la `Zona_Geografica` de la comunidad (Req. 33.3). El
 * resultado es una {@link EvolucionTemporal} que:
 *
 *  - expone una SERIE por dimension (valor por semana, en orden creciente) a
 *    partir de la cual la `Capa_ML` deriva tendencias (Req. 16.3, 31.2); y
 *  - lista las RELACIONES detectadas entre eventos del `Escenario`, temas y
 *    variaciones de comportamiento (Req. 16.2). Aceptar CERO relaciones es
 *    valido: cuando no hay variacion significativa ni eventos/temas que la
 *    expliquen, `relaciones` es `[]` (Req. 16.2).
 *
 * Esta `EvolucionTemporal` ALIMENTA aguas abajo al `Detector_Patrones`
 * (`detectar(historial, evolucion, zona)`) y al `Motor_Explicativo` (que explica
 * "cuando empezo / como evoluciono" una dimension), conservando la zona de
 * origen para la trazabilidad por ubicacion (Req. 33.3, 33.4).
 *
 * Diseno (separacion pura/efectos): el nucleo de correlacion
 * ({@link correlacionarEvolucion} y sus auxiliares) es PURO y DETERMINISTA, sin
 * estado ni efectos secundarios, y por tanto directamente testeable. La lectura
 * de los resultados semanales persistidos se aisla tras el puerto inyectable
 * {@link FuenteResultadosTemporal}, de modo que el servicio
 * {@link MotorTemporalService} solo orquesta lectura + correlacion sin acoplar
 * el `Pipeline_Analisis` a una fuente concreta.
 *
 * Diseno: design.md > "MotorTemporal" / "DetectorPatrones".
 * _Requirements: 16.2, 16.3, 13.1, 33.3_
 */
import type { EvolucionTemporal, ZonaGeografica } from "../ml";

/**
 * Umbral minimo de magnitud (|ultimo - primero|) para considerar que una
 * dimension VARIA de forma significativa entre el inicio y el final de la
 * ventana. Por debajo del umbral la dimension se considera ESTABLE y no genera
 * relaciones (contribuye a aceptar cero relaciones, Req. 16.2).
 */
export const UMBRAL_VARIACION = 1e-9;

/**
 * Instantanea del resultado de UNA `Semana_Simulada` ya analizada, para una
 * `Institucion`/`Comunidad_Digital`. Es la entrada que el `Motor_Temporal`
 * correlaciona a lo largo del tiempo.
 *
 * Contiene UNICAMENTE agregados colectivos (valores por dimension del
 * `Indice_Riesgo`) y senales de contexto (temas dominantes, eventos del
 * `Escenario`) necesarias para derivar relaciones; nunca datos individuales.
 */
export interface ResultadoSemanalTemporal {
    /** Numero de `Semana_Simulada` (>= 1). */
    numeroSemana: number;
    /** `Zona_Geografica` de la comunidad en esa semana (coordenadas + radio). */
    zona: ZonaGeografica;
    /**
     * Valor COLECTIVO por dimension del `Indice_Riesgo` (clave -> valor) en esa
     * semana. Una dimension ausente en una semana se omite de su serie.
     */
    dimensiones: Readonly<Record<string, number>>;
    /**
     * Temas/terminos dominantes detectados por el `Servicio_NLP` esa semana, usados
     * para relacionar variaciones con su contexto tematico (puede ser vacio).
     */
    temas?: readonly string[];
    /**
     * Eventos del `Escenario` activos esa semana, usados para relacionar
     * variaciones con sus causas (puede ser vacio).
     */
    eventos?: readonly string[];
}

/**
 * Puerto de lectura de los resultados semanales persistidos de una
 * `Institucion` dentro de un `Analisis`. Inyectable: en produccion lo respalda
 * la persistencia (`gds_resultado_analisis`/`gds_dimension_riesgo`); en pruebas,
 * una fuente en memoria determinista.
 */
export interface FuenteResultadosTemporal {
    /**
     * Devuelve los resultados semanales de `(analisisId, institucionId)` con
     * `numeroSemana <= hastaSemana`. El orden es indiferente: el `Motor_Temporal`
     * los ordena de forma creciente. Cero resultados es valido (sin evolucion).
     */
    resultadosSemanales(
        analisisId: string,
        institucionId: string,
        hastaSemana: number,
    ): Promise<ResultadoSemanalTemporal[]>;
}

/**
 * `Motor_Temporal` (interfaz estable del diseno).
 *
 * Reemplazable sin tocar el `Pipeline_Analisis`: correlaciona por la
 * `Zona_Geografica` de la comunidad (Req. 33.3) y produce la
 * {@link EvolucionTemporal} que consumen el `Detector_Patrones` y el
 * `Motor_Explicativo`.
 */
export interface MotorTemporal {
    /**
     * Correlaciona los resultados de `(analisisId, institucionId)` hasta
     * `hastaSemana` para detectar su evolucion temporal por zona (Req. 16.2,
     * 16.3, 33.3). Aceptar cero relaciones es valido (Req. 16.2).
     */
    correlacionar(
        analisisId: string,
        institucionId: string,
        hastaSemana: number,
    ): Promise<EvolucionTemporal>;
}

/**
 * Ordena los resultados por `numeroSemana` creciente y descarta los posteriores
 * a `hastaSemana` o con semana no finita/<=0. Ante semanas duplicadas conserva
 * la PRIMERA aparicion (determinismo). Funcion PURA: no muta la entrada.
 */
export function ordenarResultados(
    resultados: readonly ResultadoSemanalTemporal[],
    hastaSemana: number,
): ResultadoSemanalTemporal[] {
    const vistos = new Set<number>();
    return resultados
        .filter(
            (r) =>
                Number.isFinite(r.numeroSemana) &&
                r.numeroSemana >= 1 &&
                r.numeroSemana <= hastaSemana,
        )
        .slice()
        .sort((a, b) => a.numeroSemana - b.numeroSemana)
        .filter((r) => {
            if (vistos.has(r.numeroSemana)) {
                return false;
            }
            vistos.add(r.numeroSemana);
            return true;
        });
}

/**
 * Construye la SERIE temporal por dimension (Req. 16.3): para cada dimension
 * presente en alguna semana, recoge sus valores en el orden cronologico de las
 * semanas en las que aparece. Una dimension ausente en una semana simplemente no
 * aporta valor en esa posicion (la serie conserva solo sus valores reales).
 * Funcion PURA y DETERMINISTA. Sin resultados, devuelve `{}`.
 */
export function construirSeries(
    resultadosOrdenados: readonly ResultadoSemanalTemporal[],
): Record<string, number[]> {
    const series: Record<string, number[]> = {};
    for (const semana of resultadosOrdenados) {
        for (const [dimension, valor] of Object.entries(semana.dimensiones)) {
            if (!Number.isFinite(valor)) {
                continue;
            }
            (series[dimension] ??= []).push(valor);
        }
    }
    return series;
}

/**
 * Determina las dimensiones que VARIAN de forma significativa entre el primer y
 * el ultimo valor de su serie (|ultimo - primero| > {@link UMBRAL_VARIACION}),
 * junto con el delta y la direccion. Una serie con menos de 2 puntos no puede
 * variar. Funcion PURA. Devuelve las dimensiones en orden de clave estable.
 */
export function dimensionesQueVarian(
    series: Readonly<Record<string, number[]>>,
): Array<{ dimension: string; delta: number; direccion: "sube" | "baja" }> {
    const variantes: Array<{ dimension: string; delta: number; direccion: "sube" | "baja" }> = [];
    for (const dimension of Object.keys(series).sort()) {
        const valores = series[dimension];
        if (valores.length < 2) {
            continue;
        }
        const delta = valores[valores.length - 1] - valores[0];
        if (Math.abs(delta) > UMBRAL_VARIACION) {
            variantes.push({ dimension, delta, direccion: delta > 0 ? "sube" : "baja" });
        }
    }
    return variantes;
}

/**
 * Deriva las RELACIONES evento/tema -> variacion de dimension (Req. 16.2).
 *
 * Para cada dimension que varia significativamente, la conecta con cada CAUSA de
 * contexto observada en la ventana, priorizando los `eventos` del `Escenario` y,
 * solo si no hubo eventos, los `temas` dominantes (Req. 16.2, 16.3). Las causas
 * se recogen de forma determinista (orden de aparicion, sin duplicados).
 *
 * Aceptar CERO relaciones es valido y esperado cuando: no hay dimensiones que
 * varien, o no se observo ningun evento ni tema que explique la variacion
 * (Req. 16.2). Funcion PURA: no muta la entrada.
 */
export function derivarRelaciones(
    resultadosOrdenados: readonly ResultadoSemanalTemporal[],
    series: Readonly<Record<string, number[]>>,
): Array<{ desde: string; hacia: string; descripcion: string }> {
    const variantes = dimensionesQueVarian(series);
    if (variantes.length === 0) {
        return [];
    }

    const eventos = recolectarUnicos(resultadosOrdenados.map((r) => r.eventos));
    const temas = recolectarUnicos(resultadosOrdenados.map((r) => r.temas));
    // Los eventos del Escenario explican mejor las causas; los temas son el
    // respaldo cuando no se observo ningun evento (Req. 16.2, 16.3).
    const causas: Array<{ tipo: "evento" | "tema"; valor: string }> =
        eventos.length > 0
            ? eventos.map((valor) => ({ tipo: "evento" as const, valor }))
            : temas.map((valor) => ({ tipo: "tema" as const, valor }));

    if (causas.length === 0) {
        return []; // sin causas observadas: cero relaciones (Req. 16.2)
    }

    const relaciones: Array<{ desde: string; hacia: string; descripcion: string }> = [];
    for (const { dimension, delta, direccion } of variantes) {
        for (const causa of causas) {
            relaciones.push({
                desde: `${causa.tipo}:${causa.valor}`,
                hacia: `dimension:${dimension}`,
                descripcion:
                    `La dimension ${dimension} ${direccion} ` +
                    `(variacion ${delta > 0 ? "+" : ""}${redondear(delta)}) ` +
                    `correlacionada con el ${causa.tipo} "${causa.valor}"`,
            });
        }
    }
    return relaciones;
}

/**
 * Correlaciona los resultados semanales en una {@link EvolucionTemporal} (Req.
 * 16.2, 16.3, 33.3). Funcion PURA y DETERMINISTA: ordena/filtra la ventana,
 * construye las series por dimension y deriva las relaciones, aceptando cero
 * relaciones. La misma entrada produce siempre la misma salida.
 */
export function correlacionarEvolucion(
    analisisId: string,
    institucionId: string,
    hastaSemana: number,
    resultados: readonly ResultadoSemanalTemporal[],
): EvolucionTemporal {
    const ordenados = ordenarResultados(resultados, hastaSemana);
    const series = construirSeries(ordenados);
    const relaciones = derivarRelaciones(ordenados, series);
    return { analisisId, institucionId, hastaSemana, series, relaciones };
}

/**
 * Devuelve la `Zona_Geografica` de la comunidad en la ventana correlacionada
 * (la de la ultima semana disponible, que refleja el anclaje vigente, Req.
 * 33.3). Es la zona que el `Pipeline_Analisis` pasa al `Detector_Patrones`
 * (`detectar(historial, evolucion, zona)`). Devuelve `null` si no hay
 * resultados. Funcion PURA.
 */
export function zonaDeEvolucion(
    resultados: readonly ResultadoSemanalTemporal[],
    hastaSemana: number,
): ZonaGeografica | null {
    const ordenados = ordenarResultados(resultados, hastaSemana);
    if (ordenados.length === 0) {
        return null;
    }
    return ordenados[ordenados.length - 1].zona;
}

/** Aplana listas opcionales y devuelve sus valores unicos en orden de aparicion. */
function recolectarUnicos(listas: ReadonlyArray<readonly string[] | undefined>): string[] {
    const vistos = new Set<string>();
    const resultado: string[] = [];
    for (const lista of listas) {
        for (const valor of lista ?? []) {
            if (!vistos.has(valor)) {
                vistos.add(valor);
                resultado.push(valor);
            }
        }
    }
    return resultado;
}

/** Redondea a 6 decimales para descripciones legibles y estables. */
function redondear(valor: number): number {
    return Number(valor.toFixed(6));
}

/**
 * Servicio del `Motor_Temporal`: orquesta la lectura de los resultados
 * semanales (puerto {@link FuenteResultadosTemporal}) y la correlacion pura
 * ({@link correlacionarEvolucion}). No contiene logica de analisis fuera de las
 * funciones puras de este modulo. La fuente es inyectable para pruebas.
 */
export class MotorTemporalService implements MotorTemporal {
    constructor(private readonly fuente: FuenteResultadosTemporal) { }

    async correlacionar(
        analisisId: string,
        institucionId: string,
        hastaSemana: number,
    ): Promise<EvolucionTemporal> {
        const resultados = await this.fuente.resultadosSemanales(
            analisisId,
            institucionId,
            hastaSemana,
        );
        return correlacionarEvolucion(analisisId, institucionId, hastaSemana, resultados);
    }

    /**
     * Variante de conveniencia que, ademas de la {@link EvolucionTemporal},
     * devuelve la `Zona_Geografica` vigente de la comunidad, lista para pasar al
     * `Detector_Patrones` (`detectar(historial, evolucion, zona)`) y al
     * `Motor_Explicativo` (Req. 33.3, 33.4).
     */
    async correlacionarConZona(
        analisisId: string,
        institucionId: string,
        hastaSemana: number,
    ): Promise<{ evolucion: EvolucionTemporal; zona: ZonaGeografica | null }> {
        const resultados = await this.fuente.resultadosSemanales(
            analisisId,
            institucionId,
            hastaSemana,
        );
        return {
            evolucion: correlacionarEvolucion(analisisId, institucionId, hastaSemana, resultados),
            zona: zonaDeEvolucion(resultados, hastaSemana),
        };
    }
}

/**
 * `FuenteResultadosTemporal` en memoria: util para pruebas deterministas y como
 * adaptador minimo cuando los resultados ya estan disponibles en memoria (p. ej.
 * dentro del propio ciclo de `procesarSemana`). No accede a persistencia.
 */
export class FuenteResultadosEnMemoria implements FuenteResultadosTemporal {
    constructor(private readonly datos: readonly ResultadoSemanalTemporal[] = []) { }

    resultadosSemanales(
        _analisisId: string,
        _institucionId: string,
        hastaSemana: number,
    ): Promise<ResultadoSemanalTemporal[]> {
        return Promise.resolve(
            this.datos.filter((r) => r.numeroSemana <= hastaSemana).map((r) => ({ ...r })),
        );
    }
}
