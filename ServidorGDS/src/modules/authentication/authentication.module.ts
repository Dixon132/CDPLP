import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { VerificadorJwtColegio } from '../auth/verificadorJwt';
import { AlmacenRolesPrismaService } from './almacen-roles-prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { ServicioAutenticacionService } from './servicio-autenticacion.service';

/**
 * Authentication: Servicio_Autenticacion (JWT + Passport, fail-closed).
 *
 * Valida el JWT emitido por el colegio con el `JWT_SECRET` COMPARTIDO y resuelve
 * los roles GDS (`ADMIN_PLATAFORMA`/`ANALISTA`/`OBSERVADOR`) contra la PROPIA
 * base de datos del servicio (`gds_usuario_plataforma`/`gds_rol_plataforma`),
 * sin FK ni acceso a la BD del colegio (Req. 24, 25.3).
 *
 * Expone, para que el resto de modulos protejan sus rutas `/api/gds/*` y el
 * handshake WS:
 *  - `JwtStrategy` (Passport JWT) registrada como estrategia `jwt`.
 *  - `JwtAuthGuard` (autenticacion fail-closed) y `RolesGuard` (autorizacion
 *    por rol con el decorador `@Roles(...)`).
 *  - `ServicioAutenticacionService` (entrada canonica `autorizar`/`puede`).
 *
 * _Requirements: 24.1-24.8, 40.6_
 */
@Module({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    providers: [
        // Almacen de roles GDS respaldado por el PrismaService propio (Req. 25.3).
        AlmacenRolesPrismaService,
        // Servicio_Autenticacion fail-closed: verifica el JWT del colegio con el
        // secreto compartido y resuelve el rol GDS contra la BD propia (Req. 24).
        {
            provide: ServicioAutenticacionService,
            inject: [ConfigService, AlmacenRolesPrismaService],
            useFactory: (
                config: ConfigService,
                almacenRoles: AlmacenRolesPrismaService,
            ): ServicioAutenticacionService =>
                new ServicioAutenticacionService(
                    new VerificadorJwtColegio(config.get<string>('JWT_SECRET') ?? ''),
                    almacenRoles,
                ),
        },
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
    ],
    exports: [
        ServicioAutenticacionService,
        JwtAuthGuard,
        RolesGuard,
        PassportModule,
    ],
})
export class AuthenticationModule { }
