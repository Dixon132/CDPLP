import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AiModule } from './ai/ai.module';
import { CommonModule } from './common/common.module';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { AiEngineModule } from './modules/ai-engine/ai-engine.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { NlpEngineModule } from './modules/nlp-engine/nlp-engine.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SimulationModule } from './modules/simulation/simulation.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { UsersModule } from './modules/users/users.module';
import { VisionEngineModule } from './modules/vision-engine/vision-engine.module';
import { WsModule } from './modules/ws/ws.module';

/**
 * Modulo raiz del `ServidorGDS`.
 *
 * Importa la configuracion de entorno (su propio `.env`), las piezas
 * transversales (eventos internos, cola, cliente de IA, utilidades comunes) y
 * todos los modulos de dominio del backend (Req. 25.1, 25.2). El servicio es
 * autonomo: no importa simbolos del Servidor del colegio ni del modulo IREC.
 */
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // Acceso a datos: cliente Prisma propio -> BD dedicada (global, Req. 25.1, 25.3)
        PrismaModule,
        // Transversales / infraestructura
        CommonModule,
        EventsModule,
        QueueModule,
        AiModule,
        // Modulos de dominio
        DashboardModule,
        InstitutionsModule,
        AnalysisModule,
        CommunitiesModule,
        SimulationModule,
        TimelineModule,
        SchedulerModule,
        AiEngineModule,
        NlpEngineModule,
        VisionEngineModule,
        ReportsModule,
        AuditModule,
        UsersModule,
        AuthenticationModule,
        // WS Hub de progreso en vivo (handshake JWT fail-closed, tarea 24.1)
        WsModule,
    ],
    controllers: [AppController],
})
export class AppModule { }
