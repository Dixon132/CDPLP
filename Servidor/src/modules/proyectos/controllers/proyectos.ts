import { Request, Response } from "express"
import prismaClient from "../../../utils/prismaClient"
import { proyectoSchema } from "../schemas/proyectos"

export const getProyectos = async(req: Request, res: Response)=>{
    const {page = 1, limit = 15, search= ''}= req.query
    const skip: number = (Number(page) - 1) * Number(limit)
    const take: number = Number(limit)
    const searchFields = ['titulo', 'descripcion', 'fecha_inicio', 'fecha_fin', 'id_responsable', 'presupuesto', 'estado']
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
    const proyectos = await prismaClient.proyectos.findMany({
        where:{
            ...searchFilter
        },
        skip,
        take
    })
    const total = await prismaClient.proyectos.count({
        where:{
            ...searchFilter
        }
    })

    res.status(200).json({proyectos,total, page: Number(page), totalPages: Math.ceil(total / take)})
    
}

export const createProyecto = async(req: Request, res: Response)=>{
    
        const validatedData = proyectoSchema.parse(req.body)
        
        const proyecto = await prismaClient.proyectos.create({
            data: {
                titulo: validatedData.titulo,
                descripcion: validatedData.descripcion,
                fecha_inicio: new Date(validatedData.fecha_inicio),
                fecha_fin: validatedData.fecha_fin ? new Date(validatedData.fecha_fin) : null,
                id_responsable: validatedData.id_responsable,
                presupuesto: validatedData.presupuesto,
                estado: validatedData.estado || "EN_PROCESO"
            }
        })

        res.status(201).json({message: 'Proyecto creado exitosamente', proyecto})
    
}
export const updateEstadoProyectoById = async(req: Request, res: Response)=>{
    const id = req.params.id
    const {estado} = req.body
    const proyecto = await prismaClient.proyectos.update({
        where:{
            id_proyecto: +id
        },
        data:{
            estado: estado
        }
    })
    res.status(200).json({
        message: 'Proyecto cancelado exitosamente',
        proyecto
    })
}
