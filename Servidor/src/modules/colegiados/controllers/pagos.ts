import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";

export const getPagos = async (req: Request, res: Response) =>{
    const id = req.params.id
    const data = await prismaClient.pagos_colegiados.findMany({
        where:{
            id_colegiado: +id
        }
    })
    res.status(200).json(data)
}

export const createPago =async (req: Request, res: Response) =>{
    const id = req.params.id
    const{
        concepto,
        fecha_pago,
        monto,
        estado_pago
    }= req.body

    const response = await prismaClient.pagos_colegiados.create({
        data:{
            id_colegiado:+id,
            concepto,
            fecha_pago: new Date(fecha_pago),
            monto,
            estado_pago
        }
    })

    res.status(200).json(response)
}