// controllers/especialidades.ts
import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";

/**
 * GET /api/especialidades
 * Devuelve todas las especialidades activas, ordenadas por nombre.
 * Uso público (formularios de postulación, selects en colegiados, etc.)
 */
export const getActivas = async (req: Request, res: Response) => {
    const especialidades = await prismaClient.especialidades.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
    });
    return res.status(200).json(especialidades);
};

/**
 * GET /api/especialidades/admin
 * Devuelve todas las especialidades (activas e inactivas) para la vista de administración.
 */
export const getAdmin = async (req: Request, res: Response) => {
    const especialidades = await prismaClient.especialidades.findMany({
        orderBy: { nombre: "asc" },
    });
    return res.status(200).json(especialidades);
};

/**
 * POST /api/especialidades
 * Cuerpo: { nombre, descripcion? }
 * Retorna 409 si ya existe una especialidad con el mismo nombre.
 */
export const create = async (req: Request, res: Response) => {
    const { nombre, descripcion } = req.body;

    if (!nombre || String(nombre).trim() === "") {
        return res.status(400).json({ error: "El nombre es requerido" });
    }

    const nombreNorm = String(nombre).trim();

    const existente = await prismaClient.especialidades.findUnique({
        where: { nombre: nombreNorm },
    });

    if (existente) {
        return res.status(409).json({ error: "Ya existe una especialidad con ese nombre" });
    }

    const nueva = await prismaClient.especialidades.create({
        data: {
            nombre: nombreNorm,
            descripcion: descripcion ? String(descripcion).trim() : null,
        },
    });

    return res.status(201).json({ message: "Especialidad creada", data: nueva });
};

/**
 * PUT /api/especialidades/:id
 * Cuerpo: { nombre?, descripcion? }
 * Actualiza el nombre y/o descripción de una especialidad.
 */
export const update = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { nombre, descripcion } = req.body;

    const especialidad = await prismaClient.especialidades.findUnique({
        where: { id_especialidad: id },
    });

    if (!especialidad) {
        return res.status(404).json({ error: "Especialidad no encontrada" });
    }

    // Si se intenta cambiar el nombre, verificar que no colisione con otra especialidad
    if (nombre && String(nombre).trim() !== especialidad.nombre) {
        const nombreNorm = String(nombre).trim();
        const colision = await prismaClient.especialidades.findUnique({
            where: { nombre: nombreNorm },
        });
        if (colision) {
            return res.status(409).json({ error: "Ya existe una especialidad con ese nombre" });
        }
    }

    const updated = await prismaClient.especialidades.update({
        where: { id_especialidad: id },
        data: {
            ...(nombre !== undefined && { nombre: String(nombre).trim() }),
            ...(descripcion !== undefined && {
                descripcion: descripcion ? String(descripcion).trim() : null,
            }),
        },
    });

    return res.status(200).json(updated);
};

/**
 * PATCH /api/especialidades/:id/estado
 * Alterna el campo `activo` de la especialidad (true → false, false → true).
 */
export const toggleEstado = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const especialidad = await prismaClient.especialidades.findUnique({
        where: { id_especialidad: id },
    });

    if (!especialidad) {
        return res.status(404).json({ error: "Especialidad no encontrada" });
    }

    const updated = await prismaClient.especialidades.update({
        where: { id_especialidad: id },
        data: { activo: !especialidad.activo },
    });

    return res.status(200).json(updated);
};
