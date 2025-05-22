import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import dotenv from "dotenv";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { subirAaws } from "../../../utils/uploadS3";
import { Param } from "@prisma/client/runtime/library";
dotenv.config();
const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});
export const obtenerUrlFirmada = async (req: Request, res: Response) => {
    try {
        const id = +req.params.id;

        const documento = await prismaClient.documentos_colegiados.findUnique({
            where: { id_documento: id }
        });

        if (!documento) return res.status(404).json({ error: "Documento no encontrado" });

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: documento.archivo!, // Esto debe ser tipo: documentos/archivo.pdf
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutos

        res.json({ url });
    } catch (error) {
        console.error("Error generando URL firmada:", error);
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

        const urlArchivo = await subirAaws(req.file); // 🔥 Subida a S3

        const doc = await prismaClient.documentos_colegiados.create({
            data: {
                id_colegiado: id,
                tipo_documento,
                archivo: urlArchivo, // guarda la URL de S3
                fecha_entrega: new Date(),
                fecha_vencimiento: new Date(fecha_vencimiento),
                estado: "VIGENTE"
            },
        });

        res.status(201).json(doc);
    } catch (error) {
        console.error("Error al crear documento:", error);
        res.status(500).json({ error: "Error al subir documento" });
    }
};
export const getAllDocsById = async (req: Request, res: Response) => {
    const id = req.params.id
    const data = await prismaClient.documentos_colegiados.findMany({
        where: {
            id_colegiado: +id
        }
    })
    res.status(200).json(data)
}
