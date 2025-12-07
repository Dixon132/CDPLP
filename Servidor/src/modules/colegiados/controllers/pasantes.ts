import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import BadRequestException from "../../../exceptions/bad-request";
import { ErrorCodes } from "../../../exceptions/root";

export const getPasantes = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '', inactivos } = req.query;
    const skip: number = (Number(page) - 1) * Number(limit);
    const take: number = Number(limit);
    const mostrarInactivos = inactivos === 'true'
    const searchFields = ['nombre', 'apellido', 'carnet_identidad', 'correo', 'telefono'];

    const searchFilter = search
        ? {
            OR: searchFields.map(field => ({
                [field]: {
                    contains: search,
                    mode: 'insensitive',
                },
            })),
        }
        : {};

    const pasantes = await prismaClient.pasantes.findMany({
        where: {
            estado: mostrarInactivos ? 'INACTIVO' : 'ACTIVO',
            ...searchFilter,
        },
        skip,
        take,
    });

    const total = await prismaClient.pasantes.count({
        where: {
            estado: mostrarInactivos ? 'INACTIVO' : 'ACTIVO',
            ...searchFilter,
        },
    });

    res.status(200).json({
        data: pasantes,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / take),
    });
}
export const createPasante = async (req: Request, res: Response) => {
    const { nombre, apellido, carnet_identidad, correo, telefono, institucion } = req.body;

    try {
        const pasante = await prismaClient.pasantes.create({
            data: {
                nombre,
                apellido,
                carnet_identidad,
                correo,
                telefono,
                institucion,
                estado: "ACTIVO",
            }
        })
        res.status(201).json({ message: 'Pasante creado exitosamente', pasante })
    } catch (error) {
        throw new BadRequestException('Error al crear pasante', ErrorCodes.INTERNAL_EXCEPTION)
    }
}
export const getPasanteById = async (req: Request, res: Response) => {
    const id = req.params.id;
    const pasante = await prismaClient.pasantes.findFirstOrThrow({
        where: {
            id_pasante: +id
        }
    });
    res.status(200).json(pasante);
}
export const updateEstadoById = async (req: Request, res: Response) => {
    const id = req.params.id
    const { estado } = req.body
    try {
        await prismaClient.pasantes.update({
            where: {
                id_pasante: +id
            },
            data: {
                estado
            }
        })
        res.status(200).json({ message: 'Estado del pasante actualizado' })
    } catch (e) {

    }
}
export const updatePasanteById = async (req: Request, res: Response) => {
    const id = req.params.id
    const { nombre, apellido, carnet_identidad, correo, telefono, institucion } = req.body;
    try {
        const updatedPasante = await prismaClient.pasantes.update({
            where: { id_pasante: +id },
            data: {
                nombre,
                apellido,
                carnet_identidad,
                correo,
                telefono,
                institucion,
            }
        })
        res.status(200).json(updatedPasante);
    } catch (error) {

    }
}
export const deletePasanteById = async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
        await prismaClient.pasantes.delete({
            where: { id_pasante: +id }
        });
        res.status(200).json({ message: 'Pasante eliminado exitosamente' })
    } catch (error) {

    }
}
export const getPasantesSimple = async (req: Request, res: Response) => {
    try {
        const pasantes = await prismaClient.pasantes.findMany({
            select: {
                id_pasante: true,
                nombre: true,
                apellido: true,
            }
        })
    } catch (e) {

    }
}
export const getPasantesReportSummary = async (req: Request, res: Response) => {
    try {

    } catch (e) {

    }
}
export const getPasantesReportDetail = async (req: Request, res: Response) => {
    try {

    } catch (e) {

    }
}
export const updateEstadoPasanteById = async (req: Request, res: Response) => {
    const id = req.params.id;
    const { estado } = req.body;
    try {
        const updatedPasante = await prismaClient.pasantes.update({
            where: { id_pasante: +id },
            data: { estado }
        })
        res.status(200).json({
            message: 'Estado del pasante actualizado exitosamente', updatedPasante
        })
    } catch (e) {

    }
}