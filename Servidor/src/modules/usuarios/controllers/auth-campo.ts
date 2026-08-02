import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { compareSync } from "bcrypt";
import * as jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../../utils/secrets";

/**
 * POST /api/auth/campo/login
 * Body: { correo: string, carnet_identidad: string, pin: string }
 * Devuelve JWT con { id, tipo: "COLEGIADO" | "PASANTE", nombre, apellido }, exp 8h
 */
export const loginCampo = async (req: Request, res: Response) => {
    const { correo, carnet_identidad, pin } = req.body;

    if (!correo || !carnet_identidad || !pin) {
        return res.status(400).json({ error: "Correo, carnet de identidad y PIN son requeridos" });
    }

    // Buscar en ambas tablas: correo + carnet_identidad no son únicos entre
    // colegiados y pasantes (p. ej. alguien que fue pasante y luego se
    // colegió sin que se borre el registro viejo), así que puede haber un
    // candidato en cada tabla con el mismo correo/CI pero PIN distinto. Si
    // solo comprobáramos el primero que matchea (antes: colegiado, sin
    // fallback), un PIN válido para el otro registro se rechazaba como
    // "PIN incorrecto".
    const [colegiado, pasante] = await Promise.all([
        prismaClient.colegiados.findFirst({ where: { correo, carnet_identidad } }),
        prismaClient.pasantes.findFirst({ where: { correo, carnet_identidad } }),
    ]);

    if (!colegiado && !pasante) {
        return res.status(404).json({ error: "No se encontró ningún colegiado o pasante con esas credenciales" });
    }

    if (colegiado?.pin_acceso && String(pin) === colegiado.pin_acceso) {
        const token = jwt.sign(
            {
                id: colegiado.id_colegiado,
                tipo: "COLEGIADO",
                nombre: colegiado.nombre,
                apellido: colegiado.apellido
            },
            JWT_SECRET!,
            { expiresIn: "8h" }
        );

        return res.status(200).json({
            token,
            usuario: {
                id: colegiado.id_colegiado,
                tipo: "COLEGIADO",
                nombre: colegiado.nombre,
                apellido: colegiado.apellido,
                correo: colegiado.correo
            }
        });
    }

    if (pasante?.pin_acceso && String(pin) === pasante.pin_acceso) {
        const token = jwt.sign(
            {
                id: pasante.id_pasante,
                tipo: "PASANTE",
                nombre: pasante.nombre,
                apellido: pasante.apellido
            },
            JWT_SECRET!,
            { expiresIn: "8h" }
        );

        return res.status(200).json({
            token,
            usuario: {
                id: pasante.id_pasante,
                tipo: "PASANTE",
                nombre: pasante.nombre,
                apellido: pasante.apellido,
                correo: pasante.correo
            }
        });
    }

    if (!colegiado?.pin_acceso && !pasante?.pin_acceso) {
        return res.status(401).json({ error: "No tienes un PIN asignado. Consulta con la administración." });
    }

    return res.status(401).json({ error: "PIN incorrecto" });
};
