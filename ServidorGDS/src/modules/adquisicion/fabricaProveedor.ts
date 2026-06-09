/**
 * `FabricaProveedorRegistro` - implementacion de `FabricaProveedor` (tarea 5.3).
 *
 * Selecciona la implementacion concreta de `ProveedorGeneracion` por
 * **configuracion**, sin que el `Modulo_Simulacion` conozca el LLM concreto
 * (Req. 4.1). Usa **Ollama (modelo Mistral) por defecto** cuando no se
 * especifica proveedor (Req. 4.3) y permite **cambiar de proveedor sin cambios
 * de codigo** (Req. 4.4): basta con pasar `{ proveedor: "..." }` a `crear`.
 *
 * La fabrica mantiene un **registro por nombre** (`Map<string, Constructor>`)
 * para tolerar que se anadan proveedores nuevos (p. ej. Gemini, tarea 5.6) sin
 * tocar el codigo de la fabrica: basta con `registrar("gemini", ...)`. Por
 * construccion, anadir Gemini mas adelante **no** requiere ningun cambio aqui.
 *
 * Comportamiento ante nombre desconocido: si se solicita explicitamente un
 * proveedor que no esta registrado, la fabrica lanza
 * `ErrorProveedorDesconocido` con un mensaje descriptivo que lista los
 * proveedores disponibles (falla visible ante una mala configuracion). Cuando
 * **no** se especifica proveedor (campo ausente o vacio), se usa el proveedor
 * por defecto (`ollama`) sin error (Req. 4.3).
 *
 * Los constructores se invocan de forma **perezosa** en `crear`, de modo que
 * registrar un proveedor no fuerza su instanciacion (ni conexiones de red).
 *
 * Diseno: design.md > "Proveedor de generacion (intercambiable)".
 * _Requirements: 4.3, 4.4_
 */
import type { FabricaProveedor, ProveedorGeneracion } from "./proveedorGeneracion";
import type { ConfiguracionOllama, DependenciasOllama } from "./proveedorOllamaMistral";
import { ProveedorOllamaMistral } from "./proveedorOllamaMistral";

/** Nombre del proveedor por defecto al inicio: Ollama/Mistral (Req. 4.3). */
export const PROVEEDOR_POR_DEFECTO = "ollama" as const;

/**
 * Constructor perezoso de un `ProveedorGeneracion`. Se invoca solo cuando la
 * fabrica resuelve `crear` para el nombre asociado.
 */
export type ConstructorProveedor = () => ProveedorGeneracion;

/**
 * Error lanzado cuando se solicita explicitamente un proveedor que no esta
 * registrado en la fabrica. El mensaje identifica el nombre solicitado y lista
 * los proveedores disponibles para diagnosticar una mala configuracion.
 */
export class ErrorProveedorDesconocido extends Error {
    /** Nombre del proveedor solicitado (normalizado a minusculas). */
    readonly solicitado: string;
    /** Proveedores registrados disponibles al momento del fallo. */
    readonly disponibles: readonly string[];

    constructor(solicitado: string, disponibles: readonly string[]) {
        super(
            `Proveedor de generacion desconocido: "${solicitado}". ` +
            `Proveedores disponibles: ${disponibles.length > 0 ? disponibles.join(", ") : "(ninguno)"}.`,
        );
        this.name = "ErrorProveedorDesconocido";
        this.solicitado = solicitado;
        this.disponibles = [...disponibles];
    }
}

/** Normaliza un nombre de proveedor (minusculas, sin espacios sobrantes). */
function normalizarNombre(nombre: string): string {
    return nombre.trim().toLowerCase();
}

/** Opciones de construccion de la `FabricaProveedorRegistro`. */
export interface OpcionesFabricaProveedor {
    /**
     * Nombre del proveedor por defecto cuando `crear` no recibe uno. Por
     * defecto `"ollama"` (Req. 4.3).
     */
    porDefecto?: string;
    /**
     * Si es `true` (por defecto), registra automaticamente el proveedor
     * `ollama` (Ollama/Mistral). Si es `false`, la fabrica nace vacia y el
     * llamador debe registrar sus proveedores.
     */
    registrarOllamaPorDefecto?: boolean;
    /** Configuracion pasada al `ProveedorOllamaMistral` auto-registrado. */
    configOllama?: ConfiguracionOllama;
    /** Dependencias inyectables del `ProveedorOllamaMistral` auto-registrado. */
    depsOllama?: DependenciasOllama;
}

/**
 * Fabrica de `ProveedorGeneracion` basada en un registro por nombre. Soporta
 * registrar proveedores adicionales (Gemini, etc.) sin modificar su codigo.
 */
export class FabricaProveedorRegistro implements FabricaProveedor {
    private readonly registro = new Map<string, ConstructorProveedor>();
    private readonly porDefecto: string;

    constructor(opciones: OpcionesFabricaProveedor = {}) {
        this.porDefecto = normalizarNombre(opciones.porDefecto ?? PROVEEDOR_POR_DEFECTO);

        // Ollama/Mistral por defecto al inicio (Req. 4.3). Registro perezoso:
        // la instancia solo se crea cuando se resuelve `crear("ollama")`.
        if (opciones.registrarOllamaPorDefecto !== false) {
            this.registrar(
                PROVEEDOR_POR_DEFECTO,
                () => new ProveedorOllamaMistral(opciones.configOllama, opciones.depsOllama),
            );
        }
    }

    /**
     * Registra (o reemplaza) un proveedor por nombre. Anadir un proveedor nuevo
     * (p. ej. Gemini) no requiere modificar la fabrica (Req. 4.4). Devuelve
     * `this` para encadenar registros.
     */
    registrar(nombre: string, constructor: ConstructorProveedor): this {
        this.registro.set(normalizarNombre(nombre), constructor);
        return this;
    }

    /** Indica si hay un proveedor registrado bajo `nombre`. */
    tieneProveedor(nombre: string): boolean {
        return this.registro.has(normalizarNombre(nombre));
    }

    /** Lista los nombres de proveedores registrados (orden de insercion). */
    proveedoresRegistrados(): string[] {
        return [...this.registro.keys()];
    }

    /**
     * Crea el `ProveedorGeneracion` segun configuracion. Si `config.proveedor`
     * esta ausente o vacio, usa el proveedor por defecto (`ollama`, Req. 4.3).
     * Si se solicita un proveedor no registrado, lanza
     * `ErrorProveedorDesconocido` (Req. 4.4: cambiar de proveedor es solo
     * configuracion; una mala configuracion falla de forma visible).
     */
    crear(config?: { proveedor?: string }): ProveedorGeneracion {
        const solicitado = config?.proveedor?.trim();
        const nombre =
            solicitado !== undefined && solicitado.length > 0
                ? normalizarNombre(solicitado)
                : this.porDefecto;

        const constructor = this.registro.get(nombre);
        if (constructor === undefined) {
            throw new ErrorProveedorDesconocido(nombre, this.proveedoresRegistrados());
        }
        return constructor();
    }
}

/**
 * Instancia compartida lista para usar, con Ollama/Mistral por defecto.
 * Para anadir Gemini mas adelante (tarea 5.6) basta con:
 *   `fabricaProveedor.registrar("gemini", () => new ProveedorGemini(...));`
 * sin modificar esta fabrica (Req. 4.4).
 */
export const fabricaProveedor = new FabricaProveedorRegistro();
