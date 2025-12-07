import { Request, Response } from "express"
import prismaClient from "../../../utils/prismaClient"

export const getRoles = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '', inactivos } = req.query
    const skip: number = (Number(page) - 1) * Number(limit)
    const take: number = Number(limit)
    const searchFields = ['rol'];
    const mostrarInactivos = inactivos === 'true';
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
    const roles = await prismaClient.roles.findMany({
        where: {
            activo: mostrarInactivos ? false : true,
            ...searchFilter
        },
        include: {
            usuarios: {
                select: {
                    nombre: true,
                    apellido: true
                }
            }
        },
        skip,
        take
    })

    const total = await prismaClient.roles.count({
        where: {
            activo: mostrarInactivos ? false : true,
            ...searchFilter
        }
    })

    res.status(200).json({
        data: roles,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / take)
    })
}

export const createRole = async (req: Request, res: Response) => {
    const { id_usuario, rol, fecha_inicio, fecha_fin } = req.body
    const role = await prismaClient.roles.create({
        data: { id_usuario, rol, fecha_inicio, fecha_fin }
    })
    res.status(200).json(role)
}
export const updateRoleById = async (req: Request, res: Response) => {
    const id = req.params.id
    const { estado } = req.body

    const rol = await prismaClient.roles.update({
        where: {
            id_rol: +id
        },
        data: {
            activo: estado === "ACTIVO" ? true : false
        }
    })
    res.status(200).json(rol)
}

export const updateRol = async (req: Request, res: Response) => {
    const id = req.params.id
    const {
        fecha_inicio,
        fecha_fin,
        rol
    } = req.body
    const data = await prismaClient.roles.update({
        where: {
            id_rol: +id
        },
        data: {
            fecha_fin: new Date(fecha_fin),
            fecha_inicio: new Date(fecha_inicio),
            rol
        }
    })
    res.status(200).json(data)
}
export const getRolById = async (req: Request, res: Response) => {
    const id = req.params.id

    const data = await prismaClient.roles.findFirstOrThrow({
        where: {
            id_rol: +id
        }
    })
    res.status(200).json(data)
}