/**
 * Pruebas unitarias del nucleo PURO de la asociacion patron -> `Zona_Geografica`
 * (`Detector_Patrones`, Req. 33.3, 33.4, 33.5).
 *
 * Cubren el mapeo de la zona a sus columnas persistidas, la asociacion de uno y
 * de varios patrones a su zona/origen (trazabilidad), el saneo del radio a
 * entero no negativo y la agrupacion por zona para comparacion. La verificacion
 * universal por propiedades vive en la tarea 15.6 (Property 38).
 * _Requirements: 33.3, 33.4, 33.5_
 */
import { describe, expect, it } from "vitest";

import type { ZonaGeografica } from "../adquisicion/proveedorGeneracion";
import {
    aRadioMetrosEntero,
    aRegistroPatron,
    agruparPorZona,
    asociarPatronesAZona,
    claveZona,
    type OrigenComunidad,
    type PatronDetectado,
    zonaAColumnas,
} from "./detectorPatrones";

const zona: ZonaGeografica = { latitud: -16.5, longitud: -68.15, radioMetros: 1500 };
const origen: OrigenComunidad = { analisisId: "ana-1", comunidadId: "com-1" };

describe("aRadioMetrosEntero", () => {
    it("redondea radios fraccionarios al entero mas cercano", () => {
        expect(aRadioMetrosEntero(1500.4)).toBe(1500);
        expect(aRadioMetrosEntero(1500.6)).toBe(1501);
    });

    it("acota radios negativos a 0", () => {
        expect(aRadioMetrosEntero(-10)).toBe(0);
    });

    it("trata radios no finitos como 0", () => {
        expect(aRadioMetrosEntero(Number.NaN)).toBe(0);
        expect(aRadioMetrosEntero(Number.POSITIVE_INFINITY)).toBe(0);
    });
});

describe("zonaAColumnas", () => {
    it("mapea coordenadas + radio a las columnas de gds_patron (Req. 33.4)", () => {
        expect(zonaAColumnas(zona)).toEqual({
            zonaLatitud: -16.5,
            zonaLongitud: -68.15,
            zonaRadioMetros: 1500,
        });
    });

    it("normaliza coordenadas no finitas a 0 sin corromper la fila", () => {
        expect(
            zonaAColumnas({ latitud: Number.NaN, longitud: Number.POSITIVE_INFINITY, radioMetros: 100 }),
        ).toEqual({ zonaLatitud: 0, zonaLongitud: 0, zonaRadioMetros: 100 });
    });
});

describe("aRegistroPatron", () => {
    it("asocia un patron a su zona y origen para trazabilidad (Req. 33.3, 33.4)", () => {
        const patron: PatronDetectado = { tipo: "tendencia", descripcion: "alza de estres academico" };
        expect(aRegistroPatron(patron, zona, origen)).toEqual({
            analisisId: "ana-1",
            comunidadId: "com-1",
            zonaLatitud: -16.5,
            zonaLongitud: -68.15,
            zonaRadioMetros: 1500,
            tipo: "tendencia",
            descripcion: "alza de estres academico",
        });
    });
});

describe("asociarPatronesAZona", () => {
    it("ancla cada patron a la misma zona conservando orden y cardinalidad (Req. 33.4)", () => {
        const patrones: PatronDetectado[] = [
            { tipo: "tendencia", descripcion: "p1" },
            { tipo: "anomalia", descripcion: "p2" },
            { tipo: "recurrencia", descripcion: "p3" },
        ];
        const registros = asociarPatronesAZona(patrones, zona, origen);

        expect(registros).toHaveLength(3);
        expect(registros.map((r) => r.descripcion)).toEqual(["p1", "p2", "p3"]);
        for (const registro of registros) {
            expect(registro.zonaLatitud).toBe(zona.latitud);
            expect(registro.zonaLongitud).toBe(zona.longitud);
            expect(registro.zonaRadioMetros).toBe(zona.radioMetros);
            expect(registro.analisisId).toBe(origen.analisisId);
            expect(registro.comunidadId).toBe(origen.comunidadId);
        }
    });

    it("devuelve una lista vacia cuando no hay patrones detectados (Req. 16.2)", () => {
        expect(asociarPatronesAZona([], zona, origen)).toEqual([]);
    });
});

describe("agruparPorZona / claveZona", () => {
    it("agrupa patrones por su Zona_Geografica para comparacion por zona (Req. 33.5)", () => {
        const zonaA = zona;
        const zonaB: ZonaGeografica = { latitud: -17.78, longitud: -63.18, radioMetros: 2000 };
        const origenB: OrigenComunidad = { analisisId: "ana-1", comunidadId: "com-2" };

        const registros = [
            ...asociarPatronesAZona([{ tipo: "t", descripcion: "a1" }], zonaA, origen),
            ...asociarPatronesAZona(
                [
                    { tipo: "t", descripcion: "b1" },
                    { tipo: "t", descripcion: "b2" },
                ],
                zonaB,
                origenB,
            ),
        ];

        const grupos = agruparPorZona(registros);
        expect(grupos.size).toBe(2);
        expect(grupos.get(claveZona(zonaAColumnas(zonaA)))?.map((r) => r.descripcion)).toEqual(["a1"]);
        expect(grupos.get(claveZona(zonaAColumnas(zonaB)))?.map((r) => r.descripcion)).toEqual([
            "b1",
            "b2",
        ]);
    });
});
