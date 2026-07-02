// controllers/documentos-requeridos.ts
import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";

/**
 * GET /api/documentos-requeridos
 * Devuelve todos los documentos requeridos activos, ordenados por campo `orden` ascendente.
 * Uso público (formularios de postulación, step 3 de PostularPage, etc.)
 */
export const getActivos = async (req: Request, res: Response) => {
    const documentos = await prismaClient.documentos_requeridos.findMany({
        where: { activo: true },
        orderBy: { orden: "asc" },
    });
    return res.status(200).json(documentos);
};

/**
 * GET /api/documentos-requeridos/admin
 * Devuelve todos los documentos requeridos (activos e inactivos) para la vista de administración.
 */
export const getAdmin = async (req: Request, res: Response) => {
    const documentos = await prismaClient.documentos_requeridos.findMany({
        orderBy: { orden: "asc" },
    });
    return res.status(200).json(documentos);
};

/**
 * POST /api/documentos-requeridos
 * Cuerpo: { nombre, descripcion?, es_opcional?, orden? }
 * Crea un nuevo documento requerido y retorna 201.
 */
export const create = async (req: Request, res: Response) => {
    const { nombre, descripcion, es_opcional, orden } = req.body;

    const nuevo = await prismaClient.documentos_requeridos.create({
        data: {
            nombre: String(nombre),
            descripcion: descripcion !== undefined ? String(descripcion) : null,
            es_opcional: es_opcional !== undefined ? Boolean(es_opcional) : false,
            orden: orden !== undefined ? Number(orden) : 0,
        },
    });

    return res.status(201).json({ message: "Documento requerido creado", data: nuevo });
};

/**
 * PUT /api/documentos-requeridos/:id
 * Cuerpo: { nombre?, descripcion?, es_opcional?, orden? }
 * Actualiza un documento requerido identificado por `id_doc_req`.
 */
export const update = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { nombre, descripcion, es_opcional, orden } = req.body;

    const documento = await prismaClient.documentos_requeridos.findUnique({
        where: { id_doc_req: id },
    });

    if (!documento) {
        return res.status(404).json({ error: "Documento requerido no encontrado" });
    }

    const updated = await prismaClient.documentos_requeridos.update({
        where: { id_doc_req: id },
        data: {
            ...(nombre !== undefined && { nombre: String(nombre) }),
            ...(descripcion !== undefined && { descripcion: descripcion ? String(descripcion) : null }),
            ...(es_opcional !== undefined && { es_opcional: Boolean(es_opcional) }),
            ...(orden !== undefined && { orden: Number(orden) }),
        },
    });

    return res.status(200).json(updated);
};

/**
 * PATCH /api/documentos-requeridos/:id/estado
 * Alterna el campo `activo` del documento requerido (true → false, false → true).
 */
export const toggleEstado = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const documento = await prismaClient.documentos_requeridos.findUnique({
        where: { id_doc_req: id },
    });

    if (!documento) {
        return res.status(404).json({ error: "Documento requerido no encontrado" });
    }

    const updated = await prismaClient.documentos_requeridos.update({
        where: { id_doc_req: id },
        data: { activo: !documento.activo },
    });

    return res.status(200).json(updated);
};
