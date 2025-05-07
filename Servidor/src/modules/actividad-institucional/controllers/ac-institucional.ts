import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { actividadInstitucionalSchema } from "../schemas/ac-institucional";

export const getActInst = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '' } = req.query;
    const skip: number = (Number(page) - 1) * Number(limit);
    const take: number = Number(limit);

    const searchFields = ['titulo', 'descripcion', 'tipo', 'motivo', 'lugar']; 

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

    const actividades = await prismaClient.actividades_institucionales.findMany({
        where: {
            ...searchFilter,
        },
        skip,
        take,
        select:{
            usuarios:true
        }
    });

    const total = await prismaClient.actividades_institucionales.count({
        where: {
            ...searchFilter,
        },
    });

    res.status(200).json({
        data: actividades,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / take),
    });
};

export const updateEstadoActInst = async(req: Request, res: Response)=>{
    const id = req.params.id
    const {estado} = req.body
    const updated = await prismaClient.actividades_institucionales.update({
        where:{
            id_actividad: +id
        },
        data:{
            estado
        }
    })
    res.status(200).json(updated)
}
export const getActInstById = async(req: Request, res: Response)=>{
    const id = req.params.id
    const act = await prismaClient.actividades_institucionales.findFirstOrThrow({
        where:{
            id_actividad: +id
        }
    })
    res.status(200).json(act)
}
export const createActInst = async(req: Request, res: Response)=>{
    
        const validatedData = actividadInstitucionalSchema.parse(req.body)
        const act = await prismaClient.actividades_institucionales.create({
            data: {
                nombre: validatedData.nombre,
                descripcion: validatedData.descripcion,
                tipo: validatedData.tipo,
                fecha_inicio: new Date(validatedData.fecha_inicio),
                fecha_fin: validatedData.fecha_fin ? new Date(validatedData.fecha_fin) : null,
                id_responsable: validatedData.id_responsable,
                costo: validatedData.costo,
                estado: validatedData.estado
            }
        })
        res.status(201).json({
            message: "Actividad institucional creada exitosamente",
            data: act
        })
    
}