/**
 * Pruebas unitarias del `Motor_Escenarios` y la siembra de predefinidos.
 *
 * Usan un DOBLE EN MEMORIA del puerto `BibliotecaEscenariosRepositorio`, de
 * modo que la lógica pura (versionado, fijación/copia inmutable, siembra
 * idempotente) se valida SIN base de datos viva ni red.
 *
 * _Requirements: 29.1, 29.2, 29.3, 29.5, 29.6, 29.7_
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
    MotorEscenariosImpl,
    crearMotorEscenarios,
} from "./motorEscenarios";
import {
    ESCENARIOS_PREDEFINIDOS,
    sembrarEscenariosPredefinidos,
} from "./escenarios.predefinidos";
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
        // Clona los campos por valor para que el almacén no comparta referencias.
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

describe("MotorEscenarios: guardar y listar (Req. 29.1)", () => {
    let repo: BibliotecaEnMemoria;
    let motor: MotorEscenariosImpl;

    beforeEach(() => {
        repo = new BibliotecaEnMemoria();
        motor = new MotorEscenariosImpl(repo);
    });

    it("guarda un escenario con version 1 y un id asignado", async () => {
        const guardado = await motor.guardar(DEF_BASE);
        expect(guardado.id).toBeTruthy();
        expect(guardado.version).toBe(1);
        expect(guardado.nombre).toBe(DEF_BASE.nombre);
        expect(guardado.esPredefinido).toBe(false);
    });

    it("lista los escenarios persistidos", async () => {
        await motor.guardar(DEF_BASE);
        await motor.guardar({ ...DEF_BASE, nombre: "Otro" });
        const lista = await motor.listar();
        expect(lista).toHaveLength(2);
        expect(lista.map((e) => e.nombre)).toContain("Otro");
    });
});

describe("MotorEscenarios: editar versiona sin mutar versiones previas (Req. 29.5, 29.6)", () => {
    let repo: BibliotecaEnMemoria;
    let motor: MotorEscenariosImpl;

    beforeEach(() => {
        repo = new BibliotecaEnMemoria();
        motor = new MotorEscenariosImpl(repo);
    });

    it("genera una nueva versión (version + 1) al editar", async () => {
        const v1 = await motor.guardar(DEF_BASE);
        const v2 = await motor.editar(v1.id, { contexto: "contexto editado" });

        expect(v2.version).toBe(v1.version + 1);
        expect(v2.contexto).toBe("contexto editado");
        expect(v2.id).not.toBe(v1.id);
    });

    it("no muta la versión previa: sigue recuperable e intacta", async () => {
        const v1 = await motor.guardar(DEF_BASE);
        await motor.editar(v1.id, {
            contexto: "contexto editado",
            intensidad: "alta",
        });

        const v1Recuperado = await repo.obtenerPorId(v1.id);
        expect(v1Recuperado).not.toBeNull();
        expect(v1Recuperado?.contexto).toBe("contexto original");
        expect(v1Recuperado?.intensidad).toBe("media");
        expect(v1Recuperado?.version).toBe(1);
    });

    it("ignora id y version entrantes en los cambios", async () => {
        const v1 = await motor.guardar(DEF_BASE);
        const v2 = await motor.editar(v1.id, {
            id: "id-falso",
            version: 99,
            nombre: "renombrado",
        } as Partial<EscenarioReutilizable>);

        expect(v2.id).not.toBe("id-falso");
        expect(v2.version).toBe(2);
        expect(v2.nombre).toBe("renombrado");
    });

    it("lanza error al editar un id inexistente", async () => {
        await expect(motor.editar("no-existe", {})).rejects.toThrow();
    });
});

describe("MotorEscenarios: fijarParaAnalisis copia inmutable (Req. 29.3, 29.4, 29.6)", () => {
    let repo: BibliotecaEnMemoria;
    let motor: MotorEscenariosImpl;

    beforeEach(() => {
        repo = new BibliotecaEnMemoria();
        motor = new MotorEscenariosImpl(repo);
    });

    it("fija un escenario de biblioteca copiando contexto + (id, version)", async () => {
        const guardado = await motor.guardar(DEF_BASE);
        const fijado = await motor.fijarParaAnalisis({ escenarioId: guardado.id });

        expect(fijado.contexto).toBe(guardado.contexto);
        expect(fijado.escenarioId).toBe(guardado.id);
        expect(fijado.version).toBe(guardado.version);
    });

    it("la copia fijada permanece intacta tras editar el escenario en la biblioteca", async () => {
        const v1 = await motor.guardar(DEF_BASE);
        const fijado = await motor.fijarParaAnalisis({ escenarioId: v1.id });

        // Una edición posterior genera una nueva versión; la copia no cambia.
        await motor.editar(v1.id, { contexto: "contexto editado posterior" });

        expect(fijado.contexto).toBe("contexto original");
        expect(fijado.escenarioId).toBe(v1.id);
        expect(fijado.version).toBe(1);
    });

    it("fija un escenario personalizado sin guardarlo (sin trazabilidad)", async () => {
        const fijado = await motor.fijarParaAnalisis({
            personalizado: "mi contexto libre",
        });

        expect(fijado.contexto).toBe("mi contexto libre");
        expect(fijado.escenarioId).toBeNull();
        expect(fijado.version).toBeNull();
        expect(await motor.listar()).toHaveLength(0);
    });

    it("guarda opcionalmente el personalizado en la biblioteca y lo fija con trazabilidad", async () => {
        const fijado = await motor.fijarParaAnalisis({
            personalizado: "contexto a reutilizar",
            guardarEnBiblioteca: true,
        });

        expect(fijado.contexto).toBe("contexto a reutilizar");
        expect(fijado.escenarioId).toBeTruthy();
        expect(fijado.version).toBe(1);

        const lista = await motor.listar();
        expect(lista).toHaveLength(1);
        expect(lista[0].contexto).toBe("contexto a reutilizar");
        expect(lista[0].esPredefinido).toBe(false);
    });

    it("lanza error si no se indica escenarioId ni personalizado", async () => {
        await expect(motor.fijarParaAnalisis({})).rejects.toThrow();
    });

    it("lanza error al fijar un escenarioId inexistente", async () => {
        await expect(
            motor.fijarParaAnalisis({ escenarioId: "no-existe" }),
        ).rejects.toThrow();
    });
});

describe("Escenarios predefinidos y siembra (Req. 29.1, 29.7)", () => {
    it("define los 6 escenarios predefinidos esperados como datos puros", () => {
        const nombres = ESCENARIOS_PREDEFINIDOS.map((e) => e.nombre);
        expect(nombres).toEqual([
            "Guerra del Gas",
            "Conflicto Universitario",
            "Crisis Política",
            "Pandemia",
            "Problemas de Transporte",
            "Elecciones",
        ]);
        expect(ESCENARIOS_PREDEFINIDOS.every((e) => e.esPredefinido)).toBe(true);
    });

    it("siembra los predefinidos en una biblioteca vacía", async () => {
        const repo = new BibliotecaEnMemoria();
        const sembrados = await sembrarEscenariosPredefinidos(repo);

        expect(sembrados).toHaveLength(ESCENARIOS_PREDEFINIDOS.length);
        expect(sembrados.every((e) => e.esPredefinido && e.version === 1)).toBe(
            true,
        );
    });

    it("es idempotente: sembrar dos veces no duplica predefinidos", async () => {
        const repo = new BibliotecaEnMemoria();
        await sembrarEscenariosPredefinidos(repo);
        await sembrarEscenariosPredefinidos(repo);

        const lista = await repo.listar();
        expect(lista).toHaveLength(ESCENARIOS_PREDEFINIDOS.length);
    });

    it("no borra escenarios personalizados al sembrar", async () => {
        const repo = new BibliotecaEnMemoria();
        const motor = crearMotorEscenarios(repo);
        await motor.guardar(DEF_BASE);

        await sembrarEscenariosPredefinidos(repo);

        const lista = await repo.listar();
        expect(lista).toHaveLength(ESCENARIOS_PREDEFINIDOS.length + 1);
        expect(lista.some((e) => e.nombre === DEF_BASE.nombre)).toBe(true);
    });
});
