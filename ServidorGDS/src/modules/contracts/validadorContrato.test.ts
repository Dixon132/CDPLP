/**
 * Pruebas unitarias del `Validador_Contrato` (validar / serializar / deserializar).
 * _Requirements: 2.1, 2.5, 2.6, 3.2, 3.3, 3.4_
 */
import { describe, expect, it, vi } from "vitest";

import type { ContratoNormalizado } from "./contratoNormalizado";
import { CONTRATO_VERSION } from "./contratoNormalizado";
import { ValidadorContratoZod } from "./validadorContrato";

function contratoEjemplo(): ContratoNormalizado {
    return {
        post: { autorId: "usuario-1", texto: "Hola comunidad" },
        comments: [
            { autorId: "usuario-2", texto: "Estoy de acuerdo", enRespuestaA: null },
            { autorId: "usuario-3", texto: "Yo no tanto", enRespuestaA: "usuario-1" },
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

describe("ValidadorContratoZod.validar", () => {
    it("acepta un contrato conforme y devuelve el contrato parseado (Req. 3.2)", () => {
        const validador = new ValidadorContratoZod(vi.fn());
        const resultado = validador.validar(contratoEjemplo());
        expect(resultado.ok).toBe(true);
        expect(resultado.contrato).toBeDefined();
        expect(resultado.errores).toBeUndefined();
    });

    it("rechaza un contrato sin un campo requerido e identifica el campo (Req. 3.3)", () => {
        const registrar = vi.fn();
        const validador = new ValidadorContratoZod(registrar);
        const candidato = contratoEjemplo() as Record<string, unknown>;
        delete candidato.hashtags;

        const resultado = validador.validar(candidato);
        expect(resultado.ok).toBe(false);
        expect(resultado.contrato).toBeUndefined();
        expect(resultado.errores).toBeDefined();
        expect(resultado.errores?.some((e) => e.campo === "hashtags")).toBe(true);
        // Registra un error descriptivo antes de llegar a la Capa_Analisis (Req. 2.5).
        expect(registrar).toHaveBeenCalledTimes(1);
    });

    it("rechaza un campo con tipo incorrecto e identifica la ruta anidada (Req. 3.3)", () => {
        const validador = new ValidadorContratoZod(vi.fn());
        const candidato = contratoEjemplo() as unknown as Record<string, any>;
        candidato.metadata.semana = "no-es-numero";

        const resultado = validador.validar(candidato);
        expect(resultado.ok).toBe(false);
        expect(resultado.errores?.some((e) => e.campo === "metadata.semana")).toBe(true);
    });

    it("identifica la ruta de un comentario invalido con indice (Req. 3.3)", () => {
        const validador = new ValidadorContratoZod(vi.fn());
        const candidato = contratoEjemplo() as unknown as Record<string, any>;
        candidato.comments[1].autorId = "";

        const resultado = validador.validar(candidato);
        expect(resultado.ok).toBe(false);
        expect(resultado.errores?.some((e) => e.campo === "comments[1].autorId")).toBe(true);
    });
});

describe("ValidadorContratoZod.serializar", () => {
    it("produce una salida con orden de claves estable y determinista", () => {
        const validador = new ValidadorContratoZod(vi.fn());
        const contrato = contratoEjemplo();
        const s1 = validador.serializar(contrato);
        // Mismo contenido, claves de metadata en orden distinto.
        const reordenado: ContratoNormalizado = {
            metadata: { ...contrato.metadata },
            hashtags: contrato.hashtags,
            image_description: contrato.image_description,
            comments: contrato.comments,
            post: contrato.post,
        };
        const s2 = validador.serializar(reordenado);
        expect(s1).toBe(s2);
        // Las claves de nivel superior quedan ordenadas alfabeticamente.
        expect(s1.indexOf('"comments"')).toBeLessThan(s1.indexOf('"hashtags"'));
        expect(s1.indexOf('"hashtags"')).toBeLessThan(s1.indexOf('"image_description"'));
    });

    it("preserva el orden de los arreglos", () => {
        const validador = new ValidadorContratoZod(vi.fn());
        const s = validador.serializar(contratoEjemplo());
        expect(s.indexOf("#paro")).toBeLessThan(s.indexOf("#universidad"));
    });
});

describe("ValidadorContratoZod.deserializar", () => {
    it("deserializa y valida un JSON conforme (Req. 3.4)", () => {
        const validador = new ValidadorContratoZod(vi.fn());
        const json = validador.serializar(contratoEjemplo());
        const resultado = validador.deserializar(json);
        expect(resultado.ok).toBe(true);
        expect(resultado.contrato).toBeDefined();
    });

    it("rechaza un JSON mal formado con error descriptivo (Req. 2.5, 3.3)", () => {
        const registrar = vi.fn();
        const validador = new ValidadorContratoZod(registrar);
        const resultado = validador.deserializar("{ no es json valido");
        expect(resultado.ok).toBe(false);
        expect(resultado.errores?.[0].campo).toBe("(raiz)");
        expect(registrar).toHaveBeenCalledTimes(1);
    });

    it("rechaza un JSON parseable pero no conforme (Req. 3.3)", () => {
        const validador = new ValidadorContratoZod(vi.fn());
        const resultado = validador.deserializar(JSON.stringify({ post: {} }));
        expect(resultado.ok).toBe(false);
        expect(resultado.errores?.length).toBeGreaterThan(0);
    });

    it("round-trip: deserializar(serializar(c)) produce un contrato equivalente (Req. 3.4)", () => {
        const validador = new ValidadorContratoZod(vi.fn());
        const contrato = contratoEjemplo();
        const resultado = validador.deserializar(validador.serializar(contrato));
        expect(resultado.ok).toBe(true);
        expect(resultado.contrato).toEqual(contrato);
    });
});
