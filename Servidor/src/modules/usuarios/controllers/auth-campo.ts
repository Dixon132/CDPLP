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

    // Buscar en colegiados primero
    const colegiado = await prismaClient.colegiados.findFirst({
        where: { correo, carnet_identidad }
    });

    if (colegiado) {
        if (!colegiado.pin_acceso) {
            return res.status(401).json({ error: "Este colegiado no tiene PIN asignado. Consulta con la administración." });
        }
        // 3. Verificar PIN (ahora es en texto plano)
        const pinValido = (String(pin) === colegiado.pin_acceso);
        if (!pinValido) {
            return res.status(401).json({ error: "PIN incorrecto" });
        }

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

    // Buscar en pasantes
    const pasante = await prismaClient.pasantes.findFirst({
        where: { correo, carnet_identidad }
    });

    if (pasante) {
        if (!pasante.pin_acceso) {
            return res.status(401).json({ error: "Este pasante no tiene PIN asignado. Consulta con la administración." });
        }
        // 3. Verificar PIN (ahora es texto plano)
        const pinValido = (String(pin) === pasante.pin_acceso);
        if (!pinValido) {
            return res.status(401).json({ error: "PIN incorrecto" });
        }

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

    return res.status(404).json({ error: "No se encontró ningún colegiado o pasante con esas credenciales" });
};
