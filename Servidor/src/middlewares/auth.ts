import { NextFunction, Request, Response } from "express";
import UnauthorizedException from "../exceptions/unauthorized";
import { ErrorCodes } from "../exceptions/root";
import * as jwt from 'jsonwebtoken'
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken'
import { JWT_SECRET } from "../utils/secrets";
import prismaClient from "../utils/prismaClient";
import { MyJwtPayload } from "../types/express";

/**
 * Acepta tanto `Authorization: <token>` como `Authorization: Bearer <token>`:
 * el cliente del dashboard manda el token crudo y el de GDS/campo lo manda con
 * el prefijo Bearer.
 */
const extraerToken = (header?: string): string | null => {
    if (!header) return null
    const valor = header.trim()
    if (valor.toLowerCase().startsWith('bearer ')) {
        return valor.slice(7).trim() || null
    }
    return valor || null
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = extraerToken(req.headers.authorization)
        if (!token) {
            return next(new UnauthorizedException(
                'Unauthorized!',
                ErrorCodes.UNAUTHORIZED
            ))
        }
        const payload = jwt.verify(token, JWT_SECRET!) as MyJwtPayload
        const user = await prismaClient.usuarios.findFirst({
            where: { id_usuario: payload.userId },
            omit: { contrase_a: true }
        })
        if (!user) {
            return next(new UnauthorizedException('Unathorized!', ErrorCodes.UNAUTHORIZED))
        }
        if (user.estado === 'INACTIVO') {
            return next(new UnauthorizedException('Usuario desactivado', ErrorCodes.UNAUTHORIZED))
        }
        req.user = user
        next()
    } catch (err) {
        if (err instanceof TokenExpiredError) {
            return next(new UnauthorizedException('Token expired', ErrorCodes.TOKEN_EXPIRED));
        }
        if (err instanceof JsonWebTokenError) {
            return next(new UnauthorizedException('Invalid token', ErrorCodes.UNAUTHORIZED));
        }
        return next(new UnauthorizedException('Authentication failed', ErrorCodes.UNAUTHORIZED));
    }
}
