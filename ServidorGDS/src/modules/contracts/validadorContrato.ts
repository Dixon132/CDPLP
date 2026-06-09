/**
 * `Validador_Contrato` - frontera de validacion entre la `Capa_Adquisicion` y la
 * `Capa_Analisis`.
 *
 * Responsabilidades (Req. 2.1, 2.5, 2.6, 3.2, 3.3, 3.4):
 * - `validar(candidato)`: valida un candidato contra el esquema `zod` versionado
 *   y acepta **solo** instancias conformes; ante un campo faltante o de tipo
 *   incorrecto, rechaza y devuelve el/los campo(s) no conforme(s) en
 *   `errores[{ campo, mensaje }]`.
 * - `serializar(contrato)`: serializacion **canonica y determinista** (orden de
 *   claves estable de forma recursiva) que sostiene la propiedad de ida y vuelta.
 * - `deserializar(json)`: parsea el JSON y luego valida; si el JSON es invalido o
 *   no conforme, rechaza con un error descriptivo.
 *
 * Al rechazar datos, se registra un **error descriptivo** antes de que puedan
 * alcanzar la `Capa_Analisis` (Req. 2.5). El registrador es inyectable para
 * facilitar las pruebas; por defecto usa `console.error`.
 *
 * Diseno: design.md > "Contrato Normalizado (frontera entre capas)".
 * _Requirements: 2.1, 2.5, 2.6, 3.2, 3.3, 3.4_
 */
import type { ZodError } from "zod";

import type { ContratoNormalizado } from "./contratoNormalizado";
import { ContratoNormalizadoSchema } from "./contratoNormalizado";

/** Resultado de una operacion de validacion del `Validador_Contrato`. */
export interface ResultadoValidacion {
    ok: boolean;
    contrato?: ContratoNormalizado;
    /** Identifica el/los campo(s) no conforme(s) y su mensaje (Req. 3.3). */
    errores?: Array<{ campo: string; mensaje: string }>;
}

/** Contrato del componente `Validador_Contrato`. */
export interface ValidadorContrato {
    /** Valida un candidato contra el esquema versionado. (Req. 2.5, 2.6, 3.2, 3.3) */
    validar(candidato: unknown): ResultadoValidacion;
    /** Serializa de forma canonica y determinista. */
    serializar(contrato: ContratoNormalizado): string;
    /** Deserializa y valida. (Req. 3.4 round-trip) */
    deserializar(json: string): ResultadoValidacion;
}

/** Firma del registrador de errores inyectable. */
export type RegistradorError = (mensaje: string, detalle?: unknown) => void;

/**
 * Convierte la ruta de un issue de `zod` (p. ej. `["metadata", "semana"]`) en
 * una etiqueta de campo legible (`"metadata.semana"`). La raiz se rotula como
 * `"(raiz)"` cuando el issue no apunta a ningun campo en particular.
 */
function rutaACampo(ruta: ReadonlyArray<PropertyKey>): string {
    if (ruta.length === 0) {
        return "(raiz)";
    }
    return ruta
        .map((segmento) => (typeof segmento === "number" ? `[${segmento}]` : String(segmento)))
        .join(".")
        .replace(/\.\[/g, "[");
}

/** Traduce un `ZodError` a la lista `errores[{ campo, mensaje }]` (Req. 3.3). */
function erroresDesdeZod(error: ZodError): Array<{ campo: string; mensaje: string }> {
    return error.issues.map((issue) => ({
        campo: rutaACampo(issue.path),
        mensaje: issue.message,
    }));
}

/**
 * Serializacion canonica: ordena las claves de los objetos de forma recursiva
 * y preserva el orden de los arreglos. Garantiza una salida determinista para
 * que la igualdad estructural del round-trip sea robusta.
 */
function canonicalizar(valor: unknown): unknown {
    if (Array.isArray(valor)) {
        return valor.map(canonicalizar);
    }
    if (valor !== null && typeof valor === "object") {
        const objeto = valor as Record<string, unknown>;
        const ordenado: Record<string, unknown> = {};
        for (const clave of Object.keys(objeto).sort()) {
            ordenado[clave] = canonicalizar(objeto[clave]);
        }
        return ordenado;
    }
    return valor;
}

/** Implementacion del `Validador_Contrato` basada en el esquema `zod` versionado. */
export class ValidadorContratoZod implements ValidadorContrato {
    private readonly registrarError: RegistradorError;

    constructor(registrarError: RegistradorError = (mensaje, detalle) =>
        // eslint-disable-next-line no-console
        console.error(detalle === undefined ? mensaje : `${mensaje} ${JSON.stringify(detalle)}`)) {
        this.registrarError = registrarError;
    }

    /**
     * Valida un candidato contra el esquema. Acepta solo instancias conformes
     * (Req. 3.2). Si un campo requerido falta o tiene un tipo incorrecto, rechaza
     * y devuelve el/los campo(s) no conforme(s) (Req. 3.3), registrando un error
     * descriptivo antes de que los datos lleguen a la `Capa_Analisis` (Req. 2.5).
     */
    validar(candidato: unknown): ResultadoValidacion {
        const resultado = ContratoNormalizadoSchema.safeParse(candidato);
        if (resultado.success) {
            return { ok: true, contrato: resultado.data };
        }
        const errores = erroresDesdeZod(resultado.error);
        this.registrarError(
            "Validador_Contrato: contrato no conforme rechazado antes de la Capa_Analisis",
            errores
        );
        return { ok: false, errores };
    }

    /**
     * Serializa el contrato de forma canonica y determinista (orden de claves
     * estable), sosteniendo la propiedad de ida y vuelta (Req. 3.4).
     */
    serializar(contrato: ContratoNormalizado): string {
        return JSON.stringify(canonicalizar(contrato));
    }

    /**
     * Parsea el JSON y luego valida (Req. 3.4). Si el JSON esta mal formado o no
     * es conforme, rechaza con un error descriptivo registrado antes de la
     * `Capa_Analisis` (Req. 2.5, 3.3).
     */
    deserializar(json: string): ResultadoValidacion {
        let candidato: unknown;
        try {
            candidato = JSON.parse(json);
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : "JSON invalido";
            const errores = [{ campo: "(raiz)", mensaje: `JSON no parseable: ${mensaje}` }];
            this.registrarError(
                "Validador_Contrato: JSON no parseable rechazado antes de la Capa_Analisis",
                errores
            );
            return { ok: false, errores };
        }
        return this.validar(candidato);
    }
}

/** Instancia reutilizable lista para inyectarse en la frontera entre capas. */
export const validadorContrato: ValidadorContrato = new ValidadorContratoZod();
