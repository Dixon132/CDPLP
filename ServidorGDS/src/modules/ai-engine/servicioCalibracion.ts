/**
 * Servicio de integracion de la calibracion de la `Capa_ML` con el
 * `Corpus_Longitudinal` (tarea 9.4).
 *
 * Orquesta el bucle de aprendizaje longitudinal (CRISP-DM/MLOps): cuando el
 * `Corpus_Longitudinal` acumulado de un `Analisis` CRECE (mas `Semana_Simulada`
 * que en la ultima calibracion registrada), invoca `POST /calibrar` del
 * `Servicio_IA` a traves de la interfaz estable `Capa_ML` (cliente HTTP de la
 * tarea 8.1) y registra el resultado en `gds_calibracion` (`version`,
 * `artefacto_ref`, `metricas`) via {@link CalibracionRepositorio}.
 *
 * Garantia de robustez (Req. 36.4): ante un fallo del `Servicio_IA`, el servicio
 * NO propaga el error ni borra nada; CONSERVA la ultima calibracion valida
 * previamente registrada y la devuelve como vigente. El `ServidorGDS` orquesta y
 * degrada de forma segura sin acoplarse a la implementacion en Python.
 *
 * Este servicio NO toca el `Pipeline_Analisis`, `Embeddings_Search` ni la
 * indexacion de `Memoria_Semantica`: solo gobierna el ciclo de calibracion.
 *
 * Diseno: design.md > "Aprendizaje longitudinal (no reentrenamiento pesado)".
 * _Requirements: 31.3, 31.4, 36.4_
 */
import type { CapaML, ReferenciaCorpus } from "../ml/capaML";

import {
    METRICA_CORPUS_SEMANAS,
    type RegistroCalibracion,
    type ResultadoIntegracionCalibracion,
} from "./calibracion";
import {
    type CalibracionRepositorio,
    semanasDeRegistro,
} from "./calibracionRepositorio";

/** Subconjunto de la `Capa_ML` que el servicio necesita: solo recalibra. */
export type CalibradorCapaML = Pick<CapaML, "calibrar">;

/**
 * Servicio de integracion de calibracion. Desacoplado de la implementacion
 * concreta de la `Capa_ML` (cliente HTTP del `Servicio_IA` o fallback
 * determinista TS) y de la persistencia (Prisma o doble de pruebas).
 */
export class ServicioCalibracion {
    constructor(
        private readonly capaML: CalibradorCapaML,
        private readonly repositorio: CalibracionRepositorio,
    ) { }

    /**
     * Evalua el estado del `Corpus_Longitudinal` y calibra SI crecio.
     *
     * 1. Recupera la ultima calibracion valida del `Analisis`.
     * 2. Si el corpus NO crecio (mismas o menos `Semana_Simulada` que la ultima
     *    calibracion), no recalibra y devuelve la vigente (`sin_crecimiento`).
     * 3. Si crecio (o es la primera vez), invoca `POST /calibrar`:
     *    - Exito: registra en `gds_calibracion` y devuelve la nueva como vigente.
     *    - Fallo: CONSERVA la ultima calibracion valida y la devuelve (`fallo`).
     */
    async integrarCalibracion(
        corpus: ReferenciaCorpus,
    ): Promise<ResultadoIntegracionCalibracion> {
        const vigentePrevia = await this.repositorio.ultima(corpus.analisisId);

        if (!this.corpusCrecio(corpus, vigentePrevia)) {
            return {
                calibrada: false,
                motivo: "sin_crecimiento",
                vigente: vigentePrevia,
            };
        }

        try {
            const resultado = await this.capaML.calibrar(corpus);
            // El numero de semanas calibradas se persiste de forma autocontenida
            // en `metricas`, junto a las metricas tecnicas del `Servicio_IA`.
            const metricas: Record<string, number> = {
                ...resultado.metricas,
                [METRICA_CORPUS_SEMANAS]: Math.max(0, corpus.numeroSemanas),
            };
            const registro = await this.repositorio.guardar({
                analisisId: corpus.analisisId,
                version: resultado.version,
                artefactoRef: this.resolverArtefactoRef(corpus, resultado.version),
                metricas,
            });
            return { calibrada: true, motivo: "calibrada", vigente: registro };
        } catch (error) {
            // Degradacion segura: se conserva la ultima calibracion valida previa
            // (Req. 36.4). No se propaga el error ni se altera la persistencia.
            return {
                calibrada: false,
                motivo: "fallo",
                vigente: vigentePrevia,
                error,
            };
        }
    }

    /**
     * El corpus crecio si nunca se calibro o si acumula MAS `Semana_Simulada`
     * que la ultima calibracion registrada (Req. 31.3, 36.4).
     */
    private corpusCrecio(
        corpus: ReferenciaCorpus,
        vigente: RegistroCalibracion | null,
    ): boolean {
        const previas = semanasDeRegistro(vigente);
        if (previas === null) {
            return true;
        }
        return corpus.numeroSemanas > previas;
    }

    /**
     * Referencia opaca al artefacto persistente: la que provea el corpus o, en su
     * defecto, una derivada estable de la version (el contrato HTTP de
     * `POST /calibrar` no expone una referencia propia).
     */
    private resolverArtefactoRef(corpus: ReferenciaCorpus, version: string): string {
        const ref = corpus.artefactoRef?.trim();
        return ref && ref.length > 0 ? ref : `artefacto:${version}`;
    }
}
