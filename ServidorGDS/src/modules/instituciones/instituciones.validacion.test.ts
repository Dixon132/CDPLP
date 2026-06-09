import { describe, it, expect } from "vitest";
import {
    validarDatosInstitucion,
    validarCambiosInstitucion,
} from "./instituciones.schema";
import { ValidacionInstitucionError } from "./instituciones.errores";
import {
    construirDependencias,
    mensajeDependencia,
} from "./instituciones.dependencias";

/**
 * Pruebas de cordura de la validacion PURA del Gestor_Instituciones
 * (categoria, geolocalizacion, radio) y del mensaje de dependencia (Req. 7).
 * Sin red ni base de datos: solo logica pura.
 */
describe("instituciones: validacion de datos (pura)", () => {
    const base = {
        nombre: "Universidad Mayor",
        categoria: "universidad",
        latitud: -16.5,
        longitud: -68.15,
        radioMetros: 500,
    };

    it("acepta datos validos y normaliza logo/descripcion ausentes a null (Req. 7.1, 7.4)", () => {
        const datos = validarDatosInstitucion(base);
        expect(datos.categoria).toBe("universidad");
        expect(datos.radioMetros).toBe(500);
        expect(datos.logoUrl).toBeNull();
        expect(datos.descripcion).toBeNull();
    });

    it("rechaza una categoria fuera del conjunto admitido (Req. 7.2)", () => {
        expect(() => validarDatosInstitucion({ ...base, categoria: "academia" })).toThrow(
            ValidacionInstitucionError,
        );
    });

    it("rechaza coordenadas fuera de rango (Req. 7.3)", () => {
        expect(() => validarDatosInstitucion({ ...base, latitud: 91 })).toThrow(
            ValidacionInstitucionError,
        );
        expect(() => validarDatosInstitucion({ ...base, longitud: -181 })).toThrow(
            ValidacionInstitucionError,
        );
    });

    it("rechaza un radio no entero o no positivo (Req. 7.3)", () => {
        expect(() => validarDatosInstitucion({ ...base, radioMetros: 0 })).toThrow(
            ValidacionInstitucionError,
        );
        expect(() => validarDatosInstitucion({ ...base, radioMetros: 12.5 })).toThrow(
            ValidacionInstitucionError,
        );
    });

    it("identifica el/los campo(s) no conforme(s) en el error", () => {
        try {
            validarDatosInstitucion({ ...base, categoria: "x", radioMetros: -1 });
            expect.unreachable("deberia haber lanzado");
        } catch (error) {
            expect(error).toBeInstanceOf(ValidacionInstitucionError);
            const campos = (error as ValidacionInstitucionError).detalles.map((d) => d.campo);
            expect(campos).toContain("categoria");
            expect(campos).toContain("radioMetros");
        }
    });

    it("la edicion acepta subconjuntos pero rechaza un cuerpo vacio (Req. 7.5)", () => {
        expect(validarCambiosInstitucion({ nombre: "Nuevo nombre" })).toEqual({
            nombre: "Nuevo nombre",
        });
        expect(() => validarCambiosInstitucion({})).toThrow(ValidacionInstitucionError);
    });
});

describe("instituciones: mensaje de dependencia (Req. 7.6, 7.8)", () => {
    it("sin dependencias permite eliminar y devuelve mensaje vacio", () => {
        const deps = construirDependencias({
            comunidades: 0,
            ciclos: 0,
            evidencias: 0,
            reportes: 0,
        });
        expect(deps.total).toBe(0);
        expect(mensajeDependencia("inst-1", deps)).toBe("");
    });

    it("con dependencias construye un mensaje que las describe", () => {
        const deps = construirDependencias({
            comunidades: 2,
            ciclos: 3,
            evidencias: 0,
            reportes: 1,
        });
        expect(deps.total).toBe(6);
        const mensaje = mensajeDependencia("inst-1", deps);
        expect(mensaje).toContain("inst-1");
        expect(mensaje).toContain("2 comunidad");
        expect(mensaje).toContain("3 ciclo");
        expect(mensaje).toContain("1 reporte");
        expect(mensaje).not.toContain("evidencia");
    });
});
