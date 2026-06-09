import { Module } from '@nestjs/common';

import { AiEngineModule } from '../ai-engine/ai-engine.module';
import { MEMORIA_SEMANTICA } from '../ai-engine/memoriaSemantica';
import {
    FUENTE_RESUMEN_SEMANAL,
    MEMORIA_HISTORICA_REPOSITORIO,
    MEMORIA_REPOSITORIO,
    MOTOR_MEMORIA_CONTEXTUAL,
    RECUPERADOR_SEMANTICO,
} from './memoria/motor-memoria-contextual.types';
import { MemoriaRepositorioPrisma } from './memoria/memoria-repositorio';
import { MemoriaHistoricaRepositorioPrisma } from './memoria/memoria-historica-repositorio';
import { MotorMemoriaContextualService } from './memoria/motor-memoria-contextual.service';
import { FuenteResumenSemanalPrisma } from './memoria/fuente-resumen-semanal.prisma';

/**
 * Timeline: `Motor_Temporal`, trazabilidad y `Memoria_Jerarquica` (Req. 25.2).
 *
 * Migracion base (tarea 3.5): registra el `Motor_Memoria_Contextual` y su puerto
 * de persistencia `MemoriaRepositorio` como providers NestJS sobre el
 * `PrismaService` global, exponiendolos tras tokens estables.
 *
 * Tarea 22.2: cablea el complemento del `construirContexto`:
 *  - `RECUPERADOR_SEMANTICO` -> `MEMORIA_SEMANTICA` (Embeddings_Search del
 *    `ai-engine`, con degradacion segura a la `Memoria_Jerarquica`, Req. 28.5,
 *    36.3);
 *  - `MEMORIA_HISTORICA_REPOSITORIO` -> persistencia de la memoria historica
 *    (`gds_tendencia_historica`/`gds_evento_historico`, Req. 39.1-39.4).
 */
@Module({
    imports: [AiEngineModule],
    providers: [
        MemoriaRepositorioPrisma,
        { provide: MEMORIA_REPOSITORIO, useExisting: MemoriaRepositorioPrisma },
        MemoriaHistoricaRepositorioPrisma,
        {
            provide: MEMORIA_HISTORICA_REPOSITORIO,
            useExisting: MemoriaHistoricaRepositorioPrisma,
        },
        { provide: FUENTE_RESUMEN_SEMANAL, useClass: FuenteResumenSemanalPrisma },
        // Embeddings_Search del ai-engine satisface el puerto RecuperadorSemantico.
        { provide: RECUPERADOR_SEMANTICO, useExisting: MEMORIA_SEMANTICA },
        MotorMemoriaContextualService,
        {
            provide: MOTOR_MEMORIA_CONTEXTUAL,
            useExisting: MotorMemoriaContextualService,
        },
    ],
    exports: [
        MotorMemoriaContextualService,
        MOTOR_MEMORIA_CONTEXTUAL,
        MEMORIA_REPOSITORIO,
        MEMORIA_HISTORICA_REPOSITORIO,
    ],
})
export class TimelineModule { }
