/**
 * Prueba basada en propiedades (PBT) de la **inmutabilidad del escenario
 * copiado al crear un `Analisis`**.
 *
 * Property 30: Inmutabilidad del escenario copiado al crear el análisis.
 *
 * *Para todo* `Analisis` creado a partir de un `Escenario_Reutilizable` de la
 * `Biblioteca_Escenarios`, editar posteriormente ese escenario (generando
 * nuevas versiones) NO modifica el `Escenario` fijado ni la pareja
 * `(escenario_id, escenario_version)` registrada en el `Analisis`: el contexto
 * del análisis es una COPIA INMUTABLE tomada en el momento de su creación.
 *
 * Se ejercita la lógica pura del `Motor_Escenarios` (`MotorEscenariosImpl`) y
 * del helper `resolverContextoEscenarioAnalisis` (sub-tareas 7.1/7.2) contra un
 * DOBLE EN MEMORIA del puerto `BibliotecaEscenariosRepositorio`: sin base de
 * datos viva ni red, de forma determinista.
 *
 * Se reconoce por el patrón `pbt` en su ruta, de modo que `vitest run pbt`
 * ejecute esta suite (Req. 26.1, 26.2), con un mínimo de 100 iteraciones
 * (`{ numRuns: 100 }`).
 *
 * **Validates: Requirements 29.4, 29.5, 29.6**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 30: Inmutabilidad del escenario copiado al crear el análisis
import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { MotorEscenariosImpl } from "../motorEscenarios";
import {
    resolverContextoEscenarioAnalisis,
    type ContextoEscenarioAnalisis,
} from "../contextoEscenarioAnalisis";
import type {
    BibliotecaEscenariosRepositorio,
    EscenarioReutilizable,
    EscenarioSinId,
    IntensidadEscenario,
} from "../escenarios.types";

/**
 * Doble en memoria del puerto de persistencia de la `Biblioteca_Escenarios`.
 *
 * Clona por valor al crear y al leer, de modo que el almacén nunca comparte
 * referencias con el código bajo prueba (modela la semántica de la BD real,
 * donde editar crea una NUEVA fila/versión y no muta las previas).
 */
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

const intensidadArb: fc.Arbitrary<IntensidadEscenario> = fc.constantFrom(
    "baja",
    "media",
    "alta",
);

/** Generador de un `Escenario_Reutilizable` (definición sin id ni version). */
const definicionEscenarioArb = fc.record({
    nombre: fc.string({ minLength: 1, maxLength: 40 }),
    descripcion: fc.string({ maxLength: 80 }),
    contexto: fc.string({ minLength: 1, maxLength: 200 }),
    intensidad: intensidadArb,
    duracionEsperada: fc.integer({ min: 0, max: 52 }),
    eventosDetonantes: fc.array(fc.string({ maxLength: 20 }), { maxLength: 5 }),
    actoresInvolucrados: fc.array(fc.string({ maxLength: 20 }), { maxLength: 5 }),
    categoria: fc.string({ minLength: 1, maxLength: 20 }),
    tags: fc.array(fc.string({ maxLength: 15 }), { maxLength: 5 }),
    configuracionComportamiento: fc.dictionary(
        fc.string({ maxLength: 8 }),
        fc.oneof(fc.string({ maxLength: 12 }), fc.integer(), fc.boolean()),
        { maxKeys: 4 },
    ),
    parametros: fc.dictionary(
        fc.string({ maxLength: 8 }),
        fc.oneof(fc.string({ maxLength: 12 }), fc.integer(), fc.boolean()),
        { maxKeys: 4 },
    ),
    esPredefinido: fc.boolean(),
});

/**
 * Generador de un cambio de edición sobre un escenario. Cada edición toca un
 * subconjunto arbitrario de campos (no vacío), simulando una modificación real
 * en la biblioteca.
 */
const edicionArb = fc
    .record(
        {
            nombre: fc.string({ minLength: 1, maxLength: 40 }),
            descripcion: fc.string({ maxLength: 80 }),
            contexto: fc.string({ minLength: 1, maxLength: 200 }),
            intensidad: intensidadArb,
            duracionEsperada: fc.integer({ min: 0, max: 52 }),
            eventosDetonantes: fc.array(fc.string({ maxLength: 20 }), {
                maxLength: 5,
            }),
            actoresInvolucrados: fc.array(fc.string({ maxLength: 20 }), {
                maxLength: 5,
            }),
            categoria: fc.string({ minLength: 1, maxLength: 20 }),
            tags: fc.array(fc.string({ maxLength: 15 }), { maxLength: 5 }),
        },
        { requiredKeys: [] },
    )
    .filter((cambios) => Object.keys(cambios).length > 0);

/** Secuencia de ediciones posteriores a la creación del análisis. */
const secuenciaEdicionesArb = fc.array(edicionArb, {
    minLength: 1,
    maxLength: 6,
});

describe("Property 30: Inmutabilidad del escenario copiado al crear el análisis", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 30: Inmutabilidad del escenario copiado al crear el análisis
    it("editar el escenario tras crear el análisis no altera la copia fijada ni (escenario_id, escenario_version) (Req. 29.4, 29.5, 29.6)", async () => {
        await fc.assert(
            fc.asyncProperty(
                definicionEscenarioArb,
                secuenciaEdicionesArb,
                async (def, ediciones) => {
                    const repo = new BibliotecaEnMemoria();
                    const motor = new MotorEscenariosImpl(repo);

                    // 1) Se define un `Escenario_Reutilizable` (version = 1).
                    const original = await motor.guardar(def);

                    // 2) Se crea el `Analisis` fijando la COPIA INMUTABLE del
                    //    escenario de la biblioteca.
                    const ctx = await resolverContextoEscenarioAnalisis(motor, {
                        escenarioId: original.id,
                    });

                    // Instantánea profunda de la copia fijada en el análisis.
                    const snapshot: ContextoEscenarioAnalisis = JSON.parse(
                        JSON.stringify(ctx),
                    );

                    // Invariantes en el momento de la creación.
                    expect(ctx.escenario).toBe(original.contexto);
                    expect(ctx.escenarioId).toBe(original.id);
                    expect(ctx.escenarioVersion).toBe(1);
                    expect(ctx.escenarioEsPersonalizado).toBe(false);

                    // 3) Se edita el escenario varias veces tras crear el análisis.
                    //    Cada edición genera una NUEVA versión sin mutar la previa.
                    for (const cambios of ediciones) {
                        const nueva = await motor.editar(original.id, cambios);
                        expect(nueva.id).not.toBe(original.id);
                        expect(nueva.version).toBeGreaterThan(original.version);
                    }

                    // 4) La copia fijada y la trazabilidad permanecen idénticas:
                    //    ninguna edición posterior afecta al `Analisis` (Req. 29.4/29.6).
                    expect(ctx).toEqual(snapshot);
                    expect(ctx.escenario).toBe(original.contexto);
                    expect(ctx.escenarioId).toBe(original.id);
                    expect(ctx.escenarioVersion).toBe(1);

                    // 5) La versión 1 original sigue recuperable e intacta en la
                    //    biblioteca: editar versiona, no muta (Req. 29.5).
                    const v1 = await repo.obtenerPorId(original.id);
                    expect(v1).not.toBeNull();
                    expect(v1?.contexto).toBe(original.contexto);
                    expect(v1?.version).toBe(1);
                },
            ),
            { numRuns: 100 },
        );
    });
});
