import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import BadRequestException from "../../../exceptions/bad-request";
import { ErrorCodes } from "../../../exceptions/root";

export const createInvitado = async (req: Request, res: Response) => {
    try {
        const invitado = await prismaClient.invitados.create({
            data: {
                nombre: req.body.nombre,
                apellido: req.body.apellido,
                correo: req.body.correo,
                telefono: req.body.telefono,

            }
        })
        res.status(201).json({ message: 'Invitado creado exitosamente', invitado })
    } catch (e) {
        throw new BadRequestException('Error al crear invitado', ErrorCodes.INTERNAL_EXCEPTION)
    }
}
export const getInvitados = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '' } = req.query;
    const skip: number = (Number(page) - 1) * Number(limit);
    const take: number = Number(limit);
    const searchFields = ['nombre', 'apellido', 'correo', 'telefono'];


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

    const invitados = await prismaClient.invitados.findMany({
        where: {
            ...searchFilter,
        },
        skip,
        take,
    });
    const total = await prismaClient.invitados.count({
        where: {
            ...searchFilter,
        },
    });

    res.status(200).json({
        data: invitados,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / take),
    });

}
export const getInvitadoById = async (req: Request, res: Response) => {
    const id = req.params.id;
    const invitado = await prismaClient.invitados.findFirstOrThrow({
        where: {
            id_invitado: +id
        }
    });
    res.status(200).json(invitado);

}
export const updateInvitadoById = async (req: Request, res: Response) => {
    const id = req.params.id;
    const { nombre, apellido, correo, telefono } = req.body;

    try {
        const updatedInvitado = await prismaClient.invitados.update({
            where: { id_invitado: +id },
            data: {
                nombre,
                apellido,
                correo,
                telefono
            },
        });
        res.status(200).json(updatedInvitado);
    } catch (error) {
        throw new BadRequestException('Error al actualizar invitado', ErrorCodes.INTERNAL_EXCEPTION)
    }
}
export const deleteInvitadoById = async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
        await prismaClient.invitados.delete({
            where: { id_invitado: +id },
        });
        res.status(200).json({ message: 'Invitado eliminado exitosamente' });
    } catch (error) {
        throw new BadRequestException('Error al eliminar invitado', ErrorCodes.INTERNAL_EXCEPTION)

    }
}
export const getInvitadosSimple = async (req: Request, res: Response) => {
    try {

        const invitados = await prismaClient.invitados.findMany({
            select: {
                id_invitado: true,
                nombre: true,
                apellido: true,
            }
        })
        res.status(200).json(invitados)
    } catch (e) {
        throw new BadRequestException('Error al obtener invitados', ErrorCodes.INTERNAL_EXCEPTION)
    }
}
export const getInvitadosReportSummary = async (req: Request, res: Response) => {
    try {

    } catch (e) {

    }
}
export const getInvitadosReportDetail = async (req: Request, res: Response) => {
    try {

    } catch (e) {

    }
}
