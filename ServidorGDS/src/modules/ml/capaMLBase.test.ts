/**
 * Pruebas unitarias de la implementacion base/heuristica de la `Capa_ML`.
 * Pruebas en Jest (sin vitest).
 * _Requirements: 31.1, 31.2, 31.3, 31.7_
 */
import { CapaMLBase, capaMLBase, clamp01 } from "./capaMLBase";
import type { EntradaIndice, EvolucionTemporal } from "./capaML";

describe("clamp01", () => {
    it("restringe valores fuera de rango a [0,1]", () => {
        expect(clamp01(-5)).toBe(0);
        expect(clamp01(0)).toBe(0);
        expect(clamp01(0.42)).toBe(0.42);
        expect(clamp01(1)).toBe(1);
        expect(clamp01(7.3)).toBe(1);
    });

    it("trata NaN como 0", () => {
        expect(clamp01(Number.NaN)).toBe(0);
    });
});

describe("CapaMLBase.embeddings", () => {
    it("produce un vector por texto con dimension fija", async () => {
        const ml = new CapaMLBase();
        const out = await ml.embeddings(["hola", "comunidad educativa"]);
        expect(out).toHaveLength(2);
        expect(out[0]).toHaveLength(16);
        expect(out[1]).toHaveLength(16);
    });

    it("es determinista: misma entrada -> misma salida", async () => {
        const ml = new CapaMLBase();
        const a = await ml.embeddings(["paro universitario"]);
        const b = await ml.embeddings(["paro universitario"]);
        expect(a).toEqual(b);
    });

    it("normaliza a norma ~1 para texto no vacio y produce vector cero para texto vacio", async () => {
        const ml = new CapaMLBase();
        const [vec, vacio] = await ml.embeddings(["estres academico", ""]);
        const norma = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
        expect(norma).toBeCloseTo(1, 6);
        expect(vacio.every((x) => x === 0)).toBe(true);
    });
});

describe("CapaMLBase.clustering", () => {
    it("agrupa vectores identicos en un mismo cluster y separa los distintos", async () => {
        const ml = new CapaMLBase();
        const e = await ml.embeddings(["tema academico", "tema academico", "deporte zzz"]);
        const clusters = await ml.clustering(e);
        // Los dos primeros (identicos) caen juntos; el tercero se separa.
        const cluster0 = clusters.find((c) => c.miembros.includes("0"));
        expect(cluster0?.miembros).toEqual(expect.arrayContaining(["0", "1"]));
        expect(cluster0?.miembros).not.toContain("2");
    });

    it("devuelve clusters con etiqueta e id coherentes", async () => {
        const ml = new CapaMLBase();
        const clusters = await ml.clustering([
            [1, 0, 0],
            [0, 1, 0],
        ]);
        clusters.forEach((c, i) => {
            expect(c.clusterId).toBe(i);
            expect(c.etiqueta).toBe(`cluster-${i}`);
        });
    });
});

describe("CapaMLBase.anomalias", () => {
    it("marca el punto que se desvia fuertemente del patron acumulado", async () => {
        const ml = new CapaMLBase();
        const serie = [[1], [1], [1], [1], [100]];
        const anomalias = await ml.anomalias(serie);
        expect(anomalias.map((a) => a.refId)).toContain("4");
        expect(anomalias[0].score).toBeGreaterThanOrEqual(2);
    });

    it("no reporta anomalias en una serie constante o demasiado corta", async () => {
        const ml = new CapaMLBase();
        expect(await ml.anomalias([[5], [5], [5]])).toEqual([]);
        expect(await ml.anomalias([[1]])).toEqual([]);
    });
});

describe("CapaMLBase.tendencias", () => {
    it("deriva direccion y magnitud por dimension desde las series", async () => {
        const ml = new CapaMLBase();
        const evolucion: EvolucionTemporal = {
            analisisId: "a1",
            institucionId: "i1",
            hastaSemana: 3,
            series: {
                estres: [10, 20, 30],
                conflicto: [30, 20, 10],
                aislamiento: [5, 5, 5],
            },
        };
        const t = await ml.tendencias(evolucion);
        const porDim = Object.fromEntries(t.map((x) => [x.dimension, x]));
        expect(porDim.estres.direccion).toBe("sube");
        expect(porDim.estres.magnitud).toBe(20);
        expect(porDim.conflicto.direccion).toBe("baja");
        expect(porDim.aislamiento.direccion).toBe("estable");
        expect(porDim.aislamiento.magnitud).toBe(0);
    });

    it("acepta una evolucion sin series (cero tendencias)", async () => {
        const ml = new CapaMLBase();
        const evolucion: EvolucionTemporal = { analisisId: "a", institucionId: "i", hastaSemana: 1 };
        expect(await ml.tendencias(evolucion)).toEqual([]);
    });
});

describe("CapaMLBase.scoreRiesgoCalibrado", () => {
    const entrada = (senales: number[]): EntradaIndice => ({
        comunidadId: "c1",
        numeroSemana: 1,
        senales,
        evidenciaIds: ["ev-1", "ev-2"],
    });

    it("devuelve un score dentro de [0,1] y conserva las evidencias (Req. 31.7)", async () => {
        const ml = new CapaMLBase();
        const r = await ml.scoreRiesgoCalibrado(entrada([0.2, 0.4, 0.6]));
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
        expect(r.evidenciaIds).toEqual(["ev-1", "ev-2"]);
    });

    it("acota a [0,1] aunque las senales esten fuera de rango (Req. 31.2)", async () => {
        const ml = new CapaMLBase();
        expect((await ml.scoreRiesgoCalibrado(entrada([50, 80, 100]))).score).toBe(1);
        expect((await ml.scoreRiesgoCalibrado(entrada([-10, -20]))).score).toBe(0);
    });

    it("score 0 cuando no hay senales", async () => {
        const ml = new CapaMLBase();
        expect((await ml.scoreRiesgoCalibrado(entrada([]))).score).toBe(0);
    });
});

describe("CapaMLBase.calibrar", () => {
    it("incrementa la version y reporta metricas del corpus (Req. 31.3)", async () => {
        const ml = new CapaMLBase();
        const r1 = await ml.calibrar({ analisisId: "a1", numeroSemanas: 4 });
        const r2 = await ml.calibrar({ analisisId: "a1", numeroSemanas: 12 });
        expect(r1.version).toBe("base-v1");
        expect(r2.version).toBe("base-v2");
        expect(r1.metricas.corpusSemanas).toBe(4);
        expect(r2.metricas.corpusSemanas).toBe(12);
        expect(r2.metricas.factorCalibracion).toBeGreaterThan(0);
    });

    it("la calibracion mantiene el score dentro de [0,1]", async () => {
        const ml = new CapaMLBase();
        await ml.calibrar({ analisisId: "a1", numeroSemanas: 100 });
        const r = await ml.scoreRiesgoCalibrado({
            comunidadId: "c1",
            numeroSemana: 1,
            senales: [0.9, 0.95],
            evidenciaIds: [],
        });
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
    });
});

describe("instancia exportada", () => {
    it("capaMLBase implementa la interfaz CapaML", async () => {
        expect(typeof capaMLBase.embeddings).toBe("function");
        expect(typeof capaMLBase.scoreRiesgoCalibrado).toBe("function");
        expect(typeof capaMLBase.calibrar).toBe("function");
    });
});
