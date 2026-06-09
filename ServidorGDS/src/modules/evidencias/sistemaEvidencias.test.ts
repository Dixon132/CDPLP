/**
 * Pruebas unitarias del `Sistema_Evidencias`.
 *
 * Cubren los mapeos puros fila<->dominio y la logica del almacen (orden estable
 * en `obtener`, recorrido auditable anonimizado en `auditar`). El acceso a la
 * BD se reemplaza por un almacen en memoria que ejerce la MISMA logica real de
 * la clase (orden, auditoria, mapeos), sin red.
 *
 * _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 34.5_
 */
import type { Evidence as EvidenceRow } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { Contributividad, type Evidencia } from "./interfaces";
import {
    SistemaEvidenciasPrisma,
    mapEvidenciaToCreateInput,
    mapRowToEvidencia,
} from "./sistemaEvidencias";

// ---------------------------------------------------------------------------
// Doble en memoria del delegate `evidence` de Prisma (solo lo que usa la clase).
// ---------------------------------------------------------------------------
function crearClienteEnMemoria() {
    const filas: EvidenceRow[] = [];
    let secuencia = 0;

    const evidence = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: async ({ data }: { data: any }): Promise<EvidenceRow> => {
            const row = { id: `ev-${++secuencia}`, ...data } as EvidenceRow;
            filas.push(row);
            return row;
        },
        findMany: async ({
            where,
        }: {
            where: { id: { in: string[] } };
        }): Promise<EvidenceRow[]> => {
            const ids = new Set(where.id.in);
            // Devuelve en orden de insercion (como una BD sin orderBy).
            return filas.filter((f) => ids.has(f.id));
        },
        findUnique: async ({
            where,
        }: {
            where: { id: string };
        }): Promise<EvidenceRow | null> => {
            return filas.find((f) => f.id === where.id) ?? null;
        },
    };

    return { evidence } as unknown as ConstructorParameters<typeof SistemaEvidenciasPrisma>[0];
}

function evidenciaBase(): Omit<Evidencia, "id"> {
    return {
        resultadoId: "res-1",
        analisisId: "an-1",
        comunidadId: "com-1",
        institucionId: "inst-1",
        numeroSemana: 3,
        refContenido: "post:abc-anon",
        contributividad: Contributividad.CONTRIBUTIVO,
        tipo: "variacion",
        contenido: "contenido anonimizado",
        publicacionesAsociadas: ["post:1", "post:2"],
        comentariosAsociados: ["com:1"],
        eventosAsociados: ["evento:paro"],
        semanasInvolucradas: [1, 2, 3],
        indicadoresUtilizados: ["estres_academico"],
        explicacionIA: "El estres academico subio por el paro.",
        metricasUtilizadas: { conteo: 82, baseline: 50 },
        metricas: { conteo: 82, variacionPct: 64 },
    };
}

function rowEjemplo(overrides: Partial<EvidenceRow> = {}): EvidenceRow {
    return {
        id: "ev-row",
        resultadoId: "res-1",
        analisisId: "an-1",
        comunidadId: "com-1",
        institucionId: "inst-1",
        numeroSemana: 3,
        refContenido: "post:abc-anon",
        contributividad: "CONTRIBUTIVO",
        tipo: "variacion",
        contenido: "contenido anonimizado",
        publicacionesAsociadas: ["post:1", "post:2"],
        comentariosAsociados: ["com:1"],
        eventosAsociados: ["evento:paro"],
        semanasInvolucradas: [1, 2, 3],
        indicadoresUtilizados: ["estres_academico"],
        explicacionIa: "El estres academico subio por el paro.",
        metricasUtilizadas: { conteo: 82, baseline: 50 },
        variacionPct: 64,
        conteo: 82,
        ...overrides,
    } as EvidenceRow;
}

describe("mapRowToEvidencia", () => {
    it("mapea todos los campos de la fila al dominio (Req. 30.1, 30.3)", () => {
        const ev = mapRowToEvidencia(rowEjemplo());
        expect(ev).toMatchObject({
            id: "ev-row",
            resultadoId: "res-1",
            analisisId: "an-1",
            comunidadId: "com-1",
            institucionId: "inst-1",
            numeroSemana: 3,
            refContenido: "post:abc-anon",
            contributividad: Contributividad.CONTRIBUTIVO,
            tipo: "variacion",
            explicacionIA: "El estres academico subio por el paro.",
        });
        expect(ev.metricas).toEqual({ conteo: 82, variacionPct: 64 });
        expect(ev.metricasUtilizadas).toEqual({ conteo: 82, baseline: 50 });
    });

    it("interpreta NO_CONTRIBUTIVO desde el string persistido (Req. 34.5)", () => {
        const ev = mapRowToEvidencia(rowEjemplo({ contributividad: "NO_CONTRIBUTIVO" }));
        expect(ev.contributividad).toBe(Contributividad.NO_CONTRIBUTIVO);
    });

    it("usa cadena vacia cuando explicacionIa es null", () => {
        const ev = mapRowToEvidencia(rowEjemplo({ explicacionIa: null }));
        expect(ev.explicacionIA).toBe("");
    });

    it("omite `metricas` cuando conteo y variacionPct son null", () => {
        const ev = mapRowToEvidencia(rowEjemplo({ conteo: null, variacionPct: null }));
        expect(ev.metricas).toBeUndefined();
    });

    it("normaliza campos Json no-arreglo/no-objeto a estructuras vacias", () => {
        const ev = mapRowToEvidencia(
            rowEjemplo({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                publicacionesAsociadas: null as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                semanasInvolucradas: null as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                metricasUtilizadas: null as any,
            }),
        );
        expect(ev.publicacionesAsociadas).toEqual([]);
        expect(ev.semanasInvolucradas).toEqual([]);
        expect(ev.metricasUtilizadas).toEqual({});
    });
});

describe("mapEvidenciaToCreateInput", () => {
    it("traduce el dominio a la entrada de creacion de Prisma", () => {
        const input = mapEvidenciaToCreateInput(evidenciaBase());
        expect(input).toMatchObject({
            resultadoId: "res-1",
            analisisId: "an-1",
            contributividad: "CONTRIBUTIVO",
            explicacionIa: "El estres academico subio por el paro.",
            conteo: 82,
            variacionPct: 64,
        });
    });

    it("envia conteo/variacionPct null cuando no hay metricas", () => {
        const { metricas: _omit, ...sinMetricas } = evidenciaBase();
        const input = mapEvidenciaToCreateInput(sinMetricas);
        expect(input.conteo).toBeNull();
        expect(input.variacionPct).toBeNull();
    });
});

describe("SistemaEvidenciasPrisma", () => {
    it("almacenar persiste y devuelve la Evidencia con id asignado (Req. 30.1)", async () => {
        const sistema = new SistemaEvidenciasPrisma(crearClienteEnMemoria());
        const ev = await sistema.almacenar(evidenciaBase());
        expect(ev.id).toMatch(/^ev-\d+$/);
        expect(ev.analisisId).toBe("an-1");
        expect(ev.metricas).toEqual({ conteo: 82, variacionPct: 64 });
    });

    it("obtener devuelve [] para una lista vacia sin tocar el almacen", async () => {
        const sistema = new SistemaEvidenciasPrisma(crearClienteEnMemoria());
        expect(await sistema.obtener([])).toEqual([]);
    });

    it("obtener preserva el orden solicitado de ids (Req. 30.2)", async () => {
        const sistema = new SistemaEvidenciasPrisma(crearClienteEnMemoria());
        const a = await sistema.almacenar({ ...evidenciaBase(), refContenido: "A" });
        const b = await sistema.almacenar({ ...evidenciaBase(), refContenido: "B" });
        const c = await sistema.almacenar({ ...evidenciaBase(), refContenido: "C" });

        const orden = [c.id, a.id, b.id];
        const obtenidas = await sistema.obtener(orden);
        expect(obtenidas.map((e) => e.id)).toEqual(orden);
    });

    it("obtener ignora ids inexistentes", async () => {
        const sistema = new SistemaEvidenciasPrisma(crearClienteEnMemoria());
        const a = await sistema.almacenar(evidenciaBase());
        const obtenidas = await sistema.obtener([a.id, "no-existe"]);
        expect(obtenidas.map((e) => e.id)).toEqual([a.id]);
    });

    it("auditar expone el recorrido conclusion -> evidencia -> dato original (Req. 30.4)", async () => {
        const sistema = new SistemaEvidenciasPrisma(crearClienteEnMemoria());
        const ev = await sistema.almacenar(evidenciaBase());
        const recorrido = await sistema.auditar(ev.id);

        expect(recorrido.evidencia.id).toBe(ev.id);
        expect(recorrido.datoOriginal).toEqual({
            numeroSemana: ev.numeroSemana,
            comunidadId: ev.comunidadId,
            refContenido: ev.refContenido,
        });
    });

    it("auditar devuelve contenido anonimizado sin id crudo (Req. 30.5)", async () => {
        const sistema = new SistemaEvidenciasPrisma(crearClienteEnMemoria());
        const ev = await sistema.almacenar(evidenciaBase());
        const recorrido = await sistema.auditar(ev.id);
        expect(recorrido.evidencia.contenido).toBe("contenido anonimizado");
        expect(recorrido.datoOriginal.refContenido).toBe("post:abc-anon");
    });

    it("auditar lanza un error descriptivo si la evidencia no existe", async () => {
        const sistema = new SistemaEvidenciasPrisma(crearClienteEnMemoria());
        await expect(sistema.auditar("inexistente")).rejects.toThrow(/Evidencia no encontrada/);
    });
});
