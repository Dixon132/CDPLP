// Feature: analisis-tendencias-riesgo-emocional, Property 20: Compactación bajo umbral conservando el historial completo
/**
 * PBT - Property 20: Compactación bajo umbral conservando el historial completo.
 *
 * Para todo historial cuyo tamaño supere el umbral de tokens del
 * `Proveedor_Generacion` activo, el contexto enviado al LLM tras la
 * compactación NO excede dicho umbral, mientras que el historial completo
 * original permanece íntegro y recuperable en la base de datos (relacional, vía
 * la `Memoria_Jerarquica` persistida, y vectorialmente vía la
 * `Memoria_Semantica`/`Embeddings_Search`).
 *
 * Se ejercita el motor real (`MotorMemoriaContextualService`) sin mocks de
 * lógica, sobre dobles deterministas en memoria del puerto de persistencia
 * (`MemoriaRepositorio`), de la fuente de resúmenes (`FuenteResumenSemanal`) y
 * del `Embeddings_Search` (`RecuperadorSemantico`). Se construye una
 * `Memoria_Jerarquica` completa (5 niveles) cuyo tamaño en tokens supera el
 * umbral generado, forzando la compactación.
 *
 * Garantías verificadas:
 *  - El presupuesto de tokens del contexto producido (escenario + memoria
 *    jerárquica seleccionada + contexto semántico) NO excede `limiteTokens`.
 *  - La compactación recorta de MENOR a MAYOR agregación: se descartan primero
 *    los niveles inferiores (SEMANAL) y se conservan los superiores (GLOBAL).
 *  - El historial completo original persiste íntegro y recuperable (Req. 5.4):
 *    `consultar(...)` devuelve TODOS los niveles sin alteración alguna pese a la
 *    compactación enviada al proveedor.
 *
 * Runner: Jest (`jest --runInBand`), mínimo 100 iteraciones (`{ numRuns: 100 }`).
 *
 * Validates: Requirements 5.2, 5.4
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

const ANALISIS = 'a-prop20';
const COMUNIDAD = 'c-prop20';
const INSTITUCION = 'i-prop20';

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

/** Fuente de resúmenes semanales deterministas controlada por el test. */
class FuenteFalsa implements FuenteResumenSemanal {
    constructor(private readonly porSemana: Map<number, ResumenSemanaCruda>) { }

    obtenerResumenSemana(
        _analisisId: string,
        _comunidadId: string,
        semanaN: number,
    ): Promise<ResumenSemanaCruda> {
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

/**
 * Generador `historialArb`: un `Escenario` original y un historial de semanas
 * (>= 3) con contenido suficiente para que la `Memoria_Jerarquica` consolidada
 * supere holgadamente cualquier umbral fraccional generado.
 */
const historialArb = fc.record({
    escenario: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
    semanas: fc.array(datosSemanaArb, { minLength: 3, maxLength: 8 }),
});

/**
 * Generador `umbralTokensArb`: una fracción del tamaño total del historial. En
 * la propiedad se traduce a un umbral entero estrictamente menor que el tamaño
 * completo (para garantizar la precondición "el historial supera el umbral") y
 * no menor a la cabecera del `Escenario` (umbral realista del proveedor).
 */
const umbralTokensArb = fc.double({ min: 0.1, max: 0.9, noNaN: true });

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

/**
 * Presupuesto de tokens del historial COMPLETO con la misma contabilidad que el
 * motor (cabecera del escenario + suma de tokens por memoria). Coincide con
 * `seleccionarContextoMemoria(...).tokensTotales` cuando todas las memorias
 * caben.
 */
function tokensHistorialCompleto(escenario: string, memorias: readonly MemoriaNivel[]): number {
    const cabecera = estimarTokens(`Escenario: ${escenario}`);
    return memorias.reduce((acc, m) => acc + estimarTokens(textoMemoria(m)), cabecera);
}

describe('Property 20: Compactación bajo umbral conservando el historial completo (Req. 5.2, 5.4)', () => {
    it('el contexto compactado no excede el umbral y el historial completo persiste íntegro', async () => {
        await fc.assert(
            fc.asyncProperty(
                historialArb,
                umbralTokensArb,
                fragmentosArb,
                async ({ escenario, semanas }, fraccionUmbral, fragmentos) => {
                    const numSemanas = semanas.length;

                    // Sembrar el motor real con dobles deterministas en memoria.
                    const repo = new RepositorioEnMemoria();
                    const porSemana = new Map<number, ResumenSemanaCruda>();
                    semanas.forEach((d, i) => porSemana.set(i + 1, crudaDeSemana(escenario, d)));
                    const fuente = new FuenteFalsa(porSemana);
                    const recuperador = new RecuperadorSemanticoDoble(fragmentos);
                    const motor = new MotorMemoriaContextualService(repo, fuente, recuperador);

                    // Construir una Memoria_Jerarquica completa de 5 niveles para que el
                    // historial sea grande y la compactación tenga niveles que descartar.
                    for (let n = 1; n <= numSemanas; n++) {
                        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, n);
                    }
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.MENSUAL, 1);
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.TRIMESTRAL, 1);
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.SEMESTRAL, 1);
                    await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.GLOBAL, 0);

                    // Historial completo persistido (snapshot ANTES de construir contexto).
                    const historialCompleto = await motor.consultar(ANALISIS, COMUNIDAD);
                    const tokensCabecera = estimarTokens(`Escenario: ${escenario}`);
                    const tokensCompletos = tokensHistorialCompleto(escenario, historialCompleto);

                    // Precondición: el historial supera el umbral. Se elige un umbral entero
                    // en [tokensCabecera, tokensCompletos - 1] (umbral del proveedor que cabe
                    // al menos para el escenario pero NO para todo el historial).
                    const umbral = Math.min(
                        tokensCompletos - 1,
                        Math.max(tokensCabecera, Math.floor(fraccionUmbral * tokensCompletos)),
                    );
                    // El generador garantiza historial > cabecera; aseguramos el régimen.
                    expect(umbral).toBeLessThan(tokensCompletos);
                    expect(umbral).toBeGreaterThanOrEqual(tokensCabecera);

                    // Acción: construir el contexto bajo el umbral (compactación).
                    const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, numSemanas + 1, umbral);

                    // --- (1) El contexto enviado al LLM NO excede el umbral (Req. 5.2) ---
                    // Se mide con la misma contabilidad de tokens del motor: cabecera del
                    // escenario + memorias seleccionadas + fragmentos semánticos.
                    const seleccion = seleccionarContextoMemoria(escenario, historialCompleto, umbral);
                    const tokensDisponibles = umbral - seleccion.tokensTotales;
                    const fragsOrdenados = [...fragmentos].sort((a, b) => b.similitud - a.similitud);
                    const semanticoEsperado = seleccionarFragmentosSemanticos(
                        fragsOrdenados,
                        Math.max(0, tokensDisponibles),
                    );
                    const tokensSemantico = semanticoEsperado.reduce(
                        (acc, t) => acc + estimarTokens(t),
                        0,
                    );

                    // El contexto producido coincide con la selección determinista.
                    expect(ctx.contextoMemoria).toBe(seleccion.contextoMemoria);
                    expect(ctx.contextoSemantico).toEqual(semanticoEsperado);

                    // Invariante de umbral: presupuesto total dentro del límite.
                    expect(seleccion.tokensTotales).toBeLessThanOrEqual(umbral);
                    expect(seleccion.tokensTotales + tokensSemantico).toBeLessThanOrEqual(umbral);

                    // --- (2) La compactación recorta de MENOR a MAYOR agregación ---
                    // Al superar el umbral, se descarta al menos un nivel.
                    expect(seleccion.memoriasSeleccionadas.length).toBeLessThan(
                        historialCompleto.length,
                    );
                    // Las memorias conservadas son las de mayor agregación (prefijo por
                    // prioridad GLOBAL -> SEMANAL): ningún nivel descartado es de mayor
                    // agregación que un nivel conservado.
                    const prioridad = [...ORDEN_NIVELES].reverse(); // GLOBAL ... SEMANAL
                    const rangoSeleccionados = seleccion.memoriasSeleccionadas.map((m) =>
                        prioridad.indexOf(m.nivel),
                    );
                    const nivelesPresentes = new Set(
                        seleccion.memoriasSeleccionadas.map((m) => m.nivel),
                    );
                    const descartadas = historialCompleto.filter(
                        (m) => !seleccion.memoriasSeleccionadas.includes(m),
                    );
                    for (const d of descartadas) {
                        const rangoDescartado = prioridad.indexOf(d.nivel);
                        for (const r of rangoSeleccionados) {
                            // Una memoria conservada nunca es de menor agregación (mayor
                            // índice de prioridad) que una descartada del mismo o superior nivel.
                            if (!nivelesPresentes.has(d.nivel)) {
                                expect(rangoDescartado).toBeGreaterThanOrEqual(r);
                            }
                        }
                    }
                    // El escenario inmutable se conserva siempre como cabecera (Req. 5.3).
                    expect(ctx.escenario).toBe(escenario);
                    expect(ctx.contextoMemoria).toContain(`Escenario: ${escenario}`);

                    // --- (3) El historial completo original permanece íntegro (Req. 5.4) ---
                    // Tras la compactación enviada al proveedor, la BD conserva TODOS los
                    // niveles sin alteración: recuperable relacionalmente.
                    const historialTrasContexto = await motor.consultar(ANALISIS, COMUNIDAD);
                    expect(historialTrasContexto.length).toBe(historialCompleto.length);
                    // Todos los niveles de la jerarquía siguen presentes y completos.
                    for (const original of historialCompleto) {
                        const persistido = historialTrasContexto.find(
                            (m) =>
                                m.nivel === original.nivel &&
                                m.periodo === original.periodo &&
                                m.comunidadId === original.comunidadId,
                        );
                        expect(persistido).toEqual(original);
                    }
                    // El historial completo sigue siendo mayor que el contexto compactado.
                    expect(tokensCompletos).toBeGreaterThan(seleccion.tokensTotales);
                },
            ),
            { numRuns: 100 },
        );
    });
});
