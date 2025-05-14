import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";

export const createDoc = async(req:Request, res:Response)=>{
    const id = req.params.id
    const {tipo_documento, archivo, fecha_entrega, fecha_vencimiento, estado} =req.body
    const doc = await prismaClient.documentos_colegiados.create({
        data:{
            id_colegiado: +id,
            tipo_documento,
            archivo,
            fecha_entrega,
            fecha_vencimiento,
            estado
        }
    })
    res.status(201).json(doc)
    
}
export const getAllDocsById = async(req:Request, res:Response)=>{
    const id = req.params.id
    const data = await prismaClient.documentos_colegiados.findMany({
        where:{
            id_colegiado: +id
        }
    })
    res.status(200).json(data)
}