import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";

export const getUsuarios = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '', inactivos } = req.query
    const skip: number = (Number(page) - 1) * Number(limit)
    const take: number = Number(limit)
    const searchFields = ['nombre', 'apellido', 'correo', 'direccion', 'telefono'];
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

    const usuario = await prismaClient.usuarios.findMany({
        where: {
            estado: mostrarInactivos ? 'INACTIVO' : 'ACTIVO',
            ...searchFilter
        },
        skip,
        take
    })
    const total = await prismaClient.usuarios.count({
        where: {
            estado: mostrarInactivos ? 'INACTIVO' : 'ACTIVO',
            ...searchFilter
        }
    })
    res.status(200).json({
        data: usuario,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / take)
    })
}

export const getUsuarioById = async (req: Request, res: Response) => {
    const id = req.params.id
    const usuario = await prismaClient.usuarios.findUnique({
        where: {
            id_usuario: +id
        },
        select:{
            telefono:true,
            direccion: true
        }
    })
    res.status(200).json(usuario)
}
export const updateUsuarioById = async (req: Request, res: Response) => {
    const id = req.params.id
    const { telefono, direccion } = req.body
    const usuario = await prismaClient.usuarios.update({
        where: {
            id_usuario: +id
        },
        data: { telefono, direccion }
    })
    res.status(200).json(usuario)
}
export const desactivarUsuarioById = async (req: Request, res: Response) => {
    const id = req.params.id
    const usuario = await prismaClient.usuarios.update({
        where: {
            id_usuario: +id
        },
        data: { estado: 'INACTIVO' }
    })
    res.status(200).json(usuario)
}
export const activarUsuarioById = async (req: Request, res: Response) => {
    const id = req.params.id
    const usuario = await prismaClient.usuarios.update({
        where: {
            id_usuario: +id
        },
        data: { estado: 'ACTIVO' }
    })
    res.status(200).json(usuario)
}
export const getUsuariosFiltrados = async (req: Request, res: Response) => {
    const { estado } = req.query
    const usuario = await prismaClient.usuarios.findMany({
        where: {
            estado: estado as string
        }
    })
    res.status(200).json(usuario)
}
