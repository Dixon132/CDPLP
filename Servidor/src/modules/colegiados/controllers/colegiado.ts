import { Request, Response } from "express";
import { colegiadoSchema } from "../schemas/colegiados";
import prismaClient from "../../../utils/prismaClient";
import BadRequestException from "../../../exceptions/bad-request";
import { ErrorCodes } from "../../../exceptions/root";

export const createColegiado = async(req: Request, res: Response)=>{
    const validatedColegiado = colegiadoSchema.parse(req.body)
    try{
        const colegiado = await prismaClient.colegiados.create({
        data:{
            carnet_identidad: validatedColegiado.carnet_identidad,
            nombre: validatedColegiado.nombre,
            apellido: validatedColegiado.apellido,
            correo: validatedColegiado.correo,
            telefono: validatedColegiado.telefono,
            especialidades: validatedColegiado.especialidades,
            fecha_inscripcion: validatedColegiado.fecha_inscripcion,
            fecha_renovacion: validatedColegiado.fecha_renovacion,
            estado: validatedColegiado.estado
        }
    })
    res.status(201).json({message: 'El colegiado fue resgistrado exitosamente', colegiado})
    }catch{
        throw new BadRequestException('Hubo un error al crear el registro del colegiado', ErrorCodes.INTERNAL_EXCEPTION)
    }
}
export const getColegiados = async(req: Request, res: Response)=> {
    const colegiados= await prismaClient.colegiados.findMany({
        where:{
            estado: 'ACTIVO'
        }
    })
    res.status(200).json(colegiados)
}
export const updateEstadoColegiadoById = async(req: Request, res: Response)=>{
    const id = req.params.id
    const {estado} = req.body
    const colegiado = await prismaClient.colegiados.update({
        where:{
            id_colegiado: +id
        },
        data:{
            estado
        }
    })
    res.status(200).json(colegiado)
}