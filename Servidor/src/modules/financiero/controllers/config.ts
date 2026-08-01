import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { describir } from "../../../utils/auditoria";

export const getPresupuestoActivo = async (req: Request, res: Response) => {
    try {
        const config = await prismaClient.config_pago.findUnique({
            where: { clave: 'PRESUPUESTO_ACTIVO' }
        });
        if (!config) {
            return res.status(200).json({ valor: "1" }); // Default
        }
        res.status(200).json({ valor: config.valor });
    } catch (error) {
        console.error("Error obteniendo presupuesto activo:", error);
        res.status(500).json({ error: "Error al obtener configuración" });
    }
};

export const setPresupuestoActivo = async (req: Request, res: Response) => {
    try {
        const { id_presupuesto } = req.body;
        if (!id_presupuesto) {
            return res.status(400).json({ error: "Falta id_presupuesto" });
        }

        // Verificar que el presupuesto existe
        await prismaClient.presupuestos.findUniqueOrThrow({
            where: { id_presupuesto: Number(id_presupuesto) }
        });

        // Upsert permite crear o actualizar si ya existe la clave única
        const config = await prismaClient.config_pago.upsert({
            where: { clave: 'PRESUPUESTO_ACTIVO' },
            update: { valor: String(id_presupuesto) },
            create: { 
                clave: 'PRESUPUESTO_ACTIVO', 
                valor: String(id_presupuesto), 
                descripcion: 'ID del presupuesto al que se enrutan los pagos' 
            }
        });

        describir(res, `Cambió el presupuesto activo al #${id_presupuesto}`);
        res.status(200).json(config);
    } catch (error) {
        console.error("Error seteando presupuesto activo:", error);
        res.status(500).json({ error: "Error al actualizar configuración" });
    }
};
