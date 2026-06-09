/**
 * Implementacion base/heuristica de la `Capa_ML` (Req. 31).
 *
 * Es **determinista**, **sin GPU**, sin modelos externos ni red: sirve como
 * implementacion de referencia para pruebas y como **fallback seguro** cuando el
 * modelo local no esta disponible o excede la VRAM (degradacion segura, Req.
 * 31.5, 31.6). Las salidas son **colectivas y respaldadas con evidencia**
 * (Req. 31.7) y el `scoreRiesgoCalibrado` queda siempre acotado a `[0,1]`.
 *
 * El "aprendizaje" se modela como **calibracion ligera** (Req. 31.3): `calibrar`
 * incrementa una version interna y aplica un factor de calibracion derivado del
 * `Corpus_Longitudinal` acumulado, sin fine-tuning pesado. La persistencia del
 * artefacto en `gds_calibracion` se difiere a las tareas de integracion (12.2);
 * aqui se mantiene el estado en memoria.
 *
 * Diseno: design.md > "Capa de Machine Learning (sobre la Capa_Analisis)".
 * _Requirements: 31.1, 31.2, 31.3, 31.7_
 */
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

/** Dimension fija de los vectores de embedding heuristico. */
const DIMENSION_EMBEDDING = 16;

/** Umbral de similitud coseno para asignar un vector a un cluster existente. */
const UMBRAL_CLUSTER = 0.9;

/** Umbral (en desviaciones estandar) para marcar una anomalia. */
const UMBRAL_ANOMALIA_SIGMAS = 2;

/** Umbral minimo de magnitud para considerar que una tendencia no es "estable". */
const UMBRAL_TENDENCIA = 1e-9;

/** Restringe un valor al rango cerrado [0,1] (Req. 31.2, 31.7). */
export function clamp01(valor: number): number {
    if (Number.isNaN(valor)) return 0;
    if (valor < 0) return 0;
    if (valor > 1) return 1;
    return valor;
}

/** Producto punto de dos vectores de igual longitud. */
function dot(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i += 1) s += a[i] * b[i];
    return s;
}

/** Norma euclidiana de un vector. */
function norma(a: number[]): number {
    return Math.sqrt(dot(a, a));
}

/** Similitud coseno; 0 cuando alguna norma es 0. */
function coseno(a: number[], b: number[]): number {
    const na = norma(a);
    const nb = norma(b);
    if (na === 0 || nb === 0) return 0;
    return dot(a, b) / (na * nb);
}

/** Media aritmetica de una lista (0 si esta vacia). */
function media(xs: number[]): number {
    if (xs.length === 0) return 0;
    let s = 0;
    for (const x of xs) s += x;
    return s / xs.length;
}

/** Desviacion estandar poblacional (0 si hay <2 elementos). */
function desviacion(xs: number[]): number {
    if (xs.length < 2) return 0;
    const m = media(xs);
    let s = 0;
    for (const x of xs) s += (x - m) * (x - m);
    return Math.sqrt(s / xs.length);
}

/**
 * Capa_ML base determinista (heuristica, sin GPU ni red).
 */
export class CapaMLBase implements CapaML {
    /** Version actual del artefacto de calibracion en memoria. */
    private versionCalibracion = 0;

    /** Factor de calibracion aplicado al scoring (1 = sin calibrar). */
    private factorCalibracion = 1;

    /**
     * Embedding heuristico determinista: cada componente acumula los codigos de
     * caracter en posiciones congruentes modulo `DIMENSION_EMBEDDING`, y el
     * vector se normaliza (norma 1) para que la similitud coseno sea estable.
     * Un texto vacio produce el vector cero.
     */
    async embeddings(textos: string[]): Promise<number[][]> {
        return textos.map((texto) => {
            const v = new Array<number>(DIMENSION_EMBEDDING).fill(0);
            for (let i = 0; i < texto.length; i += 1) {
                v[i % DIMENSION_EMBEDDING] += texto.charCodeAt(i);
            }
            const n = norma(v);
            if (n === 0) return v;
            return v.map((x) => x / n);
        });
    }

    /**
     * Agrupamiento aglomerativo simple y determinista: recorre los vectores en
     * orden y los asigna al primer cluster cuyo centroide supere el
     * `UMBRAL_CLUSTER` de similitud coseno; si ninguno lo supera, crea un nuevo
     * cluster. Los miembros se referencian por su indice de entrada.
     */
    async clustering(vectores: number[][]): Promise<ResultadoClustering[]> {
        const clusters: Array<{ centroide: number[]; miembros: number[] }> = [];
        vectores.forEach((vec, idx) => {
            let mejor = -1;
            let mejorSim = UMBRAL_CLUSTER;
            for (let c = 0; c < clusters.length; c += 1) {
                const sim = coseno(vec, clusters[c].centroide);
                if (sim >= mejorSim) {
                    mejorSim = sim;
                    mejor = c;
                }
            }
            if (mejor === -1) {
                clusters.push({ centroide: vec, miembros: [idx] });
            } else {
                clusters[mejor].miembros.push(idx);
            }
        });
        return clusters.map((c, clusterId) => ({
            clusterId,
            miembros: c.miembros.map((m) => String(m)),
            etiqueta: `cluster-${clusterId}`,
        }));
    }

    /**
     * Deteccion de anomalias por z-score: para cada punto de la serie calcula la
     * magnitud agregada (norma) y marca como anomalia los puntos cuyo desvio
     * respecto a la media supera `UMBRAL_ANOMALIA_SIGMAS` desviaciones estandar.
     * Resultado colectivo: cada anomalia referencia el indice del punto (Req. 31.7).
     */
    async anomalias(serie: number[][], _zona?: ZonaGeografica): Promise<Anomalia[]> {
        if (serie.length < 2) return [];
        const magnitudes = serie.map((p) => norma(p));
        const m = media(magnitudes);
        const sd = desviacion(magnitudes);
        if (sd === 0) return [];
        const anomalias: Anomalia[] = [];
        magnitudes.forEach((mag, idx) => {
            const z = Math.abs(mag - m) / sd;
            if (z >= UMBRAL_ANOMALIA_SIGMAS) {
                anomalias.push({
                    refId: String(idx),
                    score: Number(z.toFixed(6)),
                    descripcion: `Desviacion de ${z.toFixed(2)} sigmas respecto al patron acumulado`,
                });
            }
        });
        return anomalias;
    }

    /**
     * Tendencias por dimension a partir de las series de `EvolucionTemporal`:
     * compara el ultimo valor contra el primero; el signo determina la direccion
     * y el valor absoluto la magnitud. Una serie sin series declaradas devuelve
     * `[]` (evolucion sin tendencias significativas es valida, Req. 16.2).
     */
    async tendencias(evolucion: EvolucionTemporal, _zona?: ZonaGeografica): Promise<Tendencia[]> {
        const series = evolucion.series ?? {};
        const tendencias: Tendencia[] = [];
        for (const [dimension, valores] of Object.entries(series)) {
            if (valores.length < 2) continue;
            const delta = valores[valores.length - 1] - valores[0];
            const magnitud = Math.abs(delta);
            let direccion: Tendencia["direccion"] = "estable";
            if (magnitud > UMBRAL_TENDENCIA) {
                direccion = delta > 0 ? "sube" : "baja";
            }
            tendencias.push({ dimension, direccion, magnitud });
        }
        return tendencias;
    }

    /**
     * Score calibrado del `Indice_Riesgo`: media de las senales agregadas
     * escalada por el factor de calibracion, **acotada explicitamente a `[0,1]`**
     * (Req. 31.2, 31.7). Conserva las evidencias de entrada como respaldo
     * colectivo trazable. Sin senales, el score es 0.
     */
    async scoreRiesgoCalibrado(entrada: EntradaIndice): Promise<ScoreCalibrado> {
        const base = media(entrada.senales);
        const score = clamp01(base * this.factorCalibracion);
        return { score, evidenciaIds: [...entrada.evidenciaIds] };
    }

    /**
     * Calibracion ligera a partir del `Corpus_Longitudinal` acumulado (Req. 31.3,
     * 31.4): incrementa la version interna y ajusta el factor de calibracion en
     * funcion del numero de semanas acumuladas (saturando suavemente). No realiza
     * fine-tuning pesado. La persistencia en `gds_calibracion` se difiere (12.2).
     */
    async calibrar(corpus: ReferenciaCorpus): Promise<ResultadoCalibracion> {
        this.versionCalibracion += 1;
        const semanas = Math.max(0, corpus.numeroSemanas);
        // Factor suave en (0.5, 1.5]: mas corpus -> mayor confianza, saturando.
        this.factorCalibracion = 0.5 + semanas / (semanas + 1);
        return {
            version: `base-v${this.versionCalibracion}`,
            metricas: {
                corpusSemanas: semanas,
                factorCalibracion: Number(this.factorCalibracion.toFixed(6)),
            },
        };
    }
}

/** Instancia reutilizable lista para inyectarse como fallback seguro. */
export const capaMLBase: CapaML = new CapaMLBase();
