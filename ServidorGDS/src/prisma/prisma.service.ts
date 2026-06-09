import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma PROPIO del servicio autonomo `ServidorGDS`.
 *
 * Se conecta EXCLUSIVAMENTE a la base de datos PostgreSQL + pgvector DEDICADA
 * de la Plataforma_GDS, a traves de su propio `DATABASE_URL` (Req. 25.1, 25.3).
 * NUNCA referencia ni accede a la base de datos del colegio: el aislamiento es
 * fisico (base de datos separada) y se refuerza pasando explicitamente la URL
 * dedicada como `datasource` al cliente.
 *
 * Gestiona el ciclo de vida de la conexion segun el ciclo de vida del modulo
 * Nest: abre la conexion en `onModuleInit` y la cierra en `onModuleDestroy`.
 */
@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor(config: ConfigService) {
        // La URL dedicada se resuelve desde la configuracion del propio servicio.
        // Se pasa de forma explicita al cliente para garantizar que se usa la
        // base de datos DEDICADA y no cualquier otra (aislamiento - Req. 25.3).
        const databaseUrl = config.get<string>('DATABASE_URL');

        super({
            datasources: databaseUrl
                ? { db: { url: databaseUrl } }
                : undefined,
        });
    }

    /**
     * Abre la conexion con la BD dedicada al inicializarse el modulo.
     */
    async onModuleInit(): Promise<void> {
        await this.$connect();
        this.logger.log('Conectado a la base de datos dedicada de la Plataforma_GDS');
    }

    /**
     * Cierra de forma ordenada la conexion al destruirse el modulo.
     */
    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
    }
}
