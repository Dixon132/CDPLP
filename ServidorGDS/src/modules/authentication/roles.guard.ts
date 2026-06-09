/**
 * `RolesGuard` del `ServidorGDS`.
 *
 * Aplica la matriz de autorizacion por rol GDS (Req. 24.3, 24.4, 24.6, 40.6)
 * sobre el contexto de acceso que el `JwtAuthGuard`/estrategia adjunto a la
 * peticion (`request.user`). Debe ejecutarse DESPUES del `JwtAuthGuard`.
 *
 * Fail-closed: si el endpoint declara roles via `@Roles(...)` y no hay contexto
 * resuelto, o el rol no esta entre los permitidos, DENIEGA (ForbiddenException).
 * Si el endpoint NO declara `@Roles(...)`, este guard no restringe por rol (la
 * autenticacion ya la garantizo el `JwtAuthGuard`).
 */
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type ContextoAcceso, type RolGDS } from '../auth/servicioAutenticacion';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const rolesPermitidos = this.reflector.getAllAndOverride<RolGDS[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Sin restriccion de rol declarada: la autenticacion ya basta.
        if (!rolesPermitidos || rolesPermitidos.length === 0) {
            return true;
        }

        const request = context
            .switchToHttp()
            .getRequest<{ user?: ContextoAcceso }>();
        const contexto = request.user;

        // Fail-closed: sin contexto resuelto no se concede acceso.
        if (!contexto || !contexto.rol) {
            throw new ForbiddenException('sin_contexto_acceso');
        }

        if (!rolesPermitidos.includes(contexto.rol)) {
            throw new ForbiddenException('permiso_insuficiente');
        }

        return true;
    }
}
