/**
 * Validacion (zod) de los datos de una `Institucion`.
 *
 * Reglas de geolocalizacion y categoria (Req. 7.2, 7.3):
 *  - `categoria` debe pertenecer a {universidad, colegio, instituto, escuela}.
 *  - `latitud` en [-90, 90]; `longitud` en [-180, 180] (grados decimales).
 *  - `radioMetros` entero positivo (radio de influencia en metros).
 *  - `logoUrl` y `descripcion` son opcionales (Req. 7.4).
 *
 * Las funciones puras `validarDatosInstitucion` / `validarCambiosInstitucion`
 * normalizan la entrada y, ante datos no conformes, lanzan
 * `ValidacionInstitucionError` con el/los campo(s) no conforme(s).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
 */
import { z } from "zod";
import { CATEGORIAS_INSTITUCION } from "./instituciones.types";
import type { CambiosInstitucion, DatosInstitucion } from "./instituciones.types";
import {
    ValidacionInstitucionError,
    type DetalleValidacion,
} from "./instituciones.errores";

const nombreSchema = z
    .string({ required_error: "requerido", invalid_type_error: "debe ser texto" })
    .trim()
    .min(1, "no puede estar vacio")
    .max(200, "maximo 200 caracteres");

const categoriaSchema = z.enum(CATEGORIAS_INSTITUCION, {
    errorMap: () => ({
        message: `debe ser una de: ${CATEGORIAS_INSTITUCION.join(", ")}`,
    }),
});

const latitudSchema = z
    .number({ required_error: "requerido", invalid_type_error: "debe ser numero" })
    .min(-90, "fuera de rango [-90, 90]")
    .max(90, "fuera de rango [-90, 90]");

const longitudSchema = z
    .number({ required_error: "requerido", invalid_type_error: "debe ser numero" })
    .min(-180, "fuera de rango [-180, 180]")
    .max(180, "fuera de rango [-180, 180]");

const radioMetrosSchema = z
    .number({ required_error: "requerido", invalid_type_error: "debe ser numero" })
    .int("debe ser entero")
    .positive("debe ser mayor que 0");

// Campos opcionales: se normaliza `undefined`/"" a `null` para persistencia.
const logoUrlSchema = z
    .string()
    .trim()
    .max(2048, "maximo 2048 caracteres")
    .nullish()
    .transform((v) => (v == null || v === "" ? null : v));

const descripcionSchema = z
    .string()
    .trim()
    .max(2000, "maximo 2000 caracteres")
    .nullish()
    .transform((v) => (v == null || v === "" ? null : v));

/** Esquema de alta: todos los campos obligatorios salvo logo/descripcion. */
export const DatosInstitucionSchema = z.object({
    nombre: nombreSchema,
    categoria: categoriaSchema,
    latitud: latitudSchema,
    longitud: longitudSchema,
    radioMetros: radioMetrosSchema,
    logoUrl: logoUrlSchema.default(null),
    descripcion: descripcionSchema.default(null),
});

/** Esquema de edicion: cualquier subconjunto de campos (Req. 7.5). */
export const CambiosInstitucionSchema = z
    .object({
        nombre: nombreSchema,
        categoria: categoriaSchema,
        latitud: latitudSchema,
        longitud: longitudSchema,
        radioMetros: radioMetrosSchema,
        logoUrl: logoUrlSchema,
        descripcion: descripcionSchema,
    })
    .partial();

/** Convierte un `ZodError` en la lista de `DetalleValidacion` del dominio. */
function aDetalles(error: z.ZodError): DetalleValidacion[] {
    return error.issues.map((issue) => ({
        campo: issue.path.join(".") || "(raiz)",
        motivo: issue.message,
    }));
}

/** Valida y normaliza los datos de alta; lanza `ValidacionInstitucionError`. */
export function validarDatosInstitucion(entrada: unknown): DatosInstitucion {
    const resultado = DatosInstitucionSchema.safeParse(entrada);
    if (!resultado.success) {
        throw new ValidacionInstitucionError(aDetalles(resultado.error));
    }
    return resultado.data;
}

/** Valida y normaliza los cambios de edicion; lanza `ValidacionInstitucionError`. */
export function validarCambiosInstitucion(entrada: unknown): CambiosInstitucion {
    const resultado = CambiosInstitucionSchema.safeParse(entrada);
    if (!resultado.success) {
        throw new ValidacionInstitucionError(aDetalles(resultado.error));
    }
    if (Object.keys(resultado.data).length === 0) {
        throw new ValidacionInstitucionError([
            { campo: "(raiz)", motivo: "no se proporciono ningun campo a actualizar" },
        ]);
    }
    return resultado.data;
}
