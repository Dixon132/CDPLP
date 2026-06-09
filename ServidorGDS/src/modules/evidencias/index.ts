/**
 * Modulo `evidencias` - `Sistema_Evidencias` (subsistema desacoplado).
 *
 * Almacena/sirve `Evidencia` por id trazable a semana, comunidad/institucion y
 * analisis, con recorrido auditable conclusion -> evidencia -> dato original,
 * contenido anonimizado y marca de `Contributividad` (Req. 30, 34.5).
 */
export const MODULE_NAME = "evidencias" as const;

export {
    Contributividad,
    type Evidencia,
    type RecorridoAuditoria,
    type SistemaEvidencias,
    type TipoEvidencia,
} from "./interfaces";

export {
    SistemaEvidenciasPrisma,
    sistemaEvidencias,
    mapRowToEvidencia,
    mapEvidenciaToCreateInput,
} from "./sistemaEvidencias";
