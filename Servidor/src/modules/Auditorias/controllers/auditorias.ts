import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";

export const getAuditorias = async (req: Request, res: Response) => {

    const data = await prismaClient.auditoria.findMany({
        include: {
            usuario: true
        },
        orderBy: {
            fecha: 'desc',
        }
    })
    res.status(200).json(data)
}
export const getAuditoriasReport = async (req: Request, res: Response) => {

}