import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { inicializarSentry } from './common/observability';

/**
 * Prefijo global de la API del servicio autonomo ServidorGDS.
 * Toda la API se expone bajo `/api/gds/*` (Req. 25.8, 1.2).
 */
const GLOBAL_PREFIX = 'api/gds';

/**
 * Bootstrap del backend NestJS autonomo `ServidorGDS`.
 *
 * Configura, de forma transversal a todos los modulos de dominio:
 *  - Prefijo global `/api/gds` (aislado de las rutas del colegio - Req. 1.2, 25.8).
 *  - `ValidationPipe` global con class-validator/class-transformer: rechaza
 *    entradas no conformes identificando el campo (Req. 40.4, 40.5).
 *  - `ExceptionFilter` global con forma de error homogenea.
 *  - Documentacion Swagger/OpenAPI en `/api/gds/docs` (Req. 25.3).
 */
async function bootstrap(): Promise<void> {
    // Captura de errores no controlados (Sentry). Guardada por `SENTRY_DSN`:
    // no-op cuando no hay DSN (dev/test/CI) (Req. 41.2).
    inicializarSentry();

    // `bufferLogs: true` retiene los logs de arranque hasta establecer el
    // logger Pino estructurado como logger de la aplicacion.
    const app = await NestFactory.create(AppModule, { bufferLogs: true });

    // Logger estructurado Pino para toda la app + request logging (Req. 41.1).
    app.useLogger(app.get(PinoLogger));

    // Seguridad de cabeceras HTTP.
    app.use(helmet());

    // CORS para el Frontend_GDS (origen configurable por entorno).
    app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });

    // Todas las rutas viven bajo `/api/gds` (servicio aislado del colegio).
    app.setGlobalPrefix(GLOBAL_PREFIX);

    // Validacion/transformacion global de DTOs de entrada (Req. 40.4, 40.5).
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    // Filtro de excepciones global: respuesta de error homogenea.
    app.useGlobalFilters(new AllExceptionsFilter());

    // Documentacion OpenAPI/Swagger (Req. 25.3).
    const swaggerConfig = new DocumentBuilder()
        .setTitle('Plataforma_GDS - ServidorGDS API')
        .setDescription(
            'API del backend de orquestacion y analisis (NestJS). Servicio autonomo, ' +
            'con base de datos PostgreSQL+pgvector y Redis dedicadas, expuesto bajo /api/gds.',
        )
        .setVersion('0.1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${GLOBAL_PREFIX}/docs`, app, document);

    const port = Number(process.env.PORT ?? 4100);
    await app.listen(port);
    // eslint-disable-next-line no-console
    console.log(
        `[ServidorGDS] NestJS escuchando en http://localhost:${port}/${GLOBAL_PREFIX} (docs: /${GLOBAL_PREFIX}/docs)`,
    );
}

void bootstrap();
