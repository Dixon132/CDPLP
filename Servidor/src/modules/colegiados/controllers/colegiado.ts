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
export const getColegiados = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '', inactivos } = req.query;
    const skip: number = (Number(page) - 1) * Number(limit);
    const take: number = Number(limit);
    const mostrarInactivos = inactivos === 'true'
    const searchFields = ['nombre', 'apellido', 'carnet_identidad', 'correo', 'telefono','especialidades']; // ajusta estos campos según tu modelo

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

    const colegiados = await prismaClient.colegiados.findMany({
        where: {
            estado:  mostrarInactivos ? 'INACTIVO' : 'ACTIVO',
            ...searchFilter,
        },
        skip,
        take,
    });

    const total = await prismaClient.colegiados.count({
        where: {
            estado:  mostrarInactivos ? 'INACTIVO' : 'ACTIVO',
            ...searchFilter,
        },
    });

    res.status(200).json({
        data: colegiados,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / take),
    });
};

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
export const updateColegiado = async(req: Request, res: Response)=>{
    const id = req.params.id
    const {correo, telefono} = req.body
    const data = await prismaClient.colegiados.update({
        where:{
            id_colegiado: +id
        },
        data:{
            correo,
            telefono
        }
    })
}
export const getColegiadoById = async(req: Request, res: Response)=>{
    const id = req.params.id
    const data = await prismaClient.colegiados.findFirstOrThrow({
        where: {
            id_colegiado: +id
        },
        select:{
            telefono: true,
            correo: true
        }
    })
    res.status(200).json(data)
}