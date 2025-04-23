import { Request, Response } from "express"
import prismaClient from "../../../utils/prismaClient"

export const getRoles = async (req: Request, res: Response)=>{
    const roles = await prismaClient.roles.findMany({
        where:{
            activo: true
        }
    })
    res.status(200).json(roles)
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

