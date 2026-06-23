import { Module } from '@nestjs/common';
import { DashboardController, IndicadoresController } from './dashboard.controller';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Dashboard: indicadores globales, estados de ciclos y control del slider de
 * progreso. Esqueleto del modulo de dominio (Req. 25.2).
 */
@Module({
    imports: [PrismaModule],
    controllers: [DashboardController, IndicadoresController],
})
export class DashboardModule { }
