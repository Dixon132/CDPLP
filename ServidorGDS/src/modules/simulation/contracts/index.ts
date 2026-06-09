/**
 * Frontera estable de la `Capa_Analisis`: Contrato_Normalizado (zod versionado)
 * + Validador_Contrato. Migrado al modulo `simulation` (tarea 3.1).
 *
 * Punto unico de importacion para el resto del backend NestJS; expone el tipo
 * estable `ContratoNormalizado`, el esquema `zod` versionado y el validador
 * (clase, instancia reutilizable y provider inyectable).
 */
export {
    CONTRATO_VERSION,
    MetadataSchema,
    ComentarioSchema,
    ContratoNormalizadoSchema,
} from "./contratoNormalizado";
export type { ContratoNormalizado } from "./contratoNormalizado";

export {
    ValidadorContratoZod,
    ValidadorContratoService,
    validadorContrato,
} from "./validadorContrato";
export type {
    ValidadorContrato,
    ResultadoValidacion,
    RegistradorError,
} from "./validadorContrato";
