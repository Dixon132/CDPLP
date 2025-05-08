import { Request, Response } from "express"
import prismaClient from "../../../utils/prismaClient"

export const getRoles = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '' } = req.query
    const skip: number = (Number(page) - 1) * Number(limit)
    const take: number = Number(limit)
    const searchFields = ['rol'];

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
            activo: true,
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
            activo: true,
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

export const createRole = async (req: Request, res: Response)=>{
    const {id_usuario, rol, fecha_inicio, fecha_fin} = req.body
    const role = await prismaClient.roles.create({
        data: {id_usuario, rol, fecha_inicio, fecha_fin}
    })
    res.status(200).json(role)
}
export const updateRoleById = async (req: Request, res: Response)=>{
    const id = req.params.id
    const rol = await prismaClient.roles.update({
        where:{
            id_rol: +id
        },
        data: {
            activo: false
        }
    })
    res.status(200).json(rol)
}

