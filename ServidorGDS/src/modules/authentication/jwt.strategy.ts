/**
 * Estrategia Passport JWT del `ServidorGDS`.
 *
 * Valida el JWT emitido por el colegio con el `JWT_SECRET` COMPARTIDO (variable
 * de entorno) extrayendolo de la cabecera `Authorization: Bearer ...`. Tras una
 * validacion criptografica exitosa, resuelve el rol GDS del usuario contra la
 * PROPIA base de datos del servicio (Req. 24.1, 24.2, 25.3).
 *
 * Fail-closed (Req. 24.7, 24.8): si el usuario no tiene rol GDS, o la
 * resolucion del rol falla tecnicamente tras los reintentos con backoff, se
 * DENIEGA el acceso (UnauthorizedException). El acceso se concede UNICAMENTE
 * tras una validacion de identidad exitosa con rol GDS resuelto.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, type StrategyOptions } from 'passport-jwt';

import { type ContextoAcceso } from '../auth/servicioAutenticacion';
import { ServicioAutenticacionService } from './servicio-autenticacion.service';

/** Identificador de la estrategia (usado por `AuthGuard('jwt')`). */
export const JWT_STRATEGY = 'jwt';

/**
 * Clave de respaldo cuando NO hay `JWT_SECRET` configurado: garantiza que la
 * verificacion FALLE (fail-closed) en vez de arrojar al construir la estrategia.
 * Nunca coincidira con un token real firmado por el colegio.
 */
const CLAVE_FAIL_CLOSED = 'JWT_SECRET_NO_CONFIGURADO_FAIL_CLOSED';

/** Payload del JWT del colegio: firma `userId` (admitimos `id` por robustez). */
interface PayloadColegio {
    userId?: number | string;
    id?: number | string;
    [clave: string]: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY) {
    constructor(
        config: ConfigService,
        private readonly servicio: ServicioAutenticacionService,
    ) {
        const secreto = config.get<string>('JWT_SECRET');
        const opciones: StrategyOptions = {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            // Token expirado -> Passport falla la verificacion -> 401 (fail-closed).
            ignoreExpiration: false,
            secretOrKey: secreto && secreto.length > 0 ? secreto : CLAVE_FAIL_CLOSED,
        };
        super(opciones);
    }

    /**
     * Se invoca SOLO si la firma y vigencia del JWT son validas. Resuelve el rol
     * GDS contra la BD propia y devuelve el contexto de acceso, que Nest adjunta
     * a `request.user`. Fail-closed ante ausencia de id, ausencia de rol o fallo
     * tecnico de resolucion.
     */
    async validate(payload: PayloadColegio): Promise<ContextoAcceso> {
        const idUsuario = payload?.userId ?? payload?.id;
        if (idUsuario === undefined || idUsuario === null || idUsuario === '') {
            throw new UnauthorizedException('token_sin_userId');
        }

        let contexto: ContextoAcceso | null;
        try {
            contexto = await this.servicio.resolverContexto(idUsuario);
        } catch {
            // Fallo tecnico tras backoff -> denegar sin acceso (Req. 24.7).
            throw new UnauthorizedException('roles_no_disponibles');
        }

        // Usuario valido pero sin rol GDS: sin acceso, ni de solo lectura (Req. 24.8).
        if (contexto === null) {
            throw new UnauthorizedException('sin_rol_gds');
        }

        return contexto;
    }
}
