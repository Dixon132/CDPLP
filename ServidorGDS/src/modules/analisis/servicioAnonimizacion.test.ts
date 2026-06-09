/**
 * Pruebas unitarias del `Servicio_Anonimizacion` (SHA-256 + salt).
 * _Requirements: 23.1, 23.2, 23.4_
 */
import { describe, expect, it } from "vitest";

import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "../contracts/contratoNormalizado";
import { ServicioAnonimizacionSha256 } from "./servicioAnonimizacion";

const servicio = new ServicioAnonimizacionSha256();

function contratoEjemplo(): ContratoNormalizado {
    return {
        post: { autorId: "usuario-1", texto: "Hola comunidad" },
        comments: [
            { autorId: "usuario-2", texto: "Estoy de acuerdo", enRespuestaA: null },
            { autorId: "usuario-3", texto: "Yo no tanto", enRespuestaA: "usuario-1" },
            { autorId: "usuario-1", texto: "Gracias", enRespuestaA: "externo-x" },
        ],
        image_description: "una plaza con estudiantes",
        hashtags: ["#paro", "#universidad"],
        metadata: {
            version: CONTRATO_VERSION,
            fuente: "simulacion",
            generadoEn: "2024-01-01T00:00:00.000Z",
            semana: 1,
            idioma: "es-BO",
        },
    };
}

describe("ServicioAnonimizacionSha256.seudonimo", () => {
    it("produce un hash SHA-256 en hex de 64 caracteres (Req. 23.2)", () => {
        const s = servicio.seudonimo("usuario-1", "salt");
        expect(s).toMatch(/^[0-9a-f]{64}$/);
    });

    it("es consistente para el mismo (id, salt) (Req. 23.4)", () => {
        expect(servicio.seudonimo("u", "salt")).toBe(servicio.seudonimo("u", "salt"));
    });

    it("cambia el seudonimo cuando cambia el salt (Req. 23.4)", () => {
        expect(servicio.seudonimo("u", "salt-a")).not.toBe(servicio.seudonimo("u", "salt-b"));
    });

    it("no contiene el id original (Req. 23.2)", () => {
        const s = servicio.seudonimo("usuario-1", "salt");
        expect(s.includes("usuario-1")).toBe(false);
    });
});

describe("ServicioAnonimizacionSha256.anonimizar", () => {
    const salt = "salt-de-prueba";

    it("reemplaza post.autorId y comments[].autorId por seudonimos (Req. 23.1)", () => {
        const out = servicio.anonimizar(contratoEjemplo(), salt);
        expect(out.post.autorId).toBe(servicio.seudonimo("usuario-1", salt));
        expect(out.comments[0].autorId).toBe(servicio.seudonimo("usuario-2", salt));
        expect(out.comments[1].autorId).toBe(servicio.seudonimo("usuario-3", salt));
        expect(out.comments[2].autorId).toBe(servicio.seudonimo("usuario-1", salt));
    });

    it("asigna el mismo seudonimo al mismo autor en todo el contrato", () => {
        const out = servicio.anonimizar(contratoEjemplo(), salt);
        // post y comentario[2] son ambos "usuario-1"
        expect(out.comments[2].autorId).toBe(out.post.autorId);
    });

    it("seudonimiza enRespuestaA cuando apunta a un autor conocido (Req. 23.1)", () => {
        const out = servicio.anonimizar(contratoEjemplo(), salt);
        expect(out.comments[1].enRespuestaA).toBe(servicio.seudonimo("usuario-1", salt));
    });

    it("conserva enRespuestaA null y referencias externas no-autor", () => {
        const out = servicio.anonimizar(contratoEjemplo(), salt);
        expect(out.comments[0].enRespuestaA).toBeNull();
        expect(out.comments[2].enRespuestaA).toBe("externo-x");
    });

    it("no contiene ningun id original tras anonimizar (Req. 23.1, 13.5)", () => {
        const out = servicio.anonimizar(contratoEjemplo(), salt);
        const serializado = JSON.stringify(out);
        for (const id of ["usuario-1", "usuario-2", "usuario-3"]) {
            expect(serializado.includes(id)).toBe(false);
        }
    });

    it("no muta el contrato original", () => {
        const original = contratoEjemplo();
        servicio.anonimizar(original, salt);
        expect(original.post.autorId).toBe("usuario-1");
        expect(original.comments[1].enRespuestaA).toBe("usuario-1");
    });
});
