import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { Prisma } from "../../../../generated/prisma";

export const getAllConvenios = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 15;
        const skip = (page - 1) * limit;
        const search = typeof req.query.search === 'string'
            ? req.query.search.trim()
            : '';

        // construyo el filtro tipado para Prisma
        let where: Prisma.convenioWhereInput = {};
        if (search) {
            where = {
                OR: [
                    { nombre: { contains: search, mode: 'insensitive' } },
                    { descripcion: { contains: search, mode: 'insensitive' } },
                ]
            };
        }

        const [data, total] = await Promise.all([
            prismaClient.convenio.findMany({
                where,
                skip,
                take: limit,
                orderBy: { fecha_inicio: 'desc' },
            }),
            prismaClient.convenio.count({ where })
        ]);

        return res.status(200).json({
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al obtener convenios' });
    }
}
export const createConvenio = async (req: Request, res: Response) => {
    const { nombre, descripcion, fecha_inicio, fecha_fin } = req.body;

    try {
        const newConvenio = await prismaClient.convenio.create({
            data: {
                nombre,
                descripcion,
                fecha_inicio: new Date(fecha_inicio),
                fecha_fin: new Date(fecha_fin),
                estado: 'ACTIVO'
            }
        });

        return res.status(201).json(newConvenio);
    } catch (error) {
        console.error("Error al crear convenio:", error);
        return res.status(500).json({ error: "Error al crear convenio" });
    }
}
export const updateConvenio = async (req: Request, res: Response) => {
    const id = req.params.id;
    const { nombre, descripcion, fecha_inicio, fecha_fin, estado } = req.body;

    try {
        const updatedConvenio = await prismaClient.convenio.update({
            where: { id_convenio: +id },
            data: {
                nombre,
                descripcion,
                fecha_inicio: new Date(fecha_inicio),
                fecha_fin: new Date(fecha_fin),
                estado
            }
        });

        return res.status(200).json(updatedConvenio);
    } catch (error) {
        console.error("Error al actualizar convenio:", error);
        return res.status(500).json({ error: "Error al actualizar convenio" });
    }
}
export const getConvenioById = async (req: Request, res: Response) => {
    const id = req.params.id;

    try {
        const convenio = await prismaClient.convenio.findUnique({
            where: { id_convenio: +id }
        });

        if (!convenio) {
            return res.status(404).json({ error: "Convenio no encontrado" });
        }

        return res.status(200).json(convenio);
    } catch (error) {
        console.error("Error al obtener convenio:", error);
        return res.status(500).json({ error: "Error al obtener convenio" });
    }
}

export const getSimpleConvenios = async (req: Request, res: Response) => {
    try {
        const convenios = await prismaClient.convenio.findMany({
            select: {
                id_convenio: true,
                nombre: true
            },
            where: {
                estado: 'ACTIVO'
            }
        });

        return res.status(200).json(convenios);
    } catch (error) {
        console.error("Error al obtener convenios simples:", error);
        return res.status(500).json({ error: "Error al obtener convenios simples" });
    }
}