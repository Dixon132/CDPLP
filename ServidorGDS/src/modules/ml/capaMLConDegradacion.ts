/**
 * Degradacion segura de la `Capa_ML` (Req. 31.5, 31.6).
 *
 * `CapaMLConDegradacion` es un envoltorio (decorador) que implementa la misma
 * interfaz estable `CapaML` y permite que los consumidores (`Servicio_NLP`,
 * `Motor_Temporal`, `Detector_Patrones`, `Indice_Riesgo`) la inyecten **sin
 * acoplar el `Pipeline_Analisis`** a una implementacion concreta (Req. 31.6).
 *
 * Comportamiento (design.md > "Errores de los nuevos subsistemas"):
 * - Recibe una `Capa_ML` **primaria** opcional (p. ej. una implementacion real
 *   pesada que usa modelos locales/GPU) y una `Capa_ML` **de respaldo** (por
 *   defecto la `CapaMLBase` heuristica, determinista y sin GPU).
 * - Si la primaria **no esta disponible** (no se inyecta) o una operacion
 *   **falla** (modelo indisponible, excede la VRAM, error de red/microservicio),
 *   degrada al **calculo base sin bloquear** el pipeline y **registra el
 *   incidente** (Req. 31.5, 31.6). La interfaz estable se mantiene intacta.
 * - El `scoreRiesgoCalibrado` queda **siempre acotado a `[0,1]`** con
 *   independencia de la fuente (primaria o respaldo), reforzando la garantia de
 *   rango (Req. 31.2, 31.7).
 *
 * El registrador de incidentes es **inyectable** para facilitar las pruebas; por
 * defecto escribe en `console.error`, coherente con el resto del servicio.
 *
 * _Requirements: 31.5, 31.6_
 */
import { capaMLBase, clamp01 } from "./capaMLBase";
import type {
    Anomalia,
    CapaML,
    EntradaIndice,
    EvolucionTemporal,
    ReferenciaCorpus,
    ResultadoCalibracion,
    ResultadoClustering,
    ScoreCalibrado,
    Tendencia,
    ZonaGeografica,
} from "./capaML";

/** Operaciones de la `CapaML` que pueden degradar (para trazar el incidente). */
export type OperacionCapaML =
    | "embeddings"
    | "clustering"
    | "anomalias"
    | "tendencias"
    | "scoreRiesgoCalibrado"
    | "calibrar";

/** Causa de la degradacion de una operacion de la `Capa_ML`. */
export type CausaDegradacion = "no_disponible" | "error" | "vram";

/** Incidente registrado cuando la `Capa_ML` primaria degrada al respaldo. */
export interface IncidenteDegradacion {
    operacion: OperacionCapaML;
    causa: CausaDegradacion;
    mensaje: string;
    error?: unknown;
}

/** Registrador de incidentes de degradacion (inyectable). */
export type RegistradorIncidente = (incidente: IncidenteDegradacion) => void;

/** Registrador por defecto: escribe el incidente en `console.error`. */
export const registradorIncidenteConsola: RegistradorIncidente = (incidente) => {
    // eslint-disable-next-line no-console
    console.error(
        `[gds_capa_ml][degradacion] operacion=${incidente.operacion} ` +
        `causa=${incidente.causa} mensaje=${incidente.mensaje}`,
        incidente.error ?? ""
    );
};

/** Opciones de construccion de `CapaMLConDegradacion`. */
export interface OpcionesDegradacion {
    /**
     * `Capa_ML` primaria (real/pesada). Opcional/inyectable: cuando es
     * `undefined`/`null`, el modelo se considera **no disponible** y todas las
     * operaciones usan directamente el respaldo (Req. 31.5).
     */
    primaria?: CapaML | null;
    /** `Capa_ML` de respaldo. Por defecto la base heuristica (sin GPU). */
    respaldo?: CapaML;
    /** Registrador de incidentes. Por defecto `console.error`. */
    registrar?: RegistradorIncidente;
}

/**
 * Heuristica para reconocer un fallo por exceso de VRAM/memoria de GPU a partir
 * del mensaje del error, solo para enriquecer el registro del incidente. No
 * cambia el comportamiento: cualquier error degrada al respaldo.
 */
function esErrorVram(error: unknown): boolean {
    const mensaje = (
        error instanceof Error ? error.message : String(error ?? "")
    ).toLowerCase();
    return (
        mensaje.includes("vram") ||
        mensaje.includes("out of memory") ||
        mensaje.includes("oom") ||
        mensaje.includes("cuda")
    );
}

/** Extrae un mensaje legible de un error desconocido. */
function mensajeDe(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error ?? "error desconocido");
}

/**
 * `Capa_ML` con degradacion segura al calculo base.
 *
 * Implementa `CapaML`; delega cada operacion en la primaria y, ante
 * indisponibilidad o error, degrada al respaldo registrando el incidente, sin
 * bloquear el pipeline (Req. 31.5, 31.6).
 */
export class CapaMLConDegradacion implements CapaML {
    private readonly primaria: CapaML | null;

    private readonly respaldo: CapaML;

    private readonly registrar: RegistradorIncidente;

    constructor(opciones: OpcionesDegradacion = {}) {
        this.primaria = opciones.primaria ?? null;
        this.respaldo = opciones.respaldo ?? capaMLBase;
        this.registrar = opciones.registrar ?? registradorIncidenteConsola;
    }

    /**
     * Ejecuta `operar` sobre la primaria; si no hay primaria o lanza un error,
     * degrada a `operar` sobre el respaldo, registrando el incidente. Nunca
     * propaga el fallo de la primaria al consumidor (no bloquea el pipeline).
     */
    private async conDegradacion<T>(
        operacion: OperacionCapaML,
        operar: (capa: CapaML) => Promise<T>
    ): Promise<T> {
        if (this.primaria === null) {
            this.registrar({
                operacion,
                causa: "no_disponible",
                mensaje: "Capa_ML primaria no disponible; usando calculo base",
            });
            return operar(this.respaldo);
        }
        try {
            return await operar(this.primaria);
        } catch (error) {
            this.registrar({
                operacion,
                causa: esErrorVram(error) ? "vram" : "error",
                mensaje: `Capa_ML primaria fallo (${mensajeDe(error)}); degradando a calculo base`,
                error,
            });
            return operar(this.respaldo);
        }
    }

    async embeddings(textos: string[]): Promise<number[][]> {
        return this.conDegradacion("embeddings", (capa) => capa.embeddings(textos));
    }

    async clustering(vectores: number[][]): Promise<ResultadoClustering[]> {
        return this.conDegradacion("clustering", (capa) => capa.clustering(vectores));
    }

    async anomalias(serie: number[][], zona?: ZonaGeografica): Promise<Anomalia[]> {
        return this.conDegradacion("anomalias", (capa) => capa.anomalias(serie, zona));
    }

    async tendencias(evolucion: EvolucionTemporal, zona?: ZonaGeografica): Promise<Tendencia[]> {
        return this.conDegradacion("tendencias", (capa) => capa.tendencias(evolucion, zona));
    }

    /**
     * Score calibrado con degradacion segura y **clamping garantizado a `[0,1]`**
     * con independencia de la fuente (Req. 31.2, 31.7): aunque la primaria
     * devuelva un valor fuera de rango, el resultado expuesto queda acotado.
     */
    async scoreRiesgoCalibrado(entrada: EntradaIndice): Promise<ScoreCalibrado> {
        const resultado = await this.conDegradacion("scoreRiesgoCalibrado", (capa) =>
            capa.scoreRiesgoCalibrado(entrada)
        );
        return { ...resultado, score: clamp01(resultado.score) };
    }

    async calibrar(corpus: ReferenciaCorpus): Promise<ResultadoCalibracion> {
        return this.conDegradacion("calibrar", (capa) => capa.calibrar(corpus));
    }
}

/**
 * Fabrica que devuelve la `Capa_ML` con degradacion segura lista para que la
 * consuman `Servicio_NLP`, `Motor_Temporal`, `Detector_Patrones` e
 * `Indice_Riesgo` por inyeccion, sin acoplar el `Pipeline_Analisis` (Req. 31.6).
 *
 * Sin argumentos, devuelve una `Capa_ML` que opera siempre sobre el calculo base
 * (no hay primaria configurada todavia); cuando exista una implementacion real,
 * basta inyectarla como `primaria` sin cambiar a los consumidores.
 */
export function crearCapaMLConDegradacion(opciones: OpcionesDegradacion = {}): CapaML {
    return new CapaMLConDegradacion(opciones);
}
