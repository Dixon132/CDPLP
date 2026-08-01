import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { Prisma } from "../../../../generated/prisma";
import { subirArchivo, buildPublicUrl, eliminarArchivo } from "../../../utils/uploadS3";
import dotenv from "dotenv";
import { describir } from "../../../utils/auditoria";
import { Modulos } from "../../../types/auditoria";
import { emitirNotificacion } from "../../notificaciones/services";
import { esc, generarInformePdf, enviarInformePdf, renderInformeHTML, renderTabla } from "../../../utils/informes";
dotenv.config();
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

    // Carpeta dinámica basada en la fecha de envío
    const dateObj = new Date(fecha_envio);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const folder = `correspondencia/${year}/${month}`;
    const urlArchivo = await subirArchivo(req.file, folder);

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

        describir(res, `Se registró correspondencia "${newCorrespondencia.asunto}" de ${remitente}`);
        await emitirNotificacion({
            modulo: Modulos.CORRESPONDENCIA,
            tipo: 'info',
            titulo: 'Nueva correspondencia recibida',
            descripcion: `${newCorrespondencia.asunto} · De: ${remitente}`,
            enlace: `/dashboard/buzon/${newCorrespondencia.id_correspondencia}`,
            idUsuario: req.user?.id_usuario,
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

        describir(res, `Modificó la correspondencia "${updatedCorrespondencia.asunto}"`);
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

        describir(res, `Marcó como visto la correspondencia "${correspondencia.asunto}"`);
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

        // Supabase: archivos públicos, devolvemos la URL directamente
        const url = buildPublicUrl(documento.contenido);
        res.json({ url });
    } catch (error) {
        console.error("Error generando URL:", error);
        res.status(500).json({ error: "Error al generar el acceso al archivo" });
    }
}

export const deleteCorrespondencia = async (req: Request, res: Response) => {
    const id = req.params.id;

    try {
        const correspondencia = await prismaClient.correspondencia.findUnique({
            where: { id_correspondencia: +id },
        });

        if (!correspondencia) {
            return res.status(404).json({ error: "Correspondencia no encontrada" });
        }

        // Eliminar el archivo de Supabase si existe
        if (correspondencia.contenido) {
            await eliminarArchivo(correspondencia.contenido).catch(e => console.error("Error eliminando archivo de correspondencia de S3:", e));
        }

        const deletedCorrespondencia = await prismaClient.correspondencia.delete({
            where: { id_correspondencia: +id },
        });

        describir(res, `Eliminó la correspondencia "${deletedCorrespondencia.asunto}"`);
        res.status(200).json(deletedCorrespondencia);
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

        describir(res, `Cambió el estado de la correspondencia "${updatedCorrespondencia.asunto}" a ${estado}`);
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
            ? `Filtros: ${esc(filtrosAplicadosTextoParts.join(" • "))}`
            : "Filtros: Ninguno (todas las correspondencias).";

        // Contadores por estado, para dar una lectura rápida antes del detalle
        const contadoresPorEstado = new Map<string, number>();
        for (const d of datos) {
            const estado = d.estado || "Sin estado";
            contadoresPorEstado.set(estado, (contadoresPorEstado.get(estado) ?? 0) + 1);
        }

        const kpis = [
            { label: "Total Correspondencia", value: datos.length, accent: "violeta" as const },
            ...Array.from(contadoresPorEstado.entries()).map(([estado, cantidad]) => ({
                label: estado,
                value: cantidad,
                accent: "neutro" as const,
            })),
        ];

        const bodyHtml = `
      <section class="seccion">
        <h2 class="seccion-titulo">Detalle</h2>
        ${renderTabla(
            [
                { label: "Asunto" },
                { label: "Remitente" },
                { label: "Destinatario" },
                { label: "Fecha Envío" },
                { label: "Fecha Recibido" },
                { label: "Estado" },
            ],
            datos.map(
                (d) => `
            <tr>
              <td>${esc(d.asunto)}</td>
              <td>${esc(d.remitente)}</td>
              <td>${esc(d.destinatario)}</td>
              <td>${esc(d.fecha_envio)}</td>
              <td>${esc(d.fecha_recibido)}</td>
              <td>${esc(d.estado)}</td>
            </tr>`
            ),
            "No se encontraron registros de correspondencia con esos filtros."
        )}
      </section>
    `;

        const html = renderInformeHTML({
            titulo: "Informe de Gestión de Correspondencia",
            filtrosTexto: filtrosAplicadosTexto,
            kpis,
            bodyHtml,
            orientacion: "landscape",
        });

        const pdfBuffer = await generarInformePdf(html, { landscape: true });
        return enviarInformePdf(res, pdfBuffer, "informe_correspondencia.pdf");
    } catch (error) {
        console.error("Error en getCorrespondenciaReport:", error);
        return res.status(500).send("Error al generar informe de correspondencia.");
    }
};