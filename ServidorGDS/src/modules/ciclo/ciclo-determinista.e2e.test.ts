/**
 * Prueba de INTEGRACION DETERMINISTA del ciclo completo end-to-end (tarea 28.2).
 *
 * Ejercita el ciclo REAL cableado en la tarea 28.1 de extremo a extremo, pero
 * con DOBLES DETERMINISTAS en las fronteras de E/S, de modo que la ejecucion sea
 * SINCRONA y no necesite red, BD (PostgreSQL/pgvector), Redis ni esperas reales
 * (entorno Windows/cmd, `jest --runInBand`):
 *
 *   crear analisis (estado en memoria con escenario + Usuario_Sintetico persistentes)
 *     -> Cola_Trabajos INMEDIATA/in-memory (EjecutorTrabajoSemana con cerrojo,
 *        registro y reloj/IDs inyectables) que ejecuta el UNICO `procesarSemana`
 *     -> GENERA: `IDataProvider` doble con SEMILLA FIJA (Modulo_Simulacion)
 *     -> VALIDA: `Validador_Contrato` REAL (zod versionado)
 *     -> ANALIZA: `Pipeline_Analisis` REAL (limpieza -> normalizacion ->
 *        ANONIMIZACION real (SHA-256) -> FILTRO_RELEVANCIA -> NLP -> VISION ->
 *        ... -> EMBEDDINGS) con `Servicio_IA`/fallback DETERMINISTAS
 *     -> APRENDE: `MotorAprendizajeReal` REAL (Indice_Riesgo + Capa_ML doble)
 *     -> ALMACENA: transaccion ATOMICA en memoria (persistor + Memoria_Semantica
 *        REAL sobre un AlmacenEmbeddings in-memory)
 *     -> REPORTE: agregado determinista del estado acumulado.
 *
 * La prueba verifica la REPRODUCIBILIDAD (Req. 26.1, 26.2, 26.4, 12.5): dos
 * ejecuciones independientes con la MISMA semilla producen un estado IDENTICO
 * (resultados por semana, dimensiones del Indice_Riesgo, evidencias, embeddings
 * acumulados y reporte). Es la garantia de que "misma semilla => mismo estado".
 *
 * _Requirements: 26.1, 26.2, 26.4, 12.5_
 */
import { CONTRATO_VERSION } from "../contracts/contratoNormalizado";
import { ValidadorContratoZod } from "../contracts/validadorContrato";
import { ServicioAnonimizacionSha256 } from "../analisis/servicioAnonimizacion";
import { FiltroRelevanciaBase } from "../analisis/filtroRelevancia";
import { ServicioNLPBase } from "../analisis/servicioNLP";
import { ServicioVisionMock } from "../analisis/servicioVision";
import { clamp01, type CapaML, type EntradaIndice as EntradaIndiceMl } from "../ml";
import {
    serializarEtapasCompletadas,
    ORDEN_ETAPAS,
} from "../pipeline/pipeline";
import {
    MemoriaSemanticaService,
} from "../ai-engine/memoriaSemantica.service";
import type {
    AlmacenEmbeddings,
    FiltroTrazabilidad,
    RefEmbedding,
    RegistroEmbedding,
} from "../ai-engine/embeddingRepositorio";
import { AnalizadorPipeline } from "../scheduler/analizadorPipeline";
import {
    ProcesadorSemana,
    type DependenciasProcesarSemana,
    type GeneradorSemana,
    type PersistorSemana,
    type ResultadoGeneracionSemana,
} from "../scheduler/procesarSemana";
import {
    EjecutorTrabajoSemana,
} from "../scheduler/cola/ejecutor-trabajo-semana";
import { EstadoTrabajo } from "../scheduler/cola/estados-trabajo";
import type { ConsultaResultadoSemana } from "../scheduler/cola/puertos-cola";
import type { DatosTrabajoSemana } from "../scheduler/cola/trabajo-semana";
import {
    CerrojoConcurrenciaEnMemoria,
    GeneradorIdSecuencial,
    RegistroEstadoTrabajosEnMemoria,
    RelojFijo,
} from "../scheduler/cola/adaptadores-memoria";
import { MotorAprendizajeReal, type ArtefactosCiclo } from "./motor-aprendizaje";

// ===========================================================================
// Utilidades deterministas (PRNG con semilla + hash estable)
// ===========================================================================

/** Hash entero estable de 32 bits de una cadena (FNV-1a). Determinista. */
function hashCadena(texto: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) {
        h ^= texto.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** PRNG mulberry32: determinista a partir de una semilla entera. */
function mulberry32(semilla: number): () => number {
    let a = semilla >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ===========================================================================
// Estado en memoria del "Analisis" (escenario + Usuario_Sintetico persistentes)
// ===========================================================================

interface UsuarioSinteticoMem {
    id: string;
}

interface ComunidadMem {
    id: string;
    institucionId: string;
    zonaLatitud: number;
    zonaLongitud: number;
    zonaRadioMetros: number;
    usuarios: UsuarioSinteticoMem[];
}

/** Resultado capturado por semana (lo que el persistor "escribe" en la BD). */
interface ResultadoSemanaCapturado {
    institucionId: string;
    numeroSemana: number;
    comunidadId: string;
    resultadoId: string;
    etapasCompletadas: string[];
    /** Seudonimo del autor del post tras la ANONIMIZACION (privacidad, Req. 23). */
    postAutorAnon: string;
    indice: Array<{
        clave: string;
        nombre: string;
        valor: number;
        minimo: number;
        maximo: number;
        scoreCalibradoMl: number;
    }>;
    /** Evidencia trazable por dimension (qué/por qué) (Req. 17.x, 20.x). */
    evidencias: Array<{
        resultadoId: string;
        clave: string;
        que: string;
        porQue: string;
    }>;
    patrones: Array<{ tipo: string; descripcion: string }>;
    resumenMemoria: {
        resumen: string;
        eventosRelevantes: string[];
        cambiosImportantes: string[];
        anomalias: string[];
        tendencias: string[];
    };
}

/** "Base de datos" en memoria del Analisis bajo prueba (committed). */
class AlmacenAnalisis {
    readonly analisisId = "analisis-det-1";
    readonly escenario = "Tension por examenes finales en la comunidad escolar";
    readonly semanasTotales: number;
    readonly comunidades: ComunidadMem[];
    /** Resultados confirmados por clave `${institucion}:${semana}`. */
    readonly resultados = new Map<string, ResultadoSemanaCapturado>();
    /** Memoria_Semantica acumulada (pgvector in-memory, append-only). */
    readonly embeddings = new AlmacenEmbeddingsMemoria();

    constructor(semanas: number, instituciones: number) {
        this.semanasTotales = semanas;
        this.comunidades = Array.from({ length: instituciones }, (_, i) => {
            const institucionId = `inst-${i + 1}`;
            return {
                id: `com-${i + 1}`,
                institucionId,
                zonaLatitud: -16.5 + i * 0.01,
                zonaLongitud: -68.15 + i * 0.01,
                zonaRadioMetros: 500 + i * 50,
                usuarios: Array.from({ length: 5 }, (_, u) => ({
                    id: `${institucionId}-u${u + 1}`,
                })),
            };
        });
    }

    comunidad(institucionId: string): ComunidadMem {
        const c = this.comunidades.find((x) => x.institucionId === institucionId);
        if (!c) {
            throw new Error(`comunidad no encontrada para ${institucionId}`);
        }
        return c;
    }

    institucionesOrdenadas(): string[] {
        return this.comunidades.map((c) => c.institucionId).sort();
    }
}

// ===========================================================================
// AlmacenEmbeddings in-memory (Memoria_Semantica -> pgvector doble, append-only)
// ===========================================================================

function cumpleFiltro(r: RegistroEmbedding, filtro?: FiltroTrazabilidad): boolean {
    if (!filtro) return true;
    if (filtro.analisisId !== undefined && r.analisisId !== filtro.analisisId) return false;
    if (filtro.comunidadId !== undefined && r.comunidadId !== filtro.comunidadId) return false;
    if (filtro.institucionId !== undefined && r.institucionId !== filtro.institucionId) return false;
    if (filtro.numeroSemana !== undefined && r.numeroSemana !== filtro.numeroSemana) return false;
    return true;
}

function aRefEmbedding(r: RegistroEmbedding): RefEmbedding {
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

/**
 * Doble in-memory APPEND-ONLY del puerto `AlmacenEmbeddings`, fiel al contrato:
 * acumula sin borrar previos e idempotente por `refId` (ON CONFLICT DO NOTHING).
 */
class AlmacenEmbeddingsMemoria implements AlmacenEmbeddings {
    readonly registros: RegistroEmbedding[] = [];

    async insertar(registros: RegistroEmbedding[]): Promise<void> {
        for (const r of registros) {
            if (!this.registros.some((x) => x.refId === r.refId)) {
                // Copia defensiva del vector para inmutabilidad del corpus.
                this.registros.push({ ...r, vector: [...r.vector] });
            }
        }
    }

    async contar(filtro?: FiltroTrazabilidad): Promise<number> {
        return this.registros.filter((r) => cumpleFiltro(r, filtro)).length;
    }

    async listarRefs(filtro?: FiltroTrazabilidad): Promise<RefEmbedding[]> {
        return this.registros.filter((r) => cumpleFiltro(r, filtro)).map(aRefEmbedding);
    }

    async recuperarRefs(
        refIds: string[],
        filtro: FiltroTrazabilidad,
    ): Promise<RefEmbedding[]> {
        const conjunto = new Set(refIds);
        return this.registros
            .filter((r) => conjunto.has(r.refId) && cumpleFiltro(r, filtro))
            .map(aRefEmbedding);
    }
}

// ===========================================================================
// Capa_ML DETERMINISTA (doble del Servicio_IA / fallback): embeddings + score
// ===========================================================================

/** Dimension fija de los embeddings del doble. */
const DIM_EMBEDDING = 8;

/**
 * `Capa_ML` doble DETERMINISTA: produce embeddings y scores calibrados como
 * funcion PURA de la entrada (misma entrada => misma salida), sin red ni modelos
 * reales. Reemplaza al `Servicio_IA`/fallback en la prueba.
 */
const capaMlDeterminista: CapaML = {
    async embeddings(textos: string[]): Promise<number[][]> {
        return textos.map((t) => {
            const r = mulberry32(hashCadena(`emb:${t}`));
            return Array.from({ length: DIM_EMBEDDING }, () =>
                Math.round(r() * 1_000_000) / 1_000_000,
            );
        });
    },
    async clustering(): Promise<never[]> {
        return [];
    },
    async anomalias(): Promise<never[]> {
        return [];
    },
    async tendencias(): Promise<never[]> {
        return [];
    },
    async scoreRiesgoCalibrado(entrada: EntradaIndiceMl) {
        const suma = entrada.senales.reduce((a, b) => a + b, 0);
        // Sigmoide determinista acotada a [0,1] (Req. 31.2, 31.7).
        const score = clamp01(1 / (1 + Math.exp(-suma / 100)));
        return { score, evidenciaIds: [...entrada.evidenciaIds] };
    },
    async calibrar() {
        return { version: "det-test", metricas: {} };
    },
};

// ===========================================================================
// IDataProvider DOBLE con SEMILLA FIJA (Modulo_Simulacion determinista)
// ===========================================================================

const VOCABULARIO = [
    "examenes", "tarea", "profesor", "amigos", "cancha", "fiesta",
    "estres", "apoyo", "grupo", "clase", "nervios", "alegria",
    "conflicto", "ayuda", "miedo", "logro",
];
const LUGARES = ["plaza", "cancha", "aula", "entrada", "patio"];

/**
 * Crea el GENERADOR (puerto de generacion) doble con semilla fija: produce un
 * `Contrato_Normalizado` valido y DETERMINISTA por `(analisisId, institucionId,
 * semana)`, reutilizando los `Usuario_Sintetico` persistentes de la comunidad
 * (Req. 10.3) y anclado a su comunidad.
 */
function crearGeneradorSemilla(
    almacen: AlmacenAnalisis,
    semilla: number,
): GeneradorSemana {
    return {
        async generar(
            analisisId: string,
            institucionId: string,
            numeroSemana: number,
        ): Promise<ResultadoGeneracionSemana> {
            const comunidad = almacen.comunidad(institucionId);
            const rng = mulberry32(
                hashCadena(`${semilla}:${analisisId}:${institucionId}:${numeroSemana}`),
            );
            const elegir = <T>(arr: readonly T[]): T =>
                arr[Math.floor(rng() * arr.length)] as T;
            const frase = (n: number): string =>
                Array.from({ length: n }, () => elegir(VOCABULARIO)).join(" ");

            const usuarios = comunidad.usuarios;
            const autorPost = elegir(usuarios).id;
            const numComentarios = 2 + Math.floor(rng() * 3);
            const comentarios = Array.from({ length: numComentarios }, (_, i) => {
                const autor = elegir(usuarios).id;
                const enRespuestaA = i === 0 ? autorPost : elegir(usuarios).id;
                return {
                    autorId: autor,
                    texto: `${frase(3 + Math.floor(rng() * 3))}!`,
                    enRespuestaA,
                };
            });

            const contrato = {
                post: { autorId: autorPost, texto: `${frase(4)}!` },
                comments: comentarios,
                image_description: `foto de ${frase(3)} en la ${elegir(LUGARES)}`,
                hashtags: [`#${elegir(VOCABULARIO)}`, `#${elegir(VOCABULARIO)}`],
                metadata: {
                    version: CONTRATO_VERSION,
                    fuente: "doble-determinista",
                    generadoEn: new Date(Date.UTC(2024, 0, numeroSemana)).toISOString(),
                    semana: numeroSemana,
                    idioma: "es-BO",
                },
            };

            return {
                contrato,
                comunidadId: comunidad.id,
                proveedor: "DobleProviderSemilla",
            };
        },
    };
}

// ===========================================================================
// Transaccion + persistor in-memory (ALMACENA atomico) + Memoria_Semantica
// ===========================================================================

/** Handle de la transaccion in-memory: staging que se vuelca al commit. */
interface TxMem {
    resultados: ResultadoSemanaCapturado[];
    almacen: AlmacenEmbeddingsMemoria;
}

const ANON_SALT = "gds-pipeline-anon-salt-v1";

/** Id de resultado DETERMINISTA (reproducible entre ejecuciones). */
function resultadoIdDe(
    analisisId: string,
    institucionId: string,
    numeroSemana: number,
): string {
    return `res:${analisisId}:${institucionId}:${numeroSemana}`;
}

/**
 * Persistor in-memory: captura el subgrafo de la semana (resultado, dimensiones
 * del Indice_Riesgo, evidencias por dimension, patrones y resumen de memoria) en
 * el staging de la transaccion. Devuelve un `resultadoId` DETERMINISTA para que
 * los embeddings trazables sean reproducibles.
 */
function crearPersistorMem(): PersistorSemana<TxMem> {
    return async (tx, unidad) => {
        const { contexto, resultado } = unidad;
        const art = unidad.aprendizaje as ArtefactosCiclo;
        const resultadoId = resultadoIdDe(
            contexto.analisisId,
            contexto.institucionId,
            contexto.numeroSemana,
        );

        const indice = (art.indice ?? []).map((d) => ({
            clave: d.clave,
            nombre: d.nombre,
            valor: d.valor,
            minimo: d.minimo,
            maximo: d.maximo,
            scoreCalibradoMl: d.scoreCalibradoMl,
        }));

        // Evidencia trazable por dimension (mismo texto que el persistor real).
        const evidencias = indice.map((dim) => ({
            resultadoId,
            clave: dim.clave,
            que: `La dimension ${dim.nombre} se situa en ${dim.valor.toFixed(2)} (rango ${dim.minimo}-${dim.maximo}).`,
            porQue: `Score calibrado por la Capa_ML: ${dim.scoreCalibradoMl.toFixed(3)}.`,
        }));

        tx.resultados.push({
            institucionId: contexto.institucionId,
            numeroSemana: contexto.numeroSemana,
            comunidadId: contexto.comunidadId,
            resultadoId,
            etapasCompletadas: serializarEtapasCompletadas(resultado),
            postAutorAnon: resultado.contrato.post.autorId,
            indice,
            evidencias,
            patrones: (art.patrones ?? []).map((p) => ({
                tipo: p.tipo,
                descripcion: p.descripcion,
            })),
            resumenMemoria: {
                resumen: art.resumenMemoria.resumen,
                eventosRelevantes: [...art.resumenMemoria.eventosRelevantes],
                cambiosImportantes: [...art.resumenMemoria.cambiosImportantes],
                anomalias: [...art.resumenMemoria.anomalias],
                tendencias: [...art.resumenMemoria.tendencias],
            },
        });

        return { resultadoId };
    };
}

// ===========================================================================
// Reporte determinista (agregado del estado acumulado)
// ===========================================================================

/** Redondea a 6 decimales para una comparacion robusta del reporte. */
function red6(n: number): number {
    return Math.round(n * 1_000_000) / 1_000_000;
}

interface Reporte {
    analisisId: string;
    semanasProcesadas: number;
    totalEmbeddings: number;
    porInstitucion: Array<{
        institucionId: string;
        semanas: number;
        totalPatrones: number;
        embeddings: number;
        dimensiones: Array<{
            clave: string;
            valorPromedio: number;
            scoreMlPromedio: number;
        }>;
    }>;
}

/** Genera un reporte determinista agregando el estado acumulado del analisis. */
function generarReporte(almacen: AlmacenAnalisis): Reporte {
    const porInstitucion = almacen.institucionesOrdenadas().map((institucionId) => {
        const semanas = [...almacen.resultados.values()]
            .filter((r) => r.institucionId === institucionId)
            .sort((a, b) => a.numeroSemana - b.numeroSemana);

        // Promedios por dimension a lo largo de las semanas (orden estable).
        const claves = semanas.length > 0 ? semanas[0].indice.map((d) => d.clave) : [];
        const dimensiones = claves.map((clave) => {
            const valores = semanas.map(
                (s) => s.indice.find((d) => d.clave === clave)!.valor,
            );
            const scores = semanas.map(
                (s) => s.indice.find((d) => d.clave === clave)!.scoreCalibradoMl,
            );
            const prom = (xs: number[]): number =>
                xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
            return {
                clave,
                valorPromedio: red6(prom(valores)),
                scoreMlPromedio: red6(prom(scores)),
            };
        });

        const totalPatrones = semanas.reduce((a, s) => a + s.patrones.length, 0);
        const embeddings = almacen.embeddings.registros.filter(
            (e) => e.institucionId === institucionId,
        ).length;

        return {
            institucionId,
            semanas: semanas.length,
            totalPatrones,
            embeddings,
            dimensiones,
        };
    });

    return {
        analisisId: almacen.analisisId,
        semanasProcesadas: almacen.resultados.size,
        totalEmbeddings: almacen.embeddings.registros.length,
        porInstitucion,
    };
}

// ===========================================================================
// Cableado del entorno determinista (ciclo REAL + dobles in-memory)
// ===========================================================================

interface Snapshot {
    resultados: ResultadoSemanaCapturado[];
    embeddings: Array<{
        refId: string;
        refContenido: string;
        resultadoId: string;
        analisisId: string;
        comunidadId: string;
        institucionId: string;
        numeroSemana: number;
        modelo: string;
        vector: number[];
    }>;
    reporte: Reporte;
}

interface Entorno {
    almacen: AlmacenAnalisis;
    ejecutarCiclo: () => Promise<void>;
    ejecutarSemana: (
        institucionId: string,
        numeroSemana: number,
    ) => Promise<{ estado: EstadoTrabajo; omitido: boolean }>;
    snapshot: () => Snapshot;
}

/**
 * Construye un entorno FRESCO y determinista: estado del analisis en memoria +
 * el ciclo REAL (procesarSemana via Pipeline_Analisis + MotorAprendizajeReal +
 * Memoria_Semantica) cableado a dobles in-memory, ejecutado por una cola
 * inmediata (EjecutorTrabajoSemana). Con la misma `semilla`, dos entornos
 * producen estados identicos.
 */
function construirEntorno(semilla: number, semanas: number, instituciones: number): Entorno {
    const almacen = new AlmacenAnalisis(semanas, instituciones);

    // ANALIZA: Pipeline_Analisis REAL (anonimizacion + filtro/NLP/vision fallback).
    const analizador = new AnalizadorPipeline({
        anonimizacion: {
            servicio: new ServicioAnonimizacionSha256(),
            salt: ANON_SALT,
        },
        servicios: {
            filtroRelevancia: new FiltroRelevanciaBase(),
            servicioNLP: new ServicioNLPBase(),
            servicioVision: new ServicioVisionMock(),
        },
    });

    // APRENDE: motor real con Capa_ML determinista (score calibrado).
    const aprendizaje = new MotorAprendizajeReal(capaMlDeterminista);

    // ALMACENA: transaccion atomica in-memory (staging -> commit).
    const ejecutarTransaccion = async <R>(
        trabajo: (tx: TxMem) => Promise<R>,
    ): Promise<R> => {
        const staging: TxMem = {
            resultados: [],
            almacen: new AlmacenEmbeddingsMemoria(),
        };
        const r = await trabajo(staging); // si lanza -> no se vuelca (rollback)
        for (const res of staging.resultados) {
            almacen.resultados.set(`${res.institucionId}:${res.numeroSemana}`, res);
        }
        await almacen.embeddings.insertar(staging.almacen.registros);
        return r;
    };

    const deps: DependenciasProcesarSemana<TxMem> = {
        generador: crearGeneradorSemilla(almacen, semilla),
        validador: new ValidadorContratoZod(() => {
            /* silencioso en pruebas */
        }),
        analizador,
        aprendizaje,
        ejecutarTransaccion,
        persistirResultado: crearPersistorMem(),
        // Memoria_Semantica REAL ligada a la transaccion (embeddings tx-scoped).
        memoriaTransaccional: (tx) =>
            new MemoriaSemanticaService(capaMlDeterminista, tx.almacen),
    };

    const procesador = new ProcesadorSemana<TxMem>(deps);

    // Cola INMEDIATA/in-memory: el EjecutorTrabajoSemana ejecuta procesarSemana
    // con idempotencia, cerrojo y estado consultable, sin Redis/BullMQ real.
    const consultaResultado: ConsultaResultadoSemana = {
        async yaProcesada(datos: DatosTrabajoSemana): Promise<boolean> {
            return almacen.resultados.has(
                `${datos.institucionId}:${datos.numeroSemana}`,
            );
        },
    };
    const ejecutor = new EjecutorTrabajoSemana({
        procesador,
        cerrojo: new CerrojoConcurrenciaEnMemoria(),
        consultaResultado,
        registro: new RegistroEstadoTrabajosEnMemoria(
            new RelojFijo(new Date("2024-01-01T00:00:00.000Z")),
            new GeneradorIdSecuencial("reg"),
        ),
    });

    const ejecutarSemana = async (
        institucionId: string,
        numeroSemana: number,
    ): Promise<{ estado: EstadoTrabajo; omitido: boolean }> => {
        const r = await ejecutor.ejecutar(
            { analisisId: almacen.analisisId, institucionId, numeroSemana },
            { intento: 1, maxIntentos: 3 },
        );
        return { estado: r.estado, omitido: r.omitido };
    };

    const ejecutarCiclo = async (): Promise<void> => {
        // Programador_Temporal/Herramienta_Aceleracion: semanas en orden creciente
        // por institucion (mismo procesarSemana para todos los modos).
        for (const institucionId of almacen.institucionesOrdenadas()) {
            for (let s = 1; s <= almacen.semanasTotales; s++) {
                await ejecutarSemana(institucionId, s);
            }
        }
    };

    const snapshot = (): Snapshot => {
        const resultados = [...almacen.resultados.values()].sort(
            (a, b) =>
                a.institucionId.localeCompare(b.institucionId) ||
                a.numeroSemana - b.numeroSemana,
        );
        const embeddings = almacen.embeddings.registros
            .map((e) => ({
                refId: e.refId,
                refContenido: e.refContenido,
                resultadoId: e.resultadoId,
                analisisId: e.analisisId,
                comunidadId: e.comunidadId,
                institucionId: e.institucionId,
                numeroSemana: e.numeroSemana,
                modelo: e.modelo,
                vector: [...e.vector],
            }))
            .sort((a, b) => a.refId.localeCompare(b.refId));
        return { resultados, embeddings, reporte: generarReporte(almacen) };
    };

    return { almacen, ejecutarCiclo, ejecutarSemana, snapshot };
}

// ===========================================================================
// Pruebas
// ===========================================================================

const SEMILLA = 1234;
const SEMANAS = 4;
const INSTITUCIONES = 2;

describe("Ciclo completo determinista end-to-end (tarea 28.2)", () => {
    it("produce un estado COMPLETO y bien formado (resultados/indice/evidencias/embeddings/reporte)", async () => {
        const env = construirEntorno(SEMILLA, SEMANAS, INSTITUCIONES);
        await env.ejecutarCiclo();
        const snap = env.snapshot();

        // Una fila por (institucion, semana).
        expect(snap.resultados).toHaveLength(SEMANAS * INSTITUCIONES);

        const etapasCanonicas = [...ORDEN_ETAPAS];
        for (const r of snap.resultados) {
            // El pipeline completo se ejecuto en orden canonico (incl. EMBEDDINGS).
            expect(r.etapasCompletadas).toEqual(etapasCanonicas);

            // Indice_Riesgo multidimensional: 8 dimensiones por defecto, en rango.
            expect(r.indice).toHaveLength(8);
            for (const dim of r.indice) {
                expect(dim.valor).toBeGreaterThanOrEqual(dim.minimo);
                expect(dim.valor).toBeLessThanOrEqual(dim.maximo);
                expect(dim.scoreCalibradoMl).toBeGreaterThanOrEqual(0);
                expect(dim.scoreCalibradoMl).toBeLessThanOrEqual(1);
            }

            // Toda dimension tiene su evidencia trazable (qué/por qué).
            expect(r.evidencias).toHaveLength(r.indice.length);
            for (const ev of r.evidencias) {
                expect(ev.resultadoId).toBe(r.resultadoId);
                expect(ev.que.length).toBeGreaterThan(0);
                expect(ev.porQue.length).toBeGreaterThan(0);
            }

            // ANONIMIZACION real: el autor del post es un seudonimo hex(64),
            // nunca el id original del Usuario_Sintetico (Req. 23.1, 23.2).
            expect(r.postAutorAnon).toMatch(/^[0-9a-f]{64}$/);
            expect(r.postAutorAnon).not.toContain(r.institucionId);
        }

        // Memoria_Semantica acumulada: embeddings trazables y no vacios.
        expect(snap.embeddings.length).toBeGreaterThan(0);
        for (const e of snap.embeddings) {
            expect(e.vector).toHaveLength(DIM_EMBEDDING);
            expect(e.analisisId).toBe(env.almacen.analisisId);
            // refId trazable al resultado de su semana (Req. 36.5).
            expect(e.refId.startsWith(`${e.resultadoId}#`)).toBe(true);
        }

        // Reporte agregado coherente.
        expect(snap.reporte.semanasProcesadas).toBe(SEMANAS * INSTITUCIONES);
        expect(snap.reporte.totalEmbeddings).toBe(snap.embeddings.length);
        expect(snap.reporte.porInstitucion).toHaveLength(INSTITUCIONES);
        for (const inst of snap.reporte.porInstitucion) {
            expect(inst.semanas).toBe(SEMANAS);
            expect(inst.dimensiones).toHaveLength(8);
        }
    });

    it("es REPRODUCIBLE: misma semilla => estado identico en dos ejecuciones independientes", async () => {
        const env1 = construirEntorno(SEMILLA, SEMANAS, INSTITUCIONES);
        await env1.ejecutarCiclo();
        const snap1 = env1.snapshot();

        const env2 = construirEntorno(SEMILLA, SEMANAS, INSTITUCIONES);
        await env2.ejecutarCiclo();
        const snap2 = env2.snapshot();

        // Resultados por semana, dimensiones del indice, evidencias, embeddings
        // (con sus vectores) y reporte: IDENTICOS (Req. 26.1, 26.2, 26.4, 12.5).
        expect(snap2).toEqual(snap1);
    });

    it("la Memoria_Semantica ACUMULA monotonicamente por semana (sin borrar previos)", async () => {
        const env = construirEntorno(SEMILLA, SEMANAS, 1);
        const institucionId = env.almacen.institucionesOrdenadas()[0];

        let previo = 0;
        for (let s = 1; s <= SEMANAS; s++) {
            await env.ejecutarSemana(institucionId, s);
            const actual = env.almacen.embeddings.registros.length;
            expect(actual).toBeGreaterThan(previo); // crece, nunca decrece
            previo = actual;
        }
    });

    it("es IDEMPOTENTE: reprocesar una semana ya COMPLETADA no altera el estado", async () => {
        const env = construirEntorno(SEMILLA, SEMANAS, INSTITUCIONES);
        await env.ejecutarCiclo();
        const snapAntes = env.snapshot();

        // Reencolar una semana ya procesada: la cola la omite por idempotencia.
        const institucionId = env.almacen.institucionesOrdenadas()[0];
        const r = await env.ejecutarSemana(institucionId, 1);
        expect(r.omitido).toBe(true);
        expect(r.estado).toBe(EstadoTrabajo.COMPLETADO);

        // El estado acumulado no cambia (sin duplicados ni mutaciones).
        expect(env.snapshot()).toEqual(snapAntes);
    });

    it("diferente semilla => contenido generado distinto (la semilla controla la simulacion)", async () => {
        const envA = construirEntorno(SEMILLA, SEMANAS, 1);
        await envA.ejecutarCiclo();
        const envB = construirEntorno(SEMILLA + 1, SEMANAS, 1);
        await envB.ejecutarCiclo();

        // Con semillas distintas, el estado debe diferir en algun punto.
        expect(envB.snapshot()).not.toEqual(envA.snapshot());
    });
});
