import { Module } from '@nestjs/common';

import {
    SISTEMA_EVIDENCIAS,
} from './sistema-evidencias.interfaces';
import { SistemaEvidenciasService } from './sistema-evidencias.service';

/**
 * Audit: `Sistema_Evidencias` y recorrido auditable conclusion -> evidencia ->
 * dato original (Req. 30).
 *
 * Migracion base (tarea 3.5): registra el `SistemaEvidenciasService` (sobre el
 * `PrismaService` global) y lo expone tras el token estable
 * `SISTEMA_EVIDENCIAS`, de modo que los consumidores dependan de la interfaz
 * `SistemaEvidencias` y no de la implementacion concreta (Req. 30.2, 30.6).
 */
@Module({
    providers: [
        SistemaEvidenciasService,
        { provide: SISTEMA_EVIDENCIAS, useExisting: SistemaEvidenciasService },
    ],
    exports: [SistemaEvidenciasService, SISTEMA_EVIDENCIAS],
})
export class AuditModule { }
