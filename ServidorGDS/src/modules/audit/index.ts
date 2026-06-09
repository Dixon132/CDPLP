/**
 * Modulo `audit` - `Sistema_Evidencias` (subsistema desacoplado) migrado a
 * NestJS (tarea 3.5).
 *
 * Almacena/sirve `Evidencia` por id trazable a semana, comunidad/institucion y
 * analisis, con recorrido auditable conclusion -> evidencia -> dato original,
 * contenido anonimizado y marca de `Contributividad` (Req. 30, 34.5).
 */
export {
    Contributividad,
    SISTEMA_EVIDENCIAS,
    type Evidencia,
    type OrigenConclusion,
    type RecorridoAuditoria,
    type RecorridoConclusion,
    type SistemaEvidencias,
    type TipoEvidencia,
    type TipoOrigen,
} from './sistema-evidencias.interfaces';

export {
    SistemaEvidenciasService,
    mapRowToEvidencia,
    mapEvidenciaToCreateInput,
} from './sistema-evidencias.service';

export { AuditModule } from './audit.module';
