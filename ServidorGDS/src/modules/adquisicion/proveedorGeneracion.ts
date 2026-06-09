/**
 * Proveedor de generacion intercambiable (`Proveedor_Generacion`).
 *
 * Interfaz comun que el `Modulo_Simulacion` usa para invocar al LLM concreto
 * (Ollama/Mistral por defecto, Gemini/GPT u otros como alternativa
 * configurable) sin acoplarse a una implementacion. La salida es siempre un
 * `Contrato_Normalizado` ya valido (Req. 4.1, 4.6).
 *
 * Las implementaciones concretas (tarea 5.2 Ollama, 5.6 Gemini) y la
 * `FabricaProveedor` (tarea 5.3) se desarrollan en tareas posteriores.
 *
 * Diseno: design.md > "Proveedor de generacion (intercambiable)".
 * _Requirements: 4.1, 4.6_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import type { Patron, PerfilUsuario } from "./tiposCompartidos";

/**
 * `Zona_Geografica` que ancla el contenido simulado: coordenadas de la
 * `Institucion` mas el radio de analisis recibido del frontend (Req. 33.1).
 */
export interface ZonaGeografica {
    latitud: number; // de la Institucion (Req. 33.1)
    longitud: number; // de la Institucion (Req. 33.1)
    radioMetros: number; // radio de analisis recibido del frontend (Req. 33.1)
}

/**
 * Contexto longitudinal que el `Motor_Memoria_Contextual` construye y entrega
 * al `Proveedor_Generacion` para generar una `Semana_Simulada`.
 */
export interface ContextoGeneracion {
    /** Escenario inmutable durante todo el analisis (Req. 5.3, 8.6, 29.4). */
    escenario: string;
    /**
     * Memoria resumida construida desde la `Memoria_Jerarquica`, NO desde las
     * semanas crudas (Req. 28.5). Prioriza niveles de mayor agregacion cuando
     * se supera el umbral de tokens del proveedor activo (Req. 28.6).
     */
    contextoMemoria: string;
    /** Patrones/tendencias acumulados detectados hasta la semana actual. */
    patronesAcumulados: Patron[];
    /** Usuarios sinteticos que se reutilizan, no se regeneran (Req. 10.3). */
    usuariosSinteticos: PerfilUsuario[];
    /** Ancla el contenido a la zona (Req. 33.2). */
    zonaGeografica: ZonaGeografica;
    /** Numero de `Semana_Simulada` a generar. */
    semana: number;
    /** Identificadores de la `Comunidad_Digital` destino. */
    comunidad: { institucionId: string; analisisId: string };
}

/**
 * Interfaz comun de los proveedores de generacion. El `Modulo_Simulacion`
 * invoca exclusivamente esta interfaz (Req. 4.1) y recibe siempre un
 * `Contrato_Normalizado` ya valido (Req. 4.6).
 */
export interface ProveedorGeneracion {
    /** Nombre del proveedor concreto (p. ej. "ollama", "gemini"). */
    readonly nombre: "gemini" | "ollama" | string;
    /** Limite de tokens de contexto del proveedor activo (Req. 5.2, 28.6). */
    readonly limiteTokens: number;
    /**
     * Genera y devuelve un `Contrato_Normalizado` ya valido, anclado a la zona
     * (Req. 4.6, 33.2).
     */
    generar(ctx: ContextoGeneracion): Promise<ContratoNormalizado>;
}

/**
 * Fabrica que selecciona la implementacion de `ProveedorGeneracion` por
 * configuracion. Usa Ollama (modelo Mistral) por defecto si no se especifica;
 * Gemini/GPT u otros como alternativa configurable (Req. 4.3, 4.4).
 */
export interface FabricaProveedor {
    crear(config?: { proveedor?: string }): ProveedorGeneracion;
}
