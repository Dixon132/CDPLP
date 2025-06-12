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
export const updatePago = async (req: Request, res: Response) => {
    const id = req.params.id;
    const { concepto, fecha_pago, monto, estado_pago } = req.body;

    try {
        const updatedPago = await prismaClient.pagos_colegiados.update({
            where: { id_pago: +id },
            data: {
                concepto,
                fecha_pago: new Date(fecha_pago),
                monto,
                estado_pago
            },
        });

        res.status(200).json(updatedPago);
    } catch (error) {
        console.error("Error al actualizar pago:", error);
        res.status(500).json({ error: "Error al actualizar pago" });
    }
}
export const getPagoById = async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
        const pago = await prismaClient.pagos_colegiados.findUnique({
            where: { id_pago: +id }
        });

        if (!pago) {
            return res.status(404).json({ error: "Pago no encontrado" });
        }

        res.status(200).json(pago);
    } catch (error) {
        console.error("Error al obtener pago:", error);
        res.status(500).json({ error: "Error al obtener pago" });
    }
}