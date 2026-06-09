// Feature: analisis-tendencias-riesgo-emocional, Property 5: Irreversibilidad del seudónimo de anonimización
/**
 * PBT (fast-check, numRuns: 100) de la **Property 5: Irreversibilidad del
 * seudónimo de anonimización** del `Servicio_Anonimizacion` (SHA-256 + salt).
 *
 * Valida que el seudónimo es un hash unidireccional SHA-256 en hex(64) del cual
 * no es posible recuperar el identificador original (Req. 23.2):
 *  - la salida es siempre una cadena hex de 64 caracteres;
 *  - la salida no contiene (ni revela) el id original ni el salt;
 *  - identificadores distintos producen seudónimos distintos bajo un mismo salt
 *    (resistencia a colisiones como prueba indirecta de la inyectividad del
 *    hash sobre el espacio muestreado);
 *  - no existe inversa disponible: la única forma de obtener el seudónimo es
 *    volver a hashear `(salt + id)`, de modo que un id candidato distinto del
 *    original nunca reproduce el seudónimo objetivo.
 *
 * Confinado a este archivo (no modifica el servicio). El segmento `pbt` del
 * nombre permite que `jest pbt` (script `test:pbt`) lo ejecute.
 *
 * **Validates: Requirements 23.2**
 */
import fc from "fast-check";
import { createHash } from "node:crypto";

import { ServicioAnonimizacionSha256 } from "./servicioAnonimizacion";

const servicio = new ServicioAnonimizacionSha256();
const NUM_RUNS = 100;

/** Generador de identificadores sintéticos no vacíos (incluye no-ASCII y símbolos). */
const idSinteticoArb = fc.string({ minLength: 1, maxLength: 64 });

/** Generador de salts (incluye cadena vacía y caracteres arbitrarios). */
const saltArb = fc.string({ minLength: 0, maxLength: 64 });

/** Recomputo independiente del hash de referencia, sin usar el servicio. */
function sha256Hex(salt: string, id: string): string {
    return createHash("sha256").update(`${salt}${id}`, "utf8").digest("hex");
}

describe("Property 5: Irreversibilidad del seudónimo de anonimización (Req. 23.2)", () => {
    it("el seudónimo es siempre un hash SHA-256 en hex de 64 caracteres", () => {
        fc.assert(
            fc.property(idSinteticoArb, saltArb, (id, salt) => {
                const seudonimo = servicio.seudonimo(id, salt);
                expect(seudonimo).toMatch(/^[0-9a-f]{64}$/);
            }),
            { numRuns: NUM_RUNS },
        );
    });

    it("el seudónimo no expone el id original ni el salt (no son recuperables de la salida)", () => {
        fc.assert(
            fc.property(
                // ids/salts suficientemente largos para que su aparición literal en
                // un hex(64) no sea fruto del azar.
                fc.string({ minLength: 3, maxLength: 64 }),
                fc.string({ minLength: 3, maxLength: 64 }),
                (id, salt) => {
                    const seudonimo = servicio.seudonimo(id, salt);
                    expect(seudonimo.includes(id)).toBe(false);
                    expect(seudonimo.includes(salt)).toBe(false);
                },
            ),
            { numRuns: NUM_RUNS },
        );
    });

    it("no hay inversa: un id candidato distinto del original no reproduce el seudónimo", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 64 }),
                fc.string({ minLength: 1, maxLength: 64 }),
                saltArb,
                (idOriginal, idCandidato, salt) => {
                    fc.pre(idOriginal !== idCandidato);
                    const objetivo = servicio.seudonimo(idOriginal, salt);
                    // El único camino para reproducir el seudónimo es hashear el id
                    // original; un candidato distinto bajo el mismo salt no lo logra.
                    expect(servicio.seudonimo(idCandidato, salt)).not.toBe(objetivo);
                    // Y el seudónimo objetivo solo se reconstruye recomputando el hash
                    // desde el id original (no existe operación inversa).
                    expect(objetivo).toBe(sha256Hex(salt, idOriginal));
                },
            ),
            { numRuns: NUM_RUNS },
        );
    });

    it("identificadores distintos producen seudónimos distintos bajo el mismo salt (resistencia a colisiones)", () => {
        fc.assert(
            fc.property(idSinteticoArb, idSinteticoArb, saltArb, (idA, idB, salt) => {
                fc.pre(idA !== idB);
                expect(servicio.seudonimo(idA, salt)).not.toBe(servicio.seudonimo(idB, salt));
            }),
            { numRuns: NUM_RUNS },
        );
    });
});
