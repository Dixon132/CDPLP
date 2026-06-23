import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { subirArchivo, eliminarArchivo } from "../../../utils/uploadS3";

export const getMemorias = async (req: Request, res: Response) => {
    try {
        const memorias = await prismaClient.memorias_balances.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(memorias);
    } catch (error) {
        console.error("Error al obtener memorias:", error);
        res.status(500).json({ error: "Error al obtener documentos" });
    }
};

export const createMemoria = async (req: Request, res: Response) => {
    try {
        const { titulo, descripcion, categoria, anio } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: "El archivo es requerido" });
        }

        const rutaRelativa = await subirArchivo(req.file, `publico/memorias/${anio || 'general'}`);

        const nueva = await prismaClient.memorias_balances.create({
            data: {
                titulo,
                descripcion,
                categoria,
                anio: anio ? parseInt(anio) : null,
                archivo: rutaRelativa
            }
        });

        res.status(201).json(nueva);
    } catch (error) {
        console.error("Error al crear memoria:", error);
        res.status(500).json({ error: "Error al crear el documento" });
    }
};

export const updateMemoria = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { titulo, descripcion, categoria, anio } = req.body;

        const memoriaActual = await prismaClient.memorias_balances.findUniqueOrThrow({
            where: { id }
        });

        let rutaRelativa = memoriaActual.archivo;
        
        if (req.file) {
            // Delete old file
            await eliminarArchivo(memoriaActual.archivo);
            // Upload new file
            rutaRelativa = await subirArchivo(req.file, `publico/memorias/${anio || memoriaActual.anio || 'general'}`);
        }

        const actualizada = await prismaClient.memorias_balances.update({
            where: { id },
            data: {
                titulo,
                descripcion,
                categoria,
                anio: anio ? parseInt(anio) : memoriaActual.anio,
                archivo: rutaRelativa
            }
        });

        res.status(200).json(actualizada);
    } catch (error) {
        console.error("Error al actualizar memoria:", error);
        res.status(500).json({ error: "Error al actualizar el documento" });
    }
};

export const deleteMemoria = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const memoriaActual = await prismaClient.memorias_balances.findUniqueOrThrow({
            where: { id }
        });

        await eliminarArchivo(memoriaActual.archivo);

        await prismaClient.memorias_balances.delete({
            where: { id }
        });

        res.status(200).json({ message: "Documento eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar memoria:", error);
        res.status(500).json({ error: "Error al eliminar el documento" });
    }
};
