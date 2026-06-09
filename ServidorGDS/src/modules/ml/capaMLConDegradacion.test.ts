/**
 * Pruebas unitarias de la degradacion segura de la `Capa_ML`.
 *
 * Verifican que el envoltorio: (a) usa la primaria cuando esta disponible y
 * funciona, (b) degrada al calculo base sin bloquear cuando la primaria no esta
 * disponible o falla, registrando el incidente, y (c) mantiene el
 * `scoreRiesgoCalibrado` acotado a `[0,1]` con independencia de la fuente.
 *
 * _Requirements: 31.5, 31.6_
 */
import { CapaMLBase, capaMLBase } from "./capaMLBase";
import {
    CapaMLConDegradacion,
    crearCapaMLConDegradacion,
    type IncidenteDegradacion,
} from "./capaMLConDegradacion";
import type { CapaML, EntradaIndice } from "./capaML";

/** Capa_ML doble que falla siempre con el error indicado. */
function capaQueFalla(error: Error): CapaML {
    const fallar = () => Promise.reject(error);
    return {
        embeddings: fallar,
        clustering: fallar,
        anomalias: fallar,
        tendencias: fallar,
        scoreRiesgoCalibrado: fallar,
        calibrar: fallar,
    };
}

const entrada = (senales: number[]): EntradaIndice => ({
    comunidadId: "c1",
    numeroSemana: 1,
    senales,
    evidenciaIds: ["ev-1"],
});

describe("CapaMLConDegradacion sin primaria (modelo no disponible)", () => {
    it("delega en el respaldo base y registra el incidente 'no_disponible' (Req. 31.5)", async () => {
        const incidentes: IncidenteDegradacion[] = [];
        const ml = new CapaMLConDegradacion({ registrar: (i) => incidentes.push(i) });

        const esperado = await capaMLBase.embeddings(["paro universitario"]);
        const obtenido = await ml.embeddings(["paro universitario"]);

        expect(obtenido).toEqual(esperado);
        expect(incidentes).toHaveLength(1);
        expect(incidentes[0]).toMatchObject({ operacion: "embeddings", causa: "no_disponible" });
    });

    it("la fabrica sin argumentos opera siempre sobre el calculo base", async () => {
        const ml = crearCapaMLConDegradacion();
        const r = await ml.scoreRiesgoCalibrado(entrada([0.2, 0.4]));
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
    });
});

describe("CapaMLConDegradacion con primaria funcional", () => {
    it("usa la primaria cuando responde correctamente, sin registrar incidentes", async () => {
        const incidentes: IncidenteDegradacion[] = [];
        const primaria = new CapaMLBase();
        const espia = jest.spyOn(primaria, "embeddings");
        const ml = new CapaMLConDegradacion({ primaria, registrar: (i) => incidentes.push(i) });

        await ml.embeddings(["estres academico"]);

        expect(espia).toHaveBeenCalledTimes(1);
        expect(incidentes).toHaveLength(0);
    });
});

describe("CapaMLConDegradacion con primaria que falla (fallback-on-error)", () => {
    it("degrada al respaldo sin propagar el error y registra el incidente (Req. 31.6)", async () => {
        const incidentes: IncidenteDegradacion[] = [];
        const respaldo = new CapaMLBase();
        const espiaRespaldo = jest.spyOn(respaldo, "tendencias");
        const ml = new CapaMLConDegradacion({
            primaria: capaQueFalla(new Error("microservicio caido")),
            respaldo,
            registrar: (i) => incidentes.push(i),
        });

        const resultado = await ml.tendencias({
            analisisId: "a1",
            institucionId: "i1",
            hastaSemana: 2,
            series: { estres: [1, 5] },
        });

        // No bloquea: devuelve el resultado del respaldo determinista.
        expect(espiaRespaldo).toHaveBeenCalledTimes(1);
        expect(resultado).toEqual([{ dimension: "estres", direccion: "sube", magnitud: 4 }]);
        expect(incidentes).toHaveLength(1);
        expect(incidentes[0]).toMatchObject({ operacion: "tendencias", causa: "error" });
    });

    it("clasifica el incidente como 'vram' cuando el error es por exceso de VRAM (Req. 31.5)", async () => {
        const incidentes: IncidenteDegradacion[] = [];
        const ml = new CapaMLConDegradacion({
            primaria: capaQueFalla(new Error("CUDA out of memory: VRAM exceeded")),
            registrar: (i) => incidentes.push(i),
        });

        await ml.embeddings(["x"]);

        expect(incidentes[0].causa).toBe("vram");
    });

    it("no propaga el fallo de la primaria al consumidor en ninguna operacion", async () => {
        const ml = new CapaMLConDegradacion({
            primaria: capaQueFalla(new Error("falla generica")),
            registrar: () => { },
        });

        await expect(ml.embeddings(["a"])).resolves.toBeDefined();
        await expect(ml.clustering([[1, 0]])).resolves.toBeDefined();
        await expect(ml.anomalias([[1], [1]])).resolves.toBeDefined();
        await expect(
            ml.tendencias({ analisisId: "a", institucionId: "i", hastaSemana: 1 })
        ).resolves.toBeDefined();
        await expect(ml.scoreRiesgoCalibrado(entrada([0.5]))).resolves.toBeDefined();
        await expect(ml.calibrar({ analisisId: "a", numeroSemanas: 3 })).resolves.toBeDefined();
    });
});

describe("CapaMLConDegradacion mantiene el score acotado a [0,1]", () => {
    it("acota el score aunque la primaria devuelva un valor fuera de rango (Req. 31.2, 31.7)", async () => {
        const primariaFueraDeRango = new CapaMLBase();
        primariaFueraDeRango.scoreRiesgoCalibrado = async (e) => ({ score: 42, evidenciaIds: e.evidenciaIds });
        const ml = new CapaMLConDegradacion({ primaria: primariaFueraDeRango, registrar: () => { } });

        const r = await ml.scoreRiesgoCalibrado(entrada([0.5]));
        expect(r.score).toBe(1);
        expect(r.evidenciaIds).toEqual(["ev-1"]);
    });

    it("acota un score negativo de la primaria a 0", async () => {
        const primariaNegativa = new CapaMLBase();
        primariaNegativa.scoreRiesgoCalibrado = async (e) => ({ score: -3, evidenciaIds: e.evidenciaIds });
        const ml = new CapaMLConDegradacion({ primaria: primariaNegativa, registrar: () => { } });

        expect((await ml.scoreRiesgoCalibrado(entrada([0.5]))).score).toBe(0);
    });

    it("el score degradado por error tambien queda en [0,1]", async () => {
        const ml = new CapaMLConDegradacion({
            primaria: capaQueFalla(new Error("boom")),
            registrar: () => { },
        });
        const r = await ml.scoreRiesgoCalibrado(entrada([50, 80]));
        expect(r.score).toBe(1);
    });
});
