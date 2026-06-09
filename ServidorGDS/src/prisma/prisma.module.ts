import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Modulo global que provee el `PrismaService` (cliente propio del servicio)
 * a todos los modulos de dominio del `ServidorGDS`.
 *
 * Es `@Global()` para evitar reimportarlo en cada modulo: el acceso a datos
 * del backend pasa siempre por este unico cliente conectado a la base de datos
 * DEDICADA (PostgreSQL + pgvector), nunca a la del colegio (Req. 25.1, 25.3).
 */
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule { }
