import { Request, Response } from "express";
import { colegiadoSchema } from "../schemas/colegiados";

import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import prismaClient from "../../../utils/prismaClient";
import BadRequestException from "../../../exceptions/bad-request";
import { ErrorCodes } from "../../../exceptions/root";
import puppeteer from "puppeteer";


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
    const id = req.params.id
    const { correo, telefono } = req.body
    const data = await prismaClient.colegiados.update({
        where: {
            id_colegiado: +id
        },
        data: {
            correo,
            telefono
        }
    })
}
export const getColegiadoById = async (req: Request, res: Response) => {
    const id = req.params.id
    const data = await prismaClient.colegiados.findFirstOrThrow({
        where: {
            id_colegiado: +id
        },
        select: {
            telefono: true,
            correo: true
        }
    })
    res.status(200).json(data)
}





export const getColegiadosReport = async (req: Request, res: Response) => {
    

// Helper para validar "asc" | "desc"
const validarOrden = (valor: string | undefined): 'asc' | 'desc' => {
  return valor === 'desc' ? 'desc' : 'asc';
};


  try {
    const {
      correo,
      telefono,
      especialidades,
      estado,
      orden_inscripcion,
      orden_renovacion
    } = req.query;

    const ordenInscripcion = validarOrden(orden_inscripcion as string);
    const ordenRenovacion = validarOrden(orden_renovacion as string);

    const filtrosAplicados = correo || telefono || especialidades || estado;

    const filtros: Record<string, any> = {
      ...(correo ? { correo: { contains: String(correo) } } : {}),
      ...(telefono ? { telefono: { contains: String(telefono) } } : {}),
      ...(especialidades ? { especialidades: { contains: String(especialidades) } } : {}),
      ...(estado ? { estado: { equals: String(estado) } } : {}),
    };

    const colegiados= await prismaClient.colegiados.findMany({
      where: filtrosAplicados ? filtros : {},
      orderBy: [
        { fecha_inscripcion: ordenInscripcion },
        { fecha_renovacion: ordenRenovacion }
      ],
      include: {
        asistencias_actividad: true,
        colegiados_asignados_social: true,
        documentos_colegiados: true,
        pagos_colegiados: true
      }
    });

    const datos = colegiados.map(c => ({
      nombre: `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim(),
      correo: c.correo ?? '',
      telefono: c.telefono ?? '',
      especialidades: c.especialidades ?? '',
      estado: c.estado ?? '',
      fecha_inscripcion: c.fecha_inscripcion?.toISOString().split('T')[0] ?? '',
      fecha_renovacion: c.fecha_renovacion?.toISOString().split('T')[0] ?? '',
      asistencias: c.asistencias_actividad.length,
      asignaciones_sociales: c.colegiados_asignados_social.length,
      documentos: c.documentos_colegiados.length,
      pagos: c.pagos_colegiados.length
    }));

    const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { color: #444; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px; }
          th { background-color: #eee; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>Reporte de Colegiados</h1>
        <p>Generado: ${new Date().toLocaleString()}</p>
        ${
          filtrosAplicados
            ? `<p>Filtros: ${correo ? `correo=${correo} ` : ''}${telefono ? `telefono=${telefono} ` : ''}${especialidades ? `especialidades=${especialidades} ` : ''}${estado ? `estado=${estado}` : ''}</p>`
            : '<p>Todos los colegiados.</p>'
        }

        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Especialidades</th>
              <th>Estado</th>
              <th>Inscripción</th>
              <th>Renovación</th>
              <th>Asistencias</th>
              <th>Asignaciones</th>
              <th>Documentos</th>
              <th>Pagos</th>
            </tr>
          </thead>
          <tbody>
            ${datos.map(d => `
              <tr>
                <td>${d.nombre}</td>
                <td>${d.correo}</td>
                <td>${d.telefono}</td>
                <td>${d.especialidades}</td>
                <td>${d.estado}</td>
                <td>${d.fecha_inscripcion}</td>
                <td>${d.fecha_renovacion}</td>
                <td>${d.asistencias}</td>
                <td>${d.asignaciones_sociales}</td>
                <td>${d.documentos}</td>
                <td>${d.pagos}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    await browser.close();

    // Validación
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('Error: PDF buffer vacío');
      return res.status(500).send('Error generando PDF');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_colegiados.pdf"');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error en generación de PDF:', error);
    res.status(500).send('Error generando PDF');
  }
};


