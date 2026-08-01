import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { actividadSocialSchema } from "../schemas/ac-social";
import { describir } from "../../../utils/auditoria";
import { esc, generarInformePdf, enviarInformePdf, renderInformeHTML, renderTabla } from "../../../utils/informes";

// Haversine: calcula distancia en metros entre dos puntos GPS
function haversineDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // radio Tierra en metros
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export const getActividadesSociales = async (req: Request, res: Response) => {
    const { page = 1, limit = 15, search = '', estado } = req.query;
    const skip: number = (Number(page) - 1) * Number(limit);
    const take: number = Number(limit);

    const searchFields = ['nombre', 'descripcion', 'ubicacion', 'tipo'];
    
    let baseFilter: any = {};
    if (estado) {
        baseFilter.estado = estado;
    }

    const searchFilter = search
        ? {
            OR: searchFields.map(field => ({
                [field]: {
                    contains: search as string,
                    mode: 'insensitive',
                },
            })),
            ...baseFilter
        }
        : { ...baseFilter };

    const actividades = await prismaClient.actividades_sociales.findMany({
        where: searchFilter,
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
export const deleteActividadSocialById = async (req: Request, res: Response) => {

    const id = req.params.id
    const actividad = await prismaClient.actividades_sociales.delete({
        where: {
            id_actividad_social: +id
        }
    })
    describir(res, `Eliminó la actividad social "${actividad.nombre}"`)
    res.status(200).json({ message: 'Actividad social eliminada exitosamente' })
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
    describir(res, `Cambió el estado de la actividad social "${updatedActividad.nombre}" a ${estado}`)
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
        estado,
        tipo,
        latitud,
        longitud,
        radio_metros
    } = req.body;

    const actividad = await prismaClient.actividades_sociales.create({
        data: {
            nombre,
            descripcion,
            ubicacion,
            id_convenio: +id_convenio,
            motivo,
            fecha_inicio: new Date(fecha_inicio),
            estado,
            tipo,
            latitud: latitud !== undefined ? Number(latitud) : null,
            longitud: longitud !== undefined ? Number(longitud) : null,
            radio_metros: radio_metros !== undefined ? Number(radio_metros) : 100
        }
    });
    describir(res, `Se creó la actividad social "${actividad.nombre}"`)
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
            include: {
                colegiados_asignados_social: {
                    include: {
                        colegiados: true,
                        pasantes: true,
                        asistencia_social_diaria: {
                            orderBy: { fecha_marcaje: 'desc' }
                        }
                    }
                },
                convenio: true,
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

export const getAsignacionesByUser = async (req: Request, res: Response) => {
    const { rol, id } = req.params;
    if (!rol || isNaN(Number(id))) {
        return res.status(400).json({ error: "Rol e ID son requeridos y el ID debe ser numérico" });
    }

    try {
        const isColegiado = rol.toLowerCase() === 'colegiado';
        const asignaciones = await prismaClient.colegiados_asignados_social.findMany({
            where: isColegiado
                ? { id_colegiado: Number(id) }
                : { id_pasante: Number(id) },
            include: {
                actividades_sociales: true,
                asistencia_social_diaria: {
                    orderBy: { fecha_marcaje: 'desc' },
                    take: 5
                }
            },
            orderBy: {
                actividades_sociales: {
                    fecha_inicio: 'desc'
                }
            }
        });

        // Retornar solo las que tengan la actividad asociada (no nula)
        res.status(200).json(asignaciones.filter(a => a.actividades_sociales !== null));
    } catch (error) {
        console.error("Error en getAsignacionesByUser:", error);
        res.status(500).json({ error: "Error interno del servidor al obtener asignaciones" });
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

        describir(res, `Asignó al colegiado #${id_colegiado} a la actividad social #${id_actividad_social}`)
        res.status(200).json(actividad);
    } catch (error) {
        console.error('Error al asignar colegiado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
export const asignarPasante = async (req: Request, res: Response) => {
    const { id_actividad_social, id_pasante } = req.body
    try {
        const actividad = await prismaClient.colegiados_asignados_social.create({
            data: {
                id_actividad_social: +id_actividad_social,
                id_pasante: +id_pasante
            }
        });

        describir(res, `Asignó al pasante #${id_pasante} a la actividad social #${id_actividad_social}`)
        res.status(200).json(actividad);
    } catch (error) {
        console.error('Error al asignar pasante:', error);
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
        estado,
        tipo,
        latitud,
        longitud,
        radio_metros
    } = req.body;

    try {
        const actividadSocialData = {
            nombre,
            descripcion,
            ubicacion,
            id_convenio: id_convenio ? Number(id_convenio) : null,
            motivo,
            fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : undefined,
            estado,
            tipo,
            latitud: (latitud !== undefined && latitud !== null && latitud !== '') ? Number(latitud) : null,
            longitud: (longitud !== undefined && longitud !== null && longitud !== '') ? Number(longitud) : null,
            radio_metros: radio_metros ? Number(radio_metros) : 100
        };

        const actividadSocialActualizada = await prismaClient.actividades_sociales.update({
            where: { id_actividad_social: +id },
            data: actividadSocialData
        });

        describir(res, `Modificó la actividad social "${actividadSocialActualizada.nombre}"`)
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
                        pasantes: {
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
        let convenioHtml = "<p>No asociado a ningún convenio.</p>";
        if (act.convenio) {
            const conv = act.convenio;
            const convInicio = conv.fecha_inicio ? conv.fecha_inicio.toISOString().split("T")[0] : "";
            const convFin = conv.fecha_fin ? conv.fecha_fin.toISOString().split("T")[0] : "";
            convenioHtml = `
        <p><strong>Convenio:</strong> ${esc(conv.nombre ?? "")}</p>
        <p><strong>Contacto:</strong> ${esc(conv.contacto ?? "")}</p>
        <p><strong>Fechas Convenio:</strong> ${esc(convInicio)} – ${esc(convFin)}</p>
        <p><strong>Estado Convenio:</strong> ${esc(conv.estado ?? "")}</p>
      `;
        }

        // Colegiados y pasantes asignados
        const asignaciones = act.colegiados_asignados_social;
        const totalColegiados = asignaciones.filter((a) => a.colegiados).length;
        const totalPasantes = asignaciones.filter((a) => a.pasantes).length;

        const filasAsignados = asignaciones
            .map((a) => {
                if (a.colegiados) {
                    const c = a.colegiados;
                    return `
                <tr>
                  <td>Colegiado</td>
                  <td>${esc(`${c.nombre ?? ""} ${c.apellido ?? ""}`.trim())}</td>
                  <td>${esc(c.correo ?? "")}</td>
                  <td>${esc(c.telefono ?? "")}</td>
                  <td>${esc(c.especialidades ?? "")}</td>
                  <td>${esc(c.estado ?? "")}</td>
                </tr>`;
                }
                if (a.pasantes) {
                    const p = a.pasantes;
                    return `
                <tr>
                  <td>Pasante</td>
                  <td>${esc(`${p.nombre ?? ""} ${p.apellido ?? ""}`.trim())}</td>
                  <td>${esc(p.correo ?? "")}</td>
                  <td>${esc(p.telefono ?? "")}</td>
                  <td>Práctica Académica</td>
                  <td>Activo</td>
                </tr>`;
                }
                return "";
            })
            .filter(Boolean);

        const kpis = [
            { label: "Total Asignados", value: asignaciones.length, accent: "violeta" as const },
            { label: "Colegiados", value: totalColegiados, accent: "violeta" as const },
            { label: "Pasantes", value: totalPasantes, accent: "rosa" as const },
        ];

        const bodyHtml = `
      <section class="seccion">
        <h2 class="seccion-titulo">Datos Generales</h2>
        <p><strong>Nombre:</strong> ${esc(nombre)}</p>
        <p><strong>Descripción:</strong> ${esc(descripcion)}</p>
        <p><strong>Ubicación:</strong> ${esc(ubicacion)}</p>
        <p><strong>Motivo:</strong> ${esc(motivo)}</p>
        <p><strong>Fechas:</strong> ${esc(fechaInicio)} – ${esc(fechaFin)}</p>
        <p><strong>Estado:</strong> ${esc(estado)}</p>
        <p><strong>Tipo:</strong> ${esc(tipo)}</p>
      </section>

      <section class="seccion">
        <h2 class="seccion-titulo">Información de Convenio</h2>
        ${convenioHtml}
      </section>

      <section class="seccion">
        <h2 class="seccion-titulo">Colegiados y Pasantes Asignados</h2>
        ${renderTabla(
            [
                { label: "Rol" },
                { label: "Nombre Completo" },
                { label: "Correo" },
                { label: "Teléfono" },
                { label: "Especialidades / Rol" },
                { label: "Estado" },
            ],
            filasAsignados,
            "No hay colegiados ni pasantes asignados a esta actividad social."
        )}
      </section>
    `;

        const html = renderInformeHTML({
            titulo: "Informe de Actividad Social",
            subtitulo: nombre,
            kpis,
            bodyHtml,
        });

        const pdfBuffer = await generarInformePdf(html);
        return enviarInformePdf(res, pdfBuffer, `informe_actividad_social_${id}.pdf`);
    } catch (error) {
        console.error("Error en getActividadSocialDetailReport:", error);
        return res
            .status(500)
            .send("Error al generar informe detallado de actividad social.");
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
        let filtrosTexto = "Todos los registros.";
        if (fecha_inicio || fecha_fin) {
            const inicio = fecha_inicio ? String(fecha_inicio) : "—";
            const fin = fecha_fin ? String(fecha_fin) : "—";
            filtrosTexto = `Rango Fecha Inicio: ${esc(inicio)} – ${esc(fin)}`;
        }

        const totalAsignadosGlobal = datos.reduce((acc, d) => acc + d.totalAsignados, 0);

        const kpis = [
            { label: "Actividades", value: datos.length, accent: "violeta" as const },
            { label: "Total Asignados", value: totalAsignadosGlobal, accent: "rosa" as const },
        ];

        const bodyHtml = `
      <section class="seccion">
        ${renderTabla(
            [
                { label: "Nombre" },
                { label: "Ubicación" },
                { label: "Motivo" },
                { label: "Tipo" },
                { label: "Estado" },
                { label: "Fecha Inicio" },
                { label: "Fecha Fin" },
                { label: "Convenio" },
                { label: "# Asignados", align: "right" },
            ],
            datos.map(
                (d) => `
            <tr>
              <td>${esc(d.nombre)}</td>
              <td>${esc(d.ubicacion)}</td>
              <td>${esc(d.motivo)}</td>
              <td>${esc(d.tipo)}</td>
              <td>${esc(d.estado)}</td>
              <td>${esc(d.fechaInicio)}</td>
              <td>${esc(d.fechaFin)}</td>
              <td>${esc(d.convenio)}</td>
              <td style="text-align:right">${d.totalAsignados}</td>
            </tr>`
            ),
            "No hay actividades sociales en este rango."
        )}
      </section>
    `;

        const html = renderInformeHTML({
            titulo: "Informe Consolidado de Actividades Sociales",
            filtrosTexto,
            kpis,
            bodyHtml,
            orientacion: "landscape",
        });

        const pdfBuffer = await generarInformePdf(html, { landscape: true });
        return enviarInformePdf(res, pdfBuffer, "informe_actividades_sociales.pdf");
    } catch (error) {
        console.error("Error en getActividadesSocialesSummaryReport:", error);
        return res
            .status(500)
            .send("Error al generar informe resumen de actividades sociales.");
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

// ─── MARCAJE DE HORAS ─────────────────────────────────────────────────────────

/**
 * GET /api/ac-sociales/asignacion/:id
 * Devuelve la asignación completa con datos de horas y del asignado.
 */
export const getAsignacionById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    try {
        const asignacion = await prismaClient.colegiados_asignados_social.findUnique({
            where: { id_asignacion: id },
            include: {
                colegiados: { select: { nombre: true, apellido: true, correo: true, carnet_identidad: true, pin_acceso: true, especialidades: true, fecha_inscripcion: true, fecha_renovacion: true, estado: true, telefono: true } },
                pasantes: { select: { nombre: true, apellido: true, correo: true, carnet_identidad: true, pin_acceso: true, institucion: true, estado: true, telefono: true } },
                actividades_sociales: {
                    select: {
                        nombre: true, ubicacion: true, estado: true,
                        latitud: true, longitud: true, radio_metros: true,
                        fecha_inicio: true, fecha_fin: true
                    }
                },
                asistencia_social_diaria: {
                    orderBy: { fecha_marcaje: 'desc' }
                }
            }
        });
        if (!asignacion) return res.status(404).json({ error: "Asignación no encontrada" });
        res.json(asignacion);
    } catch (error) {
        console.error("Error en getAsignacionById:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

/**
 * PATCH /api/ac-sociales/asignacion/:id/entrada
 * Body: { latitud: number, longitud: number }
 */
export const marcarEntrada = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const { latitud, longitud } = req.body;
    if (latitud === undefined || longitud === undefined) {
        return res.status(400).json({ error: "Se requiere latitud y longitud" });
    }

    try {
        const asignacion = await prismaClient.colegiados_asignados_social.findUnique({
            where: { id_asignacion: id },
            include: { actividades_sociales: true }
        });
        if (!asignacion) return res.status(404).json({ error: "Asignación no encontrada" });

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(hoy.getDate() + 1);

        const registroDiario = await prismaClient.asistencia_social_diaria.findFirst({
            where: {
                id_asignacion: id,
                fecha_marcaje: { gte: hoy, lt: manana }
            }
        });

        if (registroDiario?.hora_entrada && !registroDiario?.hora_salida) {
            return res.status(409).json({ error: "Ya marcó entrada hoy y no ha marcado salida" });
        }
        if (registroDiario?.hora_salida) {
            return res.status(409).json({ error: "Ya completó su turno de hoy" });
        }

        const act = asignacion.actividades_sociales;
        if (act?.latitud && act?.longitud) {
            const dist = haversineDistancia(
                Number(latitud), Number(longitud),
                act.latitud, act.longitud
            );
            const radio = act.radio_metros ?? 100;
            if (dist > radio) {
                return res.status(403).json({
                    error: "Fuera del radio permitido",
                    distancia_metros: Math.round(dist),
                    radio_metros: radio
                });
            }
        }

        const newRegistro = await prismaClient.asistencia_social_diaria.create({
            data: {
                id_asignacion: id,
                fecha_marcaje: new Date(),
                hora_entrada: new Date(),
            }
        });
        describir(res, `Marcó entrada en la asignación #${id} de actividad social`)
        res.status(200).json({ message: "Entrada marcada correctamente", asignacion: newRegistro });
    } catch (error) {
        console.error("Error en marcarEntrada:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

/**
 * PATCH /api/ac-sociales/asignacion/:id/salida
 * Body: { latitud: number, longitud: number }
 */
export const marcarSalida = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const { latitud, longitud } = req.body;
    if (latitud === undefined || longitud === undefined) {
        return res.status(400).json({ error: "Se requiere latitud y longitud" });
    }

    try {
        const asignacion = await prismaClient.colegiados_asignados_social.findUnique({
            where: { id_asignacion: id },
            include: { actividades_sociales: true }
        });
        if (!asignacion) return res.status(404).json({ error: "Asignación no encontrada" });

        const registroAbierto = await prismaClient.asistencia_social_diaria.findFirst({
            where: {
                id_asignacion: id,
                hora_entrada: { not: null },
                hora_salida: null
            },
            orderBy: {
                hora_entrada: 'desc'
            }
        });

        if (!registroAbierto || !registroAbierto.hora_entrada) {
            return res.status(400).json({ error: "No hay una entrada abierta pendiente de salida" });
        }

        const act = asignacion.actividades_sociales;
        if (act?.latitud && act?.longitud) {
            const dist = haversineDistancia(
                Number(latitud), Number(longitud),
                act.latitud, act.longitud
            );
            const radio = act.radio_metros ?? 100;
            if (dist > radio) {
                return res.status(403).json({
                    error: "Fuera del radio permitido",
                    distancia_metros: Math.round(dist),
                    radio_metros: radio
                });
            }
        }

        const ahora = new Date();
        const horasGanadas = (ahora.getTime() - registroAbierto.hora_entrada.getTime()) / 3_600_000;

        await prismaClient.$transaction(async (tx) => {
            await tx.asistencia_social_diaria.update({
                where: { id_asistencia_diaria: registroAbierto.id_asistencia_diaria },
                data: {
                    hora_salida: ahora,
                    horas_ganadas: horasGanadas
                }
            });

            await tx.colegiados_asignados_social.update({
                where: { id_asignacion: id },
                data: {
                    total_horas: { increment: horasGanadas }
                }
            });
        });

        describir(res, `Marcó salida en la asignación #${id} de actividad social`)
        res.status(200).json({ message: "Salida marcada correctamente" });
    } catch (error) {
        console.error("Error en marcarSalida:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

/**
 * PATCH /api/ac-sociales/asignacion/:id/meta
 * Body: { horas_meta: number }
 * Auth: Admin
 */
export const updateMetaAsignacion = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const { horas_meta } = req.body;
    if (horas_meta === undefined || isNaN(Number(horas_meta))) {
        return res.status(400).json({ error: "horas_meta debe ser un número" });
    }

    try {
        const updated = await prismaClient.colegiados_asignados_social.update({
            where: { id_asignacion: id },
            data: { horas_meta: Number(horas_meta) }
        });
        describir(res, `Actualizó la meta de horas de la asignación #${id} a ${horas_meta}`)
        res.status(200).json({ message: "Meta de horas actualizada", asignacion: updated });
    } catch (error) {
        console.error("Error en updateMetaAsignacion:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

/**
 * PATCH /api/ac-sociales/asignacion/:id/estado
 * Body: { estado: "ACTIVO" | "INACTIVO" }
 */
export const updateEstadoAsignacion = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const { estado } = req.body;
    if (!estado) return res.status(400).json({ error: "estado es requerido" });

    try {
        const updated = await prismaClient.colegiados_asignados_social.update({
            where: { id_asignacion: id },
            data: { estado: String(estado) }
        });
        describir(res, `Cambió el estado de participación de la asignación #${id} a ${estado}`)
        res.status(200).json({ message: "Estado de participación actualizado", asignacion: updated });
    } catch (error) {
        console.error("Error en updateEstadoAsignacion:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

/**
 * PATCH /api/ac-sociales/asignacion/:id/reset-horas
 * Forzar total_horas a 0 manteniendo el historial
 */
export const resetHorasAsignacion = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    try {
        const updated = await prismaClient.colegiados_asignados_social.update({
            where: { id_asignacion: id },
            data: { total_horas: 0 }
        });
        describir(res, `Reinició a 0 las horas acumuladas de la asignación #${id}`)
        res.status(200).json({ message: "Horas reiniciadas a 0 correctamente", asignacion: updated });
    } catch (error) {
        console.error("Error en resetHorasAsignacion:", error);
        res.status(500).json({ error: "Error interno del servidor al reiniciar horas" });
    }
};