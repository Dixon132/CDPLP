import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { Prisma } from "../../../../generated/prisma";
import { subirAawsCorrespondencia } from "../../../utils/uploadS3";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();
const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});
export const getCorrespondencia = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string'
        ? req.query.search.trim()
        : '';

    // 1) Declaro un where tipado
    let where: Prisma.correspondenciaWhereInput = {};

    // 2) Solo si tengo search lleno, agrego el OR
    if (search) {
        where = {
            OR: [
                { asunto: { contains: search, mode: 'insensitive' } },
                { resumen: { contains: search, mode: 'insensitive' } },
                { estado: { contains: search, mode: 'insensitive' } },
                { remitente: { contains: search, mode: 'insensitive' } },

            ]
        };
    }

    // 3) Uso directamente `where` sin hacer spread
    const data = await prismaClient.correspondencia.findMany({
        where,      // <— aquí Prisma sabe que es un correspondenciaWhereInput válido
        skip,
        take: limit,
        include: { destinatario: true },
        orderBy: { fecha_envio: 'desc' },
    });

    const total = await prismaClient.correspondencia.count({ where });

    res.status(200).json({
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    });
};

export const createCorrespondencia = async (req: Request, res: Response) => {
    const { asunto, estado, resumen, fecha_envio, id_destinatario, remitente } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: "Archivo no proporcionado" });
    }
    const urlArchivo = await subirAawsCorrespondencia(req.file)
    try {
        const newCorrespondencia = await prismaClient.correspondencia.create({
            data: {
                asunto,
                resumen,
                contenido: urlArchivo,
                estado: "RECIBIDO",
                fecha_envio: new Date(fecha_envio),
                id_destinatario: +id_destinatario,
                remitente
            },

        });

        res.status(201).json(newCorrespondencia);
    } catch (error) {
        console.error("Error al crear correspondencia:", error);
        res.status(200).json({ error: "Error al crear correspondencia" });
    }
}
export const getCorrespondenciaById = async (req: Request, res: Response) => {
    const id = req.params.id;

    try {
        const correspondencia = await prismaClient.correspondencia.findUnique({
            where: { id_correspondencia: +id },
            include: { destinatario: true },
        });

        if (!correspondencia) {
            return res.status(404).json({ error: "Correspondencia no encontrada" });
        }

        res.status(200).json(correspondencia);
    } catch (error) {
        console.error("Error al obtener correspondencia:", error);
        res.status(500).json({ error: "Error al obtener correspondencia" });
    }
}
export const updateCorrespondencia = async (req: Request, res: Response) => {
    const id = req.params.id;
    const { asunto, estado, contenido, resumen, fecha_envio, id_destinatario, remitente } = req.body;

    try {
        const updatedCorrespondencia = await prismaClient.correspondencia.update({
            where: { id_correspondencia: +id },
            data: {
                asunto,
                resumen,
                contenido,
                estado,
                fecha_envio: new Date(fecha_envio),
                id_destinatario,
                remitente
            }
        });

        res.status(200).json(updatedCorrespondencia);
    } catch (error) {
        console.error("Error al actualizar correspondencia:", error);
        res.status(500).json({ error: "Error al actualizar correspondencia" });
    }
}



export const getAllBuzon = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '', estado } = req.query;
    const skip: number = (Number(page) - 1) * Number(limit);
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const take: number = Number(limit);
    const estados: string[] = estado
        ? Array.isArray(estado)
            ? (estado as string[])
            : [estado as string]
        : [];
    if (estados.includes("A REVISAR")) {
        estados.push("RECIBIDO", "VISTO");
    }

    const whereClause: any = {

        OR: [
            { asunto: { contains: search as string, mode: 'insensitive' } },
            { resumen: { contains: search as string, mode: 'insensitive' } },
        ],
    };
    if (estados.length > 0) {
        // Prisma builder: campo estado dentro de cualquiera de los valores del array
        whereClause.estado = { in: estados };
    }
    const [data, total] = await Promise.all([
        prismaClient.correspondencia.findMany({
            where: whereClause,
            skip,
            take,
            include: { destinatario: true },
            orderBy: { fecha_envio: 'desc' },
        }),
        prismaClient.correspondencia.count({ where: whereClause }),
    ]);

    // 6. Devuelvo resultados y metadatos
    res.json({
        data,
        page: pageNum,
        totalPages: Math.ceil(total / take),
        totalItems: total,
    });


};

export const getContenido = async (req: Request, res: Response) => {
    const id = req.params.id;
    const data = await prismaClient.correspondencia.findFirstOrThrow({
        where: { id_correspondencia: +id },
        include: { destinatario: true },

    })
    res.status(200).json(data);
}

export const marcarVisto = async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
        const correspondencia = await prismaClient.correspondencia.update({
            where: { id_correspondencia: +id },
            data: { estado: "VISTO", fecha_recibido: new Date() }
        });

        res.status(200).json(correspondencia);
    } catch (error) {
        console.error("Error al marcar como visto:", error);
        res.status(500).json({ error: "Error al marcar como visto" });
    }
}

export const verDocFirmado = async (req: Request, res: Response) => {
    try {
        const id = +req.params.id;

        const documento = await prismaClient.correspondencia.findUnique({
            where: { id_correspondencia: id }
        });

        if (!documento) return res.status(404).json({ error: "Documento no encontrado" });

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: documento.contenido!,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutos

        res.json({ url });
    } catch (error) {
        console.error("Error generando URL firmada:", error);
        res.status(500).json({ error: "Error al generar el acceso al archivo" });
    }
}

export const deleteCorrespondencia = async (req: Request, res: Response) => {
    const id = req.params.id;

    try {
        const correspondencia = await prismaClient.correspondencia.delete({
            where: { id_correspondencia: +id },
        });

        res.status(200).json(correspondencia);
    } catch (error) {
        console.error("Error al eliminar correspondencia:", error);
        res.status(500).json({ error: "Error al eliminar correspondencia" });
    }
}

export const changeEstadoCorrespondencia = async (req: Request, res: Response) => {
    const id = req.params.id;
    const { estado } = req.body;

    try {
        const updatedCorrespondencia = await prismaClient.correspondencia.update({
            where: { id_correspondencia: +id },
            data: { estado }
        });

        res.status(200).json(updatedCorrespondencia);
    } catch (error) {
        console.error("Error al cambiar estado de correspondencia:", error);
        res.status(500).json({ error: "Error al cambiar estado de correspondencia" });
    }
}
export const listarUsuariosMinimal = async (req: Request, res: Response) => {
    try {

        const usuariosRaw = await prismaClient.usuarios.findMany({
            select: {
                id_usuario: true,
                nombre: true,
                apellido: true,
            },
            orderBy: {
                nombre: "asc",
            },
        });


        const listaMinimal = usuariosRaw.map((u) => ({
            id: u.id_usuario,
            nombreCompleto: `${u.nombre ?? ""} ${u.apellido ?? ""}`.trim(),
        }));

        // 3) Devolvemos la lista como JSON
        return res.status(200).json(listaMinimal);
    } catch (error) {
        console.error("Error en listarUsuariosMinimal:", error);
        return res
            .status(500)
            .json({ message: "Error al obtener lista mínima de usuarios." });
    }
};

export const getCorrespondenciaReport = async (req: Request, res: Response) => {
    try {
        // 1) Extraer parámetros de consulta
        const {
            fecha_envio_inicio,
            fecha_envio_fin,
            fecha_recibido_inicio,
            fecha_recibido_fin,
            asunto,
            resumen,
            id_destinatario,
        } = req.query;

        // 2) Construir el filtro “where” dinámico
        const filtros: Record<string, any> = {};

        // Rango fecha_envio
        if (fecha_envio_inicio || fecha_envio_fin) {
            filtros.fecha_envio = {};
            if (fecha_envio_inicio) {
                filtros.fecha_envio.gte = new Date(String(fecha_envio_inicio));
            }
            if (fecha_envio_fin) {
                // Para incluir el día completo, agregamos al final del día
                const fin = new Date(String(fecha_envio_fin));
                fin.setHours(23, 59, 59, 999);
                filtros.fecha_envio.lte = fin;
            }
        }

        // Rango fecha_recibido
        if (fecha_recibido_inicio || fecha_recibido_fin) {
            filtros.fecha_recibido = {};
            if (fecha_recibido_inicio) {
                filtros.fecha_recibido.gte = new Date(String(fecha_recibido_inicio));
            }
            if (fecha_recibido_fin) {
                const finRec = new Date(String(fecha_recibido_fin));
                finRec.setHours(23, 59, 59, 999);
                filtros.fecha_recibido.lte = finRec;
            }
        }

        // Filtro asunto (contains, case-insensitive)
        if (asunto) {
            filtros.asunto = {
                contains: String(asunto),
                mode: "insensitive",
            };
        }

        // Filtro resumen (contains, case-insensitive)
        if (resumen) {
            filtros.resumen = {
                contains: String(resumen),
                mode: "insensitive",
            };
        }

        // Filtro destinatario (exacto)
        if (id_destinatario) {
            filtros.id_destinatario = Number(id_destinatario);
        }

        // 3) Traer los registros de correspondencia según filtros
        const correos = await prismaClient.correspondencia.findMany({
            where: filtros,
            orderBy: { fecha_envio: "desc" },
            include: {
                destinatario: {
                    select: { nombre: true, apellido: true },
                },
            },
        });

        // 4) Mapear datos a una forma sencilla para el HTML
        const datos = correos.map((c) => {
            const destinatarioTexto = c.destinatario
                ? `${c.destinatario.nombre ?? ""} ${c.destinatario.apellido ?? ""}`.trim()
                : "N/A";
            return {
                asunto: c.asunto ?? "",
                remitente: c.remitente ?? "",
                destinatario: destinatarioTexto,
                fecha_envio: c.fecha_envio
                    ? c.fecha_envio.toISOString().split("T")[0]
                    : "",
                fecha_recibido: c.fecha_recibido
                    ? c.fecha_recibido.toISOString().split("T")[0]
                    : "",
                estado: c.estado ?? "",
                resumen: c.resumen ?? "",
            };
        });

        // 5) Generar un HTML para el PDF
        const filtrosAplicadosTextoParts: string[] = [];
        if (fecha_envio_inicio || fecha_envio_fin) {
            filtrosAplicadosTextoParts.push(
                `Envio: ${fecha_envio_inicio || "–"} a ${fecha_envio_fin || "–"}`
            );
        }
        if (fecha_recibido_inicio || fecha_recibido_fin) {
            filtrosAplicadosTextoParts.push(
                `Recibido: ${fecha_recibido_inicio || "–"} a ${fecha_recibido_fin || "–"}`
            );
        }
        if (asunto) {
            filtrosAplicadosTextoParts.push(`Asunto contiene: "${asunto}"`);
        }
        if (resumen) {
            filtrosAplicadosTextoParts.push(`Resumen contiene: "${resumen}"`);
        }
        if (id_destinatario) {
            filtrosAplicadosTextoParts.push(`Destinatario ID: ${id_destinatario}`);
        }
        const filtrosAplicadosTexto = filtrosAplicadosTextoParts.length
            ? `<p><strong>Filtros:</strong> ${filtrosAplicadosTextoParts.join(" • ")}</p>`
            : "<p><strong>Filtros:</strong> Ninguno (todas las correspondencias).</p>";

        let tablaHTML = "";
        if (datos.length === 0) {
            tablaHTML = `<p>No se encontraron registros de correspondencia con esos filtros.</p>`;
        } else {
            tablaHTML = `
      <table>
        <thead>
          <tr>
            <th>Asunto</th>
            <th>Remitente</th>
            <th>Destinatario</th>
            <th>Fecha Envío</th>
            <th>Fecha Recibido</th>
            <th>Estado</th>
            
          </tr>
        </thead>
        <tbody>
          ${datos
                    .map(
                        (d) => `
            <tr>
              <td>${d.asunto}</td>
              <td>${d.remitente}</td>
              <td>${d.destinatario}</td>
              <td>${d.fecha_envio}</td>
              <td>${d.fecha_recibido}</td>
              <td>${d.estado}</td>
              
            </tr>
          `
                    )
                    .join("")}
        </tbody>
      </table>
      `;
        }

        const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; text-align: center; }
            p { margin: 4px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; vertical-align: top; }
            th { background-color: #eee; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Reporte de Correspondencia</h1>
          <p>Generado: ${new Date().toLocaleString()}</p>
          ${filtrosAplicadosTexto}
          ${tablaHTML}
        </body>
      </html>
    `;

        // 6) Usar Puppeteer para renderizar el HTML y generar PDF
        const browser = await puppeteer.launch({
            headless: true,
            // en algunos entornos sin GUI se requieren flags:
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
        });
        await browser.close();

        if (!pdfBuffer || pdfBuffer.length === 0) {
            return res.status(500).send("Error generando PDF de correspondencia.");
        }

        // 7) Enviar PDF a cliente
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="reporte_correspondencia.pdf"`
        );
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error en getCorrespondenciaReport:", error);
        return res.status(500).send("Error al generar reporte de correspondencia.");
    }
};