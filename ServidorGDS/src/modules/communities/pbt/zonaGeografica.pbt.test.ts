// Feature: analisis-tendencias-riesgo-emocional, Property 37: Derivación y presencia de la zona geográfica
/**
 * Prueba basada en propiedades (PBT) de la `Zona_Geografica` de una
 * `Comunidad_Digital` (modulo de dominio `communities`).
 *
 * Property 37: Derivación y presencia de la zona geográfica (Req. 33.1, 33.2).
 *
 * *Para toda* `Institucion` con coordenadas almacenadas y *todo* radio de
 * analisis recibido del frontend, verifica —sobre las funciones puras
 * {@link derivarZona} y {@link anclarZona}— las dos invariantes universales de
 * la propiedad:
 *
 *  - **Derivacion exacta (Req. 33.1):** la `Zona_Geografica` derivada combina
 *    EXACTAMENTE las coordenadas almacenadas de la `Institucion` con el radio de
 *    analisis recibido. Con coordenadas finitas y radio entero no negativo, la
 *    zona reproduce esos valores sin alterarlos.
 *  - **Presencia/anclaje (Req. 33.2):** el `ContextoGeneracion` de esa comunidad
 *    contiene la `Zona_Geografica` derivada (ancla del contenido) sin mutar el
 *    contexto base ni perder el resto de sus campos.
 *
 * Se reconoce por el patron `pbt` en su ruta, de modo que `jest pbt` ejecute
 * esta suite (Req. 26.1, 26.2). Se ejecuta con un minimo de 100 iteraciones
 * (`{ numRuns: 100 }`), conforme al criterio de evidencia del Req. 26.5.
 *
 * **Validates: Requirements 33.1, 33.2**
 */
// Ejecutado bajo Jest + ts-jest: `describe`, `it` y `expect` son globales (sin import).
import fc from "fast-check";

import {
    anclarZona,
    derivarZona,
    type CoordenadasInstitucion,
} from "../zonaGeografica";

/**
 * Generador `institucionZonaArb`: una `Institucion` con coordenadas almacenadas
 * (latitud/longitud finitas en rango geografico valido) y un radio de analisis
 * recibido del frontend (entero no negativo, en metros).
 *
 * Se generan coordenadas finitas y radios enteros no negativos para poder
 * afirmar la combinacion EXACTA de la derivacion (Req. 33.1) contra los valores
 * generados directamente, sin depender de la normalizacion interna.
 */
const institucionZonaArb: fc.Arbitrary<{
    institucion: CoordenadasInstitucion;
    radioAnalisisMetros: number;
}> = fc.record({
    institucion: fc.record({
        latitud: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
        longitud: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
    }),
    radioAnalisisMetros: fc.integer({ min: 0, max: 50_000 }),
});

/**
 * Generador de un `ContextoGeneracion` base (sin zona) que recibe el anclaje.
 * Aporta campos arbitrarios para verificar que el anclaje no los pierde.
 */
const contextoBaseArb = fc.record({
    escenario: fc.string(),
    semana: fc.integer({ min: 1, max: 24 }),
    comunidad: fc.record({
        institucionId: fc.uuid(),
        analisisId: fc.uuid(),
    }),
});

describe("PBT Property 37 - Derivación y presencia de la zona geográfica (Req. 33.1, 33.2)", () => {
    it("la zona derivada combina EXACTAMENTE coordenadas de la institucion + radio (Req. 33.1, numRuns: 100)", () => {
        fc.assert(
            fc.property(institucionZonaArb, ({ institucion, radioAnalisisMetros }) => {
                const zona = derivarZona(institucion, radioAnalisisMetros);

                expect(zona.latitud).toBe(institucion.latitud);
                expect(zona.longitud).toBe(institucion.longitud);
                expect(zona.radioMetros).toBe(radioAnalisisMetros);
            }),
            { numRuns: 100 },
        );
    });

    it("el ContextoGeneracion contiene la zona derivada que ancla el contenido (Req. 33.2, numRuns: 100)", () => {
        fc.assert(
            fc.property(
                institucionZonaArb,
                contextoBaseArb,
                ({ institucion, radioAnalisisMetros }, contextoBase) => {
                    const zona = derivarZona(institucion, radioAnalisisMetros);
                    const ctx = anclarZona(contextoBase, zona);

                    // Presencia de la zona derivada en el contexto (Req. 33.2).
                    expect(ctx.zonaGeografica).toEqual(zona);
                    // El anclaje preserva el resto del contexto y no muta la entrada.
                    expect(ctx.escenario).toBe(contextoBase.escenario);
                    expect(ctx.semana).toBe(contextoBase.semana);
                    expect(ctx.comunidad).toEqual(contextoBase.comunidad);
                    expect(contextoBase).not.toHaveProperty("zonaGeografica");
                },
            ),
            { numRuns: 100 },
        );
    });
});
