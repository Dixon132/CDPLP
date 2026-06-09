import { Module } from '@nestjs/common';

import { AiModule } from '../../ai/ai.module';
import { CapaMlClient } from '../../ai/servicio-ia.client';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import {
    ALMACEN_EMBEDDINGS,
    AlmacenEmbeddingsPrisma,
} from './embeddingRepositorio';
import { MEMORIA_SEMANTICA } from './memoriaSemantica';
import {
    BUSCADOR_SEMANTICO,
    MemoriaSemanticaService,
} from './memoriaSemantica.service';

/**
 * AI Engine: Capa_ML via Servicio_IA, embeddings/pgvector y calibracion.
 *
 * Cableado (tareas 9.1 + 9.2): el indexador/recuperador de la `Memoria_Semantica`
 * ({@link MemoriaSemanticaService}) que:
 *  - genera embeddings via `Servicio_IA` (token `CAPA_ML`, resuelto por
 *    disponibilidad en {@link AiModule}) y los acumula en `pgvector` a traves del
 *    puerto append-only {@link AlmacenEmbeddingsPrisma} sobre la BD dedicada
 *    (Req. 36.1, 36.2, 36.5);
 *  - recupera contexto por similitud (`Embeddings_Search`) delegando la busqueda
 *    al `Servicio_IA` (token `BUSCADOR_SEMANTICO` -> {@link CapaMlClient},
 *    `POST /embeddings/search`) y resolviendo el ambito colectivo/trazabilidad
 *    contra `gds_embedding`, con degradacion segura a la `Memoria_Jerarquica`
 *    ante fallo (Req. 36.3, 36.6, 28.5).
 *
 * _Requirements: 36.1, 36.2, 36.3, 36.5, 28.5_
 */
@Module({
    imports: [AiModule, PrismaModule],
    providers: [
        {
            provide: ALMACEN_EMBEDDINGS,
            inject: [PrismaService],
            useFactory: (prisma: PrismaService) =>
                new AlmacenEmbeddingsPrisma(prisma),
        },
        {
            // El Embeddings_Search se delega al cliente HTTP del Servicio_IA
            // (POST /embeddings/search), capacidad extra del CapaMlClient.
            provide: BUSCADOR_SEMANTICO,
            useExisting: CapaMlClient,
        },
        {
            provide: MEMORIA_SEMANTICA,
            useClass: MemoriaSemanticaService,
        },
    ],
    exports: [MEMORIA_SEMANTICA, ALMACEN_EMBEDDINGS],
})
export class AiEngineModule { }
