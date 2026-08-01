import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { Prisma } from "../../../../generated/prisma";
import { esc, generarInformePdf, enviarInformePdf, renderInformeHTML, renderTabla } from "../../../utils/informes";

const buildWhereAuditorias = (query: Request["query"]): Prisma.auditoriaWhereInput => {
    const { search, modulo, accion, fecha_desde, fecha_hasta } = query;
    const where: Prisma.auditoriaWhereInput = {};

    if (modulo) where.modulo = String(modulo);
    if (accion) where.accion = String(accion);

    if (fecha_desde || fecha_hasta) {
        where.fecha = {};
        if (fecha_desde) where.fecha.gte = new Date(String(fecha_desde));
        if (fecha_hasta) where.fecha.lte = new Date(`${String(fecha_hasta)}T23:59:59`);
    }

    if (search) {
        where.OR = [
            { descripcion: { contains: String(search), mode: 'insensitive' } },
            { usuario: { nombre: { contains: String(search), mode: 'insensitive' } } },
            { usuario: { apellido: { contains: String(search), mode: 'insensitive' } } },
        ];
    }

    return where;
};

/**
 * GET /api/auditorias
 * query: ?page=&limit=&search=&modulo=&accion=&fecha_desde=&fecha_hasta=
 */
export const getAuditorias = async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = buildWhereAuditorias(req.query);

    const [data, total] = await Promise.all([
        prismaClient.auditoria.findMany({
            where,
            include: {
                usuario: { select: { id_usuario: true, nombre: true, apellido: true, correo: true } },
            },
            orderBy: { fecha: 'desc' },
            skip,
            take,
        }),
        prismaClient.auditoria.count({ where }),
    ]);

    res.status(200).json({
        data,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / take),
    });
};

const LIMITE_REGISTROS_INFORME = 5000;

/**
 * GET /api/auditorias/report
 * query: ?search=&modulo=&accion=&fecha_desde=&fecha_hasta=
 * Bitácora exportable en PDF, reusando los mismos filtros que /api/auditorias.
 */
export const getAuditoriasReport = async (req: Request, res: Response) => {
    try {
        const where = buildWhereAuditorias(req.query);

        const [registros, total, porModulo, porAccion] = await Promise.all([
            prismaClient.auditoria.findMany({
                where,
                include: {
                    usuario: { select: { nombre: true, apellido: true } },
                },
                orderBy: { fecha: 'desc' },
                take: LIMITE_REGISTROS_INFORME,
            }),
            prismaClient.auditoria.count({ where }),
            prismaClient.auditoria.groupBy({ by: ['modulo'], where, _count: { _all: true } }),
            prismaClient.auditoria.groupBy({ by: ['accion'], where, _count: { _all: true } }),
        ]);

        const { search, modulo, accion, fecha_desde, fecha_hasta } = req.query;
        const filtrosPartes: string[] = [];
        if (search) filtrosPartes.push(`Búsqueda: "${String(search)}"`);
        if (modulo) filtrosPartes.push(`Módulo: ${String(modulo)}`);
        if (accion) filtrosPartes.push(`Acción: ${String(accion)}`);
        if (fecha_desde || fecha_hasta) {
            filtrosPartes.push(`Rango: ${fecha_desde ? String(fecha_desde) : "—"} – ${fecha_hasta ? String(fecha_hasta) : "—"}`);
        }
        const filtrosTexto = filtrosPartes.length
            ? `Filtros: ${esc(filtrosPartes.join(" • "))}`
            : "Filtros: Ninguno (toda la bitácora).";

        const kpis = [
            { label: "Total Registros", value: total, accent: "violeta" as const },
            { label: "Módulos Distintos", value: porModulo.length, accent: "violeta" as const },
            { label: "Acciones Distintas", value: porAccion.length, accent: "rosa" as const },
        ];

        const seccionPorModulo = `
      <section class="seccion">
        <h2 class="seccion-titulo">Por Módulo</h2>
        ${renderTabla(
            [{ label: "Módulo" }, { label: "Registros", align: "right" }],
            porModulo
                .sort((a, b) => b._count._all - a._count._all)
                .map((m) => `<tr><td>${esc(m.modulo)}</td><td style="text-align:right">${m._count._all}</td></tr>`)
        )}
      </section>`;

        const seccionPorAccion = `
      <section class="seccion">
        <h2 class="seccion-titulo">Por Acción</h2>
        ${renderTabla(
            [{ label: "Acción" }, { label: "Registros", align: "right" }],
            porAccion
                .sort((a, b) => b._count._all - a._count._all)
                .map((a) => `<tr><td>${esc(a.accion)}</td><td style="text-align:right">${a._count._all}</td></tr>`)
        )}
      </section>`;

        const avisoTope = total > LIMITE_REGISTROS_INFORME
            ? `<p class="vacio">Mostrando los primeros ${LIMITE_REGISTROS_INFORME} de ${total} registros. Aplica filtros para acotar el resultado.</p>`
            : "";

        const seccionDetalle = `
      <section class="seccion">
        <h2 class="seccion-titulo">Detalle</h2>
        ${avisoTope}
        ${renderTabla(
            [{ label: "Fecha" }, { label: "Usuario" }, { label: "Módulo" }, { label: "Acción" }, { label: "Descripción" }],
            registros.map((r) => {
                const usuario = r.usuario ? `${r.usuario.nombre ?? ""} ${r.usuario.apellido ?? ""}`.trim() : "Sistema";
                const fecha = r.fecha.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
                return `<tr><td>${esc(fecha)}</td><td>${esc(usuario)}</td><td>${esc(r.modulo)}</td><td>${esc(r.accion)}</td><td>${esc(r.descripcion)}</td></tr>`;
            }),
            "No se encontraron registros de auditoría con esos filtros."
        )}
      </section>`;

        const html = renderInformeHTML({
            titulo: "Informe de Auditorías",
            subtitulo: "Bitácora de acciones del sistema",
            filtrosTexto,
            kpis,
            bodyHtml: seccionPorModulo + seccionPorAccion + seccionDetalle,
            orientacion: "landscape",
        });

        const pdfBuffer = await generarInformePdf(html, { landscape: true });
        return enviarInformePdf(res, pdfBuffer, "informe_auditorias.pdf");
    } catch (error) {
        console.error("Error en getAuditoriasReport:", error);
        return res.status(500).send("Error al generar informe de auditorías.");
    }
};
