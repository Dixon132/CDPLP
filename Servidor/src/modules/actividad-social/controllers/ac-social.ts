import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import puppeteer from "puppeteer";
import { actividadSocialSchema } from "../schemas/ac-social";

export const getActividadesSociales = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '' } = req.query;
    const skip: number = (Number(page) - 1) * Number(limit);
    const take: number = Number(limit);

    const searchFields = ['nombre', 'descripcion', 'ubicacion', 'tipo'];
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
        include: {
            convenio: true
        },
        skip,
        take
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




export const getActividadSocialById = async (req: Request, res: Response) => {
    const id = req.params.id
    const actividad = await prismaClient.actividades_sociales.findFirstOrThrow({
        where: {
            id_actividad_social: +id
        }
    })
    res.status(200).json(actividad)
}
export const updateEstadoById = async (req: Request, res: Response) => {
    const id = req.params.id
    const { estado } = req.body
    const updatedActividad = await prismaClient.actividades_sociales.update({
        where: {
            id_actividad_social: +id
        },
        data: {
            estado
        }
    })
    res.status(200).json(updatedActividad)
}
export const createActividadSocial = async (req: Request, res: Response) => {
    const {
        nombre,
        descripcion,
        ubicacion,
        id_convenio,
        motivo,
        fecha_inicio,
        fecha_fin,
        estado,
        tipo
    } = req.body;

    const actividad = await prismaClient.actividades_sociales.create({
        data: {
            nombre,
            descripcion,
            ubicacion,
            id_convenio: +id_convenio,
            motivo,
            fecha_inicio: new Date(fecha_inicio),
            fecha_fin: new Date(fecha_fin),
            estado,
            tipo
        }
    });
    res.status(200).json(actividad)
}

export const getActividadSocialesById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    try {
        const actividad = await prismaClient.actividades_sociales.findUnique({
            where: { id_actividad_social: id },
            include: {                         // responsable     // solicitud
                colegiados_asignados_social: {          // array de colegiados
                    include: {
                        colegiados: true
                    }
                },
                convenio: true, // Incluye el convenio relacionado
            }
        });

        if (!actividad) {
            return res.status(404).json({ error: 'No se encontró la actividad' });
        }

        res.json(actividad);
    } catch (error) {
        console.error('Error fetching actividad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const asignarColegiado = async (req: Request, res: Response) => {
    const { id_actividad_social, id_colegiado } = req.body;

    if (!id_actividad_social || !id_colegiado) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    try {
        const actividad = await prismaClient.colegiados_asignados_social.create({
            data: {
                id_actividad_social: +id_actividad_social,
                id_colegiado: +id_colegiado
            }
        });

        res.status(200).json(actividad);
    } catch (error) {
        console.error('Error al asignar colegiado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

export const updateActividadSocial = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        nombre,
        descripcion,
        ubicacion,
        id_convenio,
        motivo,
        fecha_inicio,
        fecha_fin,
        estado,
        tipo
    } = req.body;

    try {
        const actividadSocialData = {
            nombre,
            descripcion,
            ubicacion,
            id_convenio: +id_convenio,
            motivo,
            fecha_inicio: new Date(fecha_inicio),
            fecha_fin: new Date(fecha_fin),
            estado,
            tipo
        };


        const actividadSocialActualizada = await prismaClient.actividades_sociales.update({
            where: { id_actividad_social: +id },
            data: actividadSocialData
        });

        res.status(200).json({
            message: 'Actividad social actualizada correctamente',
            actividadSocial: actividadSocialActualizada
        });
    } catch (error) {
        console.error("Error al actualizar la actividad social:", error);
        res.status(500).json({ message: "Error al actualizar la actividad social" });
    }
}




export const getActividadSocialDetailReport = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        // 1.1) Buscamos la actividad social por ID, incluyendo convenio y colegiados asignados
        const act = await prismaClient.actividades_sociales.findUnique({
            where: { id_actividad_social: id },
            include: {
                convenio: {
                    select: { nombre: true, contacto: true, fecha_inicio: true, fecha_fin: true, estado: true },
                },
                colegiados_asignados_social: {
                    include: {
                        colegiados: {
                            select: { nombre: true, apellido: true, correo: true, telefono: true, especialidades: true, estado: true },
                        },
                        invitados: {
                            select: { nombre: true, apellido: true, correo: true, telefono: true },
                        },
                    },
                },
            },
        });

        if (!act) {
            return res.status(404).send("Actividad Social no encontrada");
        }

        // 1.2) Mapeamos la info para el HTML
        const nombre = act.nombre ?? "";
        const descripcion = act.descripcion ?? "";
        const ubicacion = act.ubicacion ?? "";
        const motivo = act.motivo ?? "";
        const estado = act.estado ?? "";
        const tipo = act.tipo ?? "";
        const fechaInicio = act.fecha_inicio ? act.fecha_inicio.toISOString().split("T")[0] : "";
        const fechaFin = act.fecha_fin ? act.fecha_fin.toISOString().split("T")[0] : "";

        // Datos del convenio, si existe
        let convenioHTML = "<p>No asociado a ningún convenio.</p>";
        if (act.convenio) {
            const conv = act.convenio;
            const convInicio = conv.fecha_inicio ? conv.fecha_inicio.toISOString().split("T")[0] : "";
            const convFin = conv.fecha_fin ? conv.fecha_fin.toISOString().split("T")[0] : "";
            convenioHTML = `
        <p><strong>Convenio:</strong> ${conv.nombre ?? ""}</p>
        <p><strong>Contacto:</strong> ${conv.contacto ?? ""}</p>
        <p><strong>Fechas Convenio:</strong> ${convInicio} – ${convFin}</p>
        <p><strong>Estado Convenio:</strong> ${conv.estado ?? ""}</p>
      `;
        }

        // Colegiados asignados
        const asignaciones = act.colegiados_asignados_social;
        let tablaAsignadosHTML = "";
        if (asignaciones.length === 0) {
            tablaAsignadosHTML = "<p>No hay colegiados ni invitados asignados a esta actividad social.</p>";
        } else {
            tablaAsignadosHTML = `
      <table>
        <thead>
          <tr>
            <th>Nombre Completo</th>
            <th>Correo</th>
            <th>Teléfono</th>
            <th>Especialidades / Tipo Invitado</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${asignaciones.map((a) => {
                if (a.colegiados) {
                    // Si es un colegiado
                    const c = a.colegiados;
                    return `
                <tr>
                  <td>Colegiado</td>
                  <td>${c.nombre ?? ""} ${c.apellido ?? ""}</td>
                  <td>${c.correo ?? ""}</td>
                  <td>${c.telefono ?? ""}</td>
                  <td>${c.especialidades ?? ""}</td>
                  <td>${c.estado ?? ""}</td>
                </tr>
              `;
                } else if (a.invitados) {
                    // Si es un invitado
                    const i = a.invitados;
                    return `
                <tr>

                  <td>${i.nombre ?? ""} ${i.apellido ?? ""}</td>
                  <td>${i.correo ?? ""}</td>
                  <td>${i.telefono ?? ""}</td>
                  <td>Invitado Externo</td>
                  <td>Invitado</td>
                </tr>
              `;
                } else {
                    return "";
                }
            }).join("")}
        </tbody>
      </table>
      `;
        }

        // 1.3) Armamos el HTML completo
        const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            h2 { color: #444; margin-top: 20px; }
            p { margin: 4px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; vertical-align: top; }
            th { background-color: #eee; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .seccion { margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Detalle Actividad Social</h1>
          <h3>Generado: ${new Date().toLocaleString()}</h3>

          <div class="seccion">
            <h2>Datos Generales</h2>
            <p><strong>Nombre:</strong> ${nombre}</p>
            <p><strong>Descripción:</strong> ${descripcion}</p>
            <p><strong>Ubicación:</strong> ${ubicacion}</p>
            <p><strong>Motivo:</strong> ${motivo}</p>
            <p><strong>Fechas:</strong> ${fechaInicio} – ${fechaFin}</p>
            <p><strong>Estado:</strong> ${estado}</p>
            <p><strong>Tipo:</strong> ${tipo}</p>
          </div>

          <div class="seccion">
            <h2>Información de Convenio</h2>
            ${convenioHTML}
          </div>

          <div class="seccion">
            <h2>Colegiados e Invitados Asignados</h2>
            ${tablaAsignadosHTML}
          </div>
        </body>
      </html>
    `;

        // 1.4) Generar PDF con Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
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
            return res.status(500).send("Error generando PDF detallado de la actividad social.");
        }

        const filename = `reporte_actividad_social_${id}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Error en getActividadSocialDetailReport:", error);
        return res
            .status(500)
            .send("Error al generar reporte detallado de actividad social.");
    }
};

//
// 2) Reporte Resumen de Actividades Sociales (entre fechas)
//    GET /api/actividades-sociales/report?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
//
export const getActividadesSocialesSummaryReport = async (req: Request, res: Response) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        // 2.1) Construimos el filtro “where” para Prisma
        const where: Record<string, any> = {};

        if (fecha_inicio || fecha_fin) {
            where.fecha_inicio = {};
            if (fecha_inicio) {
                where.fecha_inicio.gte = new Date(String(fecha_inicio));
            }
            if (fecha_fin) {
                // Para incluir todo el día final
                const fin = new Date(String(fecha_fin));
                fin.setHours(23, 59, 59, 999);
                where.fecha_inicio.lte = fin;
            }
        }

        // 2.2) Buscamos todas las actividades en ese rango, incluyendo convenio + conteo de asignados
        const acts = await prismaClient.actividades_sociales.findMany({
            where,
            orderBy: { fecha_inicio: "asc" },
            include: {
                convenio: {
                    select: { nombre: true },
                },
                colegiados_asignados_social: {
                    select: { id_asignacion: true }, // Solo para contar
                },
            },
        });

        // 2.3) Mapeamos los datos a algo sencillo para el HTML
        const datos = acts.map((a) => {
            const nombre = a.nombre ?? "";
            const ubicacion = a.ubicacion ?? "";
            const motivo = a.motivo ?? "";
            const tipo = a.tipo ?? "";
            const estado = a.estado ?? "";
            const fechaInicio = a.fecha_inicio ? a.fecha_inicio.toISOString().split("T")[0] : "";
            const fechaFin = a.fecha_fin ? a.fecha_fin.toISOString().split("T")[0] : "";
            const convenio = a.convenio ? a.convenio.nombre ?? "" : "—";
            const totalAsignados = a.colegiados_asignados_social.length;

            return {
                nombre,
                ubicacion,
                motivo,
                tipo,
                estado,
                fechaInicio,
                fechaFin,
                convenio,
                totalAsignados,
            };
        });

        // 2.4) Texto con los filtros aplicados
        let filtrosTexto = "<p>Todos los registros.</p>";
        if (fecha_inicio || fecha_fin) {
            const inicio = fecha_inicio ? String(fecha_inicio) : "—";
            const fin = fecha_fin ? String(fecha_fin) : "—";
            filtrosTexto = `<p><strong>Rango Fecha Inicio:</strong> ${inicio} – ${fin}</p>`;
        }

        // 2.5) Creamos la tabla HTML
        let tablaHTML = "";
        if (datos.length === 0) {
            tablaHTML = `<p>No hay actividades sociales en este rango.</p>`;
        } else {
            tablaHTML = `
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Ubicación</th>
            <th>Motivo</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Fecha Inicio</th>
            <th>Fecha Fin</th>
            <th>Convenio</th>
            <th># Asignados</th>
          </tr>
        </thead>
        <tbody>
          ${datos
                    .map(
                        (d) => `
            <tr>
              <td>${d.nombre}</td>
              <td>${d.ubicacion}</td>
              <td>${d.motivo}</td>
              <td>${d.tipo}</td>
              <td>${d.estado}</td>
              <td>${d.fechaInicio}</td>
              <td>${d.fechaFin}</td>
              <td>${d.convenio}</td>
              <td>${d.totalAsignados}</td>
            </tr>
          `
                    )
                    .join("")}
        </tbody>
      </table>
      `;
        }

        // 2.6) HTML completo
        const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            p { margin: 4px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; vertical-align: top; }
            th { background-color: #eee; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Resumen de Actividades Sociales</h1>
          <h3>Generado: ${new Date().toLocaleString()}</h3>
          ${filtrosTexto}
          ${tablaHTML}
        </body>
      </html>
    `;

        // 2.7) Puppeteer → PDF
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();

        if (!pdfBuffer || pdfBuffer.length === 0) {
            return res.status(500).send("Error generando PDF resumen de actividades sociales.");
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="resumen_actividades_sociales.pdf"`
        );
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Error en getActividadesSocialesSummaryReport:", error);
        return res
            .status(500)
            .send("Error al generar reporte resumen de actividades sociales.");
    }
};
export const listarActividadesSocialesMinimal = async (req: Request, res: Response) => {
    try {
        const acts = await prismaClient.actividades_sociales.findMany({
            select: {
                id_actividad_social: true,
                nombre: true,
            },
            orderBy: { nombre: "asc" },
        });
        // Transformar a { id, nombre }
        const lista = acts.map((a) => ({
            id: a.id_actividad_social,
            nombre: a.nombre ?? "",
        }));
        return res.status(200).json(lista);
    } catch (error) {
        console.error("Error en listarActividadesSocialesMinimal:", error);
        return res
            .status(500)
            .json({ message: "Error al obtener lista mínima de actividades sociales." });
    }
};