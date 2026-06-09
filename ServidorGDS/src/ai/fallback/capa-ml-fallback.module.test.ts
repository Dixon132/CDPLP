/**
 * Pruebas de cableado DI del submodulo de FALLBACK de la `Capa_ML`
 * (Req. 31.1, 31.6, 35.3).
 *
 * Verifican que:
 * - el token estable `CAPA_ML` resuelve a la implementacion fallback
 *   determinista registrada (`CapaMlFallback`);
 * - la implementacion cumple la INTERFAZ ESTABLE `CapaML` (firmas de metodo del
 *   contrato HTTP del `Servicio_IA`: embeddings/clustering/anomalias/tendencias/
 *   score-calibrado/calibrar), garantizando que fallback y cliente HTTP son
 *   intercambiables (Req. 31.6);
 * - el comportamiento determinista del trabajo previo se conserva y el score
 *   queda acotado a `[0,1]` (Req. 31.2, 31.7).
 *
 * Pruebas en Jest (sin vitest).
 *
 * _Requirements: 31.1, 31.6, 35.3_
 */
import { Test, type TestingModule } from "@nestjs/testing";

import type { CapaML, EntradaIndice, EvolucionTemporal } from "../../modules/ml/capaML";
import { CAPA_ML } from "../interfaces/tokens";
import { CapaMlFallbackModule } from "./capa-ml-fallback.module";
import { CapaMlFallback } from "./capa-ml.fallback";

const entrada = (senales: number[]): EntradaIndice => ({
    comunidadId: "c1",
    numeroSemana: 1,
    senales,
    evidenciaIds: ["ev-1", "ev-2"],
});

describe("CapaMlFallbackModule - cableado DI (Req. 31.1, 31.6, 35.3)", () => {
    let moduleRef: TestingModule;

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            imports: [CapaMlFallbackModule],
        }).compile();
    });

    it("resuelve CAPA_ML a la implementacion fallback determinista", () => {
        const capa = moduleRef.get<CapaMlFallback>(CAPA_ML);
        expect(capa).toBeInstanceOf(CapaMlFallback);
    });

    it("el fallback cumple la interfaz estable CapaML (todas las firmas)", () => {
        const capa = moduleRef.get<CapaML>(CAPA_ML);
        expect(typeof capa.embeddings).toBe("function");
        expect(typeof capa.clustering).toBe("function");
        expect(typeof capa.anomalias).toBe("function");
        expect(typeof capa.tendencias).toBe("function");
        expect(typeof capa.scoreRiesgoCalibrado).toBe("function");
        expect(typeof capa.calibrar).toBe("function");
    });

    it("los embeddings son deterministas: misma entrada -> misma salida (Req. 31.6)", async () => {
        const capa = moduleRef.get<CapaML>(CAPA_ML);
        const a = await capa.embeddings(["paro universitario"]);
        const b = await capa.embeddings(["paro universitario"]);
        expect(a).toEqual(b);
    });

    it("el clustering, anomalias y tendencias derivan resultados colectivos estables", async () => {
        const capa = moduleRef.get<CapaML>(CAPA_ML);
        const vectores = await capa.embeddings(["tema academico", "tema academico", "deporte zzz"]);
        const clusters = await capa.clustering(vectores);
        const cluster0 = clusters.find((c) => c.miembros.includes("0"));
        expect(cluster0?.miembros).toEqual(expect.arrayContaining(["0", "1"]));

        const anomalias = await capa.anomalias([[1], [1], [1], [1], [100]]);
        expect(anomalias.map((x) => x.refId)).toContain("4");

        const evolucion: EvolucionTemporal = {
            analisisId: "a1",
            institucionId: "i1",
            hastaSemana: 3,
            series: { estres: [10, 20, 30] },
        };
        const tendencias = await capa.tendencias(evolucion);
        expect(tendencias.find((t) => t.dimension === "estres")?.direccion).toBe("sube");
    });

    it("el score calibrado queda acotado a [0,1] y conserva la evidencia (Req. 31.2, 31.7)", async () => {
        const capa = moduleRef.get<CapaML>(CAPA_ML);
        expect((await capa.scoreRiesgoCalibrado(entrada([50, 80, 100]))).score).toBe(1);
        expect((await capa.scoreRiesgoCalibrado(entrada([-10, -20]))).score).toBe(0);
        const r = await capa.scoreRiesgoCalibrado(entrada([0.2, 0.4, 0.6]));
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
        expect(r.evidenciaIds).toEqual(["ev-1", "ev-2"]);
    });
});
