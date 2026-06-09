/**
 * Prueba basada en propiedades (PBT) de la derivacion de la `Zona_Geografica`
 * de una `Comunidad_Digital` y de su presencia en el `ContextoGeneracion`.
 *
 * Property 37: Derivacion y presencia de la zona geografica (Req. 33.1, 33.2).
 *
 * Para TODA `Institucion` con coordenadas almacenadas (latitud, longitud) y
 * TODO radio de analisis recibido del frontend:
 *  - **Derivacion exacta (Req. 33.1):** la `Zona_Geografica` de la comunidad
 *    combina EXACTAMENTE esas coordenadas con ese radio, sin transformarlos ni
 *    redondearlos.
 *  - **Presencia / anclaje (Req. 33.2):** el `ContextoGeneracion` de esa
 *    comunidad contiene la `Zona_Geografica` derivada, anclando el contenido a
 *    la zona, y preserva intacto el resto del contexto longitudinal.
 *
 * Se ejercen las funciones PURAS reales del modulo `zonaGeografica.ts`
 * (tarea 15.2) sin red ni BD: `derivarZonaGeografica`, `derivarZonaDeInstitucion`
 * y `anclarZonaDerivada`. La propiedad valida la logica de negocio real, no un
 * doble del comportamiento.
 *
 * Se reconoce por el patron `pbt` en su ruta (`vitest run pbt`, Req. 26.1, 26.2)
 * y se ejecuta con un minimo de 100 iteraciones (`{ numRuns: 100 }`, Req. 26.5).
 *
 * **Validates: Requirements 33.1, 33.2**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 37: Derivación y presencia de la zona geográfica
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { ContextoGeneracion } from "../proveedorGeneracion";
import {
    anclarZonaDerivada,
    derivarZonaDeInstitucion,
    derivarZonaGeografica,
    type CoordenadasInstitucion,
} from "../zonaGeografica";

// ---------------------------------------------------------------------------
// Generadores acotados al espacio de entrada del dominio.
// ---------------------------------------------------------------------------

/**
 * Genera una `Institucion` con coordenadas almacenadas finitas (lat/lon en
 * rangos geograficos reales) y el radio de analisis (en metros) recibido del
 * frontend. Modela exactamente la entrada de la Property 37.
 */
function institucionZonaArb(): fc.Arbitrary<{
    coordenadas: CoordenadasInstitucion;
    radioMetros: number;
}> {
    return fc.record({
        coordenadas: fc.record({
            latitud: fc.double({ min: -90, max: 90, noNaN: true }),
            longitud: fc.double({ min: -180, max: 180, noNaN: true }),
        }),
        // El radio se valida como finito y no negativo por `derivarZonaGeografica`.
        radioMetros: fc.double({ min: 0, max: 100_000, noNaN: true }),
    });
}

/**
 * Genera un `ContextoGeneracion` base SIN una zona significativa (se ancla con
 * una zona "centinela" obviamente distinta de la derivada) para comprobar que
 * el anclaje la reemplaza por la zona derivada y preserva el resto del contexto.
 */
function contextoBaseArb(): fc.Arbitrary<ContextoGeneracion> {
    return fc.record({
        escenario: fc.constantFrom(
            "Conflicto Universitario",
            "Crisis Política",
            "Pandemia",
            "Problemas de Transporte",
            "Guerra del Gas",
            "Elecciones",
        ),
        contextoMemoria: fc.oneof(fc.constant(""), fc.string(), fc.fullUnicodeString()),
        patronesAcumulados: fc.constant([]),
        usuariosSinteticos: fc.constant([]),
        // Zona centinela: distinta de cualquier zona derivada plausible.
        zonaGeografica: fc.constant({ latitud: 1234, longitud: 5678, radioMetros: -1 }),
        semana: fc.integer({ min: 1, max: 24 }),
        comunidad: fc.record({
            institucionId: fc.string({ minLength: 1 }),
            analisisId: fc.string({ minLength: 1 }),
        }),
    });
}

describe("PBT Property 37: Derivacion y presencia de la zona geografica (Req. 33.1, 33.2)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 37: Derivación y presencia de la zona geográfica
    it("la Zona_Geografica combina exactamente coordenadas + radio y queda anclada en el ContextoGeneracion", () => {
        fc.assert(
            fc.property(
                institucionZonaArb(),
                contextoBaseArb(),
                ({ coordenadas, radioMetros }, contextoBase) => {
                    // --- Derivacion exacta (Req. 33.1). ---
                    const zona = derivarZonaGeografica(
                        coordenadas.latitud,
                        coordenadas.longitud,
                        radioMetros,
                    );

                    // Combina EXACTAMENTE las coordenadas de la institucion con el radio.
                    expect(zona.latitud).toBe(coordenadas.latitud);
                    expect(zona.longitud).toBe(coordenadas.longitud);
                    expect(zona.radioMetros).toBe(radioMetros);

                    // La variante que agrupa las coordenadas produce la MISMA zona.
                    const zonaAgrupada = derivarZonaDeInstitucion(coordenadas, radioMetros);
                    expect(zonaAgrupada).toEqual(zona);

                    // --- Presencia / anclaje en el contexto (Req. 33.2). ---
                    const contexto = anclarZonaDerivada(contextoBase, coordenadas, radioMetros);

                    // El ContextoGeneracion contiene la Zona_Geografica derivada.
                    expect(contexto.zonaGeografica).toEqual(zona);
                    expect(contexto.zonaGeografica.latitud).toBe(coordenadas.latitud);
                    expect(contexto.zonaGeografica.longitud).toBe(coordenadas.longitud);
                    expect(contexto.zonaGeografica.radioMetros).toBe(radioMetros);

                    // La zona centinela del contexto base fue reemplazada por la derivada.
                    expect(contexto.zonaGeografica).not.toEqual(contextoBase.zonaGeografica);

                    // El resto del contexto longitudinal se preserva intacto.
                    expect(contexto.escenario).toBe(contextoBase.escenario);
                    expect(contexto.contextoMemoria).toBe(contextoBase.contextoMemoria);
                    expect(contexto.patronesAcumulados).toEqual(contextoBase.patronesAcumulados);
                    expect(contexto.usuariosSinteticos).toEqual(contextoBase.usuariosSinteticos);
                    expect(contexto.semana).toBe(contextoBase.semana);
                    expect(contexto.comunidad).toEqual(contextoBase.comunidad);

                    // El anclaje no muta el contexto original (funcion pura).
                    expect(contextoBase.zonaGeografica).toEqual({
                        latitud: 1234,
                        longitud: 5678,
                        radioMetros: -1,
                    });
                },
            ),
            { numRuns: 100 },
        );
    });
});
