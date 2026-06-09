// Feature: analisis-tendencias-riesgo-emocional, Property 28: Construcción del contexto desde la memoria jerárquica bajo umbral de tokens
/**
 * PBT - Property 28: Construcción del contexto desde la memoria jerárquica bajo
 * umbral de tokens.
 *
 * Para toda `Semana_Simulada` N > 1, el `ContextoGeneracion` se construye
 * EXCLUSIVAMENTE a partir de la `Memoria_Jerarquica` y del contexto recuperado
 * por `Embeddings_Search` (NO de las `Semana_Simulada` crudas); su tamaño NO
 * excede el umbral de tokens del `Proveedor_Generacion` activo, y cuando se
 * requiere recortar se priorizan los niveles de mayor agregación
 * (Global -> Semestral -> Trimestral -> Mensual -> Semanal), mientras el
 * historial completo permanece persistente y recuperable en la base de datos.
 *
 * Se ejercita el motor real (`MotorMemoriaContextualService`) sin mocks de
 * lógica, sobre dobles deterministas en memoria del puerto de persistencia
 * (`MemoriaRepositorio`), de la fuente de resúmenes crudos
 * (`FuenteResumenSemanal`) y del `Embeddings_Search` (`RecuperadorSemantico`).
 * Se construye una `Memoria_Jerarquica` completa (5 niveles) y se ejercita la
 * construcción de contexto bajo una amplia gama de umbrales (desde umbrales
 * holgados donde toda la jerarquía cabe, hasta umbrales ajustados que fuerzan el
 * recorte por agregación).
 *
 * Garantías verificadas (distintas de las Properties 19/20):
 *  - (28.5) El contexto se arma SOLO desde la `Memoria_Jerarquica` persistida y
 *    el `Embeddings_Search`: durante `construirContexto` la fuente de resúmenes
 *    CRUDOS NO se consulta (contador de invocaciones == 0), y el texto del
 *    contexto se corresponde exactamente con la cabecera del `Escenario` + los
 *    textos de las `MemoriaNivel` seleccionadas (no hay volcado de semanas
 *    crudas).
 *  - (28.6) El tamaño del contexto (escenario + memoria jerárquica seleccionada
 *    + contexto semántico) NO excede el umbral; y las memorias seleccionadas son
 *    siempre un PREFIJO del orden de prioridad por agregación
 *    (GLOBAL -> ... -> SEMANAL), de modo que al recortar se conservan los
 *    niveles de mayor agregación.
 *  - (28.8) El historial completo persiste íntegro y recuperable: `consultar(...)`
 *    devuelve TODOS los niveles sin alteración, sea cual sea el umbral.
 *
 * Runner: Jest (`jest --runInBand`), mínimo 100 iteraciones (`{ numRuns: 100 }`).
 *
 * Validates: Requirements 28.5, 28.6, 28.8
 */
import fc from 'fast-check';

import type { MemoriaRepositorio } from '../memoria-repositorio';
import {
    MemoriaNivel,
    NivelMemoria,
    ORDEN_NIVELES,
    type FragmentoSemantico,
    type RecuperadorSemantico,
} from '../motor-memoria-contextual.types';
import {
    estimarTokens,
    FuenteResumenSemanal,
    MotorMemoriaContextualService,
    ResumenSemanaCruda,
    seleccionarContextoMemoria,
    seleccionarFragmentosSemanticos,
    textoMemoria,
} from '../motor-memoria-contextual.service';

const ANALISIS = 'a-prop28';
const COMUNIDAD = 'c-prop28';
const INSTITUCION = 'i-prop28';

/** Doble en memoria del puerto de persistencia con semántica de upsert. */
class RepositorioEnMemoria implements MemoriaRepositorio {
    readonly almacen: MemoriaNivel[] = [];

    guardar(memoria: MemoriaNivel): Promise<MemoriaNivel> {
        const esGlobal = memoria.nivel === NivelMemoria.GLOBAL;
        const idx = this.almacen.findIndex(
            (m) =>
                m.nivel === memoria.nivel &&
                m.analisisId === memoria.analisisId &&
                (esGlobal || m.comunidadId === memoria.comunidadId) &&
                (esGlobal || m.periodo === memoria.periodo),
        );
        if (idx >= 0) {
            this.almacen[idx] = structuredClone(memoria);
        } else {
            this.almacen.push(structuredClone(memoria));
        }
        return Promise.resolve(memoria);
    }

    listar(
        analisisId: string,
        comunidadId: string,
        nivel?: NivelMemoria,
    ): Promise<MemoriaNivel[]> {
        return Promise.resolve(
            this.almacen
                .filter(
                    (m) =>
                        m.analisisId === analisisId &&
                        (nivel === undefined || m.nivel === nivel) &&
                        (m.nivel === NivelMemoria.GLOBAL || m.comunidadId === comunidadId),
                )
                .map((m) => structuredClone(m)),
        );
    }
}

/**
 * Fuente de resúmenes semanales deterministas que CUENTA sus invocaciones, para
 * verificar que `construirContexto` NO consume semanas crudas (Req. 28.5).
 */
class FuenteFalsaContadora implements FuenteResumenSemanal {
    invocaciones = 0;

    constructor(private readonly porSemana: Map<number, ResumenSemanaCruda>) { }

    obtenerResumenSemana(
        _analisisId: string,
        _comunidadId: string,
        semanaN: number,
    ): Promise<ResumenSemanaCruda> {
        this.invocaciones += 1;
        const r = this.porSemana.get(semanaN);
        if (!r) throw new Error(`sin datos para semana ${semanaN}`);
        return Promise.resolve(r);
    }
}

/** Doble determinista del Embeddings_Search (RecuperadorSemantico). */
class RecuperadorSemanticoDoble implements RecuperadorSemantico {
    constructor(private readonly fragmentos: FragmentoSemantico[]) { }

    buscarSimilares(
        _consulta: { texto?: string; vector?: number[] },
        _k: number,
        _filtro: { analisisId: string; comunidadId?: string },
    ): Promise<FragmentoSemantico[]> {
        return Promise.resolve(this.fragmentos.map((f) => ({ ...f })));
    }
}

/** Datos generados de una `Semana_Simulada`. */
interface DatosSemana {
    resumen: string;
    evento: string;
    cambio: string;
    anomalia: string;
    tendencia: string;
}

/** Fragmento de texto no vacío (incluye no-ASCII). */
const textoArb = fc.string({ minLength: 3, maxLength: 30 });

/** Datos de una semana, con resultados/patrones no vacíos. */
const datosSemanaArb: fc.Arbitrary<DatosSemana> = fc.record({
    resumen: textoArb,
    evento: textoArb,
    cambio: textoArb,
    anomalia: textoArb,
    tendencia: textoArb,
});

/** Escenario original (no vacío, admite no-ASCII). */
const escenarioArb = fc
    .string({ minLength: 1, maxLength: 40 })
    .filter((s) => s.trim().length > 0);

/** Historial de >= 2 semanas (para poder evaluar semanas N > 1). */
const semanasArb = fc.array(datosSemanaArb, { minLength: 2, maxLength: 8 });

/**
 * Fracción usada para derivar el umbral de tokens del proveedor activo. El rango
 * cubre AMBOS regímenes: umbrales ajustados (< 1: fuerzan recorte por
 * agregación) y umbrales holgados (>= 1: toda la jerarquía cabe).
 */
const fraccionUmbralArb = fc.double({ min: 0.05, max: 1.6, noNaN: true });

/** Fragmentos del `Embeddings_Search` (contenido no vacío, similitud en [0,1]). */
const fragmentosArb: fc.Arbitrary<FragmentoSemantico[]> = fc.array(
    fc.record({
        refId: fc.string({ minLength: 1, maxLength: 8 }),
        similitud: fc.double({ min: 0, max: 1, noNaN: true }),
        refContenido: textoArb,
        numeroSemana: fc.integer({ min: 1, max: 12 }),
    }),
    { minLength: 0, maxLength: 6 },
);

function crudaDeSemana(escenario: string, d: DatosSemana): ResumenSemanaCruda {
    return {
        escenario,
        institucionId: INSTITUCION,
        resumen: d.resumen,
        eventosRelevantes: [d.evento],
        cambiosImportantes: [d.cambio],
        anomalias: [d.anomalia],
        tendencias: [d.tendencia],
    };
}

/** Tokens del historial COMPLETO con la contabilidad del motor (cabecera + memorias). */
function tokensHistorialCompleto(escenario: string, memorias: readonly MemoriaNivel[]): number {
    const cabecera = estimarTokens(`Escenario: ${escenario}`);
    return memorias.reduce((acc, m) => acc + estimarTokens(textoMemoria(m)), cabecera);
}

/**
 * Reconstruye el orden de prioridad por agregación que aplica el motor
 * (GLOBAL -> ... -> SEMANAL; dentro de un nivel, periodo creciente). La selección
 * del motor es siempre un PREFIJO de este orden.
 */
function ordenPorPrioridad(memorias: readonly MemoriaNivel[]): MemoriaNivel[] {
    const prioridad = [...ORDEN_NIVELES].reverse(); // GLOBAL ... SEMANAL
    return [...memorias].sort((a, b) => {
        const pa = prioridad.indexOf(a.nivel);
        const pb = prioridad.indexOf(b.nivel);
        if (pa !== pb) return pa - pb;
        return a.periodo - b.periodo;
    });
}

describe('Property 28: Construcción del contexto desde la memoria jerárquica bajo umbral de tokens (Req. 28.5, 28.6, 28.8)', () => {
    it('para toda semana N>1, el contexto se arma solo desde la Memoria_Jerarquica + Embeddings_Search, no excede el umbral y conserva el historial completo', async () => {
        await fc.assert(
            fc.asyncProperty(
                escenarioArb,
                semanasArb,
                fraccionUmbralArb,
                fragmentosArb,
                async (escenario, semanas, fraccionUmbral, fragmentos) => {
                    const numSemanas = semanas.length;

                    // Sembrar el motor real con dobles deterministas en memoria.
                    const repo = new RepositorioEnMemoria();
                    const porSemana = new Map<number, ResumenSemanaCruda>();
                    semanas.forEach((d, i) => porSemana.set(i + 1, crudaDeSemana(escenario, d)));
                    const fuente = new FuenteFalsaContadora(porSemana);
                    const recuperador = new RecuperadorSemanticoDoble(fragmentos);
                    const motor = new MotorMemoriaContextualService(repo, fuente, recuperador);

                    // Construir una Memoria_Jerarquica completa de 5 niveles. Las
                    // consolidaciones SÍ consumen la fuente cruda; reiniciamos el contador
                    // luego para medir SOLO lo que ocurre durante `construirContexto`.
                    for (let n = 1; n <= numSemanas; n++) {
                        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, n);
                    }
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.MENSUAL, 1);
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.TRIMESTRAL, 1);
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.SEMESTRAL, 1);
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.GLOBAL, 0);

                    // Snapshot del historial completo ANTES de construir contexto.
                    const historialAntes = await motor.consultar(ANALISIS, COMUNIDAD);
                    expect(historialAntes.length).toBeGreaterThan(0);

                    // Umbral del proveedor activo: >= cabecera del escenario (umbral
                    // realista que al menos admite el escenario inmutable).
                    const tokensCabecera = estimarTokens(`Escenario: ${escenario}`);
                    const tokensCompletos = tokensHistorialCompleto(escenario, historialAntes);
                    const umbral = Math.max(
                        tokensCabecera,
                        Math.floor(fraccionUmbral * tokensCompletos),
                    );

                    // Orden de prioridad por agregación (el motor selecciona un prefijo).
                    const porPrioridad = ordenPorPrioridad(historialAntes);
                    const fragsOrdenados = [...fragmentos].sort((a, b) => b.similitud - a.similitud);

                    // Evaluar TODAS las semanas N > 1 (la propiedad es "para toda N>1").
                    for (let n = 2; n <= numSemanas + 1; n++) {
                        fuente.invocaciones = 0;

                        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, n, umbral);

                        // --- (28.5) Construido SOLO desde la Memoria_Jerarquica + Embeddings ---
                        // La fuente de semanas CRUDAS NO se consulta al construir el contexto.
                        expect(fuente.invocaciones).toBe(0);

                        // El texto del contexto coincide EXACTAMENTE con la selección pura
                        // sobre la jerarquía persistida (cabecera + textos de MemoriaNivel).
                        const seleccion = seleccionarContextoMemoria(escenario, historialAntes, umbral);
                        expect(ctx.contextoMemoria).toBe(seleccion.contextoMemoria);
                        // El contexto SIEMPRE preserva la cabecera del escenario inmutable.
                        expect(ctx.escenario).toBe(escenario);
                        expect(ctx.contextoMemoria).toContain(`Escenario: ${escenario}`);
                        // Cada bloque de memoria proviene de una MemoriaNivel persistida.
                        for (const m of seleccion.memoriasSeleccionadas) {
                            expect(ctx.contextoMemoria).toContain(textoMemoria(m));
                        }
                        // El contexto semántico complementa por Embeddings_Search (ordenado
                        // por similitud descendente) bajo el presupuesto restante.
                        const tokensDisponibles = umbral - seleccion.tokensTotales;
                        const semanticoEsperado = seleccionarFragmentosSemanticos(
                            fragsOrdenados,
                            Math.max(0, tokensDisponibles),
                        );
                        expect(ctx.contextoSemantico).toEqual(semanticoEsperado);
                        // La semana objetivo se refleja en el contexto.
                        expect(ctx.semana).toBe(n);

                        // --- (28.6) Tamaño <= umbral y prioridad por agregación ---
                        const tokensSemantico = ctx.contextoSemantico.reduce(
                            (acc, t) => acc + estimarTokens(t),
                            0,
                        );
                        expect(seleccion.tokensTotales).toBeLessThanOrEqual(umbral);
                        expect(seleccion.tokensTotales + tokensSemantico).toBeLessThanOrEqual(umbral);

                        // Las memorias seleccionadas son un PREFIJO del orden de prioridad
                        // por agregación (conserva GLOBAL antes que SEMANAL al recortar).
                        const k = seleccion.memoriasSeleccionadas.length;
                        const prefijoEsperado = porPrioridad.slice(0, k);
                        expect(seleccion.memoriasSeleccionadas).toEqual(prefijoEsperado);

                        // --- (28.8) Historial completo persiste íntegro y recuperable ---
                        const historialDespues = await motor.consultar(ANALISIS, COMUNIDAD);
                        expect(historialDespues.length).toBe(historialAntes.length);
                        for (const original of historialAntes) {
                            const persistido = historialDespues.find(
                                (m) =>
                                    m.nivel === original.nivel &&
                                    m.periodo === original.periodo &&
                                    m.comunidadId === original.comunidadId,
                            );
                            expect(persistido).toEqual(original);
                        }
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
