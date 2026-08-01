import { Request, Response } from 'express';
import prisma from '../../../utils/prismaClient';
import { describir } from '../../../utils/auditoria';

export const getAllInstituciones = async (req: Request, res: Response) => {
    try {
        const instituciones = await prisma.instituciones.findMany({
            orderBy: { nombre: 'asc' }
        });
        res.status(200).json(instituciones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener instituciones' });
    }
};

export const createInstitucion = async (req: Request, res: Response) => {
    const { nombre } = req.body;
    try {
        if (!nombre) {
            res.status(400).json({ error: 'El nombre es requerido' });
            return;
        }
        const existe = await prisma.instituciones.findUnique({
            where: { nombre }
        });
        if (existe) {
            res.status(400).json({ error: 'La institución ya existe' });
            return;
        }
        const nueva = await prisma.instituciones.create({
            data: { nombre }
        });
        describir(res, `Se creó la institución "${nueva.nombre}"`);
        res.status(201).json(nueva);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear institución' });
    }
};

export const updateInstitucion = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre } = req.body;
    try {
        if (!nombre) {
            res.status(400).json({ error: 'El nombre es requerido' });
            return;
        }
        const actualizada = await prisma.instituciones.update({
            where: { id_institucion: Number(id) },
            data: { nombre }
        });
        describir(res, `Modificó la institución a "${actualizada.nombre}"`);
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar institución' });
    }
};

export const deleteInstitucion = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const eliminada = await prisma.instituciones.delete({
            where: { id_institucion: Number(id) }
        });
        describir(res, `Eliminó la institución "${eliminada.nombre}"`);
        res.status(200).json({ message: 'Institución eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar institución' });
    }
};
