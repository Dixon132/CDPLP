import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { actividadSocialSchema } from "../schemas/ac-social";

export const getActividadesSociales = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '' } = req.query;
    const skip: number = (Number(page) - 1) * Number(limit);
    const take: number = Number(limit);

    const searchFields = ['titulo', 'descripcion', 'lugar', 'tipo']; // ajusta estos campos según tu modelo

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

    const actividades = await prismaClient.actividades_sociales.findMany({
        where: {
            ...searchFilter,
        },
        skip,
        take,
        include: {
            usuarios: true
        },
    });

    const total = await prismaClient.actividades_sociales.count({
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

export const getActividadSocialById = async(req:Request, res: Response)=>{
    const id = req.params.id
    const actividad = await prismaClient.actividades_sociales.findFirstOrThrow({
        where: {
            id_actividad_social: +id
        }
    })
    res.status(200).json(actividad)
}
export const updateEstadoById = async(req:Request, res: Response)=>{
    const id = req.params.id
    const {estado} = req.body
    const updatedActividad = await prismaClient.actividades_sociales.update({
        where:{
            id_actividad_social: +id
        },
        data:{
            estado
        }
    }) 
    res.status(200).json(updatedActividad)
}
export const createActividadSocial = async(req:Request, res: Response)=>{
    const validatedData = actividadSocialSchema.parse(req.body)
    const actividad = await prismaClient.actividades_sociales.create({
        data:{
            nombre: validatedData.nombre,
            descripcion: validatedData.descripcion,
            ubicacion: validatedData.ubicacion,
            motivo: validatedData.motivo,
            origen_intervencion: validatedData.origen_intervencion,
            fecha_inicio: validatedData.fecha_inicio,
            fecha_fin: validatedData.fecha_fin,
            costo: validatedData.costo,
            estado: validatedData.estado,
            tipo: validatedData.tipo,
            id_solicitud: validatedData.id_solicitud,
            id_responsable: validatedData.id_responsable
        }
    })
    res.status(200).json(actividad)
}
