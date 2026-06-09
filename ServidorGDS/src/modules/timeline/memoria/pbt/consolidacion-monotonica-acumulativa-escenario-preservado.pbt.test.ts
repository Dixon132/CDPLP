// Feature: analisis-tendencias-riesgo-emocional, Property 27: Consolidación monotónica acumulativa de la memoria con escenario preservado
/**
 * PBT - Property 27: Consolidación monotónica acumulativa de la memoria con
 * escenario preservado.
 *
 * Para toda `Memoria_Jerarquica` de un `Analisis`, consolidar un nivel superior
 * (mensual, trimestral, semestral o global) resume TODOS los periodos inferiores
 * ya cerrados, y reconsolidar tras añadir un periodo nuevo amplía el alcance de
 * forma monotónica sin perder la información de los periodos previos; además, el
 * `Escenario` original aparece sin alteración en TODOS los niveles, desde la
 * `Memoria_Semanal` hasta la `Memoria_Global`.
 *
 * Se ejercita el motor real (`MotorMemoriaContextualService`) sin mocks de
 * lógica, sobre dobles deterministas en memoria del puerto de persistencia
 * (`MemoriaRepositorio`) y de la fuente de resúmenes (`FuenteResumenSemanal`).
 *
 * Garantías verificadas:
 *  - Cobertura total: consolidar un nivel superior incluye (resume) la
 *    información de TODOS los periodos del nivel inferior ya cerrados, y la
 *    consolidación se propaga acumulativamente hasta `GLOBAL` (que cubre todas
 *    las `Memoria_Semanal`).
 *  - Monotonía: reconsolidar el mismo nivel tras añadir nuevos periodos
 *    inferiores produce un conjunto que CONTIENE el anterior (superset) y nunca
 *    pierde información previa (eventos/cambios/anomalías/tendencias).
 *  - Escenario inmutable: el `Escenario` original es idéntico en los cinco
 *    niveles y en toda la memoria persistida.
 *
 * Runner: Jest (`jest --runInBand`), mínimo 100 iteraciones (`{ numRuns: 100 }`).
 *
 * Validates: Requirements 28.1, 28.2, 28.3, 28.4, 28.7
 */
import fc from 'fast-check';

import type { MemoriaRepositorio } from '../memoria-repositorio';
import {
    MemoriaNivel,
    NivelMemoria,
    ORDEN_NIVELES,
} from '../motor-memoria-contextual.types';
import {
    FuenteResumenSemanal,
    MotorMemoriaContextualService,
    ResumenSemanaCruda,
} from '../motor-memoria-contextual.service';

const ANALISIS = 'a-prop27';
const COMUNIDAD = 'c-prop27';
const INSTITUCION = 'i-prop27';

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

/** Datos generados de una `Semana_Simulada`. */
interface DatosSemana {
    resumen: string;
    evento: string;
    cambio: string;
    anomalia: string;
    tendencia: string;
}

/** Fragmento de texto no vacío (incluye no-ASCII). */
const textoArb = fc.string({ minLength: 1, maxLength: 24 });

/** Datos de una semana, con resultados/patrones no vacíos. */
const datosSemanaArb: fc.Arbitrary<DatosSemana> = fc.record({
    resumen: textoArb,
    evento: textoArb,
    cambio: textoArb,
    anomalia: textoArb,
    tendencia: textoArb,
});

/**
 * Generador `memoriaJerarquicaArb`: un `Escenario` original (no vacío, admite
 * no-ASCII) y un historial de `Semana_Simulada` partido en dos lotes
 * (`semanasIniciales`, `semanasAdicionales`), ambos no vacíos, para poder
 * comparar una consolidación parcial frente a la reconsolidación tras añadir
 * nuevos periodos (monotonía).
 */
const memoriaJerarquicaArb = fc.record({
    escenario: fc
        .string({ minLength: 1, maxLength: 40 })
        .filter((s) => s.trim().length > 0),
    semanasIniciales: fc.array(datosSemanaArb, { minLength: 1, maxLength: 4 }),
    semanasAdicionales: fc.array(datosSemanaArb, { minLength: 1, maxLength: 4 }),
});

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

/** Las cuatro listas de patrones acumulados de una memoria, como conjuntos. */
function conjuntosPatrones(m: MemoriaNivel): {
    eventos: Set<string>;
    cambios: Set<string>;
    anomalias: Set<string>;
    tendencias: Set<string>;
} {
    return {
        eventos: new Set(m.eventosRelevantes),
        cambios: new Set(m.cambiosImportantes),
        anomalias: new Set(m.anomalias),
        tendencias: new Set(m.tendencias),
    };
}

/** Verifica que `mayor` contiene TODOS los elementos de `menor` (superset). */
function esSuperset<T>(mayor: Set<T>, menor: Set<T>): boolean {
    for (const x of menor) {
        if (!mayor.has(x)) return false;
    }
    return true;
}

describe('Property 27: Consolidación monotónica acumulativa con escenario preservado (Req. 28.1, 28.2, 28.3, 28.4, 28.7)', () => {
    it('consolidar resume todos los periodos inferiores, crece monotónicamente al añadir periodos y preserva el escenario en todos los niveles', async () => {
        await fc.assert(
            fc.asyncProperty(
                memoriaJerarquicaArb,
                async ({ escenario, semanasIniciales, semanasAdicionales }) => {
                    const repo = new RepositorioEnMemoria();
                    const porSemana = new Map<number, ResumenSemanaCruda>();
                    const todasLasSemanas = [...semanasIniciales, ...semanasAdicionales];
                    todasLasSemanas.forEach((d, i) =>
                        porSemana.set(i + 1, crudaDeSemana(escenario, d)),
                    );
                    const fuente = new FuenteFalsa(porSemana);
                    const motor = new MotorMemoriaContextualService(repo, fuente);

                    const nIniciales = semanasIniciales.length;
                    const nTotal = todasLasSemanas.length;

                    // --- Fase 1: cerrar las semanas iniciales y consolidar MENSUAL ---
                    for (let n = 1; n <= nIniciales; n++) {
                        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, n);
                    }
                    const mensualParcial = await motor.consolidarNivel(
                        ANALISIS,
                        COMUNIDAD,
                        NivelMemoria.MENSUAL,
                        1,
                    );

                    // (a) La MENSUAL parcial resume TODOS los periodos SEMANAL cerrados:
                    //     cada evento/tendencia/etc. de cada semana inicial está presente.
                    const setParcial = conjuntosPatrones(mensualParcial);
                    for (let i = 0; i < nIniciales; i++) {
                        const d = semanasIniciales[i];
                        expect(setParcial.eventos.has(d.evento)).toBe(true);
                        expect(setParcial.cambios.has(d.cambio)).toBe(true);
                        expect(setParcial.anomalias.has(d.anomalia)).toBe(true);
                        expect(setParcial.tendencias.has(d.tendencia)).toBe(true);
                    }
                    // El escenario original se preserva en la consolidación.
                    expect(mensualParcial.escenario).toBe(escenario);

                    // --- Fase 2: añadir las semanas adicionales y RECONSOLIDAR MENSUAL ---
                    for (let n = nIniciales + 1; n <= nTotal; n++) {
                        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, n);
                    }
                    const mensualAmpliada = await motor.consolidarNivel(
                        ANALISIS,
                        COMUNIDAD,
                        NivelMemoria.MENSUAL,
                        1,
                    );
                    const setAmpliada = conjuntosPatrones(mensualAmpliada);

                    // (b) Monotonía: reconsolidar tras añadir periodos NO pierde
                    //     información previa (el conjunto ampliado es superset del parcial).
                    expect(esSuperset(setAmpliada.eventos, setParcial.eventos)).toBe(true);
                    expect(esSuperset(setAmpliada.cambios, setParcial.cambios)).toBe(true);
                    expect(esSuperset(setAmpliada.anomalias, setParcial.anomalias)).toBe(true);
                    expect(esSuperset(setAmpliada.tendencias, setParcial.tendencias)).toBe(true);
                    // El alcance se amplía de forma monotónica (nunca decrece).
                    expect(setAmpliada.eventos.size).toBeGreaterThanOrEqual(
                        setParcial.eventos.size,
                    );
                    expect(setAmpliada.tendencias.size).toBeGreaterThanOrEqual(
                        setParcial.tendencias.size,
                    );

                    // (c) La MENSUAL ampliada resume TODAS las semanas cerradas (iniciales
                    //     + adicionales): cada patrón de cada semana está presente.
                    for (let i = 0; i < nTotal; i++) {
                        const d = todasLasSemanas[i];
                        expect(setAmpliada.eventos.has(d.evento)).toBe(true);
                        expect(setAmpliada.cambios.has(d.cambio)).toBe(true);
                        expect(setAmpliada.anomalias.has(d.anomalia)).toBe(true);
                        expect(setAmpliada.tendencias.has(d.tendencia)).toBe(true);
                    }

                    // --- Fase 3: propagar la consolidación hasta GLOBAL ---
                    await motor.consolidarNivel(
                        ANALISIS,
                        COMUNIDAD,
                        NivelMemoria.TRIMESTRAL,
                        1,
                    );
                    await motor.consolidarNivel(
                        ANALISIS,
                        COMUNIDAD,
                        NivelMemoria.SEMESTRAL,
                        1,
                    );
                    const global = await motor.consolidarNivel(
                        ANALISIS,
                        COMUNIDAD,
                        NivelMemoria.GLOBAL,
                        0,
                    );

                    // (d) La consolidación acumulativa ascendente llega a GLOBAL, que
                    //     resume TODAS las `Memoria_Semanal` del análisis (Req. 28.2-28.4).
                    const setGlobal = conjuntosPatrones(global);
                    for (let i = 0; i < nTotal; i++) {
                        const d = todasLasSemanas[i];
                        expect(setGlobal.eventos.has(d.evento)).toBe(true);
                        expect(setGlobal.cambios.has(d.cambio)).toBe(true);
                        expect(setGlobal.anomalias.has(d.anomalia)).toBe(true);
                        expect(setGlobal.tendencias.has(d.tendencia)).toBe(true);
                    }

                    // (e) El `Escenario` original aparece SIN alteración en TODOS los
                    //     niveles, desde la `Memoria_Semanal` hasta la `Memoria_Global`
                    //     (Req. 28.7).
                    for (const nivel of ORDEN_NIVELES) {
                        const memoriasNivel = await motor.consultar(
                            ANALISIS,
                            COMUNIDAD,
                            nivel,
                        );
                        expect(memoriasNivel.length).toBeGreaterThan(0);
                        for (const m of memoriasNivel) {
                            expect(m.escenario).toBe(escenario);
                        }
                    }
                    // Y en toda la memoria persistida sin excepción.
                    for (const m of repo.almacen) {
                        expect(m.escenario).toBe(escenario);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
