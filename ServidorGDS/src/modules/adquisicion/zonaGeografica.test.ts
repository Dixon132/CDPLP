/**
 * Pruebas unitarias de la derivacion y anclaje de la `Zona_Geografica`
 * (tarea 15.2).
 *
 * Cubren:
 *  - **Derivacion exacta (Req. 33.1):** la zona combina EXACTAMENTE las
 *    coordenadas de la `Institucion` con el radio de analisis recibido.
 *  - **Anclaje en el contexto (Req. 33.2):** la zona derivada queda presente en
 *    el `ContextoGeneracion` sin alterar el resto del contexto longitudinal y
 *    sin mutar el objeto original (funciones puras).
 *  - **Validacion:** se rechazan coordenadas no finitas y radios invalidos.
 *
 * _Requirements: 33.1, 33.2_
 */
import { describe, expect, it } from "vitest";

import type { ContextoGeneracion } from "./proveedorGeneracion";
import {
    anclarZonaDerivada,
    anclarZonaEnContexto,
    derivarZonaDeInstitucion,
    derivarZonaGeografica,
} from "./zonaGeografica";

function contextoBase(overrides: Partial<ContextoGeneracion> = {}): ContextoGeneracion {
    return {
        escenario: "Conflicto Universitario",
        contextoMemoria: "memoria resumida",
        patronesAcumulados: [],
        usuariosSinteticos: [],
        zonaGeografica: { latitud: 0, longitud: 0, radioMetros: 0 },
        semana: 1,
        comunidad: { institucionId: "inst-1", analisisId: "ana-1" },
        ...overrides,
    };
}

describe("derivarZonaGeografica", () => {
    it("combina exactamente las coordenadas con el radio de analisis (Req. 33.1)", () => {
        const zona = derivarZonaGeografica(-16.5, -68.15, 1500);
        expect(zona).toEqual({ latitud: -16.5, longitud: -68.15, radioMetros: 1500 });
    });

    it("preserva los valores numericos sin transformarlos", () => {
        const zona = derivarZonaGeografica(-17.783633, -63.182117, 2375);
        expect(zona.latitud).toBe(-17.783633);
        expect(zona.longitud).toBe(-63.182117);
        expect(zona.radioMetros).toBe(2375);
    });

    it("acepta radio cero como caso limite valido", () => {
        expect(derivarZonaGeografica(0, 0, 0)).toEqual({
            latitud: 0,
            longitud: 0,
            radioMetros: 0,
        });
    });

    it("rechaza coordenadas no finitas (Req. 33.1)", () => {
        expect(() => derivarZonaGeografica(Number.NaN, 0, 100)).toThrow(RangeError);
        expect(() => derivarZonaGeografica(0, Number.POSITIVE_INFINITY, 100)).toThrow(RangeError);
    });

    it("rechaza radios no finitos o negativos", () => {
        expect(() => derivarZonaGeografica(0, 0, Number.NaN)).toThrow(RangeError);
        expect(() => derivarZonaGeografica(0, 0, -1)).toThrow(RangeError);
    });
});

describe("derivarZonaDeInstitucion", () => {
    it("deriva la zona desde las coordenadas agrupadas de la institucion", () => {
        const zona = derivarZonaDeInstitucion({ latitud: -16.5, longitud: -68.15 }, 800);
        expect(zona).toEqual({ latitud: -16.5, longitud: -68.15, radioMetros: 800 });
    });
});

describe("anclarZonaEnContexto", () => {
    it("incluye la zona derivada en el ContextoGeneracion (Req. 33.2)", () => {
        const zona = derivarZonaGeografica(-16.5, -68.15, 1500);
        const ctx = anclarZonaEnContexto(contextoBase(), zona);
        expect(ctx.zonaGeografica).toEqual(zona);
    });

    it("no muta el contexto original y preserva el resto del contexto", () => {
        const original = contextoBase({ escenario: "Pandemia", semana: 7 });
        const zona = derivarZonaGeografica(1, 2, 300);
        const ctx = anclarZonaEnContexto(original, zona);

        expect(ctx).not.toBe(original);
        expect(original.zonaGeografica).toEqual({ latitud: 0, longitud: 0, radioMetros: 0 });
        expect(ctx.escenario).toBe("Pandemia");
        expect(ctx.semana).toBe(7);
        expect(ctx.comunidad).toEqual(original.comunidad);
    });
});

describe("anclarZonaDerivada", () => {
    it("deriva y ancla la zona en un solo paso (Req. 33.1, 33.2)", () => {
        const ctx = anclarZonaDerivada(
            contextoBase(),
            { latitud: -16.5, longitud: -68.15 },
            1200,
        );
        expect(ctx.zonaGeografica).toEqual({
            latitud: -16.5,
            longitud: -68.15,
            radioMetros: 1200,
        });
    });

    it("propaga la validacion del radio invalido", () => {
        expect(() =>
            anclarZonaDerivada(contextoBase(), { latitud: 0, longitud: 0 }, -5),
        ).toThrow(RangeError);
    });
});
