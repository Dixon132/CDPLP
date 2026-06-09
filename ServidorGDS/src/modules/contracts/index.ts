/**
 * Modulo `contracts` - Contrato_Normalizado (zod) + Validador_Contrato.
 */
export const MODULE_NAME = "contracts" as const;

export {
    CONTRATO_VERSION,
    MetadataSchema,
    ComentarioSchema,
    ContratoNormalizadoSchema,
} from "./contratoNormalizado";
export type { ContratoNormalizado } from "./contratoNormalizado";

export { ValidadorContratoZod, validadorContrato } from "./validadorContrato";
export type {
    ValidadorContrato,
    ResultadoValidacion,
    RegistradorError,
} from "./validadorContrato";
