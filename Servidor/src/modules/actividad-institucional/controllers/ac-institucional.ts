// controllers/ac-institucionales.controller.ts
import { Request, Response } from "express";
import puppeteer from "puppeteer";
import prismaClient from "../../../utils/prismaClient";
import { registrarMovimientoPagoCurso } from "../../financiero/services/movimiento";
import { Origen } from "../../../types/movimientos";
import registrarAuditoria from "../../Auditorias/services";
import { Acciones, Modulos } from "../../../types/auditoria";

/**
 * GET /api/ac-institucionales
 * Query params: ?page=&limit=&search=...
 * Devuelve: { data: [actividades], total, page, totalPages }
 */
export const getActInst = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const searchFields = ["nombre", "descripcion", "tipo"];

    const searchFilter = search
        ? {
            OR: searchFields.map((field) => ({
                [field]: { contains: String(search), mode: "insensitive" },
            })),
        }
        : {};

    const data = await prismaClient.actividades_institucionales.findMany({
        where: { ...searchFilter },
        skip,
        take,
        orderBy: { id_actividad: "desc" },
    });

    const total = await prismaClient.actividades_institucionales.count({
        where: { ...searchFilter },
    });

    return res.status(200).json({
        data,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / take),
    });
};

/**
 * GET /api/ac-institucionales/:id
 * Devuelve un objeto de actividad institucional (sin includes adicionales)
 */
export const getActInstById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const act = await prismaClient.actividades_institucionales.findUniqueOrThrow({
        where: { id_actividad: id },
    });
    return res.status(200).json(act);
};

/**
 * POST /api/ac-institucionales
 * Cuerpo: { nombre, descripcion, tipo, fecha_programada, costo, estado }
 */
export const createActInst = async (req: Request, res: Response) => {
    const {
        nombre,
        descripcion,
        tipo,
        fecha_programada,
        costo,
        estado,
    } = req.body;
    console.log(req.body);
    const nueva = await prismaClient.actividades_institucionales.create({
        data: {
            nombre,
            descripcion,
            tipo,
            fecha_programada: fecha_programada ? new Date(fecha_programada) : null,
            costo: costo,
            estado,
            // ignoramos id_responsable y archivo
        },
    });

    return res
        .status(201)
        .json({ message: "Actividad institucional creada", data: nueva });
};

/**
 * PATCH /api/ac-institucionales/:id
 * Cuerpo: { nombre, descripcion, tipo, fecha_programada, costo, estado }
 */
export const updateActInstById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const {
        nombre,
        descripcion,
        tipo,
        fecha_programada,
        costo,
        estado,
    } = req.body;

    const updated = await prismaClient.actividades_institucionales.update({
        where: { id_actividad: id },
        data: {
            nombre,
            descripcion,
            tipo,
            fecha_programada: fecha_programada ? new Date(fecha_programada) : null,
            costo: costo,
            estado,
        },
    });

    return res.status(200).json(updated);
};

/**
 * PATCH /api/ac-institucionales/:id/estado
 * Cuerpo: { estado }
 */
export const updateEstadoActInst = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { estado } = req.body;
    const updated = await prismaClient.actividades_institucionales.update({
        where: { id_actividad: id },
        data: { estado },
    });
    return res.status(200).json(updated);
};


/**
 * POST /api/colegiados-registrados-actividad-institucional
 * Cuerpo: { id_actividad, id_colegiado?, id_invitado?, fecha_registro, estado_registro, metodo_pago }
 */
export const createRegistroInst = async (req: Request, res: Response) => {
    const {
        id_actividad,
        id_colegiado,
        id_invitado,
        fecha_registro,
        estado_registro,
        metodo_pago,
        presupuesto
    } = req.body;

    const reg = await prismaClient.colegiados_registrados_actividad_institucional.create({
        data: {
            id_actividad: Number(id_actividad),
            id_colegiado: id_colegiado ? Number(id_colegiado) : null,
            id_invitado: id_invitado ? Number(id_invitado) : null,
            fecha_registro: fecha_registro ? new Date(fecha_registro) : new Date(),
            estado_registro,
            metodo_pago,
        },
    });
    const act = await prismaClient.actividades_institucionales.findFirstOrThrow({
        where: {
            id_actividad
        },
        select: {
            costo: true,
            nombre: true
        }
    })
    await registrarMovimientoPagoCurso(reg.id_registro, Number(act.costo), Origen.CURSO, `Pago de la actividad institucional: ${act.nombre}`, 1)
    await registrarAuditoria(req.user, Acciones.REGISTRO, Modulos.FINANCIERO, `Se registro una inscripcion al curso con monto de ${act.costo}`)
    return res.status(201).json(reg);
};





export const getRegistrosInstByActividad = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const regs = await prismaClient.colegiados_registrados_actividad_institucional.findMany({
        where: { id_actividad: id },
        include: {
            colegiados: true,
            invitados: true,
        },
    });
    return res.status(200).json(regs);
};
export const getAsistenciasInstByActividad = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const asis = await prismaClient.asistencias_actividad.findMany({
        where: { id_actividad: id },
        include: { colegiados: true },
    });
    return res.status(200).json(asis);
};





export const createAsistenciaInst = async (req: Request, res: Response) => {
    const { id_actividad, id_colegiado } = req.body;
    const a = await prismaClient.asistencias_actividad.create({
        data: {
            id_actividad: Number(id_actividad),
            id_colegiado: Number(id_colegiado),
        }
    });
    return res.status(201).json(a);
};

export const deleteAsistenciaInst = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const deleted = await prismaClient.asistencias_actividad.delete({
        where: { id_asistencia: id },
    });
    return res.status(200).json(deleted);
};


export const listarActividadesInstMinimal = async (req: Request, res: Response) => {
    try {
        const lista = await prismaClient.actividades_institucionales.findMany({
            select: {
                id_actividad: true,
                nombre: true,
            },
            orderBy: {
                nombre: "asc",
            },
        });
        // Formatear a { id, nombre }
        const minimal = lista.map((a) => ({
            id: a.id_actividad,
            nombre: a.nombre,
        }));
        return res.status(200).json(minimal);
    } catch (error) {
        console.error("Error en listarActividadesInstMinimal:", error);
        return res
            .status(500)
            .json({ message: "Error al obtener lista mínima de actividades institucionales." });
    }
};

/**
 * 2) Reporte Detallado de 1 Actividad Institucional (por ID)
 *    GET /api/actividades-institucionales/:id/report
 */
export const getActividadInstDetailReport = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        // 2.1) Obtener la actividad institucional con:
        //     - sus datos básicos
        //     - todos los registros (colegiados_registrados_actividad_institucional)
        //     - todas las asistencias (asistencias_actividad)
        //     - relación con “usuarios” (responsable) si quisieras incluirlo (pero lo ignoramos tal como pediste)
        const act = await prismaClient.actividades_institucionales.findUnique({
            where: { id_actividad: id },
            include: {
                colegiados_registrados_actividad_institucional: {
                    include: {
                        colegiados: {
                            select: {
                                nombre: true,
                                apellido: true,
                                correo: true,
                                telefono: true,
                                especialidades: true,
                                estado: true,
                            },
                        },
                        invitados: {
                            select: {
                                nombre: true,
                                apellido: true,
                                correo: true,
                                telefono: true,
                            },
                        },
                        origen_movimiento: {
                            select: {
                                // si quisieras mostrar monto/origen, etc.
                                tipo_origen: true,
                                monto: true,
                            },
                        },
                    },
                },
                asistencias_actividad: {
                    include: {
                        colegiados: {
                            select: {
                                nombre: true,
                                apellido: true,
                            },
                        },
                    },
                },
            },
        });

        if (!act) {
            return res.status(404).send("Actividad Institucional no encontrada");
        }

        // 2.2) Mapeo de datos para el HTML
        const nombre = act.nombre || "";
        const descripcion = act.descripcion || "";
        const tipo = act.tipo || "";
        const fechaProg = act.fecha_programada
            ? act.fecha_programada.toISOString().split("T")[0]
            : "";
        const costo = act.costo ? act.costo.toString() : "0.00";
        const estado = act.estado || "";
        // Nota: Omitimos id_responsable si no lo usamos

        // Registros (colegiados + invitados) → “colegiados_registrados_actividad_institucional”
        const registros = act.colegiados_registrados_actividad_institucional.map((r) => {
            if (r.colegiados) {
                const c = r.colegiados;
                return {
                    tipo: "Colegiado",
                    nombreCompleto: `${c.nombre || ""} ${c.apellido || ""}`.trim(),
                    correo: c.correo || "",
                    telefono: c.telefono || "",
                    detalles: c.especialidades || "",
                    estadoRegistro: r.estado_registro || "",
                    fechaRegistro: r.fecha_registro
                        ? r.fecha_registro.toISOString().split("T")[0]
                        : "",
                    metodoPago: r.metodo_pago || "",
                };
            } else if (r.invitados) {
                const i = r.invitados;
                return {
                    nombreCompleto: `${i.nombre || ""} ${i.apellido || ""}`.trim(),
                    correo: i.correo || "",
                    telefono: i.telefono || "",
                    detalles: "–",
                    estadoRegistro: r.estado_registro || "",
                    fechaRegistro: r.fecha_registro
                        ? r.fecha_registro.toISOString().split("T")[0]
                        : "",
                    metodoPago: r.metodo_pago || "",
                };
            } else {
                return null;
            }
        }).filter((x) => x !== null) as Array<{
            tipo: string;
            nombreCompleto: string;
            correo: string;
            telefono: string;
            detalles: string;
            estadoRegistro: string;
            fechaRegistro: string;
            metodoPago: string;
        }>;

        // Asistencias → “asistencias_actividad”
        const asistencias = act.asistencias_actividad.map((a) => ({
            nombreCompleto: a.colegiados
                ? `${a.colegiados.nombre || ""} ${a.colegiados.apellido || ""}`.trim()
                : "–",
            // Representa solo que asistió; si quisieras la fecha de asistencia, no la hay
        }));

        // 2.3) Construir HTML
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
          <h1>Detalle Actividad Institucional</h1>
          <h3>Generado: ${new Date().toLocaleString()}</h3>

          <div class="seccion">
            <h2>Datos Básicos</h2>
            <p><strong>Nombre:</strong> ${nombre}</p>
            <p><strong>Descripción:</strong> ${descripcion}</p>
            <p><strong>Tipo:</strong> ${tipo}</p>
            <p><strong>Fecha Programada:</strong> ${fechaProg}</p>
            <p><strong>Costo (Bs.):</strong> ${costo}</p>
            <p><strong>Estado:</strong> ${estado}</p>
          </div>

          <div class="seccion">
            <h2>Registros Inscritos (Colegiados & Invitados)</h2>
            ${registros.length === 0
                ? "<p>No hay registros inscritos.</p>"
                : `
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Nombre Completo</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                    <th>Detalles</th>
                    <th>Estado Registro</th>
                    <th>Fecha Registro</th>
                    <th>Método Pago</th>
                  </tr>
                </thead>
                <tbody>
                  ${registros.map((r) => `
                    <tr>
                      <td>${r.tipo}</td>
                      <td>${r.nombreCompleto}</td>
                      <td>${r.correo}</td>
                      <td>${r.telefono}</td>
                      <td>${r.detalles}</td>
                      <td>${r.estadoRegistro}</td>
                      <td>${r.fechaRegistro}</td>
                      <td>${r.metodoPago}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            `
            }
          </div>

          <div class="seccion">
            <h2>Asistencias Marcadas (solo Colegiados)</h2>
            ${asistencias.length === 0
                ? "<p>No hay asistencias registradas.</p>"
                : `
              <ul>
                ${asistencias.map((a) => `<li>${a.nombreCompleto}</li>`).join("")}
              </ul>
            `
            }
          </div>
        </body>
      </html>
    `;

        // 2.4) Generar PDF con Puppeteer
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
            return res
                .status(500)
                .send("Error generando PDF detalle de actividad institucional.");
        }

        const filename = `detalle_actividad_inst_${id}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Error en getActividadInstDetailReport:", error);
        return res
            .status(500)
            .send("Error al generar reporte detallado de actividad institucional.");
    }
};

/**
 * 3) Reporte Resumen de Actividades Institucionales entre Fechas
 *    GET /api/actividades-institucionales/report?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
 */
export const getActividadesInstSummaryReport = async (req: Request, res: Response) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        // 3.1) Construir filtro “where” para Prisma
        const where: Record<string, any> = {};

        if (fecha_inicio || fecha_fin) {
            where.fecha_programada = {};
            if (fecha_inicio) {
                where.fecha_programada.gte = new Date(String(fecha_inicio));
            }
            if (fecha_fin) {
                const fin = new Date(String(fecha_fin));
                fin.setHours(23, 59, 59, 999);
                where.fecha_programada.lte = fin;
            }
        }

        // 3.2) Obtener todas las actividades en ese rango e incluir:
        //       - conteo de registros inscritos
        //       - conteo de asistencias marcadas
        //       - costo y estado
        const acts = await prismaClient.actividades_institucionales.findMany({
            where,
            orderBy: { fecha_programada: "asc" },
            include: {
                colegiados_registrados_actividad_institucional: {
                    select: { id_registro: true }, // solo para contar
                },
                asistencias_actividad: {
                    select: { id_asistencia: true }, // para contar
                },
            },
        });

        // 3.3) Mapear datos para el HTML
        const datos = acts.map((a) => {
            const nombre = a.nombre || "";
            const tipo = a.tipo || "";
            const fechaProg = a.fecha_programada
                ? a.fecha_programada.toISOString().split("T")[0]
                : "";
            const costo = a.costo ? a.costo.toString() : "0.00";
            const estado = a.estado || "";
            const totalInscritos = a.colegiados_registrados_actividad_institucional.length;
            const totalAsistencias = a.asistencias_actividad.length;

            return {
                nombre,
                tipo,
                fechaProg,
                costo,
                estado,
                totalInscritos,
                totalAsistencias,
            };
        });

        // 3.4) Texto con filtros aplicados
        let filtrosTexto = "<p>Todos los registros.</p>";
        if (fecha_inicio || fecha_fin) {
            const inicio = fecha_inicio ? String(fecha_inicio) : "—";
            const fin = fecha_fin ? String(fecha_fin) : "—";
            filtrosTexto = `<p><strong>Rango Fecha Programada:</strong> ${inicio} – ${fin}</p>`;
        }

        // 3.5) Construir tabla HTML
        let tablaHTML = "";
        if (datos.length === 0) {
            tablaHTML = `<p>No hay actividades institucionales en este rango.</p>`;
        } else {
            tablaHTML = `
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Fecha Programada</th>
            <th>Costo (Bs.)</th>
            <th>Estado</th>
            <th># Inscritos</th>
            <th># Asistencias</th>
          </tr>
        </thead>
        <tbody>
          ${datos.map((d) => `
            <tr>
              <td>${d.nombre}</td>
              <td>${d.tipo}</td>
              <td>${d.fechaProg}</td>
              <td>${d.costo}</td>
              <td>${d.estado}</td>
              <td>${d.totalInscritos}</td>
              <td>${d.totalAsistencias}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      `;
        }

        // 3.6) HTML completo
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
          <h1>Resumen de Actividades Institucionales</h1>
          <h3>Generado: ${new Date().toLocaleString()}</h3>
          ${filtrosTexto}
          ${tablaHTML}
        </body>
      </html>
    `;

        // 3.7) Generar PDF con Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();

        if (!pdfBuffer || pdfBuffer.length === 0) {
            return res
                .status(500)
                .send("Error generando PDF resumen de actividades institucionales.");
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="resumen_actividades_institucionales.pdf"`
        );
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Error en getActividadesInstSummaryReport:", error);
        return res
            .status(500)
            .send("Error al generar reporte resumen de actividades institucionales.");
    }
};