/**
 * Prueba basada en propiedades (PBT) del `Servicio_Anonimizacion`.
 *
 * Property 4: Consistencia del seudonimo de anonimizacion (Req. 23.4).
 *
 * Verifica dos invariantes sobre `seudonimo(idSintetico, salt)`:
 * - **Determinismo / consistencia:** el mismo par `(id, salt)` produce siempre
 *   el mismo seudonimo, independientemente de la instancia del servicio.
 * - **Sensibilidad al salt:** un mismo `id` con dos `salt` distintos produce
 *   seudonimos distintos.
 *
 * Se reconoce por el patron `pbt` en su ruta, de modo que `vitest run pbt`
 * ejecute esta suite (Req. 26.1, 26.2). Se ejecuta con un minimo de 100
 * iteraciones (`{ numRuns: 100 }`).
 *
 * **Validates: Requirements 23.4**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 4: Consistencia del seudónimo de anonimización
import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { ServicioAnonimizacionSha256 } from "../servicioAnonimizacion";

/**
 * Generador de identificadores sinteticos de `Usuario_Sintetico`.
 *
 * Cubre cadenas arbitrarias no vacias, incluyendo casos limite con caracteres
 * no-ASCII y unicode, que es el espacio real de identificadores posibles.
 */
const idSinteticoArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 64 });

/**
 * Generador de salts de anonimizacion.
 *
 * Acepta el salt vacio y cadenas arbitrarias (incluido unicode) para ejercitar
 * el espacio completo de configuraciones de salt.
 */
const saltArb: fc.Arbitrary<string> = fc.string({ maxLength: 64 });

describe("PBT Property 4: Consistencia del seudonimo de anonimizacion (Req. 23.4)", () => {
    it("mismo (id, salt) produce siempre el mismo seudonimo (incluso entre instancias distintas)", () => {
        fc.assert(
            fc.property(idSinteticoArb, saltArb, (id, salt) => {
                const a = new ServicioAnonimizacionSha256();
                const b = new ServicioAnonimizacionSha256();
                const s1 = a.seudonimo(id, salt);
                const s2 = a.seudonimo(id, salt);
                const s3 = b.seudonimo(id, salt);
                expect(s1).toBe(s2);
                expect(s1).toBe(s3);
            }),
            { numRuns: 100 },
        );
    });

    it("mismo id con salts distintos produce seudonimos distintos", () => {
        const servicio = new ServicioAnonimizacionSha256();
        fc.assert(
            fc.property(
                idSinteticoArb,
                saltArb,
                saltArb,
                (id, saltA, saltB) => {
                    // La propiedad solo aplica cuando los salts son realmente distintos.
                    fc.pre(saltA !== saltB);
                    expect(servicio.seudonimo(id, saltA)).not.toBe(
                        servicio.seudonimo(id, saltB),
                    );
                },
            ),
            { numRuns: 100 },
        );
    });
});
