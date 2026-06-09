/**
 * Pruebas unitarias de la frontera de la `Capa_Adquisicion` (tarea 11.1):
 * tipos `IDataProvider`/`ContextoGeneracion` y la abstraccion de fabrica
 * `FabricaDataProvider` (`FabricaDataProviderRegistro`).
 *
 * Solo se verifica el contrato/seleccion de proveedor con dobles de test; los
 * proveedores concretos (Gemini/Ollama) se implementan en 11.2/11.3.
 * _Requirements: 4.1, 4.2, 4.6_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "../contracts/contratoNormalizado";
import {
    FabricaDataProviderRegistro,
    PROVEEDOR_POR_DEFECTO,
    type ContextoGeneracion,
    type IDataProvider,
    type NombreProveedor,
} from "./dataProvider";

function contratoEjemplo(): ContratoNormalizado {
    return {
        post: { autorId: "u1", texto: "hola" },
        comments: [],
        image_description: "una plaza",
        hashtags: ["#x"],
        metadata: {
            version: CONTRATO_VERSION,
            fuente: "simulacion",
            generadoEn: "2024-01-01T00:00:00.000Z",
            semana: 1,
            idioma: "es-BO",
        },
    };
}

/** Doble de test de `IDataProvider` que devuelve un contrato fijo. */
function dobleProveedor(nombre: NombreProveedor, limiteTokens = 8000): IDataProvider {
    return {
        nombre,
        limiteTokens,
        generar: jest.fn(async (_ctx: ContextoGeneracion) => contratoEjemplo()),
    };
}

function contextoEjemplo(): ContextoGeneracion {
    return {
        escenario: "tension estudiantil",
        contextoMemoria: "resumen",
        contextoSemantico: ["frag-1", "frag-2"],
        patronesAcumulados: [],
        usuariosSinteticos: [],
        zonaGeografica: { latitud: -16.5, longitud: -68.15, radioMetros: 500 },
        semana: 3,
        comunidad: { institucionId: "inst-1", analisisId: "an-1" },
    };
}

describe("ContextoGeneracion / IDataProvider (contrato de tipos)", () => {
    it("un IDataProvider expone nombre, limiteTokens y generar -> Contrato_Normalizado", async () => {
        const proveedor = dobleProveedor("gemini");
        expect(proveedor.nombre).toBe("gemini");
        expect(typeof proveedor.limiteTokens).toBe("number");

        const contrato = await proveedor.generar(contextoEjemplo());
        expect(contrato.metadata.version).toBe(CONTRATO_VERSION);
        expect(contrato.post.texto).toBe("hola");
    });

    it("pasa el ContextoGeneracion al proveedor al generar", async () => {
        const proveedor = dobleProveedor("ollama");
        const ctx = contextoEjemplo();
        await proveedor.generar(ctx);
        expect(proveedor.generar).toHaveBeenCalledWith(ctx);
    });
});

describe("FabricaDataProviderRegistro", () => {
    it("usa GeminiProvider por defecto cuando no se especifica proveedor (Req. 4.3)", () => {
        const gemini = dobleProveedor("gemini");
        const ollama = dobleProveedor("ollama");
        const fabrica = new FabricaDataProviderRegistro([gemini, ollama]);

        expect(fabrica.crear()).toBe(gemini);
        expect(fabrica.crear({})).toBe(gemini);
        expect(PROVEEDOR_POR_DEFECTO).toBe("gemini");
    });

    it("selecciona el proveedor solicitado por nombre (Req. 4.2, 4.4)", () => {
        const gemini = dobleProveedor("gemini");
        const ollama = dobleProveedor("ollama");
        const fabrica = new FabricaDataProviderRegistro([gemini, ollama]);

        expect(fabrica.crear({ proveedor: "ollama" })).toBe(ollama);
        expect(fabrica.crear({ proveedor: "gemini" })).toBe(gemini);
    });

    it("lanza un error claro si el proveedor solicitado no esta registrado", () => {
        const fabrica = new FabricaDataProviderRegistro([dobleProveedor("gemini")]);
        expect(() => fabrica.crear({ proveedor: "meta" })).toThrow(/meta/);
        expect(() => fabrica.crear({ proveedor: "meta" })).toThrow(/no registrado/i);
    });

    it("lanza un error si no hay proveedores registrados", () => {
        const fabrica = new FabricaDataProviderRegistro([]);
        expect(() => fabrica.crear()).toThrow(/ninguno/);
    });

    it("permite un proveedor por defecto distinto (proveedores futuros contemplados)", () => {
        const historical = dobleProveedor("historical");
        const fabrica = new FabricaDataProviderRegistro([historical], "historical");
        expect(fabrica.crear()).toBe(historical);
    });
});
