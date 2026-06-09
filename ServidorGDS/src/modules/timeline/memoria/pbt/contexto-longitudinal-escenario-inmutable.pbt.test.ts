// Feature: analisis-tendencias-riesgo-emocional, Property 19: Contexto longitudinal con escenario inmutable
/**
 * PBT - Property 19: Contexto longitudinal con escenario inmutable.
 *
 * Para toda `Semana_Simulada` N > 1, el `ContextoGeneracion` que construye el
 * `Motor_Memoria_Contextual` (`construirContexto`) contiene:
 *  - el `Escenario` original SIN alteracion (identico al fijado al crear el
 *    `Analisis`) en TODAS las semanas;
 *  - el resumen del historial previo derivado de la `Memoria_Jerarquica`
 *    (no de semanas crudas), con los resultados anteriores y los patrones
 *    acumulados (eventos/cambios/anomalias/tendencias);
 *  - el contexto semantico recuperado por `Embeddings_Search`.
 *
 * Se ejercita el motor real (sin mocks de logica) sobre dobles deterministas
 * en memoria del puerto de persistencia (`MemoriaRepositorio`), de la fuente de
 * resumenes (`FuenteResumenSemanal`) y del `Embeddings_Search`
 * (`RecuperadorSemantico`). El generador cubre escenarios no-ASCII y un numero
 * variable de semanas (>= 2).
 *
 * Runner: Jest (`jest --runInBand`), minimo 100 iteraciones (`{ numRuns: 100 }`).
 *
 * Validates: Requirements 5.1, 5.3, 8.6, 36.3
 */
import fc from 'fast-check';

import type { MemoriaRepositorio } from '../memoria-repositorio';
import {
    MemoriaNivel,
    NivelMemoria,
    type FragmentoSemantico,
    type RecuperadorSemantico,
} from '../motor-memoria-contextual.types';
import {
    FuenteResumenSemanal,
    MotorMemoriaContextualService,
    ResumenSemanaCruda,
    seleccionarFragmentosSemanticos,
    textoFragmentoSemantico,
} from '../motor-memoria-contextual.service';

const ANALISIS = 'a-prop19';
const COMUNIDAD = 'c-prop19';
const INSTITUCION = 'i-prop19';
// Umbral de tokens holgado: garantiza que la Memoria_Jerarquica completa y el
// contexto semantico quepan, de modo que la propiedad valide su PRESENCIA.
const LIMITE_TOKENS_HOLGADO = 1_000_000;

/** Doble en memoria del puerto de persistencia con semantica de upsert. */
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
            this.almacen.filter(
                (m) =>
                    m.analisisId === analisisId &&
                    (nivel === undefined || m.nivel === nivel) &&
                    (m.nivel === NivelMemoria.GLOBAL || m.comunidadId === comunidadId),
            ),
        );
    }
}

/** Fuente de resumenes semanales deterministas controlada por el test. */
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

/** Generador de un fragmento texto no vacio (incluye no-ASCII). */
const textoArb = fc.string({ minLength: 1, maxLength: 24 });

/** Generador del `Escenario` original (no vacio, admite no-ASCII). */
const escenarioArb = fc
    .string({ minLength: 1, maxLength: 40 })
    .filter((s) => s.trim().length > 0);

/** Generador de los datos de una semana, con resultados/patrones no vacios. */
const datosSemanaArb: fc.Arbitrary<DatosSemana> = fc.record({
    resumen: textoArb,
    evento: textoArb,
    cambio: textoArb,
    anomalia: textoArb,
    tendencia: textoArb,
});

/** Generador de fragmentos del `Embeddings_Search` (>= 1, contenido no vacio). */
const fragmentosArb: fc.Arbitrary<FragmentoSemantico[]> = fc.array(
    fc.record({
        refId: fc.string({ minLength: 1, maxLength: 8 }),
        similitud: fc.double({ min: 0, max: 1, noNaN: true }),
        refContenido: textoArb,
        numeroSemana: fc.integer({ min: 1, max: 12 }),
    }),
    { minLength: 1, maxLength: 6 },
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

describe('Property 19: Contexto longitudinal con escenario inmutable (Req. 5.1, 5.3, 8.6, 36.3)', () => {
    it('para toda semana N>1, el contexto preserva el escenario original e integra memoria jerarquica + Embeddings_Search', async () => {
        await fc.assert(
            fc.asyncProperty(
                escenarioArb,
                // Al menos 2 semanas para poder evaluar semanas N>1.
                fc.array(datosSemanaArb, { minLength: 2, maxLength: 6 }),
                fragmentosArb,
                async (escenario, semanas, fragmentos) => {
                    const numSemanas = semanas.length;

                    // Sembrar el motor real con dobles deterministas en memoria.
                    const repo = new RepositorioEnMemoria();
                    const porSemana = new Map<number, ResumenSemanaCruda>();
                    semanas.forEach((d, i) => {
                        porSemana.set(i + 1, crudaDeSemana(escenario, d));
                    });
                    const fuente = new FuenteFalsa(porSemana);
                    const recuperador = new RecuperadorSemanticoDoble(fragmentos);
                    const motor = new MotorMemoriaContextualService(
                        repo,
                        fuente,
                        recuperador,
                    );

                    // Cerrar la Memoria_Semanal de cada semana y consolidar un nivel
                    // superior para disponer de Memoria_Jerarquica acumulada.
                    for (let n = 1; n <= numSemanas; n++) {
                        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, n);
                    }
                    await motor.consolidarNivel(
                        ANALISIS,
                        COMUNIDAD,
                        NivelMemoria.MENSUAL,
                        1,
                    );

                    // Salida esperada del contexto semantico: fragmentos ordenados por
                    // similitud descendente (orden estable) y recortados al presupuesto.
                    const ordenados = [...fragmentos].sort(
                        (a, b) => b.similitud - a.similitud,
                    );

                    // Evaluar TODAS las semanas N>1 (la propiedad es "para toda N>1").
                    const escenariosVistos: string[] = [];
                    for (let n = 2; n <= numSemanas; n++) {
                        const ctx = await motor.construirContexto(
                            ANALISIS,
                            COMUNIDAD,
                            n,
                            LIMITE_TOKENS_HOLGADO,
                        );

                        // (a) Escenario original SIN alteracion.
                        expect(ctx.escenario).toBe(escenario);
                        expect(ctx.contextoMemoria).toContain(`Escenario: ${escenario}`);
                        escenariosVistos.push(ctx.escenario);

                        // (b) Numero de semana objetivo y comunidad correctos.
                        expect(ctx.semana).toBe(n);
                        expect(ctx.comunidad).toEqual({
                            institucionId: INSTITUCION,
                            analisisId: ANALISIS,
                        });

                        // (c) Resumen del historial previo desde la Memoria_Jerarquica:
                        //     la semana 1 (previa a toda N>=2) aparece y trae resultados
                        //     anteriores y patrones acumulados (eventos/tendencias).
                        expect(ctx.contextoMemoria).toContain(
                            `[${NivelMemoria.SEMANAL} 1]`,
                        );
                        expect(ctx.contextoMemoria).toContain('Eventos:');
                        expect(ctx.contextoMemoria).toContain('Tendencias:');

                        // (d) Contexto semantico recuperado por Embeddings_Search, no vacio
                        //     y ordenado por similitud descendente. Con umbral holgado y
                        //     fragmentos pequenos, todos caben en el presupuesto restante,
                        //     por lo que la seleccion pura los incluye en su totalidad.
                        const esperado = seleccionarFragmentosSemanticos(
                            ordenados,
                            LIMITE_TOKENS_HOLGADO,
                        );
                        expect(ctx.contextoSemantico).toEqual(esperado);
                        expect(ctx.contextoSemantico.length).toBeGreaterThan(0);
                        // Comprobacion de presencia del primer fragmento (mayor similitud).
                        expect(ctx.contextoSemantico[0]).toBe(
                            textoFragmentoSemantico({
                                refContenido: ordenados[0].refContenido,
                                numeroSemana: ordenados[0].numeroSemana,
                            }),
                        );
                    }

                    // (e) El escenario es IDENTICO en todas las semanas evaluadas y en la
                    //     memoria persistida (inmutabilidad a lo largo del analisis).
                    for (const e of escenariosVistos) {
                        expect(e).toBe(escenario);
                    }
                    for (const m of repo.almacen) {
                        expect(m.escenario).toBe(escenario);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
