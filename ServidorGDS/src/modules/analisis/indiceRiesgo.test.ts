/**
 * Pruebas unitarias del nucleo PURO del `Indice_Riesgo` multidimensional (Req. 17).
 *
 * Cubren el invariante de rango por dimension (Req. 17.1, 17.2), la
 * independencia entre dimensiones (Req. 17.2), la configurabilidad de
 * dimensiones adicionales sin alterar las existentes (Req. 17.5), la
 * integracion del `score_calibrado_ml` (Req. 31.2) y la naturaleza
 * exclusivamente colectiva de la salida (Req. 17.4, 17.6). La verificacion
 * universal por propiedades vive en las tareas 13.4 (Property 16) y 13.5
 * (Property 17). La integracion del `score_calibrado_ml` con la `Capa_ML`
 * (Req. 31.2) se cubre con un doble determinista.
 * _Requirements: 17.1, 17.2, 17.4, 17.5, 17.6, 31.2_
 */
import {
    calcularDimensiones,
    clampRango,
    DIMENSIONES_POR_DEFECTO,
    entradaMlPorDimension,
    RANGO_POR_DEFECTO,
    resolverScoresCalibradosMl,
    ServicioIndiceRiesgo,
    servicioIndiceRiesgo,
    type DefinicionDimension,
    type EntradaIndice,
} from "./indiceRiesgo";
import type { CapaML, EntradaIndice as EntradaIndiceMl, ScoreCalibrado } from "../ml";

function entradaBase(overrides: Partial<EntradaIndice> = {}): EntradaIndice {
    return {
        comunidadId: "com-1",
        numeroSemana: 1,
        senales: {},
        ...overrides,
    };
}

describe("clampRango", () => {
    it("conserva valores dentro de [minimo, maximo]", () => {
        expect(clampRango(50, 0, 100)).toBe(50);
        expect(clampRango(0, 0, 100)).toBe(0);
        expect(clampRango(100, 0, 100)).toBe(100);
    });

    it("acota por debajo del minimo y por encima del maximo", () => {
        expect(clampRango(-10, 0, 100)).toBe(0);
        expect(clampRango(150, 0, 100)).toBe(100);
    });

    it("trata cualquier valor no finito como el minimo efectivo", () => {
        expect(clampRango(Number.NaN, 5, 100)).toBe(5);
        expect(clampRango(Number.POSITIVE_INFINITY, 5, 100)).toBe(5);
        expect(clampRango(Number.NEGATIVE_INFINITY, 5, 100)).toBe(5);
    });

    it("normaliza rangos invertidos (minimo > maximo)", () => {
        expect(clampRango(50, 100, 0)).toBe(50);
        expect(clampRango(-10, 100, 0)).toBe(0);
        expect(clampRango(150, 100, 0)).toBe(100);
    });
});

describe("calcularDimensiones - dimensiones por defecto (Req. 17.1)", () => {
    it("expone al menos las dimensiones requeridas por el Req. 17.1", () => {
        const claves = DIMENSIONES_POR_DEFECTO.map((d) => d.clave);
        for (const requerida of [
            "estresAcademico",
            "ansiedadColectiva",
            "conflictoSocial",
            "bullying",
            "aislamiento",
            "agotamiento",
            "violenciaVerbal",
        ]) {
            expect(claves).toContain(requerida);
        }
    });

    it("produce una DimensionRiesgo por definicion, en el mismo orden", () => {
        const dims = calcularDimensiones(entradaBase());
        expect(dims).toHaveLength(DIMENSIONES_POR_DEFECTO.length);
        expect(dims.map((d) => d.clave)).toEqual(
            DIMENSIONES_POR_DEFECTO.map((d) => d.clave),
        );
    });

    it("trata las senales ausentes como el minimo de la dimension", () => {
        const dims = calcularDimensiones(entradaBase());
        for (const dim of dims) {
            expect(dim.valor).toBe(RANGO_POR_DEFECTO.minimo);
        }
    });
});

describe("calcularDimensiones - invariante de rango (Req. 17.1, 17.2)", () => {
    it("acota cada valor dentro de su [minimo, maximo] aunque la senal exceda el rango", () => {
        const entrada = entradaBase({
            senales: {
                estresAcademico: 500,
                ansiedadColectiva: -200,
                conflictoSocial: 42,
            },
        });
        const dims = calcularDimensiones(entrada);
        for (const dim of dims) {
            expect(dim.valor).toBeGreaterThanOrEqual(dim.minimo);
            expect(dim.valor).toBeLessThanOrEqual(dim.maximo);
        }
        const porClave = Object.fromEntries(dims.map((d) => [d.clave, d.valor]));
        expect(porClave.estresAcademico).toBe(100);
        expect(porClave.ansiedadColectiva).toBe(0);
        expect(porClave.conflictoSocial).toBe(42);
    });

    it("respeta rangos personalizados por dimension", () => {
        const dimensiones: DefinicionDimension[] = [
            { clave: "x", nombre: "X", minimo: 10, maximo: 20 },
        ];
        const dims = calcularDimensiones(
            entradaBase({ senales: { x: 5 } }),
            dimensiones,
        );
        expect(dims[0].valor).toBe(10);
        expect(dims[0].minimo).toBe(10);
        expect(dims[0].maximo).toBe(20);
    });
});

describe("calcularDimensiones - independencia entre dimensiones (Req. 17.2)", () => {
    it("perturbar la senal de una dimension no altera el valor de las demas", () => {
        const base = entradaBase({
            senales: { estresAcademico: 30, ansiedadColectiva: 40, conflictoSocial: 50 },
        });
        const dimsBase = calcularDimensiones(base);

        const perturbada = entradaBase({
            senales: { estresAcademico: 90, ansiedadColectiva: 40, conflictoSocial: 50 },
        });
        const dimsPerturbada = calcularDimensiones(perturbada);

        const valorBase = Object.fromEntries(dimsBase.map((d) => [d.clave, d.valor]));
        const valorPert = Object.fromEntries(dimsPerturbada.map((d) => [d.clave, d.valor]));

        // Solo cambia la dimension perturbada; el resto permanece identico.
        expect(valorPert.estresAcademico).toBe(90);
        expect(valorBase.estresAcademico).toBe(30);
        for (const clave of Object.keys(valorBase)) {
            if (clave !== "estresAcademico") {
                expect(valorPert[clave]).toBe(valorBase[clave]);
            }
        }
    });
});

describe("calcularDimensiones - configurabilidad (Req. 17.5)", () => {
    it("agregar una dimension adicional no modifica los valores de las existentes", () => {
        const entrada = entradaBase({
            senales: { estresAcademico: 30, ansiedadColectiva: 40, nuevaDimension: 70 },
        });

        const sinExtra = calcularDimensiones(entrada, [
            { clave: "estresAcademico", nombre: "Estres", minimo: 0, maximo: 100 },
            { clave: "ansiedadColectiva", nombre: "Ansiedad", minimo: 0, maximo: 100 },
        ]);
        const conExtra = calcularDimensiones(entrada, [
            { clave: "estresAcademico", nombre: "Estres", minimo: 0, maximo: 100 },
            { clave: "ansiedadColectiva", nombre: "Ansiedad", minimo: 0, maximo: 100 },
            { clave: "nuevaDimension", nombre: "Nueva", minimo: 0, maximo: 100 },
        ]);

        const existentesSin = sinExtra.map((d) => ({ clave: d.clave, valor: d.valor }));
        const existentesCon = conExtra
            .filter((d) => d.clave !== "nuevaDimension")
            .map((d) => ({ clave: d.clave, valor: d.valor }));

        expect(existentesCon).toEqual(existentesSin);
        // La nueva dimension se calcula y agrega sin afectar a las demas.
        expect(conExtra).toHaveLength(3);
        expect(conExtra[2].clave).toBe("nuevaDimension");
        expect(conExtra[2].valor).toBe(70);
    });
});

describe("calcularDimensiones - integracion del score_calibrado_ml (Req. 31.2)", () => {
    it("integra el score calibrado por clave, acotado a [0,1]", () => {
        const entrada = entradaBase({
            senales: { estresAcademico: 80 },
            scoresCalibradosMl: { estresAcademico: 0.73 },
        });
        const dims = calcularDimensiones(entrada, [
            { clave: "estresAcademico", nombre: "Estres", minimo: 0, maximo: 100 },
        ]);
        expect(dims[0].scoreCalibradoMl).toBeCloseTo(0.73, 12);
    });

    it("usa 0 cuando no hay score ML para la dimension", () => {
        const dims = calcularDimensiones(entradaBase({ senales: { estresAcademico: 80 } }), [
            { clave: "estresAcademico", nombre: "Estres", minimo: 0, maximo: 100 },
        ]);
        expect(dims[0].scoreCalibradoMl).toBe(0);
    });

    it("acota scores ML fuera de rango o no finitos a [0,1]", () => {
        const entrada = entradaBase({
            senales: { a: 1, b: 1, c: 1 },
            scoresCalibradosMl: { a: 5, b: -3, c: Number.NaN },
        });
        const dims = calcularDimensiones(entrada, [
            { clave: "a", nombre: "A", minimo: 0, maximo: 100 },
            { clave: "b", nombre: "B", minimo: 0, maximo: 100 },
            { clave: "c", nombre: "C", minimo: 0, maximo: 100 },
        ]);
        expect(dims[0].scoreCalibradoMl).toBe(1);
        expect(dims[1].scoreCalibradoMl).toBe(0);
        expect(dims[2].scoreCalibradoMl).toBe(0);
    });
});

describe("calcularDimensiones - exposicion exclusivamente colectiva (Req. 17.4, 17.6)", () => {
    it("cada resultado solo expone campos colectivos de dimension, sin datos individuales", () => {
        const dims = calcularDimensiones(
            entradaBase({ senales: { estresAcademico: 50 } }),
        );
        const clavesPermitidas = ["clave", "nombre", "valor", "minimo", "maximo", "scoreCalibradoMl"];
        for (const dim of dims) {
            expect(Object.keys(dim).sort()).toEqual([...clavesPermitidas].sort());
            // No se filtra ninguna referencia a usuario individual.
            const serializado = JSON.stringify(dim).toLowerCase();
            expect(serializado).not.toContain("usuario");
            expect(serializado).not.toContain("userid");
        }
    });
});

describe("calcularDimensiones - pureza", () => {
    it("no muta la entrada ni las definiciones", () => {
        const entrada = entradaBase({
            senales: Object.freeze({ estresAcademico: 30 }),
            scoresCalibradosMl: Object.freeze({ estresAcademico: 0.5 }),
        });
        const dimensiones = Object.freeze([
            Object.freeze({ clave: "estresAcademico", nombre: "Estres", minimo: 0, maximo: 100 }),
        ]) as DefinicionDimension[];
        // Si mutara entradas congeladas, lanzaria en modo estricto.
        expect(() => calcularDimensiones(entrada, dimensiones)).not.toThrow();
    });

    it("es determinista: misma entrada produce misma salida", () => {
        const entrada = entradaBase({ senales: { estresAcademico: 33, ansiedadColectiva: 66 } });
        expect(calcularDimensiones(entrada)).toEqual(calcularDimensiones(entrada));
    });
});

describe("ServicioIndiceRiesgo", () => {
    it("delega en la funcion pura y usa las dimensiones por defecto", () => {
        const servicio = new ServicioIndiceRiesgo();
        const entrada = entradaBase({ senales: { estresAcademico: 25 } });
        expect(servicio.calcular(entrada)).toEqual(calcularDimensiones(entrada));
    });

    it("expone una instancia reutilizable", () => {
        const entrada = entradaBase({ senales: { bullying: 12 } });
        expect(servicioIndiceRiesgo.calcular(entrada)).toEqual(calcularDimensiones(entrada));
    });
});

/**
 * Doble determinista de la `Capa_ML` (Req. 31.2): registra las entradas
 * recibidas y devuelve un `score` derivado de forma fija de las senales, sin
 * red ni GPU. Permite verificar la integracion sin acoplarse a una
 * implementacion concreta del `Servicio_IA`.
 */
function capaMlDoble(
    mapScore: (entrada: EntradaIndiceMl) => number = (e) => (e.senales[0] ?? 0) / 100,
): CapaML & { llamadas: EntradaIndiceMl[] } {
    const llamadas: EntradaIndiceMl[] = [];
    return {
        llamadas,
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
        async scoreRiesgoCalibrado(entrada: EntradaIndiceMl): Promise<ScoreCalibrado> {
            llamadas.push(entrada);
            return { score: mapScore(entrada), evidenciaIds: [...entrada.evidenciaIds] };
        },
        async calibrar() {
            return { version: "doble", metricas: {} };
        },
    };
}

describe("entradaMlPorDimension - construccion colectiva de la entrada ML (Req. 31.2, 17.6)", () => {
    it("usa la senal de la dimension y conserva comunidad/semana y evidencias", () => {
        const entrada = entradaBase({
            comunidadId: "com-9",
            numeroSemana: 4,
            senales: { estresAcademico: 42 },
            evidenciaIds: ["ev-1", "ev-2"],
        });
        const def: DefinicionDimension = {
            clave: "estresAcademico",
            nombre: "Estres",
            minimo: 0,
            maximo: 100,
        };
        const entradaMl = entradaMlPorDimension(def, entrada);
        expect(entradaMl).toEqual({
            comunidadId: "com-9",
            numeroSemana: 4,
            senales: [42],
            evidenciaIds: ["ev-1", "ev-2"],
        });
    });

    it("produce senales vacias cuando la senal esta ausente o no es finita", () => {
        const def: DefinicionDimension = { clave: "x", nombre: "X", minimo: 0, maximo: 100 };
        expect(entradaMlPorDimension(def, entradaBase()).senales).toEqual([]);
        expect(
            entradaMlPorDimension(def, entradaBase({ senales: { x: Number.NaN } })).senales,
        ).toEqual([]);
    });

    it("no expone identificadores individuales (solo colectivo)", () => {
        const def: DefinicionDimension = { clave: "x", nombre: "X", minimo: 0, maximo: 100 };
        const entradaMl = entradaMlPorDimension(def, entradaBase({ senales: { x: 1 } }));
        const serializado = JSON.stringify(entradaMl).toLowerCase();
        expect(serializado).not.toContain("usuario");
        expect(serializado).not.toContain("userid");
    });
});

describe("resolverScoresCalibradosMl - integracion con la Capa_ML (Req. 31.2)", () => {
    it("consulta la Capa_ML una vez por dimension y mapea clave -> score", async () => {
        const capa = capaMlDoble();
        const entrada = entradaBase({ senales: { a: 50, b: 80 } });
        const dimensiones: DefinicionDimension[] = [
            { clave: "a", nombre: "A", minimo: 0, maximo: 100 },
            { clave: "b", nombre: "B", minimo: 0, maximo: 100 },
        ];
        const scores = await resolverScoresCalibradosMl(entrada, dimensiones, capa);
        expect(scores).toEqual({ a: 0.5, b: 0.8 });
        expect(capa.llamadas).toHaveLength(2);
        expect(capa.llamadas.map((l) => l.senales)).toEqual([[50], [80]]);
    });

    it("acota a [0,1] los scores que la Capa_ML devuelva fuera de rango", async () => {
        const capa = capaMlDoble((e) => (e.senales[0] ?? 0)); // devuelve 5, -3, etc.
        const entrada = entradaBase({ senales: { a: 5, b: -3 } });
        const dimensiones: DefinicionDimension[] = [
            { clave: "a", nombre: "A", minimo: -100, maximo: 100 },
            { clave: "b", nombre: "B", minimo: -100, maximo: 100 },
        ];
        const scores = await resolverScoresCalibradosMl(entrada, dimensiones, capa);
        expect(scores.a).toBe(1);
        expect(scores.b).toBe(0);
    });
});

describe("ServicioIndiceRiesgo.calcularConMl - score_calibrado_ml integrado (Req. 31.2)", () => {
    it("integra el score de la Capa_ML en cada dimension sin alterar el valor", async () => {
        const servicio = new ServicioIndiceRiesgo(capaMlDoble());
        const entrada = entradaBase({ senales: { estresAcademico: 60, ansiedadColectiva: 30 } });
        const dimensiones: DefinicionDimension[] = [
            { clave: "estresAcademico", nombre: "Estres", minimo: 0, maximo: 100 },
            { clave: "ansiedadColectiva", nombre: "Ansiedad", minimo: 0, maximo: 100 },
        ];
        const dims = await servicio.calcularConMl(entrada, dimensiones);
        const porClave = Object.fromEntries(dims.map((d) => [d.clave, d]));
        // El valor de la dimension proviene de la senal (calculo puro)...
        expect(porClave.estresAcademico.valor).toBe(60);
        expect(porClave.ansiedadColectiva.valor).toBe(30);
        // ...y el score_calibrado_ml proviene de la Capa_ML.
        expect(porClave.estresAcademico.scoreCalibradoMl).toBeCloseTo(0.6, 12);
        expect(porClave.ansiedadColectiva.scoreCalibradoMl).toBeCloseTo(0.3, 12);
    });

    it("la Capa_ML inyectada tiene prioridad sobre el score ML precargado en la entrada", async () => {
        const servicio = new ServicioIndiceRiesgo(capaMlDoble());
        const entrada = entradaBase({
            senales: { estresAcademico: 90 },
            scoresCalibradosMl: { estresAcademico: 0.01 },
        });
        const dims = await servicio.calcularConMl(entrada, [
            { clave: "estresAcademico", nombre: "Estres", minimo: 0, maximo: 100 },
        ]);
        expect(dims[0].scoreCalibradoMl).toBeCloseTo(0.9, 12);
    });

    it("degrada con la Capa_ML por defecto (fallback determinista) sin lanzar", async () => {
        const servicio = new ServicioIndiceRiesgo();
        const entrada = entradaBase({ senales: { estresAcademico: 1 } });
        const dims = await servicio.calcularConMl(entrada, [
            { clave: "estresAcademico", nombre: "Estres", minimo: 0, maximo: 100 },
        ]);
        expect(dims).toHaveLength(1);
        expect(dims[0].scoreCalibradoMl).toBeGreaterThanOrEqual(0);
        expect(dims[0].scoreCalibradoMl).toBeLessThanOrEqual(1);
    });

    it("solo expone campos colectivos de dimension (Req. 17.4, 17.6)", async () => {
        const servicio = new ServicioIndiceRiesgo(capaMlDoble());
        const dims = await servicio.calcularConMl(
            entradaBase({ senales: { estresAcademico: 50 }, evidenciaIds: ["ev-1"] }),
            [{ clave: "estresAcademico", nombre: "Estres", minimo: 0, maximo: 100 }],
        );
        const clavesPermitidas = ["clave", "nombre", "valor", "minimo", "maximo", "scoreCalibradoMl"];
        for (const dim of dims) {
            expect(Object.keys(dim).sort()).toEqual([...clavesPermitidas].sort());
        }
    });
});
