/**
 * Verificador del JWT emitido por el sistema del colegio.
 *
 * Usa el `JWT_SECRET` COMPARTIDO (variable de entorno) para validar la firma y
 * vigencia del token, SIN consultar la base de datos del colegio (Req. 24.1).
 *
 * Mapea los errores de `jsonwebtoken` a la taxonomia del Servicio_Autenticacion:
 *  - Firma invalida / token malformado / `NotBefore` -> `ErrorTokenInvalido`.
 *  - Token expirado -> `ErrorTokenInvalido` (deniega 401 sin reintentar).
 *  - Cualquier otro fallo inesperado -> `ErrorTecnicoValidacion` (reintenta).
 */
import jwt, {
    JsonWebTokenError,
    NotBeforeError,
    TokenExpiredError,
    type JwtPayload,
} from "jsonwebtoken";
import {
    ErrorTecnicoValidacion,
    ErrorTokenInvalido,
    type PayloadVerificado,
    type VerificadorJwt,
} from "./servicioAutenticacion";

export class VerificadorJwtColegio implements VerificadorJwt {
    private readonly secreto: string;

    constructor(secreto: string) {
        this.secreto = secreto;
    }

    async verificar(token: string): Promise<PayloadVerificado> {
        // Sin secreto configurado no es posible validar: fallo tecnico (fail-closed).
        if (!this.secreto) {
            throw new ErrorTecnicoValidacion("jwt_secret_no_configurado");
        }

        try {
            const decodificado = jwt.verify(token, this.secreto);
            if (typeof decodificado === "string") {
                throw new ErrorTokenInvalido("payload_no_objeto");
            }
            const payload = decodificado as JwtPayload & {
                userId?: number | string;
                id?: number | string;
            };
            // El JWT del colegio firma `userId` (id_usuario). Aceptamos `id`
            // como alternativa por robustez ante variantes de emision.
            const userId = payload.userId ?? payload.id;
            if (userId === undefined || userId === null || userId === "") {
                throw new ErrorTokenInvalido("payload_sin_userId");
            }
            return { ...payload, userId };
        } catch (error) {
            if (error instanceof ErrorTokenInvalido) {
                throw error;
            }
            if (
                error instanceof TokenExpiredError ||
                error instanceof JsonWebTokenError ||
                error instanceof NotBeforeError
            ) {
                // Problema criptografico / vigencia -> deniega sin reintentar.
                throw new ErrorTokenInvalido(error.message);
            }
            // Fallo inesperado -> tecnico (se reintenta con backoff).
            throw new ErrorTecnicoValidacion(
                error instanceof Error ? error.message : "error_tecnico"
            );
        }
    }
}
