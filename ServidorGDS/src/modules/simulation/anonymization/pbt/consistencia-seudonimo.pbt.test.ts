// Feature: analisis-tendencias-riesgo-emocional, Property 4: Consistencia del seudónimo de anonimización
/**
 * PBT — Property 4: Consistencia del seudónimo de anonimización.
 *
 * Verifica, con fast-check (numRuns: 100), que la operación `seudonimo(id, salt)`
 * del `Servicio_Anonimizacion` es consistente:
 *  - El mismo par `(idSintetico, salt)` produce SIEMPRE el mismo seudónimo
 *    (determinismo / estabilidad), independientemente del número de invocaciones.
 *  - Un `salt` distinto (manteniendo el mismo id) produce un seudónimo distinto,
 *    de modo que el seudónimo depende efectivamente del salt.
 *
 * Se usa la instancia reutilizable `servicioAnonimizacion` (sin DI). No se
 * modifica el servicio bajo prueba.
 *
 * Generadores: `idSinteticoArb` y `saltArb`.
 *
 * **Validates: Requirements 23.4**
 */
import fc from "fast-check";

import { servicioAnonimizacion } from "../servicioAnonimizacion";

/** Identificadores sintéticos no vacíos (incluye Unicode y casos límite). */
const idSinteticoArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 64 });

/** Salts no vacíos (incluye Unicode y casos límite). */
const saltArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 64 });

describe("Property 4 — Consistencia del seudónimo de anonimización (Req. 23.4)", () => {
    it("el mismo (id, salt) produce siempre el mismo seudónimo", () => {
        fc.assert(
            fc.property(idSinteticoArb, saltArb, (id, salt) => {
                const a = servicioAnonimizacion.seudonimo(id, salt);
                const b = servicioAnonimizacion.seudonimo(id, salt);
                const c = servicioAnonimizacion.seudonimo(id, salt);
                expect(a).toBe(b);
                expect(b).toBe(c);
            }),
            { numRuns: 100 },
        );
    });

    it("un salt distinto (mismo id) produce un seudónimo distinto", () => {
        fc.assert(
            fc.property(
                idSinteticoArb,
                saltArb,
                saltArb,
                (id, saltA, saltB) => {
                    // Precondición: solo es exigible la diferencia cuando los salts difieren.
                    fc.pre(saltA !== saltB);
                    expect(servicioAnonimizacion.seudonimo(id, saltA)).not.toBe(
                        servicioAnonimizacion.seudonimo(id, saltB),
                    );
                },
            ),
            { numRuns: 100 },
        );
    });
});
