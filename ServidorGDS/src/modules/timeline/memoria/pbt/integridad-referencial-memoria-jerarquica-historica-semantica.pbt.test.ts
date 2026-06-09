// Feature: analisis-tendencias-riesgo-emocional, Property 29: Integridad referencial de la memoria jerárquica y de la memoria histórica
/**
 * PBT - Property 29: Integridad referencial de la memoria jerarquica y de la
 * memoria historica (tarea 22.8).
 *
 * Texto de la propiedad (design.md):
 * "Para todo nivel de la `Memoria_Jerarquica` y todo registro de memoria
 *  historica (tendencias/eventos) y de `Memoria_Semantica` (`gds_embedding`),
 *  cada registro referencia exactamente un `Analisis` y su
 *  `Comunidad_Digital`/`Institucion` correspondiente (o el `Analisis` en el nivel
 *  global), sin registros huerfanos; al eliminar el `Analisis`, se borran en
 *  cascada sin afectar los de otros analisis."
 *
 * La propiedad se verifica de forma SINCRONA y DETERMINISTA (sin Redis, sin BD
 * real, sin red), conforme a las restricciones Windows/cmd del plan, ejercitando
 * las piezas REALES de dominio que ESCRIBEN en las tres memorias persistentes a
 * traves de sus puertos estables (tareas 3.5, 9.1, 22.1/22.2):
 *
 *  - `MotorMemoriaContextualService` REAL escribe la `Memoria_Jerarquica` de los
 *    CINCO niveles (`consolidarSemanal` + `consolidarNivel`) y la MEMORIA
 *    HISTORICA (`registrarHistoria`: tendencias + eventos) a traves de los
 *    puertos `MemoriaRepositorio` y `MemoriaHistoricaRepositorio`.
 *  - `MemoriaSemanticaService` REAL acumula la `Memoria_Semantica`
 *    (`gds_embedding`) a traves del puerto append-only `AlmacenEmbeddings`.
 *
 * Los tres puertos estan respaldados por un UNICO doble relacional en memoria
 * (`BancoMemoria`), modelo fiel de la BD dedicada que:
 *
 *   (a) ENFORZA la integridad referencial al INSERTAR (Req. 28.9, 36.5, 39.3):
 *       todo registro debe referenciar un `Analisis` registrado y, salvo el nivel
 *       GLOBAL, su `Comunidad_Digital` registrada (perteneciente a ese `Analisis`)
 *       y la `Institucion` de esa comunidad. Un insert con referencias colgantes
 *       se RECHAZA, de modo que el sistema impide estructuralmente los huerfanos
 *       (las implementaciones reales no pueden crearlos).
 *   (b) Modela la CASCADA de borrado del subgrafo del `Analisis`
 *       (`borrarAnalisis`) tal como la declara el esquema Prisma
 *       (`onDelete: Cascade` sobre `analisis_id`), conservando las `Institucion`
 *       (FK RESTRICT, nunca se borran en cascada, Req. 25.7) y SIN tocar los
 *       registros de otros `Analisis`.
 *
 * Garantias verificadas (las tres que exige la propiedad):
 *
 *   1. ATADURA REFERENCIAL EXACTA (Req. 28.9, 36.5, 39.3): cada registro de los
 *      cinco niveles jerarquicos, de tendencias, de eventos y de embeddings
 *      referencia exactamente UN `Analisis` registrado; los niveles
 *      semanal..semestral, las tendencias, los eventos y los embeddings ademas a
 *      exactamente UNA `Comunidad_Digital` perteneciente a ese `Analisis` y a la
 *      `Institucion` de esa comunidad; el nivel GLOBAL referencia solo al
 *      `Analisis` (sin comunidad/institucion).
 *   2. SIN REGISTROS HUERFANOS (Req. 28.9, 36.5, 39.3): no existe ningun registro
 *      cuyo `Analisis`/`Comunidad_Digital`/`Institucion` referenciada no este
 *      registrada; la fuente de verdad (banco) lo impide al insertar.
 *   3. CASCADA AISLADA (Req. 25.4, 25.7): al eliminar UN `Analisis`, TODOS sus
 *      registros dependientes de las tres memorias desaparecen, los de los demas
 *      `Analisis` permanecen IDENTICOS (sin mezcla entre estudios paralelos) y
 *      ninguna `Institucion` se elimina.
 *
 * Framework: Jest + fast-check (numRuns: 100), `jest --runInBand`.
 *
 * Validates: Requirements 28.9, 36.5, 39.3
 */
import fc from 'fast-check';

import type { MemoriaRepositorio } from '../memoria-repositorio';
import type { MemoriaHistoricaRepositorio } from '../memoria-historica-repositorio';
import {
    MemoriaNivel,
    NivelMemoria,
    ORDEN_NIVELES,
    type EventoHistoricoRegistro,
    type FiltroHistoria,
    type TendenciaHistoricaRegistro,
} from '../motor-memoria-contextual.types';
import {
    MotorMemoriaContextualService,
    type FuenteResumenSemanal,
    type ResumenSemanaCruda,
} from '../motor-memoria-contextual.service';

import {
    MemoriaSemanticaService,
    type GeneradorEmbeddings,
} from '../../../ai-engine/memoriaSemantica.service';
import type {
    AlmacenEmbeddings,
    FiltroTrazabilidad,
    RefEmbedding,
    RegistroEmbedding,
} from '../../../ai-engine/embeddingRepositorio';
import type { VectorMemoria } from '../../../ai-engine/memoriaSemantica';

const NUM_RUNS = 100;

// ===========================================================================
// Doble relacional en memoria de la BD dedicada (fuente de verdad)
// ===========================================================================

/** `Comunidad_Digital` registrada: pertenece a UN `Analisis` y UNA `Institucion`. */
interface ComunidadRegistrada {
    comunidadId: string;
    analisisId: string;
    institucionId: string;
}

/** Clave de upsert de una `MemoriaNivel` (GLOBAL no esta acotada a comunidad). */
function claveMemoria(m: MemoriaNivel): string {
    return m.nivel === NivelMemoria.GLOBAL
        ? `${m.nivel}|${m.analisisId}`
        : `${m.nivel}|${m.analisisId}|${m.comunidadId}|${m.periodo}`;
}

/**
 * Banco relacional en memoria que respalda los TRES puertos de persistencia y
 * gobierna la integridad referencial y la cascada del subgrafo del `Analisis`.
 */
class BancoMemoria {
    /** `Analisis` registrados (id -> escenario). */
    private readonly analisis = new Map<string, { escenario: string }>();
    /** `Institucion` registradas (FK RESTRICT: nunca se borran en cascada). */
    private readonly instituciones = new Set<string>();
    /** `Comunidad_Digital` registradas. */
    private readonly comunidades = new Map<string, ComunidadRegistrada>();

    /** Tablas dependientes (subgrafo del `Analisis`, borradas en cascada). */
    readonly memorias = new Map<string, MemoriaNivel>();
    readonly tendencias: (TendenciaHistoricaRegistro & { id: number })[] = [];
    readonly eventos: (EventoHistoricoRegistro & { id: number })[] = [];
    readonly embeddings = new Map<string, RegistroEmbedding>();

    private seqHistoria = 0;

    // --- Registro de entidades padre -------------------------------------

    registrarAnalisis(analisisId: string, escenario: string): void {
        this.analisis.set(analisisId, { escenario });
    }

    registrarInstitucion(institucionId: string): void {
        this.instituciones.add(institucionId);
    }

    registrarComunidad(c: ComunidadRegistrada): void {
        this.comunidades.set(c.comunidadId, { ...c });
    }

    analisisRegistrado(analisisId: string): boolean {
        return this.analisis.has(analisisId);
    }

    institucionRegistrada(institucionId: string): boolean {
        return this.instituciones.has(institucionId);
    }

    comunidadDe(comunidadId: string): ComunidadRegistrada | undefined {
        return this.comunidades.get(comunidadId);
    }

    institucionesRegistradas(): string[] {
        return [...this.instituciones];
    }

    // --- Validacion de integridad referencial al INSERTAR ----------------

    /**
     * Verifica que una referencia `(analisisId, comunidadId, institucionId)` sea
     * integra antes de aceptar un insert. `esGlobal` exime de comunidad/institucion
     * (el nivel GLOBAL referencia solo al `Analisis`).
     *
     * @throws si la referencia esta colgada (impide huerfanos, Req. 28.9/36.5/39.3).
     */
    private validarReferencia(
        contexto: string,
        analisisId: string,
        comunidadId: string,
        institucionId: string,
        esGlobal: boolean,
    ): void {
        if (!this.analisis.has(analisisId)) {
            throw new Error(`${contexto}: Analisis huerfano '${analisisId}'.`);
        }
        if (esGlobal) {
            if (comunidadId !== '' || institucionId !== '') {
                throw new Error(`${contexto}: el nivel GLOBAL no debe fijar comunidad/institucion.`);
            }
            return;
        }
        const comunidad = this.comunidades.get(comunidadId);
        if (!comunidad) {
            throw new Error(`${contexto}: Comunidad_Digital huerfana '${comunidadId}'.`);
        }
        if (comunidad.analisisId !== analisisId) {
            throw new Error(
                `${contexto}: la comunidad '${comunidadId}' no pertenece al analisis '${analisisId}'.`,
            );
        }
        if (comunidad.institucionId !== institucionId) {
            throw new Error(
                `${contexto}: institucion '${institucionId}' no coincide con la de la comunidad.`,
            );
        }
        if (!this.instituciones.has(institucionId)) {
            throw new Error(`${contexto}: Institucion huerfana '${institucionId}'.`);
        }
    }

    // --- Operaciones de las tablas dependientes --------------------------

    upsertMemoria(m: MemoriaNivel): void {
        const esGlobal = m.nivel === NivelMemoria.GLOBAL;
        this.validarReferencia('gds_memoria_*', m.analisisId, m.comunidadId, m.institucionId, esGlobal);
        this.memorias.set(claveMemoria(m), structuredClone(m));
    }

    listarMemorias(
        analisisId: string,
        comunidadId: string,
        nivel?: NivelMemoria,
    ): MemoriaNivel[] {
        return [...this.memorias.values()]
            .filter(
                (m) =>
                    m.analisisId === analisisId &&
                    (nivel === undefined || m.nivel === nivel) &&
                    (m.nivel === NivelMemoria.GLOBAL || m.comunidadId === comunidadId),
            )
            .map((m) => structuredClone(m));
    }

    insertarTendencia(t: TendenciaHistoricaRegistro): void {
        this.validarReferencia('gds_tendencia_historica', t.analisisId, t.comunidadId, t.comunidadId === '' ? '' : this.comunidadDe(t.comunidadId)?.institucionId ?? '___', false);
        this.tendencias.push({ ...t, id: this.seqHistoria++ });
    }

    insertarEvento(e: EventoHistoricoRegistro): void {
        this.validarReferencia('gds_evento_historico', e.analisisId, e.comunidadId, e.comunidadId === '' ? '' : this.comunidadDe(e.comunidadId)?.institucionId ?? '___', false);
        this.eventos.push({ ...e, id: this.seqHistoria++ });
    }

    insertarEmbedding(r: RegistroEmbedding): void {
        this.validarReferencia('gds_embedding', r.analisisId, r.comunidadId, r.institucionId, false);
        // Append-only idempotente por refId (clave primaria estable).
        if (!this.embeddings.has(r.refId)) {
            this.embeddings.set(r.refId, { ...r });
        }
    }

    // --- Cascada de borrado del subgrafo del `Analisis` (Req. 25.4) -------

    /**
     * Borra en cascada TODOS los registros dependientes del `Analisis` indicado:
     * memoria jerarquica, tendencias, eventos, embeddings y sus comunidades. NO
     * elimina ninguna `Institucion` (FK RESTRICT, Req. 25.7) ni toca registros de
     * otros `Analisis`.
     */
    borrarAnalisis(analisisId: string): void {
        for (const [clave, m] of [...this.memorias]) {
            if (m.analisisId === analisisId) this.memorias.delete(clave);
        }
        let i = this.tendencias.length;
        while (i--) if (this.tendencias[i].analisisId === analisisId) this.tendencias.splice(i, 1);
        let j = this.eventos.length;
        while (j--) if (this.eventos[j].analisisId === analisisId) this.eventos.splice(j, 1);
        for (const [refId, r] of [...this.embeddings]) {
            if (r.analisisId === analisisId) this.embeddings.delete(refId);
        }
        for (const [comunidadId, c] of [...this.comunidades]) {
            if (c.analisisId === analisisId) this.comunidades.delete(comunidadId);
        }
        this.analisis.delete(analisisId);
        // Las `Institucion` permanecen (RESTRICT): no se tocan.
    }

    // --- Vistas de auditoria de las tablas dependientes ------------------

    todasLasMemorias(): MemoriaNivel[] {
        return [...this.memorias.values()].map((m) => structuredClone(m));
    }
}

// ===========================================================================
// Adaptadores de los tres puertos REALES sobre el banco
// ===========================================================================

/** `MemoriaRepositorio` (puerto de la `Memoria_Jerarquica`) sobre el banco. */
class RepoMemoriaSobreBanco implements MemoriaRepositorio {
    constructor(private readonly banco: BancoMemoria) { }

    guardar(memoria: MemoriaNivel): Promise<MemoriaNivel> {
        this.banco.upsertMemoria(memoria);
        return Promise.resolve(memoria);
    }

    listar(
        analisisId: string,
        comunidadId: string,
        nivel?: NivelMemoria,
    ): Promise<MemoriaNivel[]> {
        return Promise.resolve(this.banco.listarMemorias(analisisId, comunidadId, nivel));
    }
}

/** `MemoriaHistoricaRepositorio` (tendencias + eventos) sobre el banco. */
class RepoHistoricaSobreBanco implements MemoriaHistoricaRepositorio {
    constructor(private readonly banco: BancoMemoria) { }

    registrarTendencias(tendencias: TendenciaHistoricaRegistro[]): Promise<void> {
        for (const t of tendencias) this.banco.insertarTendencia(t);
        return Promise.resolve();
    }

    registrarEventos(eventos: EventoHistoricoRegistro[]): Promise<void> {
        for (const e of eventos) this.banco.insertarEvento(e);
        return Promise.resolve();
    }

    listarTendencias(filtro: FiltroHistoria): Promise<TendenciaHistoricaRegistro[]> {
        return Promise.resolve(
            this.banco.tendencias
                .filter(
                    (t) =>
                        t.analisisId === filtro.analisisId &&
                        (filtro.comunidadId === undefined || t.comunidadId === filtro.comunidadId) &&
                        (filtro.numeroSemana === undefined || t.numeroSemana === filtro.numeroSemana),
                )
                .map(({ id: _id, ...t }) => t),
        );
    }

    listarEventos(filtro: FiltroHistoria): Promise<EventoHistoricoRegistro[]> {
        return Promise.resolve(
            this.banco.eventos
                .filter(
                    (e) =>
                        e.analisisId === filtro.analisisId &&
                        (filtro.comunidadId === undefined || e.comunidadId === filtro.comunidadId) &&
                        (filtro.numeroSemana === undefined || e.numeroSemana === filtro.numeroSemana),
                )
                .map(({ id: _id, ...e }) => e),
        );
    }
}

/** `AlmacenEmbeddings` (append-only, `gds_embedding`) sobre el banco. */
class AlmacenSobreBanco implements AlmacenEmbeddings {
    constructor(private readonly banco: BancoMemoria) { }

    insertar(registros: RegistroEmbedding[]): Promise<void> {
        for (const r of registros) this.banco.insertarEmbedding(r);
        return Promise.resolve();
    }

    contar(filtro?: FiltroTrazabilidad): Promise<number> {
        return Promise.resolve(this.filtrar(filtro).length);
    }

    listarRefs(filtro?: FiltroTrazabilidad): Promise<RefEmbedding[]> {
        return Promise.resolve(this.filtrar(filtro).map(aRef));
    }

    recuperarRefs(refIds: string[], filtro: FiltroTrazabilidad): Promise<RefEmbedding[]> {
        const set = new Set(refIds);
        return Promise.resolve(this.filtrar(filtro).filter((r) => set.has(r.refId)).map(aRef));
    }

    private filtrar(filtro?: FiltroTrazabilidad): RegistroEmbedding[] {
        return [...this.banco.embeddings.values()].filter((r) => {
            if (!filtro) return true;
            if (filtro.analisisId !== undefined && r.analisisId !== filtro.analisisId) return false;
            if (filtro.comunidadId !== undefined && r.comunidadId !== filtro.comunidadId) return false;
            if (filtro.institucionId !== undefined && r.institucionId !== filtro.institucionId) return false;
            if (filtro.numeroSemana !== undefined && r.numeroSemana !== filtro.numeroSemana) return false;
            return true;
        });
    }
}

/** Proyeccion de un `RegistroEmbedding` a su `RefEmbedding` (sin el vector). */
function aRef(r: RegistroEmbedding): RefEmbedding {
    return {
        refId: r.refId,
        analisisId: r.analisisId,
        comunidadId: r.comunidadId,
        institucionId: r.institucionId,
        resultadoId: r.resultadoId,
        numeroSemana: r.numeroSemana,
        refContenido: r.refContenido,
        modelo: r.modelo,
    };
}

/** Generador determinista de embeddings (doble de la `Capa_ML`/`Servicio_IA`). */
class GeneradorEmbeddingsDoble implements GeneradorEmbeddings {
    embeddings(textos: string[]): Promise<number[][]> {
        return Promise.resolve(textos.map((t, i) => [t.length, i, t.length + i]));
    }
}

// ===========================================================================
// Generadores fast-check de la poblacion de Analisis paralelos
// ===========================================================================

interface ConfigComunidad {
    /** Sufijo base (unico dentro del analisis) para derivar el `comunidadId`. */
    base: string;
    institucionId: string;
}

interface ConfigAnalisis {
    analisisId: string;
    escenario: string;
    comunidades: ConfigComunidad[];
    semanas: number;
}

/** Escenario inmutable no vacio (admite no-ASCII). */
const escenarioArb = fc.string({ minLength: 1, maxLength: 24 }).filter((s) => s.trim().length > 0);

/** Una comunidad: base unica por analisis + institucion de un pool (compartible). */
const comunidadArb: fc.Arbitrary<ConfigComunidad> = fc.record({
    base: fc.constantFrom('cA', 'cB', 'cC', 'cD'),
    institucionId: fc.constantFrom('inst-1', 'inst-2', 'inst-3'),
});

/** Un `Analisis` con 1..3 comunidades (bases unicas) y 1..5 semanas. */
const analisisArb: fc.Arbitrary<ConfigAnalisis> = fc
    .record({
        analisisId: fc.constantFrom('an-1', 'an-2', 'an-3', 'an-4'),
        escenario: escenarioArb,
        comunidades: fc.uniqueArray(comunidadArb, {
            minLength: 1,
            maxLength: 3,
            selector: (c) => c.base,
        }),
        semanas: fc.integer({ min: 1, max: 5 }),
    });

/** Poblacion de 1..4 `Analisis` paralelos con ids unicos. */
const poblacionArb: fc.Arbitrary<ConfigAnalisis[]> = fc.uniqueArray(analisisArb, {
    minLength: 1,
    maxLength: 4,
    selector: (a) => a.analisisId,
});

// ===========================================================================
// Construccion de la poblacion: ESCRITURA con los servicios REALES
// ===========================================================================

/** `comunidadId` globalmente unico derivado de `(analisisId, base)`. */
function comunidadIdDe(analisisId: string, base: string): string {
    return `${analisisId}:${base}`;
}

/**
 * Siembra el banco con la `Memoria_Jerarquica` (5 niveles), la memoria historica
 * (tendencias + eventos) y la `Memoria_Semantica` (embeddings) de toda la
 * poblacion, usando EXCLUSIVAMENTE los servicios reales a traves de sus puertos.
 */
async function sembrarPoblacion(
    banco: BancoMemoria,
    poblacion: ConfigAnalisis[],
): Promise<void> {
    const fuenteMapa = new Map<string, ResumenSemanaCruda>();
    const motor = new MotorMemoriaContextualService(
        new RepoMemoriaSobreBanco(banco),
        new FuenteMapa(fuenteMapa),
        undefined,
        new RepoHistoricaSobreBanco(banco),
    );
    const memoriaSemantica = new MemoriaSemanticaService(
        new GeneradorEmbeddingsDoble(),
        new AlmacenSobreBanco(banco),
    );

    // 1) Registrar entidades padre (Analisis, Institucion, Comunidad).
    for (const a of poblacion) {
        banco.registrarAnalisis(a.analisisId, a.escenario);
        for (const c of a.comunidades) {
            banco.registrarInstitucion(c.institucionId);
            banco.registrarComunidad({
                comunidadId: comunidadIdDe(a.analisisId, c.base),
                analisisId: a.analisisId,
                institucionId: c.institucionId,
            });
        }
    }

    // 2) Escribir las tres memorias por (analisis, comunidad, semana).
    for (const a of poblacion) {
        for (const c of a.comunidades) {
            const comunidadId = comunidadIdDe(a.analisisId, c.base);

            // Preparar la fuente cruda de cada semana (escenario + institucion).
            for (let n = 1; n <= a.semanas; n++) {
                fuenteMapa.set(`${a.analisisId}|${comunidadId}|${n}`, {
                    escenario: a.escenario,
                    institucionId: c.institucionId,
                    resumen: `S${n} ${comunidadId}`,
                    eventosRelevantes: [`ev-${n}`],
                    cambiosImportantes: [`ch-${n}`],
                    anomalias: [`an-${n}`],
                    tendencias: [`tr-${n}`],
                });
            }

            // Memoria_Jerarquica de CINCO niveles (Req. 28.1-28.4).
            for (let n = 1; n <= a.semanas; n++) {
                await motor.consolidarSemanal(a.analisisId, comunidadId, n);
            }
            await motor.consolidarNivel(a.analisisId, comunidadId, NivelMemoria.MENSUAL, 1);
            await motor.consolidarNivel(a.analisisId, comunidadId, NivelMemoria.TRIMESTRAL, 1);
            await motor.consolidarNivel(a.analisisId, comunidadId, NivelMemoria.SEMESTRAL, 1);
            await motor.consolidarNivel(a.analisisId, comunidadId, NivelMemoria.GLOBAL, 0);

            // Memoria historica (tendencias + eventos) trazable (Req. 39.3).
            for (let n = 1; n <= a.semanas; n++) {
                await motor.registrarHistoria({
                    tendencias: [
                        {
                            analisisId: a.analisisId,
                            comunidadId,
                            numeroSemana: n,
                            dimension: 'aislamiento',
                            direccion: 'sube',
                            magnitud: n / 10,
                            zonaLatitud: 0,
                            zonaLongitud: 0,
                            zonaRadioMetros: 100,
                        },
                    ],
                    eventos: [
                        {
                            analisisId: a.analisisId,
                            comunidadId,
                            numeroSemana: n,
                            tipo: 'conflicto',
                            descripcion: `evt s${n}`,
                        },
                    ],
                });
            }

            // Memoria_Semantica: embeddings trazables acumulados (Req. 36.5).
            for (let n = 1; n <= a.semanas; n++) {
                const vectores: VectorMemoria[] = [
                    {
                        refId: `${comunidadId}:s${n}:post`,
                        analisisId: a.analisisId,
                        comunidadId,
                        institucionId: c.institucionId,
                        resultadoId: `res:${a.analisisId}:${comunidadId}:${n}`,
                        numeroSemana: n,
                        refContenido: `post s${n}`,
                        modelo: 'all-MiniLM-L6-v2',
                    },
                ];
                await memoriaSemantica.indexar(vectores, vectores.map((v) => v.refContenido));
            }
        }
    }
}

/** `FuenteResumenSemanal` respaldada por un mapa precargado. */
class FuenteMapa implements FuenteResumenSemanal {
    constructor(private readonly mapa: Map<string, ResumenSemanaCruda>) { }

    obtenerResumenSemana(
        analisisId: string,
        comunidadId: string,
        semanaN: number,
    ): Promise<ResumenSemanaCruda> {
        const r = this.mapa.get(`${analisisId}|${comunidadId}|${semanaN}`);
        if (!r) throw new Error(`sin datos para ${analisisId}|${comunidadId}|${semanaN}`);
        return Promise.resolve(r);
    }
}

// ===========================================================================
// Verificaciones de integridad referencial (invariantes 1 y 2)
// ===========================================================================

/** Comprueba la atadura exacta y la ausencia de huerfanos de TODO el banco. */
function verificarIntegridad(banco: BancoMemoria): void {
    // (1/2) Memoria_Jerarquica: cada nivel referencia exactamente un Analisis;
    // los niveles no-globales, ademas su Comunidad (del mismo analisis) y la
    // Institucion de esa comunidad. El nivel GLOBAL solo referencia al Analisis.
    for (const m of banco.todasLasMemorias()) {
        expect(banco.analisisRegistrado(m.analisisId)).toBe(true);
        if (m.nivel === NivelMemoria.GLOBAL) {
            expect(m.comunidadId).toBe('');
            expect(m.institucionId).toBe('');
        } else {
            const comunidad = banco.comunidadDe(m.comunidadId);
            expect(comunidad).toBeDefined();
            expect(comunidad!.analisisId).toBe(m.analisisId);
            expect(m.institucionId).toBe(comunidad!.institucionId);
            expect(banco.institucionRegistrada(m.institucionId)).toBe(true);
        }
    }

    // (1/2) Memoria historica (tendencias): Analisis + Comunidad del mismo analisis.
    for (const t of banco.tendencias) {
        expect(banco.analisisRegistrado(t.analisisId)).toBe(true);
        const comunidad = banco.comunidadDe(t.comunidadId);
        expect(comunidad).toBeDefined();
        expect(comunidad!.analisisId).toBe(t.analisisId);
    }

    // (1/2) Memoria historica (eventos): Analisis + Comunidad del mismo analisis.
    for (const e of banco.eventos) {
        expect(banco.analisisRegistrado(e.analisisId)).toBe(true);
        const comunidad = banco.comunidadDe(e.comunidadId);
        expect(comunidad).toBeDefined();
        expect(comunidad!.analisisId).toBe(e.analisisId);
    }

    // (1/2) Memoria_Semantica (gds_embedding): Analisis + Comunidad + Institucion.
    for (const r of banco.embeddings.values()) {
        expect(banco.analisisRegistrado(r.analisisId)).toBe(true);
        const comunidad = banco.comunidadDe(r.comunidadId);
        expect(comunidad).toBeDefined();
        expect(comunidad!.analisisId).toBe(r.analisisId);
        expect(r.institucionId).toBe(comunidad!.institucionId);
        expect(banco.institucionRegistrada(r.institucionId)).toBe(true);
    }
}

/** Recuento total de registros dependientes de un `Analisis` en las tres memorias. */
function registrosDe(banco: BancoMemoria, analisisId: string): {
    memorias: number;
    tendencias: number;
    eventos: number;
    embeddings: number;
} {
    return {
        memorias: banco.todasLasMemorias().filter((m) => m.analisisId === analisisId).length,
        tendencias: banco.tendencias.filter((t) => t.analisisId === analisisId).length,
        eventos: banco.eventos.filter((e) => e.analisisId === analisisId).length,
        embeddings: [...banco.embeddings.values()].filter((r) => r.analisisId === analisisId).length,
    };
}

/** Huella ordenada y estable de los registros de un `Analisis` (para comparar). */
function huellaDe(banco: BancoMemoria, analisisId: string): string {
    const memorias = banco
        .todasLasMemorias()
        .filter((m) => m.analisisId === analisisId)
        .map((m) => `${m.nivel}|${m.comunidadId}|${m.periodo}|${m.resumen}`)
        .sort();
    const tendencias = banco.tendencias
        .filter((t) => t.analisisId === analisisId)
        .map((t) => `${t.comunidadId}|${t.numeroSemana}|${t.dimension}|${t.magnitud}`)
        .sort();
    const eventos = banco.eventos
        .filter((e) => e.analisisId === analisisId)
        .map((e) => `${e.comunidadId}|${e.numeroSemana}|${e.tipo}|${e.descripcion}`)
        .sort();
    const embeddings = [...banco.embeddings.values()]
        .filter((r) => r.analisisId === analisisId)
        .map((r) => `${r.refId}|${r.comunidadId}|${r.numeroSemana}`)
        .sort();
    return JSON.stringify({ memorias, tendencias, eventos, embeddings });
}

// ===========================================================================
// Propiedad
// ===========================================================================

describe('Property 29: integridad referencial de la memoria jerarquica, historica y semantica (Req. 28.9, 36.5, 39.3)', () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 29: Integridad referencial de la memoria jerárquica y de la memoria histórica
    it('cada registro referencia exactamente un Analisis (y su Comunidad/Institucion, salvo el nivel global), sin huerfanos', async () => {
        await fc.assert(
            fc.asyncProperty(poblacionArb, async (poblacion) => {
                const banco = new BancoMemoria();
                await sembrarPoblacion(banco, poblacion);

                // El banco quedo poblado por los servicios reales.
                expect(banco.todasLasMemorias().length).toBeGreaterThan(0);
                expect(banco.embeddings.size).toBeGreaterThan(0);
                expect(banco.tendencias.length).toBeGreaterThan(0);
                expect(banco.eventos.length).toBeGreaterThan(0);

                // Invariantes 1 y 2: atadura referencial exacta y sin huerfanos.
                verificarIntegridad(banco);

                // Cada `Analisis` tiene exactamente los CINCO niveles por comunidad
                // (semanal..semestral) + un GLOBAL por analisis: ningun nivel cuelga
                // de un analisis distinto al suyo.
                for (const a of poblacion) {
                    for (const c of a.comunidades) {
                        const comunidadId = comunidadIdDe(a.analisisId, c.base);
                        const deComunidad = banco
                            .todasLasMemorias()
                            .filter(
                                (m) =>
                                    m.analisisId === a.analisisId &&
                                    m.comunidadId === comunidadId,
                            );
                        const niveles = new Set(deComunidad.map((m) => m.nivel));
                        // Los cuatro niveles acotados a comunidad estan presentes.
                        for (const nivel of ORDEN_NIVELES) {
                            if (nivel === NivelMemoria.GLOBAL) continue;
                            expect(niveles.has(nivel)).toBe(true);
                        }
                    }
                    // Exactamente un nivel GLOBAL por analisis.
                    const globales = banco
                        .todasLasMemorias()
                        .filter(
                            (m) => m.analisisId === a.analisisId && m.nivel === NivelMemoria.GLOBAL,
                        );
                    expect(globales).toHaveLength(1);
                }
            }),
            { numRuns: NUM_RUNS },
        );
    });

    it('al eliminar un Analisis se borran en cascada todos sus registros de las tres memorias, sin afectar a otros analisis ni a las instituciones', async () => {
        await fc.assert(
            fc.asyncProperty(
                poblacionArb,
                fc.double({ min: 0, max: 0.999, noNaN: true }),
                async (poblacion, fraccion) => {
                    const banco = new BancoMemoria();
                    await sembrarPoblacion(banco, poblacion);

                    // Elegir deterministicamente un Analisis a eliminar.
                    const objetivo = poblacion[Math.floor(fraccion * poblacion.length)];
                    const otros = poblacion.filter((a) => a.analisisId !== objetivo.analisisId);

                    // Pre-condicion: el objetivo SI tiene registros en las tres memorias.
                    const antesObjetivo = registrosDe(banco, objetivo.analisisId);
                    expect(antesObjetivo.memorias).toBeGreaterThan(0);
                    expect(antesObjetivo.tendencias).toBeGreaterThan(0);
                    expect(antesObjetivo.eventos).toBeGreaterThan(0);
                    expect(antesObjetivo.embeddings).toBeGreaterThan(0);

                    // Huellas de los demas analisis ANTES del borrado.
                    const huellasAntes = new Map(
                        otros.map((a) => [a.analisisId, huellaDe(banco, a.analisisId)]),
                    );
                    const institucionesAntes = banco.institucionesRegistradas().sort();

                    // --- Cascada del Analisis objetivo (Req. 25.4) ---
                    banco.borrarAnalisis(objetivo.analisisId);

                    // (3a) TODOS los registros dependientes del objetivo desaparecen
                    //      de las TRES memorias (no quedan huerfanos del analisis).
                    const despuesObjetivo = registrosDe(banco, objetivo.analisisId);
                    expect(despuesObjetivo).toEqual({
                        memorias: 0,
                        tendencias: 0,
                        eventos: 0,
                        embeddings: 0,
                    });

                    // (3b) Los registros de los DEMAS analisis permanecen IDENTICOS
                    //      (sin mezcla entre estudios paralelos).
                    for (const a of otros) {
                        expect(huellaDe(banco, a.analisisId)).toBe(
                            huellasAntes.get(a.analisisId),
                        );
                    }

                    // (3c) Ninguna `Institucion` se elimina en cascada (FK RESTRICT).
                    expect(banco.institucionesRegistradas().sort()).toEqual(institucionesAntes);

                    // (3d) El banco resultante sigue siendo integro (sin huerfanos).
                    verificarIntegridad(banco);
                },
            ),
            { numRuns: NUM_RUNS },
        );
    });
});
