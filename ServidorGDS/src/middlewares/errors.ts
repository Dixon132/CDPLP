import { NextFunction, Request, Response } from "express";

/**
 * Manejador de errores centralizado del servicio ServidorGDS.
 * Implementacion base; se enriquecera con el manejo de errores de dominio.
 */
export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    res.status(500).json({ error: message });
}
