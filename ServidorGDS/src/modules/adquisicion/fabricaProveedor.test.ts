/**
 * Pruebas unitarias de la `FabricaProveedorRegistro` (tarea 5.3, Req. 4.3, 4.4).
 *
 * Verifican de forma determinista (sin red ni base de datos):
 *  - seleccion por defecto: sin proveedor especificado -> Ollama/Mistral (Req. 4.3).
 *  - seleccion explicita: `{ proveedor: "ollama" }` -> Ollama/Mistral.
 *  - cambio de proveedor sin cambios de codigo: registrar un proveedor nuevo
 *    (doble de "gemini") y seleccionarlo solo por configuracion (Req. 4.4).
 *  - nombre desconocido -> `ErrorProveedorDesconocido` con lista de disponibles.
 *  - registro perezoso: registrar no instancia el proveedor hasta `crear`.
 *
 * _Requirements: 4.3, 4.4_
 */
import { describe, expect, it } from "vitest";

import type { ContextoGeneracion, ProveedorGeneracion } from "./proveedorGeneracion";
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import {
    ErrorProveedorDesconocido,
    FabricaProveedorRegistro,
    PROVEEDOR_POR_DEFECTO,
    fabricaProveedor,
} from "./fabricaProveedor";
import { ProveedorOllamaMistral } from "./proveedorOllamaMistral";

/** Doble de proveedor que permite verificar la seleccion sin red. */
class ProveedorDoble implements ProveedorGeneracion {
    readonly limiteTokens = 4096;
    constructor(readonly nombre: string) { }
    async generar(_ctx: ContextoGeneracion): Promise<ContratoNormalizado> {
        throw new Error("no invocado en estas pruebas");
    }
}

describe("FabricaProveedorRegistro", () => {
    it("usa Ollama/Mistral por defecto cuando no se especifica proveedor (Req. 4.3)", () => {
        const fabrica = new FabricaProveedorRegistro();

        const sinConfig = fabrica.crear();
        const configVacia = fabrica.crear({});
        const proveedorVacio = fabrica.crear({ proveedor: "" });
        const proveedorEspacios = fabrica.crear({ proveedor: "   " });

        expect(sinConfig).toBeInstanceOf(ProveedorOllamaMistral);
        expect(sinConfig.nombre).toBe("ollama");
        expect(configVacia).toBeInstanceOf(ProveedorOllamaMistral);
        expect(proveedorVacio).toBeInstanceOf(ProveedorOllamaMistral);
        expect(proveedorEspacios).toBeInstanceOf(ProveedorOllamaMistral);
    });

    it("selecciona Ollama/Mistral cuando se especifica explicitamente (case-insensitive)", () => {
        const fabrica = new FabricaProveedorRegistro();

        expect(fabrica.crear({ proveedor: "ollama" })).toBeInstanceOf(ProveedorOllamaMistral);
        expect(fabrica.crear({ proveedor: "OLLAMA" })).toBeInstanceOf(ProveedorOllamaMistral);
        expect(fabrica.crear({ proveedor: "  Ollama  " })).toBeInstanceOf(ProveedorOllamaMistral);
    });

    it("permite cambiar de proveedor solo por configuracion sin tocar la fabrica (Req. 4.4)", () => {
        const fabrica = new FabricaProveedorRegistro();
        fabrica.registrar("gemini", () => new ProveedorDoble("gemini"));

        const porDefecto = fabrica.crear();
        const elegido = fabrica.crear({ proveedor: "gemini" });

        expect(porDefecto.nombre).toBe("ollama");
        expect(elegido.nombre).toBe("gemini");
        expect(elegido).toBeInstanceOf(ProveedorDoble);
        // Ambos proveedores conviven en el registro (Req. 4.4).
        expect(fabrica.proveedoresRegistrados()).toEqual(["ollama", "gemini"]);
        expect(fabrica.tieneProveedor("gemini")).toBe(true);
    });

    it("lanza ErrorProveedorDesconocido para un proveedor no registrado", () => {
        const fabrica = new FabricaProveedorRegistro();

        expect(() => fabrica.crear({ proveedor: "inexistente" })).toThrow(
            ErrorProveedorDesconocido,
        );
        try {
            fabrica.crear({ proveedor: "inexistente" });
        } catch (error) {
            expect(error).toBeInstanceOf(ErrorProveedorDesconocido);
            const e = error as ErrorProveedorDesconocido;
            expect(e.solicitado).toBe("inexistente");
            expect(e.disponibles).toContain("ollama");
            expect(e.message).toContain("inexistente");
            expect(e.message).toContain("ollama");
        }
    });

    it("respeta un proveedor por defecto personalizado", () => {
        const fabrica = new FabricaProveedorRegistro({ porDefecto: "gemini" });
        fabrica.registrar("gemini", () => new ProveedorDoble("gemini"));

        expect(fabrica.crear().nombre).toBe("gemini");
        expect(fabrica.crear({ proveedor: "ollama" })).toBeInstanceOf(ProveedorOllamaMistral);
    });

    it("registra los proveedores de forma perezosa (no instancia hasta crear)", () => {
        const fabrica = new FabricaProveedorRegistro({ registrarOllamaPorDefecto: false });
        let instanciaciones = 0;
        fabrica.registrar("gemini", () => {
            instanciaciones += 1;
            return new ProveedorDoble("gemini");
        });

        // Registrar no instancia.
        expect(instanciaciones).toBe(0);

        fabrica.crear({ proveedor: "gemini" });
        expect(instanciaciones).toBe(1);

        fabrica.crear({ proveedor: "gemini" });
        expect(instanciaciones).toBe(2);
    });

    it("la fabrica vacia (sin Ollama) falla al pedir el proveedor por defecto", () => {
        const fabrica = new FabricaProveedorRegistro({ registrarOllamaPorDefecto: false });

        expect(fabrica.proveedoresRegistrados()).toEqual([]);
        expect(() => fabrica.crear()).toThrow(ErrorProveedorDesconocido);
    });

    it("expone una instancia compartida con Ollama/Mistral por defecto", () => {
        expect(PROVEEDOR_POR_DEFECTO).toBe("ollama");
        expect(fabricaProveedor.crear()).toBeInstanceOf(ProveedorOllamaMistral);
        expect(fabricaProveedor.tieneProveedor("ollama")).toBe(true);
    });
});
