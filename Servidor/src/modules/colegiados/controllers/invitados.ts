import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import BadRequestException from "../../../exceptions/bad-request";
import { ErrorCodes } from "../../../exceptions/root";
import { describir } from "../../../utils/auditoria";

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
        describir(res, `Se creó el invitado ${invitado.nombre} ${invitado.apellido}`)
        res.status(201).json({ message: 'Invitado creado exitosamente', invitado })
    } catch (e) {
        throw new BadRequestException('Error al crear invitado', ErrorCodes.INTERNAL_EXCEPTION)
    }
}
export const getInvitados = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '', inactivos = 'false' } = req.query;
    const skip: number = (Number(page) - 1) * Number(limit);
    const take: number = Number(limit);
    const searchFields = ['nombre', 'apellido', 'correo', 'telefono'];

    // Determinar si mostrar inactivos o activos
    const showInactivos = inactivos === 'true';

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

    const whereFilter = {
        ...searchFilter,
        estado: showInactivos ? 'INACTIVO' : 'ACTIVO'
    };

    const invitados = await prismaClient.invitados.findMany({
        where: whereFilter,
        skip,
        take,
    });
    const total = await prismaClient.invitados.count({
        where: whereFilter,
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

export const updateEstadoInvitado = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { estado } = req.body;

    try {
        const invitado = await prismaClient.invitados.update({
            where: { id_invitado: Number(id) },
            data: { estado }
        });
        describir(res, `${estado === 'ACTIVO' ? 'Activó' : 'Desactivó'} al invitado ${invitado.nombre} ${invitado.apellido}`)
        res.status(200).json(invitado);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el estado del invitado" });
    }
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
        describir(res, `Modificó los datos del invitado ${updatedInvitado.nombre} ${updatedInvitado.apellido}`)
        res.status(200).json(updatedInvitado);
    } catch (error) {
        throw new BadRequestException('Error al actualizar invitado', ErrorCodes.INTERNAL_EXCEPTION)
    }
}
export const deleteInvitadoById = async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
        const invitado = await prismaClient.invitados.delete({
            where: { id_invitado: +id },
        });
        describir(res, `Eliminó al invitado ${invitado.nombre} ${invitado.apellido}`)
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
