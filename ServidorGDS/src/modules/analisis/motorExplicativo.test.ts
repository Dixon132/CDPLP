/**
 * Pruebas unitarias del `Motor_Explicativo` (Req. 16.4, 17.3, 20.1-20.4).
 *
 * Cubren:
 *  - estructura NL completa (que/por que/cuando empezo/como evoluciono) (Req. 20.1);
 *  - evidencia cuantificable (conteos + variacion %) (Req. 20.2);
 *  - bloqueo de conclusiones sin evidencia referenciable (Req. 20.3);
 *  - referencia trazable a las evidencias que la sustentan (Req. 20.4, 30.1);
 *  - explicacion solo ante variacion y a nivel colectivo (Req. 17.3, 20.5).
 *
 * Runner: Jest + ts-jest (globals describe/it/expect, sin imports).
 * _Requirements: 16.4, 17.3, 20.1, 20.2, 20.3, 20.4_
 */
import type { DimensionRiesgo } from "./indiceRiesgo";
import {
    ConclusionSinEvidenciaError,
    calcularEvidenciaCuantificable,
    construirExplicacion,
    normalizarEvidenciaIds,
    ServicioMotorExplicativo,
    servicioMotorExplicativo,
    tieneEvidenciaReferenciable,
} from "./motorExplicativo";

function dim(overrides: Partial<DimensionRiesgo> = {}): DimensionRiesgo {
    return {
        clave: "estresAcademico",
        nombre: "Estres academico",
        valor: 80,
        minimo: 0,
        maximo: 100,
        scoreCalibradoMl: 0.8,
        ...overrides,
    };
}

describe("normalizarEvidenciaIds", () => {
    it("descarta vacios/blancos y elimina duplicados conservando orden", () => {
        expect(normalizarEvidenciaIds(["e1", "  ", "e2", "e1", " e3 "])).toEqual([
            "e1",
            "e2",
            "e3",
        ]);
    });

    it("devuelve lista vacia cuando no hay ids referenciables", () => {
        expect(normalizarEvidenciaIds(["", "   "])).toEqual([]);
        expect(tieneEvidenciaReferenciable(["", "  "])).toBe(false);
        expect(tieneEvidenciaReferenciable(["e1"])).toBe(true);
    });
});

describe("calcularEvidenciaCuantificable (Req. 20.2)", () => {
    it("calcula delta y variacion % respecto al valor anterior", () => {
        const ev = calcularEvidenciaCuantificable(
            dim({ valor: 80 }),
            dim({ valor: 50 }),
            { conteoPublicaciones: 12, conteoComentarios: 34 },
        );
        expect(ev.delta).toBe(30);
        expect(ev.variacionPct).toBe(60); // 30 / 50 * 100
        expect(ev.conteoPublicaciones).toBe(12);
        expect(ev.conteoComentarios).toBe(34);
    });

    it("sin periodo anterior reporta delta y variacion 0 (linea base)", () => {
        const ev = calcularEvidenciaCuantificable(dim({ valor: 40 }), null, {
            conteoPublicaciones: 5,
        });
        expect(ev.delta).toBe(0);
        expect(ev.variacionPct).toBe(0);
        expect(ev.conteoPublicaciones).toBe(5);
        expect(ev.conteoComentarios).toBe(0);
    });

    it("evita division por cero usando la amplitud del rango cuando el anterior es 0", () => {
        const ev = calcularEvidenciaCuantificable(
            dim({ valor: 25, minimo: 0, maximo: 100 }),
            dim({ valor: 0, minimo: 0, maximo: 100 }),
        );
        expect(Number.isFinite(ev.variacionPct)).toBe(true);
        expect(ev.delta).toBe(25);
        expect(ev.variacionPct).toBe(25); // 25 / 100 * 100
    });

    it("normaliza conteos negativos/fraccionarios a enteros no negativos", () => {
        const ev = calcularEvidenciaCuantificable(dim(), dim({ valor: 70 }), {
            conteoPublicaciones: -3,
            conteoComentarios: 4.9,
        });
        expect(ev.conteoPublicaciones).toBe(0);
        expect(ev.conteoComentarios).toBe(4);
    });
});

describe("construirExplicacion - estructura NL completa (Req. 20.1)", () => {
    it("incluye que / por que / cuando empezo / como evoluciono", () => {
        const exp = construirExplicacion(dim({ valor: 82 }), dim({ valor: 60 }), ["e1", "e2"], {
            causas: ["evento:examenes_finales", "tema:estres"],
            semanaInicio: 3,
            semanaActual: 5,
            serie: [60, 70, 82],
            conteoPublicaciones: 10,
            conteoComentarios: 20,
        });

        expect(exp.que).toContain("Estres academico");
        expect(exp.que.length).toBeGreaterThan(0);
        expect(exp.porQue).toContain("examenes_finales");
        expect(exp.cuandoEmpezo).toContain("semana 3");
        expect(exp.comoEvoluciono).toContain("3 semanas");
        // El texto NL completo concatena los cuatro componentes.
        expect(exp.textoNL).toContain(exp.que);
        expect(exp.textoNL).toContain(exp.porQue);
        expect(exp.textoNL).toContain(exp.cuandoEmpezo);
        expect(exp.textoNL).toContain(exp.comoEvoluciono);
    });

    it("refleja la direccion y referencia la evidencia trazable (Req. 20.4)", () => {
        const sube = construirExplicacion(dim({ valor: 90 }), dim({ valor: 50 }), ["e1"]);
        expect(sube.direccion).toBe("sube");
        expect(sube.evidenciaIds).toEqual(["e1"]);

        const baja = construirExplicacion(dim({ valor: 20 }), dim({ valor: 50 }), ["e1", "e1"]);
        expect(baja.direccion).toBe("baja");
        // Deduplica los ids de evidencia.
        expect(baja.evidenciaIds).toEqual(["e1"]);
    });

    it("trata la primera medicion como linea base sin variacion previa", () => {
        const exp = construirExplicacion(dim({ valor: 40 }), null, ["e1"]);
        expect(exp.direccion).toBe("estable");
        expect(exp.cuandoEmpezo).toContain("primera medicion");
        expect(exp.evidencia.variacionPct).toBe(0);
    });

    it("describe ausencia de causa detonante cuando no se proveen causas (Req. 16.3)", () => {
        const exp = construirExplicacion(dim({ valor: 70 }), dim({ valor: 60 }), ["e1"]);
        expect(exp.porQue.toLowerCase()).toContain("no se identifico");
    });
});

describe("bloqueo de conclusiones sin evidencia (Req. 20.3)", () => {
    it("lanza ConclusionSinEvidenciaError cuando no hay ids referenciables", () => {
        expect(() => construirExplicacion(dim(), dim({ valor: 50 }), [])).toThrow(
            ConclusionSinEvidenciaError,
        );
        expect(() => construirExplicacion(dim(), dim({ valor: 50 }), ["", "  "])).toThrow(
            ConclusionSinEvidenciaError,
        );
    });

    it("el error identifica la dimension bloqueada", () => {
        try {
            construirExplicacion(dim({ clave: "bullying" }), null, []);
            throw new Error("deberia haber lanzado");
        } catch (e) {
            expect(e).toBeInstanceOf(ConclusionSinEvidenciaError);
            expect((e as ConclusionSinEvidenciaError).dimension).toBe("bullying");
        }
    });
});

describe("ServicioMotorExplicativo", () => {
    it("explicar delega en la logica pura y exige evidencia", () => {
        const exp = servicioMotorExplicativo.explicar(dim({ valor: 82 }), dim({ valor: 60 }), [
            "e1",
        ]);
        expect(exp.dimension).toBe("estresAcademico");
        expect(exp.evidenciaIds).toEqual(["e1"]);
        expect(() => servicioMotorExplicativo.explicar(dim(), null, [])).toThrow(
            ConclusionSinEvidenciaError,
        );
    });

    it("explicarVariaciones solo explica dimensiones que varian y con evidencia (Req. 17.3, 20.3)", () => {
        const motor = new ServicioMotorExplicativo();
        const actuales: DimensionRiesgo[] = [
            dim({ clave: "estresAcademico", valor: 80 }), // varia y con evidencia -> explicada
            dim({ clave: "ansiedadColectiva", valor: 50 }), // estable -> omitida
            dim({ clave: "bullying", valor: 30 }), // varia pero sin evidencia -> omitida
        ];
        const anteriores: Record<string, DimensionRiesgo> = {
            estresAcademico: dim({ clave: "estresAcademico", valor: 50 }),
            ansiedadColectiva: dim({ clave: "ansiedadColectiva", valor: 50 }),
            bullying: dim({ clave: "bullying", valor: 10 }),
        };
        const evidencia = {
            estresAcademico: ["e1", "e2"],
            ansiedadColectiva: ["e3"],
            bullying: [],
        };

        const explicaciones = motor.explicarVariaciones(actuales, anteriores, evidencia, {
            estresAcademico: { conteoPublicaciones: 8, conteoComentarios: 15 },
        });

        expect(explicaciones).toHaveLength(1);
        expect(explicaciones[0].dimension).toBe("estresAcademico");
        expect(explicaciones[0].evidencia.conteoPublicaciones).toBe(8);
        expect(explicaciones[0].evidenciaIds).toEqual(["e1", "e2"]);
    });

    it("en la primera semana (sin anteriores) explica toda dimension con evidencia", () => {
        const motor = new ServicioMotorExplicativo();
        const explicaciones = motor.explicarVariaciones(
            [dim({ clave: "aislamiento", valor: 12 })],
            null,
            { aislamiento: ["e9"] },
        );
        expect(explicaciones).toHaveLength(1);
        expect(explicaciones[0].cuandoEmpezo).toContain("primera medicion");
    });
});
