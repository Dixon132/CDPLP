/**
 * Pruebas unitarias del helper de COPIA INMUTABLE del escenario para
 * `gds_analisis` (`resolverContextoEscenarioAnalisis` /
 * `aContextoEscenarioAnalisis`).
 *
 * Verifican que, dada una `SeleccionEscenario`, se producen los campos
 * inmutables que persiste `gds_analisis` (`escenario`, `escenarioId`,
 * `escenarioVersion`, `escenarioEsPersonalizado`) y que la copia fijada es
 * INDEPENDIENTE de cualquier edición posterior de la `Biblioteca_Escenarios`.
 *
 * Usan un DOBLE EN MEMORIA del puerto `BibliotecaEscenariosRepositorio`: sin
 * base de datos viva ni red.
 *
 * _Requirements: 29.4, 29.6, 8.6_
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MotorEscenariosImpl } from "./motorEscenarios";
import {
    aContextoEscenarioAnalisis,
    resolverContextoEscenarioAnalisis,
} from "./contextoEscenarioAnalisis";
import type {
    BibliotecaEscenariosRepositorio,
    DefinicionEscenario,
    EscenarioReutilizable,
    EscenarioSinId,
} from "./escenarios.types";

/** Doble en memoria del puerto de persistencia de la biblioteca. */
class BibliotecaEnMemoria implements BibliotecaEscenariosRepositorio {
    private filas: EscenarioReutilizable[] = [];
    private contador = 0;

    async crear(def: EscenarioSinId): Promise<EscenarioReutilizable> {
        this.contador += 1;
        const fila: EscenarioReutilizable = {
            id: `esc-${this.contador}`,
            nombre: def.nombre,
            descripcion: def.descripcion,
            contexto: def.contexto,
            intensidad: def.intensidad,
            duracionEsperada: def.duracionEsperada,
            eventosDetonantes: [...def.eventosDetonantes],
            actoresInvolucrados: [...def.actoresInvolucrados],
            categoria: def.categoria,
            tags: [...def.tags],
            configuracionComportamiento: { ...def.configuracionComportamiento },
            parametros: { ...def.parametros },
            version: def.version,
            esPredefinido: def.esPredefinido,
        };
        this.filas.push(fila);
        return { ...fila };
    }

    async listar(): Promise<EscenarioReutilizable[]> {
        return this.filas.map((f) => ({ ...f }));
    }

    async obtenerPorId(id: string): Promise<EscenarioReutilizable | null> {
        const f = this.filas.find((x) => x.id === id);
        return f ? { ...f } : null;
    }
}

const DEF_BASE: DefinicionEscenario = {
    nombre: "Escenario de prueba",
    descripcion: "desc",
    contexto: "contexto original",
    intensidad: "media",
    duracionEsperada: 5,
    eventosDetonantes: ["evento A"],
    actoresInvolucrados: ["estudiantes"],
    categoria: "académico",
    tags: ["prueba"],
    configuracionComportamiento: { tono: "neutral" },
    parametros: { x: 1 },
    esPredefinido: false,
};

describe("resolverContextoEscenarioAnalisis: escenario de biblioteca (Req. 29.4, 29.6)", () => {
    let repo: BibliotecaEnMemoria;
    let motor: MotorEscenariosImpl;

    beforeEach(() => {
        repo = new BibliotecaEnMemoria();
        motor = new MotorEscenariosImpl(repo);
    });

    it("produce los campos inmutables para gds_analisis copiando contexto + (id, version)", async () => {
        const guardado = await motor.guardar(DEF_BASE);

        const ctx = await resolverContextoEscenarioAnalisis(motor, {
            escenarioId: guardado.id,
        });

        expect(ctx).toEqual({
            escenario: guardado.contexto,
            escenarioId: guardado.id,
            escenarioVersion: guardado.version,
            escenarioEsPersonalizado: false,
        });
    });

    it("la copia fijada es INDEPENDIENTE de ediciones posteriores de la biblioteca", async () => {
        const v1 = await motor.guardar(DEF_BASE);
        const ctx = await resolverContextoEscenarioAnalisis(motor, {
            escenarioId: v1.id,
        });

        // Ediciones posteriores generan nuevas versiones en la biblioteca.
        await motor.editar(v1.id, { contexto: "contexto editado 1" });
        await motor.editar(v1.id, { contexto: "contexto editado 2" });

        // La copia fijada en el análisis no cambia.
        expect(ctx.escenario).toBe("contexto original");
        expect(ctx.escenarioId).toBe(v1.id);
        expect(ctx.escenarioVersion).toBe(1);
        expect(ctx.escenarioEsPersonalizado).toBe(false);
    });

    it("propaga el error si el escenarioId no existe en la biblioteca", async () => {
        await expect(
            resolverContextoEscenarioAnalisis(motor, { escenarioId: "no-existe" }),
        ).rejects.toThrow();
    });
});

describe("resolverContextoEscenarioAnalisis: escenario personalizado (Req. 8.6, 29.4)", () => {
    let repo: BibliotecaEnMemoria;
    let motor: MotorEscenariosImpl;

    beforeEach(() => {
        repo = new BibliotecaEnMemoria();
        motor = new MotorEscenariosImpl(repo);
    });

    it("marca esPersonalizado y no registra trazabilidad si no se guarda", async () => {
        const ctx = await resolverContextoEscenarioAnalisis(motor, {
            personalizado: "mi contexto libre",
        });

        expect(ctx).toEqual({
            escenario: "mi contexto libre",
            escenarioId: null,
            escenarioVersion: null,
            escenarioEsPersonalizado: true,
        });
    });

    it("marca esPersonalizado y registra (id, version) si se guarda en biblioteca", async () => {
        const ctx = await resolverContextoEscenarioAnalisis(motor, {
            personalizado: "contexto a reutilizar",
            guardarEnBiblioteca: true,
        });

        expect(ctx.escenario).toBe("contexto a reutilizar");
        expect(ctx.escenarioId).toBeTruthy();
        expect(ctx.escenarioVersion).toBe(1);
        expect(ctx.escenarioEsPersonalizado).toBe(true);
    });

    it("el personalizado guardado queda fijado aunque se edite luego en la biblioteca", async () => {
        const ctx = await resolverContextoEscenarioAnalisis(motor, {
            personalizado: "contexto inicial libre",
            guardarEnBiblioteca: true,
        });

        await motor.editar(ctx.escenarioId as string, {
            contexto: "editado tras crear el análisis",
        });

        expect(ctx.escenario).toBe("contexto inicial libre");
        expect(ctx.escenarioVersion).toBe(1);
    });

    it("propaga el error si la selección está vacía", async () => {
        await expect(
            resolverContextoEscenarioAnalisis(motor, {}),
        ).rejects.toThrow();
    });
});

describe("aContextoEscenarioAnalisis: mapeo puro EscenarioFijado → campos gds_analisis", () => {
    it("mapea un escenario de biblioteca (no personalizado)", () => {
        const ctx = aContextoEscenarioAnalisis(
            { contexto: "ctx", escenarioId: "esc-1", version: 3 },
            { escenarioId: "esc-1" },
        );
        expect(ctx).toEqual({
            escenario: "ctx",
            escenarioId: "esc-1",
            escenarioVersion: 3,
            escenarioEsPersonalizado: false,
        });
    });

    it("mapea un personalizado en texto libre (sin trazabilidad)", () => {
        const ctx = aContextoEscenarioAnalisis(
            { contexto: "libre", escenarioId: null, version: null },
            { personalizado: "libre" },
        );
        expect(ctx).toEqual({
            escenario: "libre",
            escenarioId: null,
            escenarioVersion: null,
            escenarioEsPersonalizado: true,
        });
    });
});
