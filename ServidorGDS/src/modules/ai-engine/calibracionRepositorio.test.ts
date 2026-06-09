/**
 * Pruebas unitarias del puerto de persistencia de calibracion (tarea 9.4).
 *
 * Validan los helpers de mapeo puros (`Json` -> dominio) y la logica de
 * `CalibracionRepositorioPrisma` sobre un doble determinista del cliente Prisma
 * (`gds_calibracion`), sin tocar la base de datos: persistencia de `version`,
 * `artefacto_ref` y `metricas`, y recuperacion de la ULTIMA calibracion valida.
 *
 * Pruebas en Jest (sin vitest).
 * _Requirements: 31.3, 36.4_
 */
import {
    aMetricas,
    CalibracionRepositorioPrisma,
    type ClienteCalibracion,
    mapFilaToRegistro,
    semanasDeRegistro,
} from "./calibracionRepositorio";
import { METRICA_CORPUS_SEMANAS, type RegistroCalibracion } from "./calibracion";

describe("aMetricas (normalizacion Json -> Record<string, number>)", () => {
    it("conserva solo entradas numericas finitas", () => {
        expect(aMetricas({ a: 1, b: 2.5, [METRICA_CORPUS_SEMANAS]: 7 })).toEqual({
            a: 1,
            b: 2.5,
            [METRICA_CORPUS_SEMANAS]: 7,
        });
    });

    it("descarta valores no numericos, no finitos, arreglos y null", () => {
        expect(aMetricas({ a: "x", b: true, c: null, d: 3 })).toEqual({ d: 3 });
        expect(aMetricas([1, 2, 3])).toEqual({});
        expect(aMetricas(null)).toEqual({});
        expect(aMetricas(undefined)).toEqual({});
    });
});

describe("mapFilaToRegistro / semanasDeRegistro", () => {
    it("mapea una fila de gds_calibracion al dominio y extrae las semanas", () => {
        const calibradoEn = new Date("2025-01-15T10:00:00.000Z");
        const registro = mapFilaToRegistro({
            id: "cal-1",
            analisisId: "a1",
            version: "ia-v3",
            artefactoRef: "artefacto:ia-v3",
            metricas: { [METRICA_CORPUS_SEMANAS]: 12, factorCalibracion: 0.92 },
            calibradoEn,
        });

        expect(registro).toEqual<RegistroCalibracion>({
            id: "cal-1",
            analisisId: "a1",
            version: "ia-v3",
            artefactoRef: "artefacto:ia-v3",
            metricas: { [METRICA_CORPUS_SEMANAS]: 12, factorCalibracion: 0.92 },
            calibradoEn,
        });
        expect(semanasDeRegistro(registro)).toBe(12);
    });

    it("semanasDeRegistro devuelve null sin registro o sin la metrica", () => {
        expect(semanasDeRegistro(null)).toBeNull();
        expect(
            semanasDeRegistro({
                analisisId: "a1",
                version: "v",
                artefactoRef: "r",
                metricas: {},
            }),
        ).toBeNull();
    });
});

/** Doble determinista del cliente Prisma acotado a `gds_calibracion`. */
function crearClienteDoble() {
    const filas: Array<{
        id: string;
        analisisId: string;
        version: string;
        artefactoRef: string;
        metricas: unknown;
        calibradoEn: Date;
    }> = [];
    let seq = 0;

    const cliente = {
        calibracion: {
            async create({ data }: { data: Record<string, unknown> }) {
                seq += 1;
                const fila = {
                    id: `cal-${seq}`,
                    analisisId: data.analisisId as string,
                    version: data.version as string,
                    artefactoRef: data.artefactoRef as string,
                    metricas: data.metricas,
                    calibradoEn: new Date(1_700_000_000_000 + seq),
                };
                filas.push(fila);
                return fila;
            },
            async findFirst({
                where,
                orderBy,
            }: {
                where: { analisisId: string };
                orderBy: { calibradoEn: "asc" | "desc" };
            }) {
                const propias = filas
                    .filter((f) => f.analisisId === where.analisisId)
                    .sort((a, b) =>
                        orderBy.calibradoEn === "desc"
                            ? b.calibradoEn.getTime() - a.calibradoEn.getTime()
                            : a.calibradoEn.getTime() - b.calibradoEn.getTime(),
                    );
                return propias[0] ?? null;
            },
        },
    };

    return { cliente: cliente as unknown as ClienteCalibracion, filas };
}

describe("CalibracionRepositorioPrisma", () => {
    it("guarda version, artefacto_ref y metricas en gds_calibracion", async () => {
        const { cliente, filas } = crearClienteDoble();
        const repo = new CalibracionRepositorioPrisma(cliente);

        const guardado = await repo.guardar({
            analisisId: "a1",
            version: "ia-v1",
            artefactoRef: "artefacto:ia-v1",
            metricas: { [METRICA_CORPUS_SEMANAS]: 4, factorCalibracion: 0.8 },
        });

        expect(filas).toHaveLength(1);
        expect(guardado.id).toBe("cal-1");
        expect(guardado.version).toBe("ia-v1");
        expect(guardado.artefactoRef).toBe("artefacto:ia-v1");
        expect(guardado.metricas[METRICA_CORPUS_SEMANAS]).toBe(4);
    });

    it("ultima devuelve la calibracion mas reciente del analisis", async () => {
        const { cliente } = crearClienteDoble();
        const repo = new CalibracionRepositorioPrisma(cliente);

        await repo.guardar({ analisisId: "a1", version: "ia-v1", artefactoRef: "r1", metricas: { [METRICA_CORPUS_SEMANAS]: 4 } });
        await repo.guardar({ analisisId: "a1", version: "ia-v2", artefactoRef: "r2", metricas: { [METRICA_CORPUS_SEMANAS]: 9 } });
        await repo.guardar({ analisisId: "otro", version: "ia-vX", artefactoRef: "rx", metricas: {} });

        const ultima = await repo.ultima("a1");
        expect(ultima?.version).toBe("ia-v2");
        expect(ultima?.metricas[METRICA_CORPUS_SEMANAS]).toBe(9);
    });

    it("ultima devuelve null cuando el analisis no tiene calibraciones", async () => {
        const { cliente } = crearClienteDoble();
        const repo = new CalibracionRepositorioPrisma(cliente);
        expect(await repo.ultima("inexistente")).toBeNull();
    });
});
