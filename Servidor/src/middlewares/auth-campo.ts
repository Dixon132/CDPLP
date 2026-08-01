import { NextFunction, Request, Response } from "express";
import UnauthorizedException from "../exceptions/unauthorized";
import { ErrorCodes } from "../exceptions/root";
import * as jwt from 'jsonwebtoken'
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken'
import { JWT_SECRET } from "../utils/secrets";
import prismaClient from "../utils/prismaClient";
import { authMiddleware } from "./auth";

/**
 * Guard para la app de campo (marcaje por GPS).
 *
 * El token de campo lo emite `loginCampo` y tiene forma `{ id, tipo }`, distinta
 * del token del dashboard (`{ userId, rol }`), por eso no sirve `authMiddleware`.
 * Deja el sujeto autenticado en `req.campo` para que los controladores puedan
 * comprobar que solo opera sobre sus propias asignaciones.
 */
export interface CampoPayload {
    id: number
    tipo: 'COLEGIADO' | 'PASANTE'
    nombre?: string
    apellido?: string
}

const extraerToken = (header?: string): string | null => {
    if (!header) return null
    const valor = header.trim()
    if (valor.toLowerCase().startsWith('bearer ')) {
        return valor.slice(7).trim() || null
    }
    return valor || null
}

export const authCampoMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = extraerToken(req.headers.authorization)
        if (!token) {
            return next(new UnauthorizedException('Unauthorized!', ErrorCodes.UNAUTHORIZED))
        }
        const payload = jwt.verify(token, JWT_SECRET!) as CampoPayload
        if (!payload?.id || (payload.tipo !== 'COLEGIADO' && payload.tipo !== 'PASANTE')) {
            return next(new UnauthorizedException('Token de campo inválido', ErrorCodes.UNAUTHORIZED))
        }

        const existe = payload.tipo === 'COLEGIADO'
            ? await prismaClient.colegiados.findUnique({ where: { id_colegiado: payload.id } })
            : await prismaClient.pasantes.findUnique({ where: { id_pasante: payload.id } })

        if (!existe || existe.estado === 'INACTIVO') {
            return next(new UnauthorizedException('Unauthorized!', ErrorCodes.UNAUTHORIZED))
        }

        req.campo = payload
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

/**
 * Acepta cualquiera de los dos tokens (dashboard o campo). Útil en rutas que
 * consultan tanto los administradores como el propio colegiado/pasante.
 */
export const authDashboardOCampo = async (req: Request, res: Response, next: NextFunction) => {
    const token = extraerToken(req.headers.authorization)
    if (!token) {
        return next(new UnauthorizedException('Unauthorized!', ErrorCodes.UNAUTHORIZED))
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET!) as Record<string, unknown>
        if (payload.userId) return authMiddleware(req, res, next)
        return authCampoMiddleware(req, res, next)
    } catch {
        return authCampoMiddleware(req, res, next)
    }
}
