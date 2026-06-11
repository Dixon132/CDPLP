import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export const validateBody = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Reemplaza el body con la versión parseada (que aplica coerciones de Zod)
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            next(error); // Delega al error-handler que ya está preparado para interceptar ZodError
        }
    };
};
