/**
 * `JwtAuthGuard` (Passport JWT) del `ServidorGDS`.
 *
 * Protege todas las rutas `/api/gds/*` exigiendo un JWT del colegio valido
 * (Req. 24.1, 24.8). Refuerza la postura fail-closed: ante CUALQUIER fallo de
 * la estrategia (token ausente/invalido/expirado, fallo tecnico de resolucion
 * de rol o ausencia de contexto) DENIEGA el acceso, sin conceder ningun
 * permiso ni siquiera de solo lectura (Req. 24.7, 24.8).
 */
import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { JWT_STRATEGY } from './jwt.strategy';

@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY) {
    /**
     * Centraliza la decision fail-closed: si hay error o no se resolvio un
     * contexto de acceso valido, deniega (UnauthorizedException). Nunca deja
     * pasar una peticion como resultado de un fallo tecnico.
     */
    handleRequest<TUser = unknown>(
        err: unknown,
        user: TUser,
        _info: unknown,
        _context: ExecutionContext,
    ): TUser {
        if (err || !user) {
            throw new UnauthorizedException('no_autorizado');
        }
        return user;
    }
}
