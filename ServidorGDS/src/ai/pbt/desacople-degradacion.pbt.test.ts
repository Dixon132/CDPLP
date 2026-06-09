// Feature: analisis-tendencias-riesgo-emocional, Property 32: Desacople estable de subsistemas reemplazables y degradación segura
/**
 * PBT Property 32 - Desacople estable de subsistemas reemplazables y degradacion
 * segura (tarea 8.4).
 *
 * Verifica, sobre los subsistemas expuestos tras INTERFAZ ESTABLE
 * (`Servicio_NLP`, `Servicio_Vision`, `Capa_ML`, `Filtro_Relevancia`,
 * `Sistema_Evidencias`), que:
 *
 *  (A) Desacople estable: *para toda* pareja de implementaciones intercambiables
 *      de un subsistema (cliente `Servicio_IA` HTTP SIMULADO vs fallback
 *      determinista TS), AMBAS cumplen el MISMO contrato observable (forma de la
 *      salida, referencias por id, particion sin solape, auditoria) sin cambiar
 *      la firma de la interfaz. Esto materializa la reemplazabilidad del diseno
 *      (Req. 30.2, 30.6, 31.6, 34.6, 35.2).
 *
 *  (B) Degradacion segura y recuperacion: el {@link ProxyDegradacionServicioIA}
 *      consume el PRIMARIO (`Servicio_IA`) cuando la sonda lo reporta disponible
 *      y DELEGA en el fallback TS ante indisponibilidad o fallo HTTP, SIN
 *      bloquear el ciclo (nunca propaga el error) y exponiendo el estado
 *      `degradado`; al recuperarse el `Servicio_IA`, REANUDA el primario sin
 *      cambios de codigo (Req. 35.3, 35.4).
 *
 * El generador `implementacionSubsistemaArb` produce, para cada subsistema, un
 * caso con >= 2 dobles intercambiables (cliente `Servicio_IA` simulado y
 * fallback TS) mas la entrada y la secuencia de disponibilidad/fallos a aplicar.
 * Sin red real: deterministico bajo Jest (`jest --runInBand`, { numRuns: 100 }).
 *
 * **Validates: Requirements 30.2, 30.6, 31.6, 34.6, 35.2, 35.3, 35.4**
 */
import fc from "fast-check";

import {
    ProxyDegradacionServicioIA,
    type RegistroIncidente,
} from "../health/proxy-degradacion";
import type { SondaServicioIA } from "../health/sonda-servicio-ia";
import { CapaMlFallback } from "../fallback/capa-ml.fallback";
import { FiltroRelevanciaFallback } from "../fallback/filtro-relevancia.fallback";
import { ServicioNlpFallback } from "../fallback/nlp.fallback";
import { ServicioVisionFallback } from "../fallback/vision.fallback";
import type { ServicioNLP, ResultadoNLP } from "../../modules/analisis/servicioNLP";
import type { ServicioVision, ResultadoVision } from "../../modules/analisis/servicioVision";
import type {
    FiltroRelevancia,
    ResultadoFiltroRelevancia,
} from "../../modules/analisis/interfaces";
import type { CapaML, EntradaIndice, ScoreCalibrado } from "../../modules/ml/capaML";
import { clamp01 } from "../../modules/ml/capaMLBase";
import {
    Contributividad,
    type Evidencia,
    type RecorridoAuditoria,
    type SistemaEvidencias,
} from "../../modules/evidencias/interfaces";
import {
    CONTRATO_VERSION,
    type ContratoNormalizado,
} from "../../modules/contracts/contratoNormalizado";

// ---------------------------------------------------------------------------
// Infraestructura de pruebas: estado controlable, sonda y logger silencioso
// ---------------------------------------------------------------------------

/** Estado controlable de la simulacion del `Servicio_IA` por paso. */
interface EstadoControl {
    /** `true` si la sonda `GET /health` reporta disponibilidad. */
    disponible: boolean;
    /** `true` para simular un fallo HTTP en tiempo de llamada del primario. */
    primarioFalla: boolean;
}

/** Sonda falsa que refleja el estado controlable (sin red real). */
function sondaDe(estado: EstadoControl): SondaServicioIA {
    return { disponible: async () => estado.disponible };
}

/** Logger silencioso para no contaminar la salida de las 100 iteraciones. */
function loggerSilencioso(): RegistroIncidente {
    return { warn: () => undefined, log: () => undefined };
}

/** Error simulado de indisponibilidad HTTP del `Servicio_IA`. */
function fallaHttp(ruta: string): never {
    throw new Error(`HTTP 503 Servicio_IA ${ruta} (simulado)`);
}

// ---------------------------------------------------------------------------
// Contrato del caso generico de subsistema reemplazable
// ---------------------------------------------------------------------------

/** Pareja de implementaciones intercambiables envuelta en el proxy de degradacion. */
interface ParSubsistema<T> {
    proxy: ProxyDegradacionServicioIA<T>;
    /** Doble PRIMARIO: cliente `Servicio_IA` HTTP simulado. */
    primario: T;
    /** Doble FALLBACK determinista TS. */
    fallback: T;
    /** Numero de invocaciones servidas por el primario. */
    primCount: () => number;
    /** Numero de invocaciones servidas por el fallback. */
    fbCount: () => number;
}

/**
 * Caso generico para un subsistema expuesto tras interfaz estable. Encierra la
 * entrada generada y sabe construir el par de dobles, ejecutar la operacion
 * representativa y validar el contrato observable de su salida.
 */
interface CasoSubsistema {
    nombre: string;
    /** Construye un par de dobles fresco y su proxy de degradacion. */
    crearPar(estado: EstadoControl): ParSubsistema<unknown>;
    /** Ejecuta la operacion representativa de la interfaz sobre `impl`. */
    ejecutar(impl: unknown): Promise<unknown>;
    /** Valida que la salida cumple el contrato OBSERVABLE estable del subsistema. */
    conforma(resultado: unknown): boolean;
}

/** Construye un proxy de degradacion sobre un par de dobles ya instrumentado. */
function proxyDe<T>(
    nombre: string,
    primario: T,
    fallback: T,
    estado: EstadoControl,
): ProxyDegradacionServicioIA<T> {
    return new ProxyDegradacionServicioIA<T>(primario, fallback, sondaDe(estado), {
        nombre,
        logger: loggerSilencioso(),
    });
}

// ---------------------------------------------------------------------------
// Generadores de entrada
// ---------------------------------------------------------------------------

const textoArb = (): fc.Arbitrary<string> =>
    fc.oneof(
        fc.string(),
        fc.fullUnicodeString(),
        fc.constantFrom(
            "hoy fue un dia agotador en el colegio",
            "¡no aguanto mas los examenes!",
            "que paro mas largo che",
            "#animo equipo",
        ),
    );

const contratoArb = (): fc.Arbitrary<ContratoNormalizado> =>
    fc.record({
        post: fc.record({ autorId: fc.string({ minLength: 1 }), texto: textoArb() }),
        comments: fc.array(
            fc.record({
                autorId: fc.string({ minLength: 1 }),
                texto: textoArb(),
                enRespuestaA: fc.option(fc.string({ minLength: 1 }), { nil: null }),
            }),
            { maxLength: 5 },
        ),
        image_description: textoArb(),
        hashtags: fc.array(fc.string({ minLength: 1 }).map((s) => `#${s}`), {
            maxLength: 4,
        }),
        metadata: fc.record({
            version: fc.constant(CONTRATO_VERSION),
            fuente: fc.constantFrom("simulacion", "opaca"),
            generadoEn: fc.constant("2024-01-01T00:00:00.000Z"),
            semana: fc.integer({ min: 1, max: 24 }),
            idioma: fc.constant("es-BO"),
        }),
    });

/** Descripcion visual NO vacia (el contrato de vision prohibe entradas vacias). */
const descripcionArb = (): fc.Arbitrary<string> =>
    fc
        .array(
            fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz áéíóúñ ".split("")),
            { minLength: 1, maxLength: 40 },
        )
        .map((cs) => cs.join(""))
        .filter((s) => s.trim().length > 0);

const entradaIndiceArb = (): fc.Arbitrary<EntradaIndice> =>
    fc.record({
        comunidadId: fc.string({ minLength: 1 }),
        numeroSemana: fc.integer({ min: 1, max: 24 }),
        senales: fc.array(fc.double({ min: -5, max: 5, noNaN: true }), {
            maxLength: 6,
        }),
        evidenciaIds: fc.array(fc.string({ minLength: 1 }), { maxLength: 4 }),
    });

const evidenciaArb = (): fc.Arbitrary<Omit<Evidencia, "id">> =>
    fc.record({
        resultadoId: fc.string({ minLength: 1 }),
        analisisId: fc.string({ minLength: 1 }),
        comunidadId: fc.string({ minLength: 1 }),
        institucionId: fc.string({ minLength: 1 }),
        numeroSemana: fc.integer({ min: 1, max: 24 }),
        refContenido: fc.constantFrom("post", "comment:0", "comment:1"),
        contributividad: fc.constantFrom(
            Contributividad.CONTRIBUTIVO,
            Contributividad.NO_CONTRIBUTIVO,
        ),
        tipo: fc.constantFrom("publicacion", "comentario", "conteo", "variacion"),
        contenido: textoArb(),
        publicacionesAsociadas: fc.array(fc.string(), { maxLength: 3 }),
        comentariosAsociados: fc.array(fc.string(), { maxLength: 3 }),
        eventosAsociados: fc.array(fc.string(), { maxLength: 3 }),
        semanasInvolucradas: fc.array(fc.integer({ min: 1, max: 24 }), { maxLength: 4 }),
        indicadoresUtilizados: fc.array(fc.string(), { maxLength: 3 }),
        explicacionIA: fc.string(),
        metricasUtilizadas: fc.constant<Record<string, number>>({}),
    }) as fc.Arbitrary<Omit<Evidencia, "id">>;

/** Secuencia de pasos de disponibilidad / fallo HTTP a aplicar al proxy. */
const secuenciaArb = (): fc.Arbitrary<EstadoControl[]> =>
    fc.array(
        fc.record({ disponible: fc.boolean(), primarioFalla: fc.boolean() }),
        { minLength: 1, maxLength: 8 },
    );

// ---------------------------------------------------------------------------
// Dobles SIMULADOS del `Servicio_IA` (salidas conformes al contrato observable)
// ---------------------------------------------------------------------------

function simResultadoNLP(contrato: ContratoNormalizado): ResultadoNLP {
    return {
        semantico: {
            totalItems: 1 + contrato.comments.length,
            totalTokens: 0,
            diversidadLexica: 0,
            terminosClave: [],
        },
        emocional: {
            senal: { valencia: 0, activacion: 0, intensidad: 0, dispersion: 0 },
            distribucion: { neutral: 1 },
        },
        tematico: { grupos: [] },
        elementosCausales: [],
        conversacional: { interacciones: [], hilos: 0, profundidadMaxima: 0 },
        tendencias: [],
        derivadoDeComprensionContextual: true,
    };
}

function simResultadoVision(): ResultadoVision {
    return {
        scene: "escena derivada (Servicio_IA simulado)",
        objects: ["objeto-sim"],
        emotion_context: "contexto emocional sereno (sim)",
    };
}

function simScore(entrada: EntradaIndice): ScoreCalibrado {
    const base =
        entrada.senales.length === 0
            ? 0
            : entrada.senales.reduce((a, b) => a + b, 0) / entrada.senales.length;
    return { score: clamp01(base), evidenciaIds: [...entrada.evidenciaIds] };
}

function simFiltro(contrato: ContratoNormalizado): ResultadoFiltroRelevancia {
    const refs = ["post", ...contrato.comments.map((_, i) => `comment:${i}`)];
    return {
        contributivos: refs.map((refId) => ({
            refId,
            contributividad: Contributividad.CONTRIBUTIVO,
            motivo: "senal (Servicio_IA simulado)",
        })),
        noContributivos: [],
    };
}

/** Doble en memoria del `Sistema_Evidencias` (interfaz estable, sin Prisma). */
class EvidenciasEnMemoria implements SistemaEvidencias {
    private readonly store = new Map<string, Evidencia>();
    private seq = 0;

    constructor(private readonly prefijo: string) { }

    async almacenar(e: Omit<Evidencia, "id">): Promise<Evidencia> {
        this.seq += 1;
        const id = `${this.prefijo}-ev-${this.seq}`;
        const evidencia: Evidencia = { ...e, id };
        this.store.set(id, evidencia);
        return evidencia;
    }

    async obtener(ids: string[]): Promise<Evidencia[]> {
        return ids
            .map((id) => this.store.get(id))
            .filter((e): e is Evidencia => e !== undefined);
    }

    async auditar(evidenciaId: string): Promise<RecorridoAuditoria> {
        const evidencia = this.store.get(evidenciaId);
        if (!evidencia) {
            throw new Error(`Evidencia ${evidenciaId} inexistente`);
        }
        return {
            evidencia,
            datoOriginal: {
                numeroSemana: evidencia.numeroSemana,
                comunidadId: evidencia.comunidadId,
                refContenido: evidencia.refContenido,
            },
        };
    }
}

// ---------------------------------------------------------------------------
// Validadores del contrato OBSERVABLE estable de cada subsistema
// ---------------------------------------------------------------------------

const esNumero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const esArray = (x: unknown): x is unknown[] => Array.isArray(x);

function conformaNLP(r: unknown): boolean {
    const o = r as ResultadoNLP;
    return (
        !!o &&
        typeof o === "object" &&
        !!o.semantico &&
        esNumero(o.semantico.totalItems) &&
        esArray(o.semantico.terminosClave) &&
        !!o.emocional?.senal &&
        esNumero(o.emocional.senal.valencia) &&
        esNumero(o.emocional.senal.activacion) &&
        esNumero(o.emocional.senal.intensidad) &&
        esNumero(o.emocional.senal.dispersion) &&
        !!o.emocional.distribucion &&
        esArray(o.tematico?.grupos) &&
        esArray(o.elementosCausales) &&
        esArray(o.conversacional?.interacciones) &&
        esArray(o.tendencias) &&
        o.derivadoDeComprensionContextual === true
    );
}

function conformaVision(r: unknown): boolean {
    const o = r as ResultadoVision;
    return (
        !!o &&
        typeof o.scene === "string" &&
        o.scene.length > 0 &&
        esArray(o.objects) &&
        o.objects.every((x) => typeof x === "string") &&
        typeof o.emotion_context === "string" &&
        o.emotion_context.length > 0
    );
}

function conformaScore(r: unknown): boolean {
    const o = r as ScoreCalibrado;
    return (
        !!o &&
        esNumero(o.score) &&
        o.score >= 0 &&
        o.score <= 1 &&
        esArray(o.evidenciaIds) &&
        o.evidenciaIds.every((x) => typeof x === "string")
    );
}

function conformaFiltro(r: unknown): boolean {
    const o = r as ResultadoFiltroRelevancia;
    if (!o || !esArray(o.contributivos) || !esArray(o.noContributivos)) {
        return false;
    }
    const todos = [...o.contributivos, ...o.noContributivos];
    const refs = todos.map((i) => i.refId);
    const sinSolape = new Set(refs).size === refs.length;
    const valoresEnum = new Set<string>([
        Contributividad.CONTRIBUTIVO,
        Contributividad.NO_CONTRIBUTIVO,
    ]);
    const itemsOk = todos.every(
        (i) =>
            typeof i.refId === "string" &&
            valoresEnum.has(i.contributividad) &&
            typeof i.motivo === "string",
    );
    return sinSolape && itemsOk;
}

/** Resultado compuesto del recorrido del `Sistema_Evidencias`. */
interface ResultadoEvidencias {
    evidencia: Evidencia;
    recuperada: Evidencia | undefined;
    auditoria: RecorridoAuditoria;
}

function conformaEvidencias(r: unknown): boolean {
    const o = r as ResultadoEvidencias;
    return (
        !!o &&
        typeof o.evidencia?.id === "string" &&
        o.evidencia.id.length > 0 &&
        !!o.recuperada &&
        o.recuperada.id === o.evidencia.id &&
        !!o.auditoria?.datoOriginal &&
        typeof o.auditoria.datoOriginal.refContenido === "string" &&
        o.auditoria.evidencia.id === o.evidencia.id
    );
}

// ---------------------------------------------------------------------------
// implementacionSubsistemaArb: un caso por subsistema con >= 2 dobles
// ---------------------------------------------------------------------------

function casoNLP(contrato: ContratoNormalizado): CasoSubsistema {
    return {
        nombre: "Servicio_NLP",
        crearPar(estado) {
            let pc = 0;
            let fc_ = 0;
            const primario: ServicioNLP = {
                async analizar(c) {
                    pc += 1;
                    if (estado.primarioFalla) fallaHttp("/nlp");
                    return simResultadoNLP(c);
                },
            };
            const base = new ServicioNlpFallback();
            const fallback: ServicioNLP = {
                async analizar(c) {
                    fc_ += 1;
                    return base.analizar(c);
                },
            };
            return {
                proxy: proxyDe("Servicio_NLP", primario, fallback, estado),
                primario,
                fallback,
                primCount: () => pc,
                fbCount: () => fc_,
            } as ParSubsistema<unknown>;
        },
        ejecutar: (impl) => (impl as ServicioNLP).analizar(contrato),
        conforma: conformaNLP,
    };
}

function casoVision(descripcion: string): CasoSubsistema {
    return {
        nombre: "Servicio_Vision",
        crearPar(estado) {
            let pc = 0;
            let fc_ = 0;
            const primario: ServicioVision = {
                async analizar() {
                    pc += 1;
                    if (estado.primarioFalla) fallaHttp("/vision");
                    return simResultadoVision();
                },
            };
            const base = new ServicioVisionFallback();
            const fallback: ServicioVision = {
                async analizar(d) {
                    fc_ += 1;
                    return base.analizar(d);
                },
            };
            return {
                proxy: proxyDe("Servicio_Vision", primario, fallback, estado),
                primario,
                fallback,
                primCount: () => pc,
                fbCount: () => fc_,
            } as ParSubsistema<unknown>;
        },
        ejecutar: (impl) => (impl as ServicioVision).analizar(descripcion),
        conforma: conformaVision,
    };
}

function casoCapaML(entrada: EntradaIndice): CasoSubsistema {
    return {
        nombre: "Capa_ML",
        crearPar(estado) {
            let pc = 0;
            let fc_ = 0;
            const primario: CapaML = {
                ...crearStubsCapaML(),
                async scoreRiesgoCalibrado(e) {
                    pc += 1;
                    if (estado.primarioFalla) fallaHttp("/score-calibrado");
                    return simScore(e);
                },
            };
            const base = new CapaMlFallback();
            const fallback: CapaML = {
                ...crearStubsCapaML(),
                async scoreRiesgoCalibrado(e) {
                    fc_ += 1;
                    return base.scoreRiesgoCalibrado(e);
                },
            };
            return {
                proxy: proxyDe("Capa_ML", primario, fallback, estado),
                primario,
                fallback,
                primCount: () => pc,
                fbCount: () => fc_,
            } as ParSubsistema<unknown>;
        },
        ejecutar: (impl) => (impl as CapaML).scoreRiesgoCalibrado(entrada),
        conforma: conformaScore,
    };
}

/** Stubs de los metodos no ejercitados de `CapaML` (la op representativa es el score). */
function crearStubsCapaML(): Omit<CapaML, "scoreRiesgoCalibrado"> {
    return {
        async embeddings() {
            return [];
        },
        async clustering() {
            return [];
        },
        async anomalias() {
            return [];
        },
        async tendencias() {
            return [];
        },
        async calibrar() {
            return { version: "stub", metricas: {} };
        },
    };
}

function casoFiltro(contrato: ContratoNormalizado): CasoSubsistema {
    return {
        nombre: "Filtro_Relevancia",
        crearPar(estado) {
            let pc = 0;
            let fc_ = 0;
            const primario: FiltroRelevancia = {
                async clasificar(c) {
                    pc += 1;
                    if (estado.primarioFalla) fallaHttp("/relevancia");
                    return simFiltro(c);
                },
            };
            const base = new FiltroRelevanciaFallback();
            const fallback: FiltroRelevancia = {
                async clasificar(c) {
                    fc_ += 1;
                    return base.clasificar(c);
                },
            };
            return {
                proxy: proxyDe("Filtro_Relevancia", primario, fallback, estado),
                primario,
                fallback,
                primCount: () => pc,
                fbCount: () => fc_,
            } as ParSubsistema<unknown>;
        },
        ejecutar: (impl) => (impl as FiltroRelevancia).clasificar(contrato),
        conforma: conformaFiltro,
    };
}

function casoEvidencias(evidencia: Omit<Evidencia, "id">): CasoSubsistema {
    const ejecutar = async (impl: unknown): Promise<ResultadoEvidencias> => {
        const sistema = impl as SistemaEvidencias;
        const guardada = await sistema.almacenar(evidencia);
        const [recuperada] = await sistema.obtener([guardada.id]);
        const auditoria = await sistema.auditar(guardada.id);
        return { evidencia: guardada, recuperada, auditoria };
    };
    return {
        nombre: "Sistema_Evidencias",
        crearPar(estado) {
            let pc = 0;
            let fc_ = 0;
            const basePrim = new EvidenciasEnMemoria("primario");
            const primario: SistemaEvidencias = {
                async almacenar(e) {
                    pc += 1;
                    if (estado.primarioFalla) fallaHttp("/evidencias");
                    return basePrim.almacenar(e);
                },
                obtener: (ids) => basePrim.obtener(ids),
                auditar: (id) => basePrim.auditar(id),
            };
            const baseFb = new EvidenciasEnMemoria("fallback");
            const fallback: SistemaEvidencias = {
                async almacenar(e) {
                    fc_ += 1;
                    return baseFb.almacenar(e);
                },
                obtener: (ids) => baseFb.obtener(ids),
                auditar: (id) => baseFb.auditar(id),
            };
            return {
                proxy: proxyDe("Sistema_Evidencias", primario, fallback, estado),
                primario,
                fallback,
                primCount: () => pc,
                fbCount: () => fc_,
            } as ParSubsistema<unknown>;
        },
        ejecutar,
        conforma: conformaEvidencias,
    };
}

/** Caso completo generado: el subsistema + la secuencia de disponibilidad. */
interface CasoGenerado {
    caso: CasoSubsistema;
    secuencia: EstadoControl[];
}

/**
 * `implementacionSubsistemaArb`: genera un caso por subsistema reemplazable, cada
 * uno con >= 2 dobles intercambiables (cliente `Servicio_IA` simulado + fallback
 * TS), su entrada y la secuencia de disponibilidad/fallos a aplicar.
 */
const implementacionSubsistemaArb = (): fc.Arbitrary<CasoGenerado> =>
    fc.record({
        caso: fc.oneof(
            contratoArb().map(casoNLP),
            descripcionArb().map(casoVision),
            entradaIndiceArb().map(casoCapaML),
            contratoArb().map(casoFiltro),
            evidenciaArb().map(casoEvidencias),
        ),
        secuencia: secuenciaArb(),
    });

// ---------------------------------------------------------------------------
// Property 32
// ---------------------------------------------------------------------------

describe("Property 32: Desacople estable de subsistemas reemplazables y degradacion segura (tarea 8.4)", () => {
    it("(A) ambas implementaciones intercambiables cumplen identicamente el contrato observable estable (Req. 30.2, 30.6, 31.6, 34.6, 35.2)", async () => {
        await fc.assert(
            fc.asyncProperty(implementacionSubsistemaArb(), async ({ caso }) => {
                // Disponible y sin fallo: ambos dobles operan directamente.
                const estado: EstadoControl = { disponible: true, primarioFalla: false };
                const { primario, fallback } = caso.crearPar(estado);

                const rPrimario = await caso.ejecutar(primario);
                const rFallback = await caso.ejecutar(fallback);

                // El contrato observable se cumple de forma IDENTICA en ambos
                // (mismas firmas, misma forma de salida): son intercambiables.
                expect(caso.conforma(rPrimario)).toBe(true);
                expect(caso.conforma(rFallback)).toBe(true);
            }),
            { numRuns: 100 },
        );
    });

    it("(B) degrada al fallback sin bloquear el ciclo y reanuda el Servicio_IA al recuperarse (Req. 35.3, 35.4)", async () => {
        await fc.assert(
            fc.asyncProperty(implementacionSubsistemaArb(), async ({ caso, secuencia }) => {
                const estado: EstadoControl = { disponible: true, primarioFalla: false };
                const { proxy, primCount, fbCount } = caso.crearPar(estado);

                for (const paso of secuencia) {
                    estado.disponible = paso.disponible;
                    estado.primarioFalla = paso.primarioFalla;

                    const pPre = primCount();
                    const fPre = fbCount();

                    // NUNCA bloquea el ciclo: la operacion no propaga error alguno.
                    const r = await proxy.ejecutar((impl) => caso.ejecutar(impl));

                    // Siempre hay un calculo base conforme al contrato observable.
                    expect(caso.conforma(r)).toBe(true);

                    const esperaPrimario = paso.disponible && !paso.primarioFalla;
                    expect(proxy.degradado).toBe(!esperaPrimario);

                    if (esperaPrimario) {
                        // Consume el Servicio_IA primario; no toca el fallback.
                        expect(primCount()).toBeGreaterThan(pPre);
                        expect(fbCount()).toBe(fPre);
                    } else {
                        // Degradacion segura: el fallback TS produce el resultado.
                        expect(fbCount()).toBeGreaterThan(fPre);
                    }
                }

                // Recuperacion: con el Servicio_IA disponible vuelve a consumir el
                // primario SIN cambios de codigo y restablece el estado.
                estado.disponible = true;
                estado.primarioFalla = false;
                const pPre = primCount();
                const r = await proxy.ejecutar((impl) => caso.ejecutar(impl));

                expect(caso.conforma(r)).toBe(true);
                expect(proxy.degradado).toBe(false);
                expect(primCount()).toBeGreaterThan(pPre);
            }),
            { numRuns: 100 },
        );
    });
});
