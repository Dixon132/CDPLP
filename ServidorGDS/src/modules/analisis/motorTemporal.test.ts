/**
 * Pruebas unitarias del `Motor_Temporal` (etapa `TEMPORAL` del pipeline).
 *
 * Cubren la correlacion de resultados por semanas/meses para detectar la
 * evolucion por `Zona_Geografica` (series por dimension), la derivacion de
 * relaciones evento/tema -> variacion, la aceptacion de CERO relaciones cuando
 * no hay variacion significativa ni causas observadas (Req. 16.2), y la
 * alimentacion del `Detector_Patrones`/`Motor_Explicativo` mediante la
 * `EvolucionTemporal` y la `Zona_Geografica` vigente (Req. 16.3, 33.3).
 *
 * Runner: Jest (`jest --runInBand`); los globals describe/it/expect estan
 * disponibles sin import (`@types/jest`).
 * _Requirements: 16.2, 16.3, 13.1, 33.3_
 */
import type { ZonaGeografica } from "../ml";
import {
    FuenteResultadosEnMemoria,
    MotorTemporalService,
    type ResultadoSemanalTemporal,
    construirSeries,
    correlacionarEvolucion,
    derivarRelaciones,
    dimensionesQueVarian,
    ordenarResultados,
    zonaDeEvolucion,
} from "./motorTemporal";

const zonaA: ZonaGeografica = { latitud: -16.5, longitud: -68.15, radioMetros: 1500 };
const zonaB: ZonaGeografica = { latitud: -17.78, longitud: -63.18, radioMetros: 2000 };

function semana(
    n: number,
    dimensiones: Record<string, number>,
    extra: Partial<ResultadoSemanalTemporal> = {},
): ResultadoSemanalTemporal {
    return { numeroSemana: n, zona: zonaA, dimensiones, ...extra };
}

describe("ordenarResultados", () => {
    it("ordena por numeroSemana creciente y descarta las posteriores a hastaSemana", () => {
        const r = ordenarResultados(
            [semana(3, {}), semana(1, {}), semana(2, {}), semana(5, {})],
            3,
        );
        expect(r.map((x) => x.numeroSemana)).toEqual([1, 2, 3]);
    });

    it("descarta semanas no finitas o <= 0 y deduplica conservando la primera", () => {
        const r = ordenarResultados(
            [
                semana(0, { a: 1 }),
                semana(Number.NaN, { a: 1 }),
                semana(2, { a: 10 }),
                semana(2, { a: 99 }),
            ],
            5,
        );
        expect(r.map((x) => x.numeroSemana)).toEqual([2]);
        expect(r[0].dimensiones.a).toBe(10); // primera aparicion
    });
});

describe("construirSeries", () => {
    it("recoge los valores por dimension en orden cronologico (Req. 16.3)", () => {
        const ordenados = ordenarResultados(
            [
                semana(1, { ansiedad: 10, conflicto: 5 }),
                semana(2, { ansiedad: 20, conflicto: 5 }),
                semana(3, { ansiedad: 35, conflicto: 4 }),
            ],
            3,
        );
        expect(construirSeries(ordenados)).toEqual({
            ansiedad: [10, 20, 35],
            conflicto: [5, 5, 4],
        });
    });

    it("omite valores no finitos y dimensiones ausentes en una semana", () => {
        const ordenados = ordenarResultados(
            [
                semana(1, { ansiedad: 10 }),
                semana(2, { ansiedad: Number.NaN, bullying: 3 }),
                semana(3, { ansiedad: 30, bullying: 7 }),
            ],
            3,
        );
        expect(construirSeries(ordenados)).toEqual({
            ansiedad: [10, 30],
            bullying: [3, 7],
        });
    });
});

describe("dimensionesQueVarian", () => {
    it("detecta variacion significativa con direccion sube/baja", () => {
        const variantes = dimensionesQueVarian({
            ansiedad: [10, 35], // sube
            conflicto: [8, 4], // baja
            bullying: [5, 5], // estable
        });
        expect(variantes).toEqual([
            { dimension: "ansiedad", delta: 25, direccion: "sube" },
            { dimension: "conflicto", delta: -4, direccion: "baja" },
        ]);
    });

    it("ignora series con menos de 2 puntos", () => {
        expect(dimensionesQueVarian({ ansiedad: [10] })).toEqual([]);
    });
});

describe("derivarRelaciones", () => {
    it("relaciona variaciones con eventos del Escenario (prioridad sobre temas)", () => {
        const ordenados = ordenarResultados(
            [
                semana(1, { ansiedad: 10 }, { eventos: ["examenes"], temas: ["tareas"] }),
                semana(2, { ansiedad: 40 }, { eventos: ["examenes"] }),
            ],
            2,
        );
        const series = construirSeries(ordenados);
        const relaciones = derivarRelaciones(ordenados, series);
        expect(relaciones).toHaveLength(1);
        expect(relaciones[0].desde).toBe("evento:examenes");
        expect(relaciones[0].hacia).toBe("dimension:ansiedad");
    });

    it("usa los temas como respaldo cuando no hubo eventos", () => {
        const ordenados = ordenarResultados(
            [
                semana(1, { conflicto: 5 }, { temas: ["peleas"] }),
                semana(2, { conflicto: 20 }, { temas: ["peleas"] }),
            ],
            2,
        );
        const relaciones = derivarRelaciones(ordenados, construirSeries(ordenados));
        expect(relaciones).toHaveLength(1);
        expect(relaciones[0].desde).toBe("tema:peleas");
    });

    it("acepta CERO relaciones cuando no hay variacion significativa (Req. 16.2)", () => {
        const ordenados = ordenarResultados(
            [
                semana(1, { ansiedad: 10 }, { eventos: ["examenes"] }),
                semana(2, { ansiedad: 10 }, { eventos: ["examenes"] }),
            ],
            2,
        );
        expect(derivarRelaciones(ordenados, construirSeries(ordenados))).toEqual([]);
    });

    it("acepta CERO relaciones cuando hay variacion pero no se observan causas (Req. 16.2)", () => {
        const ordenados = ordenarResultados(
            [semana(1, { ansiedad: 10 }), semana(2, { ansiedad: 40 })],
            2,
        );
        expect(derivarRelaciones(ordenados, construirSeries(ordenados))).toEqual([]);
    });
});

describe("correlacionarEvolucion", () => {
    it("produce una EvolucionTemporal con series y relaciones por la ventana", () => {
        const evolucion = correlacionarEvolucion("ana-1", "inst-1", 3, [
            semana(1, { ansiedad: 10 }, { eventos: ["examenes"] }),
            semana(2, { ansiedad: 25 }, { eventos: ["examenes"] }),
            semana(3, { ansiedad: 45 }, { eventos: ["examenes"] }),
        ]);
        expect(evolucion.analisisId).toBe("ana-1");
        expect(evolucion.institucionId).toBe("inst-1");
        expect(evolucion.hastaSemana).toBe(3);
        expect(evolucion.series).toEqual({ ansiedad: [10, 25, 45] });
        expect(evolucion.relaciones).toHaveLength(1);
    });

    it("sin resultados produce una evolucion vacia con cero relaciones (Req. 16.2)", () => {
        const evolucion = correlacionarEvolucion("ana-1", "inst-1", 4, []);
        expect(evolucion.series).toEqual({});
        expect(evolucion.relaciones).toEqual([]);
    });

    it("es determinista: misma entrada produce misma salida", () => {
        const datos = [
            semana(2, { conflicto: 20 }, { temas: ["peleas"] }),
            semana(1, { conflicto: 5 }, { temas: ["peleas"] }),
        ];
        expect(correlacionarEvolucion("a", "i", 2, datos)).toEqual(
            correlacionarEvolucion("a", "i", 2, datos),
        );
    });
});

describe("zonaDeEvolucion", () => {
    it("devuelve la zona de la ultima semana disponible (anclaje vigente)", () => {
        const datos = [
            semana(1, { ansiedad: 1 }),
            { ...semana(2, { ansiedad: 2 }), zona: zonaB },
        ];
        expect(zonaDeEvolucion(datos, 2)).toEqual(zonaB);
    });

    it("devuelve null sin resultados", () => {
        expect(zonaDeEvolucion([], 3)).toBeNull();
    });
});

describe("MotorTemporalService", () => {
    it("lee de la fuente y correlaciona la evolucion (Req. 16.3, 33.3)", async () => {
        const fuente = new FuenteResultadosEnMemoria([
            semana(1, { ansiedad: 10 }, { eventos: ["bullying-incidente"] }),
            semana(2, { ansiedad: 30 }, { eventos: ["bullying-incidente"] }),
        ]);
        const motor = new MotorTemporalService(fuente);

        const evolucion = await motor.correlacionar("ana-1", "inst-1", 2);
        expect(evolucion.series).toEqual({ ansiedad: [10, 30] });
        expect(evolucion.relaciones).toHaveLength(1);
        expect(evolucion.relaciones?.[0].hacia).toBe("dimension:ansiedad");
    });

    it("correlacionarConZona entrega evolucion + zona para el Detector_Patrones", async () => {
        const fuente = new FuenteResultadosEnMemoria([
            semana(1, { conflicto: 5 }),
            { ...semana(2, { conflicto: 5 }), zona: zonaB },
        ]);
        const motor = new MotorTemporalService(fuente);

        const { evolucion, zona } = await motor.correlacionarConZona("ana-1", "inst-1", 2);
        expect(zona).toEqual(zonaB);
        // Sin variacion ni eventos: cero relaciones, pero la serie existe (Req. 16.2).
        expect(evolucion.series).toEqual({ conflicto: [5, 5] });
        expect(evolucion.relaciones).toEqual([]);
    });

    it("respeta hastaSemana al leer la ventana", async () => {
        const fuente = new FuenteResultadosEnMemoria([
            semana(1, { ansiedad: 10 }),
            semana(2, { ansiedad: 20 }),
            semana(3, { ansiedad: 30 }),
        ]);
        const motor = new MotorTemporalService(fuente);

        const evolucion = await motor.correlacionar("ana-1", "inst-1", 2);
        expect(evolucion.series).toEqual({ ansiedad: [10, 20] });
    });
});
