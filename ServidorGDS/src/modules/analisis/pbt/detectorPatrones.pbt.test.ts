// Feature: analisis-tendencias-riesgo-emocional, Property 38: Trazabilidad de patrones a su zona geográfica
/**
 * Prueba basada en propiedades (PBT) de la trazabilidad de patrones/tendencias a
 * su `Zona_Geografica` (`Detector_Patrones`, modulo de dominio `analisis`).
 *
 * Property 38: Trazabilidad de patrones a su zona geográfica (Req. 33.4, 33.5).
 *
 * *Para todo* patron o tendencia detectado, queda asociado de forma persistente
 * a la `Zona_Geografica` (coordenadas + radio) de la `Comunidad_Digital` /
 * `Institucion` de origen, permitiendo su trazabilidad y la comparacion por zona
 * entre comunidades del mismo `Analisis`. Se verifican —sobre las funciones
 * puras {@link asociarPatronesAZona}, {@link agruparPorZona} y {@link claveZona}—
 * las dos invariantes universales de la propiedad:
 *
 *  - **Trazabilidad persistente (Req. 33.4):** asociar una lista de patrones a su
 *    zona/origen produce EXACTAMENTE un registro por patron (orden y cardinalidad
 *    conservados), y cada registro lleva embebida la `Zona_Geografica` (coords +
 *    radio, mapeada a columnas) y los identificadores de comunidad/analisis de
 *    origen, de modo que toda conclusion es trazable a su ubicacion.
 *  - **Comparacion por zona (Req. 33.5):** al agrupar registros de varias
 *    `Comunidad_Digital` de un mismo `Analisis`, la particion por
 *    `Zona_Geografica` conserva todos los registros (sin perdida ni duplicado),
 *    agrupa juntos exactamente los que comparten zona y produce tantos grupos
 *    como zonas distintas, habilitando la comparacion entre comunidades.
 *
 * Se reconoce por el patron `pbt` en su ruta, de modo que `jest pbt` ejecute
 * esta suite (Req. 26.1, 26.2). Se ejecuta con un minimo de 100 iteraciones
 * (`{ numRuns: 100 }`), conforme al criterio de evidencia del Req. 26.5.
 *
 * **Validates: Requirements 33.4, 33.5**
 */
// Ejecutado bajo Jest + ts-jest: `describe`, `it` y `expect` son globales (sin import).
import fc from "fast-check";

import type { ZonaGeografica } from "../../adquisicion/proveedorGeneracion";
import {
    agruparPorZona,
    asociarPatronesAZona,
    claveZona,
    zonaAColumnas,
    type OrigenComunidad,
    type PatronDetectado,
    type RegistroPatron,
} from "../detectorPatrones";

/** Patron/tendencia ya detectado, antes de anclarse a una zona. */
const patronDetectadoArb: fc.Arbitrary<PatronDetectado> = fc.record({
    tipo: fc.constantFrom("tendencia", "anomalia", "recurrencia", "polarizacion"),
    descripcion: fc.string(),
});

/**
 * `Zona_Geografica` de origen: coordenadas finitas en rango geografico y radio
 * entero no negativo (coherente con la columna `Int` persistida).
 */
const zonaArb: fc.Arbitrary<ZonaGeografica> = fc.record({
    latitud: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
    longitud: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
    radioMetros: fc.integer({ min: 0, max: 50_000 }),
});

/**
 * Zona extraida de un pool reducido para que distintas `Comunidad_Digital`
 * COINCIDAN en zona con probabilidad apreciable y se ejercite de verdad la
 * comparacion por zona (Req. 33.5).
 */
const zonaPoolArb: fc.Arbitrary<ZonaGeografica> = fc.constantFrom<ZonaGeografica>(
    { latitud: -16.5, longitud: -68.15, radioMetros: 1500 },
    { latitud: -17.78, longitud: -63.18, radioMetros: 2000 },
    { latitud: -19.04, longitud: -65.26, radioMetros: 800 },
);

const origenArb: fc.Arbitrary<OrigenComunidad> = fc.record({
    analisisId: fc.uuid(),
    comunidadId: fc.uuid(),
});

/**
 * Conjunto de `Comunidad_Digital` de un MISMO `Analisis`: cada una con su zona
 * (de un pool con colisiones), su `comunidadId` y sus patrones detectados.
 */
const comunidadesDelAnalisisArb = fc
    .tuple(
        fc.uuid(),
        fc.array(
            fc.record({
                zona: zonaPoolArb,
                comunidadId: fc.uuid(),
                patrones: fc.array(patronDetectadoArb, { minLength: 1, maxLength: 5 }),
            }),
            { minLength: 1, maxLength: 6 },
        ),
    )
    .map(([analisisId, comunidades]) => ({ analisisId, comunidades }));

describe("PBT Property 38 - Trazabilidad de patrones a su zona geográfica (Req. 33.4, 33.5)", () => {
    it("cada patron detectado conserva persistentemente su zona y origen (Req. 33.4, numRuns: 100)", () => {
        fc.assert(
            fc.property(
                fc.array(patronDetectadoArb, { maxLength: 12 }),
                zonaArb,
                origenArb,
                (patrones, zona, origen) => {
                    const registros = asociarPatronesAZona(patrones, zona, origen);
                    const columnas = zonaAColumnas(zona);

                    // Un registro por patron, en el mismo orden y cardinalidad.
                    expect(registros).toHaveLength(patrones.length);

                    registros.forEach((registro, i) => {
                        // Zona_Geografica (coordenadas + radio) embebida y trazable.
                        expect(registro.zonaLatitud).toBe(columnas.zonaLatitud);
                        expect(registro.zonaLongitud).toBe(columnas.zonaLongitud);
                        expect(registro.zonaRadioMetros).toBe(columnas.zonaRadioMetros);
                        // Origen (comunidad + analisis) para trazabilidad.
                        expect(registro.analisisId).toBe(origen.analisisId);
                        expect(registro.comunidadId).toBe(origen.comunidadId);
                        // Patron preservado sin alteracion.
                        expect(registro.tipo).toBe(patrones[i].tipo);
                        expect(registro.descripcion).toBe(patrones[i].descripcion);
                    });
                },
            ),
            { numRuns: 100 },
        );
    });

    it("la agrupacion por zona conserva todos los registros y separa por Zona_Geografica (Req. 33.5, numRuns: 100)", () => {
        fc.assert(
            fc.property(comunidadesDelAnalisisArb, ({ analisisId, comunidades }) => {
                const registros: RegistroPatron[] = comunidades.flatMap((c) =>
                    asociarPatronesAZona(c.patrones, c.zona, {
                        analisisId,
                        comunidadId: c.comunidadId,
                    }),
                );

                const grupos = agruparPorZona(registros);

                // Conservacion: ningun registro se pierde ni se duplica al agrupar.
                const totalAgrupado = [...grupos.values()].reduce((n, g) => n + g.length, 0);
                expect(totalAgrupado).toBe(registros.length);

                // Tantos grupos como zonas distintas presentes (comparacion por zona).
                const clavesDistintas = new Set(registros.map((r) => claveZona(r)));
                expect(grupos.size).toBe(clavesDistintas.size);

                // Cada grupo es homogeneo: todos sus registros comparten la zona,
                // y se indexa bajo esa misma clave (agrupados juntos exactamente
                // los patrones de igual Zona_Geografica, aun de comunidades distintas).
                for (const [clave, grupo] of grupos) {
                    for (const registro of grupo) {
                        expect(claveZona(registro)).toBe(clave);
                    }
                }
            }),
            { numRuns: 100 },
        );
    });
});
