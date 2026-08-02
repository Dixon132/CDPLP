import { Request, Response } from "express";
import { obtenerVencimientos, obtenerResumenVencimientos, DominioVencimiento, RangoVencimiento } from "../services";

const DOMINIOS_VALIDOS: DominioVencimiento[] = ["colegiado", "documento"];
const RANGOS_VALIDOS: RangoVencimiento[] = ["vencidos", "7", "15", "30", "60", "90", "todos"];

export const getVencimientos = async (req: Request, res: Response) => {
    const dominio = DOMINIOS_VALIDOS.includes(req.query.dominio as DominioVencimiento)
        ? (req.query.dominio as DominioVencimiento)
        : undefined;
    const rango = RANGOS_VALIDOS.includes(req.query.rango as RangoVencimiento)
        ? (req.query.rango as RangoVencimiento)
        : undefined;

    const data = await obtenerVencimientos({ dominio, rango });
    res.status(200).json(data);
};

export const getResumenVencimientos = async (req: Request, res: Response) => {
    const data = await obtenerResumenVencimientos();
    res.status(200).json(data);
};
