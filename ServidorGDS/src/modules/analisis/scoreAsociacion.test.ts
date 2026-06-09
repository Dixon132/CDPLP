/**
 * Pruebas unitarias del nucleo PURO del `Score_Asociacion` (Req. 11).
 *
 * Cubren el rango/clamp del score (Req. 11.1), la combinacion de los ocho
 * factores (Req. 11.2) y la naturaleza probabilistica (sin certezas) del
 * resultado (Req. 11.3). La verificacion universal por propiedades vive en la
 * tarea 14.2 (Property 15).
 * _Requirements: 11.1, 11.2, 11.3_
 */
import { describe, expect, it } from "vitest";

import {
    calcularScoreAsociacion,
    clamp01,
    FACTORES_ASOCIACION,
    PESOS_POR_DEFECTO,
    type FactoresAsociacion,
} from "./scoreAsociacion";

function factores(valor: number): FactoresAsociacion {
    return {
        interacciones: valor,
        frecuencia: valor,
        temas: valor,
        contexto: valor,
        participacion: valor,
        recurrencia: valor,
        ubicacion: valor,
        historial: valor,
    };
}

describe("clamp01", () => {
    it("acota valores por debajo de 0 a 0", () => {
        expect(clamp01(-0.5)).toBe(0);
        expect(clamp01(-1000)).toBe(0);
    });

    it("acota valores por encima de 1 a 1", () => {
        expect(clamp01(1.5)).toBe(1);
        expect(clamp01(1000)).toBe(1);
    });

    it("conserva valores ya dentro de [0, 1]", () => {
        expect(clamp01(0)).toBe(0);
        expect(clamp01(0.42)).toBe(0.42);
        expect(clamp01(1)).toBe(1);
    });

    it("trata valores no finitos como 0 (NaN, Infinity, -Infinity)", () => {
        expect(clamp01(Number.NaN)).toBe(0);
        expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
        expect(clamp01(Number.NEGATIVE_INFINITY)).toBe(0);
    });
});

describe("calcularScoreAsociacion", () => {
    it("devuelve 0 cuando todos los factores son 0 (Req. 11.1)", () => {
        expect(calcularScoreAsociacion(factores(0))).toBe(0);
    });

    it("devuelve 1 cuando todos los factores son 1 (Req. 11.1)", () => {
        expect(calcularScoreAsociacion(factores(1))).toBe(1);
    });

    it("devuelve el valor comun cuando todos los factores coinciden", () => {
        expect(calcularScoreAsociacion(factores(0.5))).toBeCloseTo(0.5, 12);
    });

    it("nunca afirma certeza: con factores parciales el score queda en (0, 1) (Req. 11.3)", () => {
        const score = calcularScoreAsociacion(factores(0.3));
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(1);
    });

    it("acota a [0, 1] aunque las entradas excedan el rango (Req. 11.1)", () => {
        expect(calcularScoreAsociacion(factores(5))).toBe(1);
        expect(calcularScoreAsociacion(factores(-5))).toBe(0);
    });

    it("sanea factores no finitos sin salir de rango (Req. 11.1)", () => {
        const mezcla = factores(1);
        mezcla.interacciones = Number.NaN;
        mezcla.frecuencia = Number.POSITIVE_INFINITY;
        const score = calcularScoreAsociacion(mezcla);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
        // dos factores saneados a 0 y seis a 1, equiponderados => 6/8.
        expect(score).toBeCloseTo(6 / 8, 12);
    });

    it("considera los ocho factores (Req. 11.2): variar uno cambia el score", () => {
        const base = factores(0);
        for (const clave of FACTORES_ASOCIACION) {
            const variante = { ...base, [clave]: 1 };
            const score = calcularScoreAsociacion(variante);
            expect(score).toBeCloseTo(PESOS_POR_DEFECTO[clave], 12);
            expect(score).toBeGreaterThan(0);
        }
    });

    it("respeta pesos personalizados normalizando por su suma", () => {
        const f = factores(0);
        f.interacciones = 1;
        // Solo interacciones pesa => el score iguala su factor (1).
        const score = calcularScoreAsociacion(f, {
            interacciones: 1,
            frecuencia: 0,
            temas: 0,
            contexto: 0,
            participacion: 0,
            recurrencia: 0,
            ubicacion: 0,
            historial: 0,
        });
        expect(score).toBe(1);
    });

    it("recurre a equiponderacion si los pesos son invalidos (suma <= 0)", () => {
        const score = calcularScoreAsociacion(factores(0.5), {
            interacciones: -1,
            frecuencia: Number.NaN,
            temas: 0,
            contexto: 0,
            participacion: 0,
            recurrencia: 0,
            ubicacion: 0,
            historial: 0,
        });
        expect(score).toBeCloseTo(0.5, 12);
    });
});
