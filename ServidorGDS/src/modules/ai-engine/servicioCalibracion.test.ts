/**
 * Pruebas unitarias del `ServicioCalibracion` (tarea 9.4): integracion de la
 * calibracion de la `Capa_ML` con el `Corpus_Longitudinal`.
 *
 * Validan, con un doble determinista del `Servicio_IA` (`Capa_ML.calibrar`) y un
 * repositorio en memoria, que:
 *  - la calibracion se invoca AL CRECER el corpus y NO cuando no crece,
 *  - cada calibracion se registra en `gds_calibracion` (`version`,
 *    `artefacto_ref`, `metricas`),
 *  - ante un fallo del `Servicio_IA` se CONSERVA la ultima calibracion valida.
 *
 * Pruebas en Jest (sin vitest).
 * _Requirements: 31.3, 31.4, 36.4_
 */
import type { ReferenciaCorpus, ResultadoCalibracion } from "../ml/capaML";

import { METRICA_CORPUS_SEMANAS, type RegistroCalibracion } from "./calibracion";
import type { CalibracionRepositorio } from "./calibracionRepositorio";
import {
    type CalibradorCapaML,
    ServicioCalibracion,
} from "./servicioCalibracion";

/**
 * Doble determinista del `Servicio_IA` (`Capa_ML.calibrar`): cuenta invocaciones
 * y deriva la version y las metricas del corpus recibido. Puede configurarse
 * para FALLAR y simular la indisponibilidad del `Servicio_IA`.
 */
class CalibradorDoble implements CalibradorCapaML {
    public llamadas: ReferenciaCorpus[] = [];
    private version = 0;

    constructor(private fallar = false) { }

    programarFallo(fallar: boolean): void {
        this.fallar = fallar;
    }

    async calibrar(corpus: ReferenciaCorpus): Promise<ResultadoCalibracion> {
        this.llamadas.push(corpus);
        if (this.fallar) {
            throw new Error("Servicio_IA no disponible");
        }
        this.version += 1;
        return {
            version: `ia-v${this.version}`,
            metricas: {
                factorCalibracion: Number((0.5 + corpus.numeroSemanas / (corpus.numeroSemanas + 1)).toFixed(6)),
            },
        };
    }
}

/** Repositorio en memoria que conserva el historial completo de calibraciones. */
class RepositorioMemoria implements CalibracionRepositorio {
    public registros: RegistroCalibracion[] = [];
    private seq = 0;

    async guardar(registro: RegistroCalibracion): Promise<RegistroCalibracion> {
        this.seq += 1;
        const persistido: RegistroCalibracion = {
            ...registro,
            id: `cal-${this.seq}`,
            metricas: { ...registro.metricas },
            // Orden temporal estrictamente creciente para `ultima`.
            calibradoEn: new Date(1_700_000_000_000 + this.seq),
        };
        this.registros.push(persistido);
        return persistido;
    }

    async ultima(analisisId: string): Promise<RegistroCalibracion | null> {
        const propias = this.registros.filter((r) => r.analisisId === analisisId);
        if (propias.length === 0) {
            return null;
        }
        return propias.reduce((acc, r) =>
            (r.calibradoEn?.getTime() ?? 0) >= (acc.calibradoEn?.getTime() ?? 0) ? r : acc,
        );
    }
}

const corpus = (numeroSemanas: number, extra: Partial<ReferenciaCorpus> = {}): ReferenciaCorpus => ({
    analisisId: "a1",
    numeroSemanas,
    ...extra,
});

describe("ServicioCalibracion: calibracion al crecer el corpus (Req. 31.3, 36.4)", () => {
    it("invoca POST /calibrar y registra gds_calibracion la primera vez", async () => {
        const calibrador = new CalibradorDoble();
        const repo = new RepositorioMemoria();
        const servicio = new ServicioCalibracion(calibrador, repo);

        const resultado = await servicio.integrarCalibracion(corpus(4));

        expect(resultado.calibrada).toBe(true);
        expect(resultado.motivo).toBe("calibrada");
        expect(calibrador.llamadas).toHaveLength(1);
        // Se registro exactamente un gds_calibracion con version/artefacto/metricas.
        expect(repo.registros).toHaveLength(1);
        expect(repo.registros[0].version).toBe("ia-v1");
        expect(repo.registros[0].artefactoRef).toBe("artefacto:ia-v1");
        expect(repo.registros[0].metricas[METRICA_CORPUS_SEMANAS]).toBe(4);
        expect(resultado.vigente).toEqual(repo.registros[0]);
    });

    it("recalibra cuando el corpus crece (mas Semana_Simulada acumuladas)", async () => {
        const calibrador = new CalibradorDoble();
        const repo = new RepositorioMemoria();
        const servicio = new ServicioCalibracion(calibrador, repo);

        await servicio.integrarCalibracion(corpus(4));
        const segunda = await servicio.integrarCalibracion(corpus(12));

        expect(segunda.calibrada).toBe(true);
        expect(calibrador.llamadas).toHaveLength(2);
        expect(repo.registros).toHaveLength(2);
        expect(segunda.vigente?.version).toBe("ia-v2");
        expect(segunda.vigente?.metricas[METRICA_CORPUS_SEMANAS]).toBe(12);
    });

    it("NO recalibra cuando el corpus no crece (igual o menor tamano)", async () => {
        const calibrador = new CalibradorDoble();
        const repo = new RepositorioMemoria();
        const servicio = new ServicioCalibracion(calibrador, repo);

        await servicio.integrarCalibracion(corpus(10));
        const igual = await servicio.integrarCalibracion(corpus(10));
        const menor = await servicio.integrarCalibracion(corpus(7));

        expect(igual.calibrada).toBe(false);
        expect(igual.motivo).toBe("sin_crecimiento");
        expect(menor.calibrada).toBe(false);
        expect(menor.motivo).toBe("sin_crecimiento");
        // Solo la primera (crecimiento desde cero) invoco al Servicio_IA.
        expect(calibrador.llamadas).toHaveLength(1);
        expect(repo.registros).toHaveLength(1);
        // La vigente sigue siendo la unica calibracion valida registrada.
        expect(igual.vigente?.version).toBe("ia-v1");
        expect(menor.vigente?.version).toBe("ia-v1");
    });

    it("usa el artefactoRef del corpus cuando se provee", async () => {
        const calibrador = new CalibradorDoble();
        const repo = new RepositorioMemoria();
        const servicio = new ServicioCalibracion(calibrador, repo);

        const resultado = await servicio.integrarCalibracion(
            corpus(5, { artefactoRef: "s3://corpus/a1/v5" }),
        );

        expect(resultado.vigente?.artefactoRef).toBe("s3://corpus/a1/v5");
    });
});

describe("ServicioCalibracion: conserva la ultima calibracion valida ante fallo (Req. 36.4)", () => {
    it("ante fallo del Servicio_IA conserva y devuelve la ultima calibracion valida", async () => {
        const calibrador = new CalibradorDoble();
        const repo = new RepositorioMemoria();
        const servicio = new ServicioCalibracion(calibrador, repo);

        // Primera calibracion valida con corpus de 4 semanas.
        const valida = await servicio.integrarCalibracion(corpus(4));
        expect(valida.calibrada).toBe(true);

        // El corpus crece a 9 pero el Servicio_IA falla.
        calibrador.programarFallo(true);
        const trasFallo = await servicio.integrarCalibracion(corpus(9));

        expect(trasFallo.calibrada).toBe(false);
        expect(trasFallo.motivo).toBe("fallo");
        expect(trasFallo.error).toBeInstanceOf(Error);
        // No se registro una nueva calibracion: persiste solo la valida previa.
        expect(repo.registros).toHaveLength(1);
        // La vigente conservada es exactamente la ultima calibracion valida.
        expect(trasFallo.vigente).toEqual(valida.vigente);
        expect(trasFallo.vigente?.version).toBe("ia-v1");
        expect(trasFallo.vigente?.metricas[METRICA_CORPUS_SEMANAS]).toBe(4);
    });

    it("tras recuperarse el Servicio_IA, recalibra con el corpus crecido", async () => {
        const calibrador = new CalibradorDoble();
        const repo = new RepositorioMemoria();
        const servicio = new ServicioCalibracion(calibrador, repo);

        await servicio.integrarCalibracion(corpus(4));

        calibrador.programarFallo(true);
        await servicio.integrarCalibracion(corpus(9));

        // El Servicio_IA se recupera; el corpus sigue crecido (9 > 4).
        calibrador.programarFallo(false);
        const recuperada = await servicio.integrarCalibracion(corpus(9));

        expect(recuperada.calibrada).toBe(true);
        expect(recuperada.motivo).toBe("calibrada");
        expect(repo.registros).toHaveLength(2);
        expect(recuperada.vigente?.metricas[METRICA_CORPUS_SEMANAS]).toBe(9);
    });

    it("ante fallo sin calibracion previa, la vigente es null y no registra nada", async () => {
        const calibrador = new CalibradorDoble(true);
        const repo = new RepositorioMemoria();
        const servicio = new ServicioCalibracion(calibrador, repo);

        const resultado = await servicio.integrarCalibracion(corpus(3));

        expect(resultado.calibrada).toBe(false);
        expect(resultado.motivo).toBe("fallo");
        expect(resultado.vigente).toBeNull();
        expect(repo.registros).toHaveLength(0);
    });
});
