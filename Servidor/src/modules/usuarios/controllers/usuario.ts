import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";

export const getUsuarios = async (req: Request, res: Response)=>{
    const usuario = await prismaClient.usuarios.findMany({
        where:{
            estado: 'ACTIVO'
        }
    })
    res.status(200).json(usuario)
}
export const getUsuarioById = async(req: Request, res: Response)=>{
    const id = req.params.id
    const usuario = await prismaClient.usuarios.findUnique({
        where:{
            id_usuario: +id
        }
    })
    res.status(200).json(usuario)
}
export const updateUsuarioById = async(req: Request, res: Response)=>{
    const id = req.params.id
    const {telefono, direccion} = req.body
    const usuario = await prismaClient.usuarios.update({
        where:{
            id_usuario: +id
        },
        data: {telefono, direccion}
    })
    res.status(200).json(usuario)
}
export const desactivarUsuarioById = async(req: Request, res: Response)=>{
    const id = req.params.id
    const usuario = await prismaClient.usuarios.update({
        where:{
            id_usuario: +id
        },
        data: {estado: 'INACTIVO'}
    })  
    res.status(200).json(usuario)
}
export const activarUsuarioById = async(req: Request, res: Response)=>{
    const id = req.params.id
    const usuario = await prismaClient.usuarios.update({
        where:{
            id_usuario: +id
        },
        data: {estado: 'ACTIVO'}
    })
    res.status(200).json(usuario)
}
export const getUsuariosFiltrados = async(req: Request, res: Response)=>{
    const {estado} = req.query
    const usuario = await prismaClient.usuarios.findMany({
        where:{
            estado: estado as string
        }
    })
    res.status(200).json(usuario)
}
