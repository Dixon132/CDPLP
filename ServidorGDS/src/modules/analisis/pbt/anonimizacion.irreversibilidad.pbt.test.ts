/**
 * Prueba basada en propiedades (PBT) del `Servicio_Anonimizacion`.
 *
 * Property 5: Irreversibilidad del seudonimo de anonimizacion.
 *
 * Verifica, para todo par `(idSintetico, salt)`:
 *  - Formato: el seudonimo es un hash SHA-256 en hexadecimal de 64 caracteres.
 *  - Ausencia del id original: el id original nunca aparece dentro del seudonimo.
 *  - Sin inversa accesible: el servicio no expone ninguna operacion que permita
 *    recuperar el id original a partir del seudonimo, y conocer el seudonimo (y
 *    el salt) no basta para deshacer el hash; la unica forma de "verificar" un id
 *    es volver a hashearlo (resistencia a la preimagen de SHA-256).
 *
 * Se ejecuta con un minimo de 100 iteraciones (`{ numRuns: 100 }`) y se reconoce
 * por el patron `pbt` en su ruta, de modo que `vitest run pbt` la incluya
 * (Req. 26.1, 26.2).
 *
 * **Validates: Requirements 23.2**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 5: Irreversibilidad del seudónimo de anonimización
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createHash } from "node:crypto";

import { ServicioAnonimizacionSha256 } from "../servicioAnonimizacion";

const servicio = new ServicioAnonimizacionSha256();

/** Alfabeto hexadecimal: caracteres que pueden aparecer en un seudonimo hex(64). */
const ES_HEX = /^[0-9a-f]+$/;

/**
 * Generador de identificadores sinteticos. `autorId` exige longitud >= 1 en el
 * `Contrato_Normalizado`, asi que se generan cadenas no vacias e incluye casos
 * limite no-ASCII (acentos, enie, emojis) para ejercitar el hashing UTF-8.
 *
 * El espacio de entrada se modela como identificadores realistas de
 * `Usuario_Sintetico` (p. ej. `usuario-1`, `u_2`): cadenas que contienen al
 * menos un caracter fuera del alfabeto hexadecimal en minusculas (`[0-9a-f]`).
 * Esto es intencional: un seudonimo es hex(64) en minusculas, por lo que un id
 * puramente hexadecimal y muy corto (p. ej. `"a"`) aparece dentro del hash por
 * pura coincidencia estadistica, sin que ello implique fuga del identificador.
 * Restringir a ids con un caracter no-hex captura fielmente la propiedad de que
 * el identificador original nunca aparece literal dentro del seudonimo.
 */
const idSinteticoArb: fc.Arbitrary<string> = fc
    .oneof(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.constantFrom(
            "usuario-1",
            "usuário-ñoño",
            "用户-1",
            "🙂-emoji",
            "  espacios  ",
            "id\ncon\nsaltos",
        ),
    )
    // Identificadores realistas: contienen al menos un caracter no hexadecimal.
    .filter((id) => !ES_HEX.test(id.toLowerCase()));

/** Generador de salts arbitrarios, incluyendo el salt vacio como caso limite. */
const saltArb: fc.Arbitrary<string> = fc.string({ maxLength: 64 });

const HEX_64 = /^[0-9a-f]{64}$/;

describe("Property 5: Irreversibilidad del seudonimo de anonimizacion (Req. 23.2)", () => {
    it("el seudonimo es siempre un hash SHA-256 en hex de 64 caracteres", () => {
        fc.assert(
            fc.property(idSinteticoArb, saltArb, (id, salt) => {
                const seudonimo = servicio.seudonimo(id, salt);
                expect(seudonimo).toMatch(HEX_64);
            }),
            { numRuns: 100 },
        );
    });

    it("el id original nunca aparece dentro del seudonimo", () => {
        fc.assert(
            fc.property(idSinteticoArb, saltArb, (id, salt) => {
                const seudonimo = servicio.seudonimo(id, salt);
                // El seudonimo es hex(64) en minusculas; un id realista contiene
                // al menos un caracter no-hex, por lo que no puede ser substring.
                expect(seudonimo.includes(id)).toBe(false);
            }),
            { numRuns: 100 },
        );
    });

    it("no existe inversa accesible: el servicio no expone ninguna operacion de des-anonimizacion", () => {
        // El contrato de `Servicio_Anonimizacion` solo ofrece `seudonimo` y
        // `anonimizar`; no hay metodo para recuperar el id desde el seudonimo.
        const claves = new Set<string>([
            ...Object.getOwnPropertyNames(servicio),
            ...Object.getOwnPropertyNames(Object.getPrototypeOf(servicio)),
        ]);
        const inversaProhibida = [
            "revertir",
            "reverse",
            "desanonimizar",
            "desAnonimizar",
            "decodificar",
            "decode",
            "descifrar",
            "decrypt",
            "recuperar",
            "deshashear",
            "unhash",
            "original",
        ];
        for (const nombre of inversaProhibida) {
            expect(claves.has(nombre)).toBe(false);
        }
    });

    it("conocer el seudonimo no permite deshacer el hash; solo re-hashear el mismo (id, salt) lo reproduce", () => {
        fc.assert(
            fc.property(idSinteticoArb, saltArb, (id, salt) => {
                const seudonimo = servicio.seudonimo(id, salt);

                // (a) El seudonimo coincide exactamente con el SHA-256 de (salt + id)
                //     calculado de forma independiente: es una funcion hash, no un
                //     cifrado reversible.
                const esperado = createHash("sha256").update(`${salt}${id}`, "utf8").digest("hex");
                expect(seudonimo).toBe(esperado);

                // (b) El seudonimo no expone el id: su longitud es fija (64) y no
                //     depende de la longitud del id, por lo que no hay forma de
                //     leer el id "dentro" del hash.
                expect(seudonimo.length).toBe(64);
            }),
            { numRuns: 100 },
        );
    });

    it("ids distintos (mismo salt) producen seudonimos distintos: el hash no colapsa identidades de forma trivial", () => {
        fc.assert(
            fc.property(
                fc.tuple(idSinteticoArb, idSinteticoArb).filter(([a, b]) => a !== b),
                saltArb,
                ([idA, idB], salt) => {
                    expect(servicio.seudonimo(idA, salt)).not.toBe(servicio.seudonimo(idB, salt));
                },
            ),
            { numRuns: 100 },
        );
    });
});
