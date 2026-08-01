import { ErrorRequestHandler, NextFunction, Request, Response } from "express"
import { HttpException } from "../exceptions/root"

const errorMiddleware: ErrorRequestHandler = (
    error: HttpException,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Un error que no pasó por `errorHandler` (p. ej. lanzado por multer o por
    // otro middleware) llega sin `statusCode`; sin este fallback Express revienta
    // al intentar `res.status(undefined)`.
    const statusCode = error?.statusCode ?? 500

    if (statusCode >= 500) {
        console.error('[error]', req.method, req.originalUrl, error)
    }

    res.status(statusCode).json({
        message: error?.message ?? 'Something went wrong!',
        errorCode: error?.errorCode ?? null,
        error: error?.error ?? null
    })
}
export default errorMiddleware
