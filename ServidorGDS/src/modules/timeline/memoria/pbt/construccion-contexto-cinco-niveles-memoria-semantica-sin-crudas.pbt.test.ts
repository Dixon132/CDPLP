// Feature: analisis-tendencias-riesgo-emocional, Property 40: Construcción del contexto desde la memoria de cinco niveles + memoria semántica sin publicaciones crudas completas
/**
 * PBT - Property 40: Construcción del contexto desde la memoria de CINCO
 * niveles + memoria semántica, SIN publicaciones crudas completas.
 *
 * Para toda `Semana_Simulada` N > 1 y todo historial de publicaciones de
 * longitud arbitraria, el `ContextoGeneracion` que arma el
 * `Motor_Memoria_Contextual` se compone de la **memoria resumida** (escenario
 * original + eventos relevantes + cambios importantes + anomalías + tendencias)
 * de los niveles `Semanal`/`Mensual`/`Trimestral`/`Semestral`/`Global` y del
 * **contexto semántico** recuperado por `Embeddings_Search` sobre la
 * `Memoria_Semantica` (`pgvector`), y **nunca** incluye el volcado crudo de las
 * publicaciones de todas las semanas anteriores; el tamaño estimado del contexto
 * NO excede el umbral de tokens del `Proveedor_Generacion` activo, recortando
 * primero los niveles de menor agregación
 * (Semanal -> Mensual -> Trimestral -> Semestral -> Global), mientras el
 * historial crudo completo permanece íntegro y recuperable en la base de datos.
 *
 * Esta propiedad **refina y fortalece** la Property 28 (design.md > "Nota de
 * no-redundancia"): aquí el énfasis recae en (a) la presencia explícita de los
 * CINCO niveles consolidados de la `Memoria_Jerarquica`, (b) la `Memoria_Semantica`
 * generada por `memoriaSemanticaArb` y recuperada por `Embeddings_Search`, y
 * (c) la garantía "sin publicaciones crudas completas": el contexto se compone
 * ÚNICAMENTE de la cabecera del `Escenario` + los resúmenes de las
 * `MemoriaNivel` consolidadas + los fragmentos semánticos, jamás del volcado de
 * las publicaciones crudas de las semanas previas.
 *
 * Nota de alcance: las "publicaciones originales de la semana N" se generan
 * DESPUÉS de construir el contexto (el contexto las precede), por lo que el
 * motor de memoria no las inyecta; lo que esta propiedad verifica de forma
 * observable es la ausencia del volcado crudo de TODAS las semanas anteriores.
 *
 * Se ejercita el motor real (`MotorMemoriaContextualService`) sin mocks de
 * lógica, sobre dobles deterministas en memoria del puerto de persistencia
 * (`MemoriaRepositorio`), de la fuente de resúmenes crudos
 * (`FuenteResumenSemanal`) y del `Embeddings_Search` (`RecuperadorSemantico`).
 *
 * Garantías verificadas (distintas de las Properties 19/20/27/28):
 *  - (28.5) Cinco niveles + sin crudas: el contexto se arma SOLO desde la
 *    `Memoria_Jerarquica` consolidada (los cinco niveles) y el `Embeddings_Search`;
 *    la fuente de publicaciones CRUDAS NO se consulta durante `construirContexto`
 *    (contador == 0) y el texto resultante es EXACTAMENTE cabecera + resúmenes de
 *    `MemoriaNivel` seleccionadas (no hay volcado de semanas crudas).
 *  - (36.3) El contexto semántico proviene íntegramente de la `Memoria_Semantica`
 *    (`memoriaSemanticaArb`) recuperada por `Embeddings_Search`, ordenada por
 *    similitud descendente y recortada al presupuesto de tokens restante.
 *  - (28.6) El tamaño total (escenario + memoria jerárquica + contexto semántico)
 *    NO excede el umbral; al recortar se descartan primero los niveles de MENOR
 *    agregación (Semanal antes que Global), y con umbral holgado los CINCO niveles
 *    están presentes en el contexto.
 *  - (28.8) El historial completo persiste íntegro y recuperable: tanto la
 *    `Memoria_Jerarquica` (`consultar`) como las publicaciones crudas (fuente)
 *    permanecen recuperables sin alteración tras construir el contexto.
 *
 * Runner: Jest (`jest --runInBand`), mínimo 100 iteraciones (`{ numRuns: 100 }`).
 *
 * Validates: Requirements 28.5, 28.6, 28.8, 36.3
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

const ANALISIS = 'a-prop40';
const COMUNIDAD = 'c-prop40';
const INSTITUCION = 'i-prop40';

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
 * Fuente de publicaciones CRUDAS deterministas que CUENTA sus invocaciones, para
 * verificar que `construirContexto` NO vuelca las publicaciones crudas de las
 * semanas anteriores (Req. 28.5). Cada semana lleva un MARCADOR crudo único que
 * NO se propaga a la memoria resumida, de modo que su presencia en el contexto
 * delataría un volcado crudo indebido.
 */
class FuenteCrudaContadora implements FuenteResumenSemanal {
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

/** Datos resumidos (NO crudos) de una `Semana_Simulada`. */
interface DatosSemana {
    resumen: string;
    evento: string;
    cambio: string;
    anomalia: string;
    tendencia: string;
}

/** Fragmento de texto resumido no vacío (incluye no-ASCII). */
const textoArb = fc.string({ minLength: 3, maxLength: 30 });

/** Datos resumidos de una semana, con resultados/patrones no vacíos. */
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

/** Historial de >= 2 semanas crudas (para evaluar semanas N > 1). */
const semanasArb = fc.array(datosSemanaArb, { minLength: 2, maxLength: 8 });

/**
 * Fracción usada para derivar el umbral de tokens del proveedor activo. El rango
 * cubre AMBOS regímenes: umbrales ajustados (< 1: fuerzan recorte por
 * agregación) y umbrales holgados (>= 1: toda la jerarquía cabe y los cinco
 * niveles están presentes).
 */
const fraccionUmbralArb = fc.double({ min: 0.05, max: 1.6, noNaN: true });

/**
 * `memoriaSemanticaArb` — Generador de la `Memoria_Semantica` (corpus de
 * `Embeddings` en `pgvector`) que el `Embeddings_Search` recupera para
 * COMPLEMENTAR la `Memoria_Jerarquica` (Req. 36.3). Cada fragmento es trazable
 * (`refId`, `numeroSemana`) y porta una similitud en el rango definido [0,1].
 */
const memoriaSemanticaArb: fc.Arbitrary<FragmentoSemantico[]> = fc.array(
    fc.record({
        refId: fc.string({ minLength: 1, maxLength: 8 }),
        similitud: fc.double({ min: 0, max: 1, noNaN: true }),
        refContenido: textoArb,
        numeroSemana: fc.integer({ min: 1, max: 12 }),
    }),
    { minLength: 0, maxLength: 6 },
);

/**
 * Marcador de publicaciones CRUDAS de una semana. NO se inyecta en la memoria
 * resumida; sirve para detectar un volcado crudo indebido en el contexto.
 */
function marcadorCrudo(semanaN: number): string {
    return `<<CRUDO_SEMANA_${semanaN}_PUBLICACIONES_COMPLETAS>>`;
}

/**
 * Construye el resumen crudo de una semana. El campo `resumen` es un RESUMEN
 * (no el volcado crudo). El marcador crudo se mantiene FUERA de los campos que
 * la consolidación copia a la memoria, asegurando que nunca llegue al contexto.
 */
function crudaDeSemana(escenario: string, semanaN: number, d: DatosSemana): ResumenSemanaCruda {
    return {
        escenario,
        institucionId: INSTITUCION,
        // Resumen estructurado (no el volcado crudo); el marcador crudo NO se
        // incluye aquí, de modo que jamás se propague a la Memoria_Jerarquica.
        resumen: `S${semanaN}: ${d.resumen}`,
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
 * del motor es siempre un PREFIJO de este orden, de modo que al recortar se
 * descartan primero los niveles de MENOR agregación (Req. 28.6).
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

describe('Property 40: Contexto desde la memoria de cinco niveles + memoria semántica sin publicaciones crudas completas (Req. 28.5, 28.6, 28.8, 36.3)', () => {
    it('para toda semana N>1, el contexto se compone de los cinco niveles + Embeddings_Search, nunca del volcado crudo, no excede el umbral y conserva el historial completo', async () => {
        await fc.assert(
            fc.asyncProperty(
                escenarioArb,
                semanasArb,
                fraccionUmbralArb,
                memoriaSemanticaArb,
                async (escenario, semanas, fraccionUmbral, memoriaSemantica) => {
                    const numSemanas = semanas.length;

                    // Sembrar el motor real con dobles deterministas en memoria.
                    const repo = new RepositorioEnMemoria();
                    const porSemana = new Map<number, ResumenSemanaCruda>();
                    semanas.forEach((d, i) => porSemana.set(i + 1, crudaDeSemana(escenario, i + 1, d)));
                    const fuente = new FuenteCrudaContadora(porSemana);
                    const recuperador = new RecuperadorSemanticoDoble(memoriaSemantica);
                    const motor = new MotorMemoriaContextualService(repo, fuente, recuperador);

                    // Construir la Memoria_Jerarquica COMPLETA de los CINCO niveles. Las
                    // consolidaciones SÍ consumen la fuente cruda; reiniciamos el contador
                    // luego para medir SOLO lo que ocurre durante `construirContexto`.
                    for (let n = 1; n <= numSemanas; n++) {
                        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, n);
                    }
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.MENSUAL, 1);
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.TRIMESTRAL, 1);
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.SEMESTRAL, 1);
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.GLOBAL, 0);

                    // Snapshot del historial jerárquico completo ANTES de construir contexto.
                    const historialAntes = await motor.consultar(ANALISIS, COMUNIDAD);
                    expect(historialAntes.length).toBeGreaterThan(0);

                    // Los CINCO niveles están consolidados y persistidos (memoria de
                    // cinco niveles, Req. 28.1-28.4).
                    const nivelesPersistidos = new Set(historialAntes.map((m) => m.nivel));
                    for (const nivel of ORDEN_NIVELES) {
                        expect(nivelesPersistidos.has(nivel)).toBe(true);
                    }

                    // Umbral del proveedor activo: >= cabecera del escenario inmutable.
                    const tokensCabecera = estimarTokens(`Escenario: ${escenario}`);
                    const tokensCompletos = tokensHistorialCompleto(escenario, historialAntes);
                    const umbral = Math.max(
                        tokensCabecera,
                        Math.floor(fraccionUmbral * tokensCompletos),
                    );

                    // Orden de prioridad por agregación (el motor selecciona un prefijo).
                    const porPrioridad = ordenPorPrioridad(historialAntes);
                    const fragsOrdenados = [...memoriaSemantica].sort((a, b) => b.similitud - a.similitud);

                    // Conjunto de marcadores crudos de TODAS las semanas anteriores.
                    const marcadoresCrudos = Array.from({ length: numSemanas }, (_, i) =>
                        marcadorCrudo(i + 1),
                    );

                    // Evaluar TODAS las semanas N > 1 (la propiedad es "para toda N>1").
                    for (let n = 2; n <= numSemanas + 1; n++) {
                        fuente.invocaciones = 0;

                        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, n, umbral);

                        // --- (28.5) Cinco niveles + SIN publicaciones crudas completas ---
                        // La fuente de publicaciones CRUDAS NO se consulta al construir contexto.
                        expect(fuente.invocaciones).toBe(0);

                        // El texto del contexto coincide EXACTAMENTE con la selección pura
                        // sobre la jerarquía persistida (cabecera + resúmenes de MemoriaNivel):
                        // prueba de que NO hay volcado de publicaciones crudas.
                        const seleccion = seleccionarContextoMemoria(escenario, historialAntes, umbral);
                        expect(ctx.contextoMemoria).toBe(seleccion.contextoMemoria);
                        expect(ctx.escenario).toBe(escenario);
                        expect(ctx.contextoMemoria).toContain(`Escenario: ${escenario}`);
                        expect(ctx.semana).toBe(n);

                        // Ningún marcador crudo de semanas anteriores aparece en el contexto
                        // (ni en la memoria jerárquica ni en el contexto semántico).
                        for (const marcador of marcadoresCrudos) {
                            expect(ctx.contextoMemoria).not.toContain(marcador);
                            for (const frag of ctx.contextoSemantico) {
                                expect(frag).not.toContain(marcador);
                            }
                        }

                        // Cada bloque de memoria proviene de una MemoriaNivel consolidada
                        // (uno de los cinco niveles), nunca de una publicación cruda.
                        for (const m of seleccion.memoriasSeleccionadas) {
                            expect(ctx.contextoMemoria).toContain(textoMemoria(m));
                        }

                        // --- (36.3) Contexto semántico desde la Memoria_Semantica ---
                        // Proviene de `memoriaSemanticaArb` vía Embeddings_Search, ordenado
                        // por similitud descendente, recortado al presupuesto restante.
                        const tokensDisponibles = umbral - seleccion.tokensTotales;
                        const semanticoEsperado = seleccionarFragmentosSemanticos(
                            fragsOrdenados,
                            Math.max(0, tokensDisponibles),
                        );
                        expect(ctx.contextoSemantico).toEqual(semanticoEsperado);

                        // --- (28.6) Tamaño <= umbral y recorte de menor a mayor agregación ---
                        const tokensSemantico = ctx.contextoSemantico.reduce(
                            (acc, t) => acc + estimarTokens(t),
                            0,
                        );
                        expect(seleccion.tokensTotales).toBeLessThanOrEqual(umbral);
                        expect(seleccion.tokensTotales + tokensSemantico).toBeLessThanOrEqual(umbral);

                        // La selección es un PREFIJO del orden de prioridad por agregación:
                        // al recortar se descartan PRIMERO los niveles de menor agregación
                        // (Semanal antes que Global).
                        const k = seleccion.memoriasSeleccionadas.length;
                        const prefijoEsperado = porPrioridad.slice(0, k);
                        expect(seleccion.memoriasSeleccionadas).toEqual(prefijoEsperado);

                        // Con umbral holgado (toda la jerarquía cabe), los CINCO niveles
                        // están presentes en el contexto construido.
                        if (umbral >= tokensCompletos) {
                            const nivelesEnContexto = new Set(
                                seleccion.memoriasSeleccionadas.map((m) => m.nivel),
                            );
                            for (const nivel of ORDEN_NIVELES) {
                                expect(nivelesEnContexto.has(nivel)).toBe(true);
                            }
                        }

                        // --- (28.8) Historial jerárquico completo persiste íntegro ---
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

                    // --- (28.8) El historial CRUDO completo permanece recuperable en la BD ---
                    // Tras construir el contexto, cada semana cruda sigue recuperable intacta.
                    fuente.invocaciones = 0;
                    for (let n = 1; n <= numSemanas; n++) {
                        const cruda = await fuente.obtenerResumenSemana(ANALISIS, COMUNIDAD, n);
                        expect(cruda).toEqual(crudaDeSemana(escenario, n, semanas[n - 1]));
                    }
                    expect(fuente.invocaciones).toBe(numSemanas);
                },
            ),
            { numRuns: 100 },
        );
    });
});
