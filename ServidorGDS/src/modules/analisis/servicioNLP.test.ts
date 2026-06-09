/**
 * Pruebas unitarias de sanidad del `Servicio_NLP` (Req. 14, 16.1).
 *
 * Verifican la INTERFAZ ESTABLE y la FORMA de las salidas (semantico,
 * emocional, tematico, causas/eventos/detonantes, conversacional y tendencias),
 * el determinismo de la implementacion base y que las conclusiones se derivan de
 * comprension contextual y no de reglas lexicas fijas (Req. 16.1). La cobertura
 * completa de unidad del NLP vive en la sub-tarea 11.4.
 * _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 16.1_
 */
import { describe, expect, it } from "vitest";

import { CONTRATO_VERSION, type ContratoNormalizado } from "../contracts/contratoNormalizado";
import {
    analizarContrato,
    ServicioNLPBase,
    servicioNLP,
    tokenizar,
} from "./servicioNLP";

function contrato(overrides: Partial<ContratoNormalizado> = {}): ContratoNormalizado {
    return {
        post: { autorId: "u1", texto: "El paro en la universidad ya cansa a todos" },
        comments: [
            { autorId: "u2", texto: "El paro otra vez, que paro tan largo", enRespuestaA: "u1" },
            { autorId: "u3", texto: "Tranquilos, pasara pronto el paro", enRespuestaA: "u2" },
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
        ...overrides,
    };
}

describe("tokenizar", () => {
    it("normaliza a minusculas y conserva acentos/no-ASCII", () => {
        expect(tokenizar("Ánimo compañeros")).toEqual(["ánimo", "compañeros"]);
    });

    it("descarta tokens muy cortos (ruido estructural)", () => {
        expect(tokenizar("yo no se")).toEqual([]);
    });
});

describe("ServicioNLPBase.analizar", () => {
    it("expone la interfaz estable y devuelve un ResultadoNLP completo", async () => {
        const r = await servicioNLP.analizar(contrato());

        expect(r.derivadoDeComprensionContextual).toBe(true);
        // Semantico: 3 items (post + 2 comentarios) y diversidad lexica en [0,1].
        expect(r.semantico.totalItems).toBe(3);
        expect(r.semantico.totalTokens).toBeGreaterThan(0);
        expect(r.semantico.diversidadLexica).toBeGreaterThanOrEqual(0);
        expect(r.semantico.diversidadLexica).toBeLessThanOrEqual(1);
        expect(Array.isArray(r.semantico.terminosClave)).toBe(true);

        // Emocional: senal en sus rangos y distribucion graduada que suma ~1.
        const { valencia, activacion, intensidad, dispersion } = r.emocional.senal;
        expect(valencia).toBeGreaterThanOrEqual(-1);
        expect(valencia).toBeLessThanOrEqual(1);
        for (const v of [activacion, intensidad, dispersion]) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
        }
        const suma = Object.values(r.emocional.distribucion).reduce((a, b) => a + b, 0);
        expect(suma).toBeCloseTo(1, 5);

        // Conversacional: una interaccion por item y profundidad creciente.
        expect(r.conversacional.interacciones).toHaveLength(3);
        expect(r.conversacional.profundidadMaxima).toBeGreaterThanOrEqual(1);

        // Tendencias: al menos una interpretacion con direccion valida.
        expect(r.tendencias.length).toBeGreaterThanOrEqual(1);
        expect(["ascendente", "descendente", "estable"]).toContain(
            r.tendencias[0].direccion,
        );
    });

    it("infiere eventos a partir de los hashtags del ecosistema (Req. 14.2)", async () => {
        const r = await servicioNLP.analizar(contrato());
        const eventos = r.elementosCausales.filter((e) => e.tipo === "evento");
        expect(eventos.length).toBe(2);
        expect(eventos.map((e) => e.descripcion).join(" ")).toContain("#paro");
    });

    it("hace emerger temas del corpus por co-ocurrencia (no diccionario fijo)", async () => {
        // Corpus con varios items: "transporte" co-ocurre en un subconjunto (no en
        // todos), por lo que es discriminante y NO se descarta como stopword
        // contextual; debe emerger como tema agrupando esos items.
        const r = await servicioNLP.analizar(
            contrato({
                post: { autorId: "u1", texto: "Hoy hubo asamblea general muy larga" },
                comments: [
                    { autorId: "u2", texto: "El transporte publico esta carisimo", enRespuestaA: null },
                    { autorId: "u3", texto: "Sin transporte no llego a clases nunca", enRespuestaA: "u2" },
                    { autorId: "u4", texto: "La cafeteria cambio el menu otra vez", enRespuestaA: null },
                ],
                hashtags: [],
            }),
        );
        const tema = r.tematico.grupos.find((g) => g.terminos.includes("transporte"));
        expect(tema).toBeDefined();
        expect(tema?.itemRefs.length).toBeGreaterThanOrEqual(2);
    });

    it("es determinista: misma entrada produce la misma salida", () => {
        const c = contrato();
        expect(analizarContrato(c)).toEqual(analizarContrato(c));
    });

    it("acepta cero relaciones y contenido vacio sin fallar (Req. 16.2)", async () => {
        const vacio = contrato({
            post: { autorId: "u1", texto: "" },
            comments: [],
            hashtags: [],
        });
        const r = await new ServicioNLPBase().analizar(vacio);
        expect(r.semantico.totalItems).toBe(1);
        expect(r.tematico.grupos).toEqual([]);
        expect(r.elementosCausales).toEqual([]);
        expect(r.tendencias).toEqual([]);
    });
});
