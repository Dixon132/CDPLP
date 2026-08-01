import { JwtPayload } from "jsonwebtoken";
import { usuarios } from "../generated/prisma";

/**
 * Usuario autenticado adjuntado por `authMiddleware`.
 * Nunca incluye la contraseña: el middleware la excluye del `select`.
 */
export type UsuarioAutenticado = Omit<usuarios, "contrase_a">;

/** Sujeto autenticado por la app de campo (token `{ id, tipo }`). */
export interface CampoAutenticado {
    id: number;
    tipo: "COLEGIADO" | "PASANTE";
    nombre?: string;
    apellido?: string;
}

declare module "express" {
    export interface Request {
        user?: UsuarioAutenticado;
        campo?: CampoAutenticado;
    }
}

export interface MyJwtPayload extends JwtPayload {
    userId: number;
}
