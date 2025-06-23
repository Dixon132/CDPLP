import { Request, Response } from "express";
import { colegiadoSchema } from "../schemas/colegiados";

import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import prismaClient from "../../../utils/prismaClient";
import BadRequestException from "../../../exceptions/bad-request";
import { ErrorCodes } from "../../../exceptions/root";
import puppeteer from "puppeteer";
import { Prisma } from "../../../../generated/prisma";
import registrarAuditoria from "../../Auditorias/services";
import { Acciones, Modulos } from "../../../types/auditoria";


const chartCanvas = new ChartJSNodeCanvas({ width: 600, height: 300 });

export const createColegiado = async (req: Request, res: Response) => {
  const validatedColegiado = colegiadoSchema.parse(req.body)
  try {
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
        estado: validatedColegiado.estado
      }
    })
    registrarAuditoria(req.user, Acciones.CREO, Modulos.COLEGIADOS, `Se creo el colegiado ${colegiado.nombre} ${colegiado.apellido}`)
    res.status(201).json({ message: 'El colegiado fue resgistrado exitosamente', colegiado })
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
    // Contamos cuántos colegiados están ACTIVO e INACTIVO
    const totalActivos = await prismaClient.colegiados.count({
      where: { estado: "ACTIVO" },
    });
    const totalInactivos = await prismaClient.colegiados.count({
      where: { estado: "INACTIVO" },
    });

    // Generamos un HTML sencillo para el PDF
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            .resumen { margin-top: 40px; font-size: 16px; }
            .resumen span { font-weight: bold; }
            table { width: 50%; margin: 20px auto; border-collapse: collapse; }
            th, td { border: 1px solid #999; padding: 8px; text-align: center; }
            th { background-color: #eee; }
          </style>
        </head>
        <body>
          <h1>Resumen de Colegiados</h1>
          <div class="resumen">
            <p>Total Colegiados Activos: <span>${totalActivos}</span></p>
            <p>Total Colegiados Inactivos: <span>${totalInactivos}</span></p>
            <p>Generado: ${new Date().toLocaleString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ACTIVOS</td>
                <td>${totalActivos}</td>
              </tr>
              <tr>
                <td>INACTIVOS</td>
                <td>${totalInactivos}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Lanzamos Puppeteer en modo headless
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Generar PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });
    await browser.close();

    // Validar buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(500).send("Error generando PDF de resumen.");
    }

    // Enviamos el PDF como descarga
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reporte_resumen_colegiados.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error en getColegiadosReportSummary:", error);
    return res.status(500).send("Error al generar reporte resumen.");
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

    // 3) Armar HTML del detalle
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1, h2, h3 { color: #333; margin-bottom: 5px; }
            .seccion { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
            th { background-color: #eee; text-align: left; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .datos-basicos p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <h1>Reporte Individual de Colegiado</h1>
          <h3>Generado: ${new Date().toLocaleString()}</h3>

          <div class="seccion datos-basicos">
            <h2>Datos Básicos</h2>
            <p><strong>Nombre Completo:</strong> ${nombreCompleto}</p>
            <p><strong>C.I.:</strong> ${ci}</p>
            <p><strong>Correo:</strong> ${correo}</p>
            <p><strong>Teléfono:</strong> ${telefono}</p>
            <p><strong>Especialidades:</strong> ${especialidades}</p>
            <p><strong>Estado:</strong> ${estado}</p>
            <p><strong>Fecha Inscripción:</strong> ${fechaInscr}</p>
            <p><strong>Fecha Renovación:</strong> ${fechaRenov}</p>
          </div>

          <div class="seccion">
            <h2>Documentos</h2>
            ${docs.length === 0
        ? "<p>No tiene documentos registrados.</p>"
        : `
              <table>
                <thead>
                  <tr>
                    <th>Tipo Documento</th>
                    <th>Fecha Entrega</th>
                    <th>Fecha Vencimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${docs
          .map(
            (d) => `
                    <tr>
                      <td>${d.tipo}</td>
                      <td>${d.fecha_entrega}</td>
                      <td>${d.fecha_vencimiento}</td>
                      <td>${d.estado}</td>
                    </tr>
                  `
          )
          .join("")}
                </tbody>
              </table>
            `
      }
          </div>

          <div class="seccion">
            <h2>Pagos</h2>
            ${pagos.length === 0
        ? "<p>No se han registrado pagos.</p>"
        : `
              <table>
                <thead>
                  <tr>
                    <th>Fecha Pago</th>
                    <th>Monto (Bs.)</th>
                    <th>Concepto</th>
                    <th>Estado Pago</th>
                  </tr>
                </thead>
                <tbody>
                  ${pagos
          .map(
            (p) => `
                    <tr>
                      <td>${p.fecha_pago}</td>
                      <td>${p.monto.toString()}</td>
                      <td>${p.concepto}</td>
                      <td>${p.estado_pago}</td>
                    </tr>
                  `
          )
          .join("")}
                </tbody>
              </table>
            `
      }
          </div>

          <div class="seccion">
            <h2>Asistencias a Actividades Institucionales</h2>
            ${asistenciasInst.length === 0
        ? "<p>No ha asistido a actividades institucionales.</p>"
        : `
              <table>
                <thead>
                  <tr>
                    <th>Actividad Institucional</th>
                    <th>Fecha Programada</th>
                  </tr>
                </thead>
                <tbody>
                  ${asistenciasInst
          .map(
            (a) => `
                    <tr>
                      <td>${a.nombre_actividad}</td>
                      <td>${a.fecha_actividad}</td>
                    </tr>
                  `
          )
          .join("")}
                </tbody>
              </table>
            `
      }
          </div>

          <div class="seccion">
            <h2>Asignaciones a Actividades Sociales</h2>
            ${sesionesSociales.length === 0
        ? "<p>No ha sido asignado a actividades sociales.</p>"
        : `
              <table>
                <thead>
                  <tr>
                    <th>Actividad Social</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Fin</th>
                    <th>Estado Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  ${sesionesSociales
          .map(
            (s) => `
                    <tr>
                      <td>${s.nombre_actividad}</td>
                      <td>${s.fecha_inicio}</td>
                      <td>${s.fecha_fin}</td>
                      <td>${s.estado_actividad}</td>
                    </tr>
                  `
          )
          .join("")}
                </tbody>
              </table>
            `
      }
          </div>

          <!-- Si quieres incluir correspondencia aquí, agregar otra sección similar -->

        </body>
      </html>
    `;

    // 4) Generar PDF con Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });
    await browser.close();

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(500).send("Error generando PDF de detalle.");
    }

    // 5) Enviar como descarga
    const filename = `reporte_colegiado_${id}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error en getColegiadoReportDetail:", error);
    return res.status(500).send("Error al generar reporte individual.");
  }
};