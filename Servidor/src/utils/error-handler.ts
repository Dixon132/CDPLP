import { NextFunction, Request, RequestHandler, Response } from "express";
import { ErrorCodes, HttpException } from "../exceptions/root";
import BadRequestException from "../exceptions/bad-request";
import { ZodError } from "zod";
import InternalException from "../exceptions/internal-exception";
import { AuditMeta, registrarAuditoria } from "./auditoria";

type AsyncController = (
    req: Request,
    res: Response,
    next: NextFunction
)=>Promise<any>;

const METODOS_MUTADORES = ["POST", "PUT", "PATCH", "DELETE"];

/**
 * Envuelve un controlador con manejo de errores y, si se le pasa `auditoria`,
 * con auditoría automática.
 *
 * La auditoría se dispara SOLO cuando las tres condiciones se cumplen:
 *  1. el método HTTP es mutador (POST/PUT/PATCH/DELETE) — las rutas de
 *     lectura nunca se auditan;
 *  2. hay un usuario de sesión de dashboard en `req.user` — las rutas
 *     públicas (p. ej. postulaciones) y las de la app de campo (que solo
 *     traen `req.campo`) NO generan auditoría, por decisión explícita: aquí
 *     solo se registra lo que pasa DENTRO del dashboard;
 *  3. la respuesta fue exitosa (`res.statusCode < 400`) — un rechazo de
 *     validación o un error no se audita como si hubiera ocurrido.
 *
 * Esto es lo que garantiza "ninguna ruta mutadora se puede saltar la
 * auditoría sin que sea visible": para omitirla a propósito, una ruta
 * simplemente no recibe el segundo argumento, lo cual queda expuesto a
 * simple vista (y a un grep) en su archivo de rutas.
 */
const errorHandler = (method: AsyncController, auditoria?: AuditMeta): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await method(req, res, next)

            if (
                auditoria &&
                req.user &&
                METODOS_MUTADORES.includes(req.method) &&
                res.statusCode < 400
            ) {
                const descripcion =
                    (res.locals.auditoriaDescripcion as string | undefined) ??
                    `${auditoria.accion} en ${auditoria.modulo.toLowerCase()} (${req.method} ${req.originalUrl})`;
                await registrarAuditoria(req.user.id_usuario, auditoria.accion, auditoria.modulo, descripcion);
            }
        } catch (e: any) {
            let exception: HttpException;
            if (e instanceof HttpException) {
                exception = e
            } else {
                if (e instanceof ZodError) {
                    exception = new BadRequestException(
                        'Unprocessable entity',
                        ErrorCodes.USER_ALREADY_EXISTS,
                        e
                    )
                } else {
                    exception = new InternalException(
                        'Something went wrong!',
                        ErrorCodes.INCORRECT_PASSWORD,
                        e
                    )
                }
            }
            next(exception)
        }
    }
}
export default errorHandler
