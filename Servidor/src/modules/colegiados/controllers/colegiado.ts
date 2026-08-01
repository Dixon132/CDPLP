import { Request, Response } from "express";
import { colegiadoSchema } from "../schemas/colegiados";

import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import prismaClient from "../../../utils/prismaClient";
import BadRequestException from "../../../exceptions/bad-request";
import { ErrorCodes } from "../../../exceptions/root";
import { Prisma } from "../../../../generated/prisma";
import { Modulos } from "../../../types/auditoria";
import { emitirNotificacion } from "../../notificaciones/services";
import { describir } from "../../../utils/auditoria";
import { esc, generarInformePdf, enviarInformePdf, renderInformeHTML, renderTabla, renderBarraProgreso } from "../../../utils/informes";


const chartCanvas = new ChartJSNodeCanvas({ width: 600, height: 300 });

export const createColegiado = async (req: Request, res: Response) => {
  const validatedColegiado = colegiadoSchema.parse(req.body)
  try {
    // Generar PIN de 4 dígitos
    const pinPlano = String(Math.floor(1000 + Math.random() * 9000));

    const colegiado = await prismaClient.colegiados.create({
      data: {
        carnet_identidad: validatedColegiado.carnet_identidad,
        nombre: validatedColegiado.nombre,
        apellido: validatedColegiado.apellido,
        correo: validatedColegiado.correo,
        telefono: validatedColegiado.telefono,
        especialidades: validatedColegiado.especialidades,
        fecha_inscripcion: validatedColegiado.fecha_inscripcion,
        fecha_renovacion: validatedColegiado.fecha_renovacion,
        estado: validatedColegiado.estado,
        pin_acceso: pinPlano
      }
    })
    describir(res, `Se creó el colegiado ${colegiado.nombre} ${colegiado.apellido}`)
    await emitirNotificacion({
      modulo: Modulos.COLEGIADOS,
      tipo: 'exito',
      titulo: 'Nuevo colegiado registrado',
      descripcion: `${colegiado.nombre} ${colegiado.apellido} fue dado de alta.`,
      enlace: '/dashboard/colegiados',
      idUsuario: req.user!.id_usuario,
    })
    // pin_temporal se devuelve para mostrarlo al registrar. El PIN queda además
    // consultable desde el listado de colegiados (columna "PIN Acceso"), que es
    // una ruta autenticada.
    res.status(201).json({ message: 'El colegiado fue registrado exitosamente', colegiado, pin_temporal: pinPlano })
  } catch {
    throw new BadRequestException('Hubo un error al crear el registro del colegiado', ErrorCodes.INTERNAL_EXCEPTION)
  }
}
export const getColegiados = async (req: Request, res: Response) => {
  const { page = 1, limit = 15, search = '', inactivos } = req.query;
  const skip: number = (Number(page) - 1) * Number(limit);
  const take: number = Number(limit);
  const mostrarInactivos = inactivos === 'true'
  const searchFields = ['nombre', 'apellido', 'carnet_identidad', 'correo', 'telefono', 'especialidades']; // ajusta estos campos según tu modelo

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
      estado: mostrarInactivos ? 'INACTIVO' : 'ACTIVO',
      ...searchFilter,
    },
    skip,
    take,
  });

  const total = await prismaClient.colegiados.count({
    where: {
      estado: mostrarInactivos ? 'INACTIVO' : 'ACTIVO',
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

export const updateEstadoColegiadoById = async (req: Request, res: Response) => {
  const id = req.params.id
  const { estado } = req.body
  const colegiado = await prismaClient.colegiados.update({
    where: {
      id_colegiado: +id
    },
    data: {
      estado
    }
  })
  describir(res, `${estado === 'ACTIVO' ? 'Activó' : 'Desactivó'} al colegiado ${colegiado.nombre} ${colegiado.apellido}`)
  res.status(200).json(colegiado)
}


export const updateColegiado = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const {
    carnet_identidad,
    nombre,
    apellido,
    correo,
    telefono,
    especialidades,
    fecha_inscripcion,
    fecha_renovacion,
    estado,
  } = req.body;

  try {
    const colegiadoActualizado = await prismaClient.colegiados.update({
      where: {
        id_colegiado: id,
      },
      data: {
        carnet_identidad,
        nombre,
        apellido,
        correo,
        telefono,
        especialidades,
        fecha_inscripcion: fecha_inscripcion ? new Date(fecha_inscripcion) : undefined,
        fecha_renovacion: fecha_renovacion ? new Date(fecha_renovacion) : undefined,
        estado,
      },
    });

    describir(res, `Modificó los datos del colegiado ${colegiadoActualizado.nombre} ${colegiadoActualizado.apellido}`)
    res.status(200).json(colegiadoActualizado);
  } catch (error) {
    console.error("Error al actualizar el colegiado:", error);
    res.status(500).json({ message: "Error al actualizar el colegiado" });
  }
};

export const getColegiadoById = async (req: Request, res: Response) => {
  const id = req.params.id
  const data = await prismaClient.colegiados.findFirstOrThrow({
    where: {
      id_colegiado: +id
    }
  })
  res.status(200).json(data)
}

export const getColegiadosSimple = async (req: Request, res: Response) => {
  const colegiados = await prismaClient.colegiados.findMany({
    select: {
      id_colegiado: true,
      nombre: true,
      apellido: true,
      correo: true,
      telefono: true,
      especialidades: true,
    },
    orderBy: {
      nombre: 'asc'
    }
  })
  res.status(200).json(colegiados)
}

export const getInvitadosSimple = async (req: Request, res: Response) => {
  const invitados = await prismaClient.invitados.findMany({
    select: {
      id_invitado: true,
      nombre: true,
      apellido: true,
      correo: true,
      telefono: true,
    },
    orderBy: {
      nombre: 'asc'
    }
  })
  res.status(200).json(invitados);
}




export const getColegiadosReportSummary = async (req: Request, res: Response) => {
  try {
    const [totalActivos, totalInactivos, porEspecialidad] = await Promise.all([
      prismaClient.colegiados.count({ where: { estado: "ACTIVO" } }),
      prismaClient.colegiados.count({ where: { estado: "INACTIVO" } }),
      prismaClient.colegiados.groupBy({
        by: ["especialidades"],
        _count: { _all: true },
        orderBy: { _count: { especialidades: "desc" } },
      }),
    ]);

    const totalColegiados = totalActivos + totalInactivos;
    const pctActivos = totalColegiados > 0 ? (totalActivos / totalColegiados) * 100 : 0;

    const kpis = [
      { label: "Total Colegiados", value: totalColegiados, accent: "violeta" as const },
      { label: "Activos", value: totalActivos, accent: "violeta" as const },
      { label: "Inactivos", value: totalInactivos, accent: "rosa" as const },
    ];

    const filasEstado = [
      `<tr><td>Activos</td><td>${totalActivos}</td><td>${renderBarraProgreso(pctActivos)}</td></tr>`,
      `<tr><td>Inactivos</td><td>${totalInactivos}</td><td>${renderBarraProgreso(100 - pctActivos)}</td></tr>`,
    ];

    const filasEspecialidad = porEspecialidad.map((e) => {
      const nombre = e.especialidades?.trim() ? e.especialidades : "Sin especialidad registrada";
      const cantidad = e._count._all;
      const pct = totalColegiados > 0 ? (cantidad / totalColegiados) * 100 : 0;
      return `<tr><td>${esc(nombre)}</td><td>${cantidad}</td><td>${renderBarraProgreso(pct)}</td></tr>`;
    });

    const bodyHtml = `
      <section class="seccion">
        <h2 class="seccion-titulo">Estado de la Membresía</h2>
        ${renderTabla(
          [{ label: "Estado" }, { label: "Total", align: "right" }, { label: "% del Total" }],
          filasEstado
        )}
      </section>
      <section class="seccion">
        <h2 class="seccion-titulo">Distribución por Especialidad</h2>
        ${renderTabla(
          [{ label: "Especialidad" }, { label: "Colegiados", align: "right" }, { label: "% del Total" }],
          filasEspecialidad
        )}
      </section>
    `;

    const html = renderInformeHTML({
      titulo: "Informe Estadístico de Colegiados",
      subtitulo: "Resumen de membresía por estado y especialidad",
      kpis,
      bodyHtml,
    });

    const pdfBuffer = await generarInformePdf(html);
    return enviarInformePdf(res, pdfBuffer, "informe_resumen_colegiados.pdf");
  } catch (error) {
    console.error("Error en getColegiadosReportSummary:", error);
    return res.status(500).send("Error al generar informe resumen.");
  }
};

/**
 * 2) Reporte Individual de un Colegiado (por ID)
 *    GET /api/colegiados/:id/report
 */
export const getColegiadoReportDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    // 1) Obtener datos del colegiado
    const c = await prismaClient.colegiados.findUnique({
      where: { id_colegiado: id },
      include: {
        documentos_colegiados: true,
        pagos_colegiados: true,
        asistencias_actividad: {
          include: {
            actividades_institucionales: true,
          },
        },
        colegiados_asignados_social: {
          include: {
            actividades_sociales: true,
          },
        },
        // Si quieres incluir correspondencia:
        // correspondencia_enviada: true,
        // correspondencia_recibida: true,
      },
    });

    if (!c) {
      return res.status(404).send("Colegiado no encontrado");
    }

    // 2) Mapeamos la info en una estructura más amigable
    const nombreCompleto = `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim();
    const ci = c.carnet_identidad ?? "";
    const correo = c.correo ?? "";
    const telefono = c.telefono ?? "";
    const especialidades = c.especialidades ?? "";
    const estado = c.estado ?? "";
    const fechaInscr = c.fecha_inscripcion
      ? c.fecha_inscripcion.toISOString().split("T")[0]
      : "";
    const fechaRenov = c.fecha_renovacion
      ? c.fecha_renovacion.toISOString().split("T")[0]
      : "";

    // Documentos
    const docs = c.documentos_colegiados.map((d) => ({
      tipo: d.tipo_documento ?? "",
      fecha_entrega: d.fecha_entrega
        ? d.fecha_entrega.toISOString().split("T")[0]
        : "",
      fecha_vencimiento: d.fecha_vencimiento
        ? d.fecha_vencimiento.toISOString().split("T")[0]
        : "",
      estado: d.estado ?? "",
    }));

    // Pagos
    const pagos = c.pagos_colegiados.map((p) => ({
      fecha_pago: p.fecha_pago ? p.fecha_pago.toISOString().split("T")[0] : "",
      monto: p.monto ?? new Prisma.Decimal(0),
      concepto: p.concepto ?? "",
      estado_pago: p.estado_pago ?? "",
    }));

    // Asistencias a Actividades Institucionales
    const asistenciasInst = c.asistencias_actividad.map((a) => ({
      nombre_actividad:
        a.actividades_institucionales?.nombre ?? "Actividad desconocida",
      fecha_actividad: a.actividades_institucionales?.fecha_programada
        ? a.actividades_institucionales.fecha_programada
          .toISOString()
          .split("T")[0]
        : "",
    }));

    // Asignaciones a Actividades Sociales
    const sesionesSociales = c.colegiados_asignados_social.map((s) => ({
      nombre_actividad:
        s.actividades_sociales?.nombre ?? "Actividad Soc. desconocida",
      fecha_inicio: s.actividades_sociales?.fecha_inicio
        ? s.actividades_sociales.fecha_inicio.toISOString().split("T")[0]
        : "",
      fecha_fin: s.actividades_sociales?.fecha_fin
        ? s.actividades_sociales.fecha_fin.toISOString().split("T")[0]
        : "",
      estado_actividad: s.actividades_sociales?.estado ?? "",
    }));

    const totalPagado = pagos
      .filter((p) => p.estado_pago === "REALIZADO")
      .reduce((acc, p) => acc + Number(p.monto), 0);

    const kpis = [
      { label: "Documentos", value: docs.length, accent: "violeta" as const },
      { label: "Pagos Registrados", value: pagos.length, accent: "violeta" as const },
      { label: "Total Pagado - Realizado (Bs.)", value: totalPagado.toFixed(2), accent: "rosa" as const },
      { label: "Actividades (Inst. + Soc.)", value: asistenciasInst.length + sesionesSociales.length, accent: "neutro" as const },
    ];

    const bodyHtml = `
      <section class="seccion">
        <h2 class="seccion-titulo">Datos Básicos</h2>
        <p><strong>Nombre Completo:</strong> ${esc(nombreCompleto)}</p>
        <p><strong>C.I.:</strong> ${esc(ci)}</p>
        <p><strong>Correo:</strong> ${esc(correo)}</p>
        <p><strong>Teléfono:</strong> ${esc(telefono)}</p>
        <p><strong>Especialidades:</strong> ${esc(especialidades)}</p>
        <p><strong>Estado:</strong> ${esc(estado)}</p>
        <p><strong>Fecha Inscripción:</strong> ${esc(fechaInscr)}</p>
        <p><strong>Fecha Renovación:</strong> ${esc(fechaRenov)}</p>
      </section>

      <section class="seccion">
        <h2 class="seccion-titulo">Documentos</h2>
        ${renderTabla(
          [{ label: "Tipo Documento" }, { label: "Fecha Entrega" }, { label: "Fecha Vencimiento" }, { label: "Estado" }],
          docs.map(
            (d) => `<tr><td>${esc(d.tipo)}</td><td>${esc(d.fecha_entrega)}</td><td>${esc(d.fecha_vencimiento)}</td><td>${esc(d.estado)}</td></tr>`
          ),
          "No tiene documentos registrados."
        )}
      </section>

      <section class="seccion">
        <h2 class="seccion-titulo">Pagos</h2>
        ${renderTabla(
          [{ label: "Fecha Pago" }, { label: "Monto (Bs.)", align: "right" }, { label: "Concepto" }, { label: "Estado Pago" }],
          pagos.map(
            (p) => `<tr><td>${esc(p.fecha_pago)}</td><td style="text-align:right">${esc(p.monto.toString())}</td><td>${esc(p.concepto)}</td><td>${esc(p.estado_pago)}</td></tr>`
          ),
          "No se han registrado pagos."
        )}
      </section>

      <section class="seccion">
        <h2 class="seccion-titulo">Asistencias a Actividades Institucionales</h2>
        ${renderTabla(
          [{ label: "Actividad Institucional" }, { label: "Fecha Programada" }],
          asistenciasInst.map((a) => `<tr><td>${esc(a.nombre_actividad)}</td><td>${esc(a.fecha_actividad)}</td></tr>`),
          "No ha asistido a actividades institucionales."
        )}
      </section>

      <section class="seccion">
        <h2 class="seccion-titulo">Asignaciones a Actividades Sociales</h2>
        ${renderTabla(
          [{ label: "Actividad Social" }, { label: "Fecha Inicio" }, { label: "Fecha Fin" }, { label: "Estado Actividad" }],
          sesionesSociales.map(
            (s) => `<tr><td>${esc(s.nombre_actividad)}</td><td>${esc(s.fecha_inicio)}</td><td>${esc(s.fecha_fin)}</td><td>${esc(s.estado_actividad)}</td></tr>`
          ),
          "No ha sido asignado a actividades sociales."
        )}
      </section>
    `;

    const html = renderInformeHTML({
      titulo: "Informe Individual de Colegiado",
      subtitulo: nombreCompleto,
      kpis,
      bodyHtml,
    });

    const pdfBuffer = await generarInformePdf(html);
    return enviarInformePdf(res, pdfBuffer, `informe_colegiado_${id}.pdf`);
  } catch (error) {
    console.error("Error en getColegiadoReportDetail:", error);
    return res.status(500).send("Error al generar informe individual.");
  }
};