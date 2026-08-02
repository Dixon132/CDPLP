import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import dotenv from "dotenv";
import { subirAaws, subirArchivo, eliminarArchivo, buildPublicUrl } from "../../../utils/uploadS3";
import { describir } from "../../../utils/auditoria";
import { sumarMeses } from "../../../utils/fechas";
dotenv.config();

export const obtenerUrlFirmada = async (req: Request, res: Response) => {
    try {
        const id = +req.params.id;

        const documento = await prismaClient.documentos_colegiados.findUnique({
            where: { id_documento: id }
        });

        if (!documento) return res.status(404).json({ error: "Documento no encontrado" });

        // Con Supabase los archivos son públicos — devolvemos la URL directamente
        const url = buildPublicUrl(documento.archivo);
        res.json({ url });
    } catch (error) {
        console.error("Error generando URL:", error);
        res.status(500).json({ error: "Error al generar el acceso al archivo" });
    }
};

export const createDoc = async (req: Request, res: Response) => {
    try {
        const id = +req.params.id;
        const { tipo_documento, fecha_vencimiento } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "Archivo no recibido" });
        }

        const col = await prismaClient.colegiados.findUnique({
            where: { id_colegiado: id },
            select: { nombre: true, apellido: true }
        });

        if (!col) return res.status(404).json({ error: "Colegiado no encontrado" });

        let folderUser = '';

        const existingDoc = await prismaClient.documentos_colegiados.findFirst({
            where: { id_colegiado: id }
        });
        if (existingDoc && existingDoc.archivo?.includes('/')) {
            folderUser = existingDoc.archivo.split('/')[1];
        }

        if (!folderUser) {
            const existingPago = await prismaClient.pagos_colegiados.findFirst({
                where: { id_colegiado: id, comprobante: { not: null } }
            });
            if (existingPago && existingPago.comprobante?.includes('/')) {
                folderUser = existingPago.comprobante.split('/')[1];
            }
        }

        if (!folderUser) {
            const iniciales = `${col.nombre?.charAt(0).toUpperCase() ?? ''}${col.apellido?.charAt(0).toUpperCase() ?? ''}`;
            const hash = Math.random().toString(36).substring(2, 6);
            folderUser = `${iniciales}-${hash}`;
        }

        const rutaRelativa = await subirArchivo(req.file, `colegiados/${folderUser}`);

        const fechaEntrega = new Date();

        // Si no viene fecha manual, se calcula desde la vigencia configurada en
        // el catálogo (documentos_requeridos.vigencia_meses). Si el tipo tampoco
        // tiene vigencia configurada, el documento simplemente no vence.
        let fechaVencimientoFinal: Date | null = fecha_vencimiento ? new Date(fecha_vencimiento) : null;
        if (!fechaVencimientoFinal) {
            const docRequerido = await prismaClient.documentos_requeridos.findFirst({
                where: { nombre: tipo_documento }
            });
            if (docRequerido?.vigencia_meses) {
                fechaVencimientoFinal = sumarMeses(fechaEntrega, docRequerido.vigencia_meses);
            }
        }

        const doc = await prismaClient.documentos_colegiados.create({
            data: {
                id_colegiado: id,
                tipo_documento,
                archivo: rutaRelativa,
                fecha_entrega: fechaEntrega,
                fecha_vencimiento: fechaVencimientoFinal,
                estado: "VIGENTE"
            },
        });

        describir(res, `Se subió el documento "${tipo_documento}" de ${col.nombre} ${col.apellido}`);
        res.status(201).json(doc);
    } catch (error) {
        console.error("Error al crear documento:", error);
        res.status(500).json({ error: "Error al subir documento" });
    }
};

export const getAllDocsById = async (req: Request, res: Response) => {
    const id = req.params.id;
    const data = await prismaClient.documentos_colegiados.findMany({
        where: { id_colegiado: +id },
        orderBy: { fecha_entrega: 'desc' }
    });
    res.status(200).json(data);
};

export const getDocumentoById = async (req: Request, res: Response) => {
    const id = req.params.id;
    const documento = await prismaClient.documentos_colegiados.findMany({
        where: {
            id_colegiado: +id,
            tipo_documento: req.query.tipo_documento as string
        }
    });
    res.status(200).json(documento);
};

export const getEspecificDocumentoById = async (req: Request, res: Response) => {
    const id = req.params.id;
    const documento = await prismaClient.documentos_colegiados.findUnique({
        where: { id_documento: +id }
    });
    if (!documento) {
        return res.status(404).json({ error: "Documento no encontrado" });
    }
    res.status(200).json(documento);
};

export const updateDocumento = async (req: Request, res: Response) => {
    const id = req.params.id;
    const { fecha_entrega, estado, fecha_vencimiento } = req.body;

    try {
        const updatedDoc = await prismaClient.documentos_colegiados.update({
            where: { id_documento: +id },
            data: {
                fecha_entrega: new Date(fecha_entrega),
                estado,
                fecha_vencimiento: new Date(fecha_vencimiento),
            },
        });

        describir(res, `Modificó el documento "${updatedDoc.tipo_documento}" (ID ${updatedDoc.id_documento})`);
        res.status(200).json(updatedDoc);
    } catch (error) {
        console.error("Error actualizando documento:", error);
        res.status(500).json({ error: "Error al actualizar el documento" });
    }
};

export const deleteDocumento = async (req: Request, res: Response) => {
    try {
        const id = +req.params.id;
        const doc = await prismaClient.documentos_colegiados.findUnique({
            where: { id_documento: id }
        });
        
        if (!doc) {
            return res.status(404).json({ error: "Documento no encontrado" });
        }

        if (doc.archivo) {
            await eliminarArchivo(doc.archivo);
        }

        await prismaClient.documentos_colegiados.delete({
            where: { id_documento: id }
        });

        describir(res, `Eliminó el documento "${doc.tipo_documento}" (ID ${doc.id_documento})`);
        res.status(200).json({ message: "Documento eliminado con éxito" });
    } catch (error) {
        console.error("Error al eliminar documento:", error);
        res.status(500).json({ error: "Error al eliminar el documento" });
    }
};