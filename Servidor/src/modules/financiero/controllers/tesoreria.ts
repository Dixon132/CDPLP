// controllers/tesoreria.controller.ts
import { Request, Response } from "express";

import { Prisma } from "../../../../generated/prisma";
import prismaClient from "../../../utils/prismaClient";
import { subirArchivo, buildPublicUrl, eliminarArchivo } from "../../../utils/uploadS3";
import { describir } from "../../../utils/auditoria";
import { movimientoSchema } from "../schemas/tesoreria";
import { esc, generarInformePdf, enviarInformePdf, renderInformeHTML, renderTabla, renderBarraProgreso } from "../../../utils/informes";

/**
 * Listar todos los presupuestos (paginado + búsqueda opcional).
 * GET /api/tesoreria/presupuestos?search=&page=&limit=
 */
export const getAllPresupuestos = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 15, search = "" } = req.query;
        const pageNum = Number(page);
        const take = Number(limit);
        const skip = (pageNum - 1) * take;

        // 1) Anotamos explícitamente como “PresupuestosWhereInput”:
        const whereFilter: Prisma.presupuestosWhereInput = search
            ? {
                OR: [
                    {
                        nombre_presupuesto: { contains: String(search), mode: "insensitive" },
                    },
                    {
                        descripcion: { contains: String(search), mode: "insensitive" },
                    },
                ],
            }
            : {};

        // 2) Ya lo pasamos a Prisma sin que TypeScript se queje
        const presupuestos = await prismaClient.presupuestos.findMany({
            where: whereFilter,
            skip,
            take,
            orderBy: { id_presupuesto: "desc" },
        });

        // 3) Contamos total para paginación
        const total = await prismaClient.presupuestos.count({ where: whereFilter });

        // 4) Calculamos saldo_restante
        const resultados = await Promise.all(
            presupuestos.map(async (p) => {
                // Obtener todos los movimientos financieros del presupuesto
                const movimientos = await prismaClient.movimientos_financieros.findMany({
                    where: { id_presupuesto: p.id_presupuesto, estado: 'COMPLETADO' },
                });

                let totalIngresos = new Prisma.Decimal(0);
                let totalEgresos = new Prisma.Decimal(0);

                movimientos.forEach((mov) => {
                    const monto = mov.monto ?? new Prisma.Decimal(0);
                    if (mov.tipo_movimiento === "INGRESO") {
                        totalIngresos = totalIngresos.add(monto);
                    } else if (mov.tipo_movimiento === "EGRESO") {
                        totalEgresos = totalEgresos.add(monto);
                    }
                });

                const montoTotal = p.monto_total ?? new Prisma.Decimal(0);
                const saldoRestante = montoTotal.add(totalIngresos).sub(totalEgresos);

                return {
                    ...p,
                    monto_total: p.monto_total,
                    saldo_restante: saldoRestante,
                };
            })
        );


        return res.status(200).json({
            data: resultados,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / take),
        });
    } catch (error) {
        console.error("Error getAllPresupuestos:", error);
        return res.status(500).json({ message: "Error al obtener presupuestos." });
    }
};
export const getPresupuestoById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        // Buscar el presupuesto
        const p = await prismaClient.presupuestos.findUniqueOrThrow({
            where: { id_presupuesto: id },
        });

        // Obtener todos los movimientos relacionados
        const movimientos = await prismaClient.movimientos_financieros.findMany({
            where: { id_presupuesto: id, estado: 'COMPLETADO' },
            orderBy: { fecha_movimiento: "desc" },
        });

        // Calcular saldo restante en base a ingresos y egresos
        let totalIngresos = new Prisma.Decimal(0);
        let totalEgresos = new Prisma.Decimal(0);

        movimientos.forEach((mov) => {
            const monto = mov.monto ?? new Prisma.Decimal(0);
            if (mov.tipo_movimiento === "INGRESO") {
                totalIngresos = totalIngresos.add(monto);
            } else if (mov.tipo_movimiento === "EGRESO") {
                totalEgresos = totalEgresos.add(monto);
            }
        });

        const montoTotal = p.monto_total ?? new Prisma.Decimal(0);
        const saldoRestante = montoTotal.add(totalIngresos).sub(totalEgresos);

        return res.status(200).json({
            ...p,
            monto_total: p.monto_total,
            saldo_restante: saldoRestante,
            movimientos,
        });
    } catch (error) {
        console.error("Error getPresupuestoById:", error);
        return res.status(404).json({ message: "Presupuesto no encontrado" });
    }
};

/**
 * Crear un nuevo presupuesto.
 * POST /api/tesoreria/presupuestos
 * body: { nombre_presupuesto, descripcion, monto_total, fecha_asignacion, estado }
 */
export const createPresupuesto = async (req: Request, res: Response) => {
    try {
        const { nombre_presupuesto, descripcion, monto_total, fecha_asignacion, estado } = req.body;

        const nuevo = await prismaClient.presupuestos.create({
            data: {
                nombre_presupuesto,
                descripcion,
                monto_total: monto_total ? new Prisma.Decimal(monto_total) : undefined,
                fecha_asignacion: fecha_asignacion ? new Date(fecha_asignacion) : undefined,
                estado,
            },
        });

        describir(res, `Se creó el presupuesto "${nuevo.nombre_presupuesto}"`);
        return res.status(201).json(nuevo);
    } catch (error) {
        console.error("Error createPresupuesto:", error);
        return res.status(400).json({ message: "Error al crear presupuesto" });
    }
};

/**
 * Actualizar un presupuesto existente.
 * PATCH /api/tesoreria/presupuestos/:id
 * body: { nombre_presupuesto, descripcion, monto_total, fecha_asignacion, estado }
 */
export const updatePresupuesto = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { nombre_presupuesto, descripcion, monto_total, fecha_asignacion, estado } = req.body;

        const updated = await prismaClient.presupuestos.update({
            where: { id_presupuesto: id },
            data: {
                nombre_presupuesto,
                descripcion,
                monto_total: monto_total ? new Prisma.Decimal(monto_total) : undefined,
                fecha_asignacion: fecha_asignacion ? new Date(fecha_asignacion) : undefined,
                estado,
            },
        });

        describir(res, `Modificó el presupuesto "${updated.nombre_presupuesto}"`);
        return res.status(200).json(updated);
    } catch (error) {
        console.error("Error updatePresupuesto:", error);
        return res.status(400).json({ message: "Error al actualizar presupuesto" });
    }
};

/**
 * Eliminar un presupuesto (y en cascada todos sus movimientos)
 * DELETE /api/tesoreria/presupuestos/:id
 */
export const deletePresupuesto = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        // Primero eliminar los movimientos asociados (si no usas onDelete:cascade)
        await prismaClient.movimientos_financieros.deleteMany({
            where: { id_presupuesto: id },
        });
        // Luego eliminar el presupuesto
        const eliminado = await prismaClient.presupuestos.delete({ where: { id_presupuesto: id } });
        describir(res, `Eliminó el presupuesto "${eliminado.nombre_presupuesto}" y sus movimientos asociados`);
        return res.status(200).json({ message: "Presupuesto eliminado" });
    } catch (error) {
        console.error("Error deletePresupuesto:", error);
        return res.status(400).json({ message: "Error al eliminar presupuesto" });
    }
};

/**
 * Listar movimientos financieros de un presupuesto.
 * GET /api/tesoreria/presupuestos/:id/movimientos
 */
export const getMovimientosByPresupuesto = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const movimientos = await prismaClient.movimientos_financieros.findMany({
            where: { id_presupuesto: id },
            orderBy: { fecha_movimiento: "desc" },
        });
        return res.status(200).json(movimientos);
    } catch (error) {
        console.error("Error getMovimientosByPresupuesto:", error);
        return res.status(400).json({ message: "Error al obtener movimientos" });
    }
};

/**
 * Crear un nuevo movimiento financiero (ingreso o egreso).
 * POST /api/tesoreria/movimientos
 * body: { id_presupuesto, tipo_movimiento, categoria, descripcion, monto, fecha_movimiento }
 */
export const createMovimientoFinanciero = async (req: Request, res: Response) => {
    try {
        const validatedData = movimientoSchema.parse(req.body);
        const { id_presupuesto, tipo_movimiento, categoria, descripcion, monto, metodo_pago, fecha_movimiento } = validatedData;
        const userId = req.user?.id_usuario;

        let rutaComprobante: string | null = null;
        if (req.file) {
            const p = await prismaClient.presupuestos.findUnique({
                where: { id_presupuesto: Number(id_presupuesto) },
                select: { nombre_presupuesto: true }
            });
            const nombre_presupuesto = p?.nombre_presupuesto || String(id_presupuesto);
            const nombreCorto = nombre_presupuesto.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            rutaComprobante = await subirArchivo(
                req.file,
                `movimientos/${nombreCorto}`
            );
        }

        const nuevoMov = await prismaClient.$transaction(async (tx) => {
            const mov = await tx.movimientos_financieros.create({
                data: {
                    id_presupuesto: Number(id_presupuesto),
                    id_usuario: userId,
                    tipo_movimiento,
                    categoria,
                    descripcion,
                    monto: new Prisma.Decimal(monto),
                    metodo_pago,
                    fecha_movimiento: fecha_movimiento ? new Date(fecha_movimiento) : undefined,
                    id_origen: null, 
                    tipo_origen_label: 'MANUAL',
                    estado: 'COMPLETADO',
                    comprobante: rutaComprobante
                },
            });

            return mov;
        });

        describir(res, `Se registró un movimiento manual de ${tipo_movimiento} por ${monto}Bs en tesorería`);
        return res.status(201).json(nuevoMov);
    } catch (error: any) {
        if (error.name === 'ZodError') {
             return res.status(400).json({ message: "Error de validación", errors: error.errors });
        }
        console.error("Error createMovimientoFinanciero:", error);
        return res.status(400).json({ message: "Error al crear movimiento financiero" });
    }
};

/**
 * Actualizar un movimiento financiero existente.
 * PATCH /api/tesoreria/movimientos/:id
 * body: { tipo_movimiento, categoria, descripcion, monto, fecha_movimiento }
 */
export const updateMovimientoFinanciero = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const existing = await prismaClient.movimientos_financieros.findUnique({ where: { id_movimiento: id } });
        if (!existing) return res.status(404).json({ message: "Movimiento no encontrado" });
        if (existing.tipo_origen_label !== 'MANUAL') {
            return res.status(403).json({ message: "No se puede editar un movimiento generado automáticamente" });
        }

        const { tipo_movimiento, categoria, descripcion, monto, fecha_movimiento, metodo_pago } = req.body;

        const updatedMov = await prismaClient.movimientos_financieros.update({
            where: { id_movimiento: id },
            data: {
                tipo_movimiento,
                categoria,
                descripcion,
                monto: monto ? new Prisma.Decimal(monto) : undefined,
                fecha_movimiento: fecha_movimiento ? new Date(fecha_movimiento) : undefined,
                metodo_pago
            },
        });

        describir(res, `Modificó el movimiento manual de ${updatedMov.tipo_movimiento} #${updatedMov.id_movimiento} en tesorería`);
        return res.status(200).json(updatedMov);
    } catch (error) {
        console.error("Error updateMovimientoFinanciero:", error);
        return res.status(400).json({ message: "Error al actualizar movimiento" });
    }
};

/**
 * Eliminar un movimiento financiero.
 * DELETE /api/tesoreria/movimientos/:id
 */
export const deleteMovimientoFinanciero = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const existing = await prismaClient.movimientos_financieros.findUnique({ 
            where: { id_movimiento: id },
            include: { origen_movimiento: true }
        });
        if (!existing) return res.status(404).json({ message: "Movimiento no encontrado" });
        if (existing.estado === 'ANULADO') {
            return res.status(409).json({ message: "Este movimiento ya fue anulado" });
        }

        await prismaClient.$transaction(async (tx) => {
            // Anular el movimiento en tesorería
            await tx.movimientos_financieros.update({
                where: { id_movimiento: id },
                data: { 
                    estado: 'ANULADO',
                    comprobante: null 
                },
            });

            // Si proviene de colegiatura o postulación, anular el pago colegiado
            if ((existing.tipo_origen_label === 'COLEGIATURA' || existing.tipo_origen_label === 'POSTULACION') && existing.id_origen) {
                const origen = await tx.origen_movimiento.findUnique({ where: { id_origen: existing.id_origen } });
                if (origen?.id_pago_colegiado) {
                    await tx.pagos_colegiados.update({
                        where: { id_pago: origen.id_pago_colegiado },
                        data: { estado_pago: 'ANULADO', comprobante: null }
                    });
                }
            }
            
            // Si proviene de invitado, anular el pago invitado
            if (existing.tipo_origen_label === 'INVITADO' && existing.id_origen) {
                const origen = await tx.origen_movimiento.findUnique({ where: { id_origen: existing.id_origen } });
                if (origen?.id_pago_invitado) {
                    await tx.pagos_invitados.update({
                        where: { id_pago: origen.id_pago_invitado },
                        data: { estado_pago: 'ANULADO', comprobante: null }
                    });
                }
            }
            
            // Si proviene de actividad institucional, anular el registro y sus pagos asociados
            if (existing.tipo_origen_label === 'ACTIVIDAD_INSTITUCIONAL' && existing.id_origen) {
                const origen = await tx.origen_movimiento.findUnique({ where: { id_origen: existing.id_origen } });
                if (origen?.id_registro_actividad_institucional) {
                    await tx.colegiados_registrados_actividad_institucional.update({
                        where: { id_registro: origen.id_registro_actividad_institucional },
                        data: { estado_registro: 'ANULADO' }
                    });
                }
                if (origen?.id_pago_colegiado) {
                    await tx.pagos_colegiados.update({
                        where: { id_pago: origen.id_pago_colegiado },
                        data: { estado_pago: 'ANULADO', comprobante: null }
                    });
                }
                if (origen?.id_pago_invitado) {
                    await tx.pagos_invitados.update({
                        where: { id_pago: origen.id_pago_invitado },
                        data: { estado_pago: 'ANULADO', comprobante: null }
                    });
                }
            }
        });

        // Eliminar archivo ya confirmada la transacción
        if (existing.comprobante) {
            await eliminarArchivo(existing.comprobante).catch(e => console.error("Error eliminando comprobante:", e));
        }

        describir(res, `Anuló el movimiento financiero #${existing.id_movimiento} (${existing.tipo_movimiento}, ${existing.monto}Bs)`);
        return res.status(200).json({ message: "Movimiento anulado" });
    } catch (error) {
        console.error("Error deleteMovimientoFinanciero:", error);
        return res.status(400).json({ message: "Error al anular movimiento" });
    }
};
















/////////////
//////////////


export const getPresupuestosSummaryReport = async (req: Request, res: Response) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        // 1.1.1) Construir filtro “where” para Prisma
        const where: Record<string, any> = {};
        if (fecha_inicio || fecha_fin) {
            where.fecha_asignacion = {};
            if (fecha_inicio) {
                where.fecha_asignacion.gte = new Date(String(fecha_inicio));
            }
            if (fecha_fin) {
                const fin = new Date(String(fecha_fin));
                fin.setHours(23, 59, 59, 999);
                where.fecha_asignacion.lte = fin;
            }
        }

        // 1.1.2) Traer todos los presupuestos en ese rango, e incluir conteo/suma de movimientos
        const presupuestos = await prismaClient.presupuestos.findMany({
            where,
            orderBy: { fecha_asignacion: "asc" },
            select: {
                id_presupuesto: true,
                nombre_presupuesto: true,
                descripcion: true,
                monto_total: true,
                fecha_asignacion: true,
                estado: true,
            },
        });

        // 1.1.3) Para cada presupuesto, calcular “saldo_restante” (monto_total – suma de movimientos)
        const datos = await Promise.all(
            presupuestos.map(async (p) => {
                // Sumar todos los movimientos vinculados a este presupuesto
                const agg = await prismaClient.movimientos_financieros.aggregate({
                    _sum: { monto: true },
                    where: { id_presupuesto: p.id_presupuesto, estado: 'COMPLETADO' },
                });
                const sumaMov = agg._sum.monto ?? new Prisma.Decimal(0);
                const montoTotalDecimal = p.monto_total ?? new Prisma.Decimal(0);
                const montoTotal = montoTotalDecimal.toNumber();
                const ejecutado = sumaMov.toNumber();
                const saldoRest = montoTotal - ejecutado;
                const pctEjecutado = montoTotal > 0 ? (ejecutado / montoTotal) * 100 : 0;

                return {
                    nombre_presupuesto: p.nombre_presupuesto || "",
                    descripcion: p.descripcion || "",
                    monto_total: montoTotal,
                    fecha_asignacion: p.fecha_asignacion
                        ? p.fecha_asignacion.toISOString().split("T")[0]
                        : "",
                    estado: p.estado || "",
                    saldo_restante: saldoRest,
                    pct_ejecutado: pctEjecutado,
                };
            })
        );

        // 1.1.4) Texto con filtros aplicados
        let filtrosTexto = "Todos los presupuestos.";
        if (fecha_inicio || fecha_fin) {
            const inicio = fecha_inicio ? String(fecha_inicio) : "—";
            const fin = fecha_fin ? String(fecha_fin) : "—";
            filtrosTexto = `Rango Fecha Asignación: ${esc(inicio)} – ${esc(fin)}`;
        }

        const totalMontoAsignado = datos.reduce((acc, d) => acc + d.monto_total, 0);
        const totalSaldoRestante = datos.reduce((acc, d) => acc + d.saldo_restante, 0);

        const kpis = [
            { label: "Presupuestos", value: datos.length, accent: "violeta" as const },
            { label: "Monto Total Asignado (Bs.)", value: totalMontoAsignado.toFixed(2), accent: "violeta" as const },
            { label: "Saldo Total Restante (Bs.)", value: totalSaldoRestante.toFixed(2), accent: "rosa" as const },
        ];

        const filas = datos.map(
            (d) => `
            <tr>
              <td>${esc(d.nombre_presupuesto)}</td>
              <td>${esc(d.descripcion)}</td>
              <td style="text-align:right">${d.monto_total.toFixed(2)}</td>
              <td>${esc(d.fecha_asignacion)}</td>
              <td>${esc(d.estado)}</td>
              <td style="text-align:right">${d.saldo_restante.toFixed(2)}</td>
              <td>${renderBarraProgreso(d.pct_ejecutado)}</td>
            </tr>`
        );

        if (datos.length > 0) {
            filas.push(`
            <tr class="fila-total">
              <td colspan="2">TOTAL</td>
              <td style="text-align:right">${totalMontoAsignado.toFixed(2)}</td>
              <td></td>
              <td></td>
              <td style="text-align:right">${totalSaldoRestante.toFixed(2)}</td>
              <td></td>
            </tr>`);
        }

        const bodyHtml = `
      <section class="seccion">
        ${renderTabla(
            [
                { label: "Nombre" },
                { label: "Descripción" },
                { label: "Monto Total (Bs.)", align: "right" },
                { label: "Fecha Asignación" },
                { label: "Estado" },
                { label: "Saldo Restante (Bs.)", align: "right" },
                { label: "% Ejecutado" },
            ],
            filas,
            "No hay presupuestos en este rango de fechas."
        )}
      </section>
    `;

        const html = renderInformeHTML({
            titulo: "Informe de Estado Presupuestario",
            subtitulo: "Resumen consolidado de presupuestos",
            filtrosTexto,
            kpis,
            bodyHtml,
            orientacion: "landscape",
        });

        const pdfBuffer = await generarInformePdf(html, { landscape: true });
        return enviarInformePdf(res, pdfBuffer, "informe_estado_presupuestario.pdf");
    } catch (error) {
        console.error("Error en getPresupuestosSummaryReport:", error);
        return res
            .status(500)
            .send("Error al generar informe resumen de presupuestos.");
    }
};

/**
 * 1.2) Reporte Detalle de un Presupuesto (por ID)
 *      GET /api/presupuestos/:id/report
 */
export const getPresupuestoDetailReport = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        // 1.2.1) Buscar el presupuesto por ID e incluir movimientos
        const p = await prismaClient.presupuestos.findUnique({
            where: { id_presupuesto: id },
            include: {
                movimientos_financieros: {
                    where: { estado: 'COMPLETADO' },
                    orderBy: { fecha_movimiento: "asc" },
                    select: {
                        fecha_movimiento: true,
                        tipo_movimiento: true,
                        categoria: true,
                        descripcion: true,
                        monto: true,
                    },
                },
            },
        });

        if (!p) {
            return res.status(404).send("Presupuesto no encontrado.");
        }

        // 1.2.2) Calcular saldo_restante
        const agg = await prismaClient.movimientos_financieros.aggregate({
            _sum: { monto: true },
            where: { id_presupuesto: id, estado: 'COMPLETADO' },
        });
        const sumaMov = agg._sum.monto ?? new Prisma.Decimal(0);
        const montoTotalDecimal = p.monto_total ?? new Prisma.Decimal(0);
        const montoTotal = montoTotalDecimal.toNumber();
        const saldoRest = montoTotal - sumaMov.toNumber();

        // 1.2.3) Mapeo de movimientos a texto (string)
        const movimientos = p.movimientos_financieros.map((m) => ({
            fecha_movimiento: m.fecha_movimiento
                ? m.fecha_movimiento.toISOString().split("T")[0]
                : "",
            tipo_movimiento: m.tipo_movimiento ?? "",
            categoria: m.categoria ?? "Sin categoría",
            descripcion: m.descripcion || "",
            monto: m.monto?.toNumber() ?? 0,
        }));

        const pctEjecutado = montoTotal > 0 ? (sumaMov.toNumber() / montoTotal) * 100 : 0;

        // Subtotal por categoría (agrupando también por tipo de movimiento)
        const subtotalesPorCategoria = new Map<string, number>();
        for (const m of movimientos) {
            const clave = `${m.categoria}|${m.tipo_movimiento}`;
            subtotalesPorCategoria.set(clave, (subtotalesPorCategoria.get(clave) ?? 0) + m.monto);
        }

        const kpis = [
            { label: "Monto Total (Bs.)", value: montoTotal.toFixed(2), accent: "violeta" as const },
            { label: "Ejecutado (Bs.)", value: sumaMov.toNumber().toFixed(2), accent: "violeta" as const },
            { label: "Saldo Restante (Bs.)", value: saldoRest.toFixed(2), accent: "rosa" as const },
        ];

        const filasCategoria = Array.from(subtotalesPorCategoria.entries()).map(([clave, subtotal]) => {
            const [categoria, tipo] = clave.split("|");
            return `<tr><td>${esc(categoria)}</td><td>${esc(tipo)}</td><td style="text-align:right">${subtotal.toFixed(2)}</td></tr>`;
        });

        const bodyHtml = `
      <section class="seccion">
        <h2 class="seccion-titulo">Información General</h2>
        <p><strong>Nombre:</strong> ${esc(p.nombre_presupuesto)}</p>
        <p><strong>Descripción:</strong> ${esc(p.descripcion || "")}</p>
        <p><strong>Fecha Asignación:</strong> ${esc(p.fecha_asignacion ? p.fecha_asignacion.toISOString().split("T")[0] : "")}</p>
        <p><strong>Estado:</strong> ${esc(p.estado || "")}</p>
        <p><strong>% Ejecutado:</strong></p>
        ${renderBarraProgreso(pctEjecutado)}
      </section>

      <section class="seccion">
        <h2 class="seccion-titulo">Subtotal por Categoría</h2>
        ${renderTabla(
            [{ label: "Categoría" }, { label: "Tipo" }, { label: "Subtotal (Bs.)", align: "right" }],
            filasCategoria,
            "No hay movimientos para este presupuesto."
        )}
      </section>

      <section class="seccion">
        <h2 class="seccion-titulo">Movimientos Financieros</h2>
        ${renderTabla(
            [{ label: "Fecha" }, { label: "Tipo" }, { label: "Categoría" }, { label: "Descripción" }, { label: "Monto (Bs.)", align: "right" }],
            movimientos.map(
                (m) => `<tr><td>${esc(m.fecha_movimiento)}</td><td>${esc(m.tipo_movimiento)}</td><td>${esc(m.categoria)}</td><td>${esc(m.descripcion)}</td><td style="text-align:right">${m.monto.toFixed(2)}</td></tr>`
            ),
            "No hay movimientos para este presupuesto."
        )}
      </section>
    `;

        const html = renderInformeHTML({
            titulo: "Detalle de Presupuesto",
            subtitulo: p.nombre_presupuesto ?? undefined,
            kpis,
            bodyHtml,
        });

        const pdfBuffer = await generarInformePdf(html);
        const filename = `informe_detalle_presupuesto_${id}.pdf`;
        return enviarInformePdf(res, pdfBuffer, filename);
    } catch (error) {
        console.error("Error en getPresupuestoDetailReport:", error);
        return res
            .status(500)
            .send("Error al generar informe detallado de presupuesto.");
    }
};





export const getMovimientosSummaryReport = async (req: Request, res: Response) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        // 2.1.1) Construir filtro “where” para Prisma
        const where: any = { estado: 'COMPLETADO' };
        if (fecha_inicio || fecha_fin) {
            where.fecha_movimiento = {};
            if (fecha_inicio) {
                where.fecha_movimiento.gte = new Date(String(fecha_inicio));
            }
            if (fecha_fin) {
                const fin = new Date(String(fecha_fin));
                fin.setHours(23, 59, 59, 999);
                where.fecha_movimiento.lte = fin;
            }
        }

        // 2.1.2) Obtener movimientos en ese rango, incluyendo el nombre del presupuesto asociado
        const movs = await prismaClient.movimientos_financieros.findMany({
            where,
            orderBy: { fecha_movimiento: "asc" },
            include: {
                presupuestos: {
                    select: { nombre_presupuesto: true },
                },
            },
        });

        // 2.1.3) Mapear a estructura simple para el HTML
        const datos = movs.map((m) => ({
            fecha_movimiento: m.fecha_movimiento
                ? m.fecha_movimiento.toISOString().split("T")[0]
                : "",
            tipo_movimiento: m.tipo_movimiento ?? "",
            categoria: m.categoria ?? "",
            descripcion: m.descripcion || "",
            monto: m.monto?.toNumber() ?? 0,
            presupuesto: m.presupuestos?.nombre_presupuesto || "",
        }));

        // 2.1.4) Texto con filtros aplicados
        let filtrosTexto = "Todos los movimientos.";
        if (fecha_inicio || fecha_fin) {
            const inicio = fecha_inicio ? String(fecha_inicio) : "—";
            const fin = fecha_fin ? String(fecha_fin) : "—";
            filtrosTexto = `Rango Fecha Movimiento: ${esc(inicio)} – ${esc(fin)}`;
        }

        const ingresos = datos.filter((d) => d.tipo_movimiento === "INGRESO");
        const egresos = datos.filter((d) => d.tipo_movimiento === "EGRESO");
        const totalIngresos = ingresos.reduce((acc, d) => acc + d.monto, 0);
        const totalEgresos = egresos.reduce((acc, d) => acc + d.monto, 0);
        const neto = totalIngresos - totalEgresos;

        const kpis = [
            { label: "Total Ingresos (Bs.)", value: totalIngresos.toFixed(2), accent: "violeta" as const },
            { label: "Total Egresos (Bs.)", value: totalEgresos.toFixed(2), accent: "rosa" as const },
            { label: "Neto (Bs.)", value: neto.toFixed(2), accent: neto >= 0 ? ("violeta" as const) : ("rosa" as const) },
        ];

        const columnas = [
            { label: "Fecha" },
            { label: "Categoría" },
            { label: "Descripción" },
            { label: "Monto (Bs.)", align: "right" as const },
            { label: "Presupuesto Asociado" },
        ];

        const filaMovimiento = (d: (typeof datos)[number]) =>
            `<tr><td>${esc(d.fecha_movimiento)}</td><td>${esc(d.categoria)}</td><td>${esc(d.descripcion)}</td><td style="text-align:right">${d.monto.toFixed(2)}</td><td>${esc(d.presupuesto)}</td></tr>`;

        const filasIngresos = ingresos.map(filaMovimiento);
        if (ingresos.length > 0) {
            filasIngresos.push(`<tr class="fila-total"><td colspan="3">SUBTOTAL INGRESOS</td><td style="text-align:right">${totalIngresos.toFixed(2)}</td><td></td></tr>`);
        }

        const filasEgresos = egresos.map(filaMovimiento);
        if (egresos.length > 0) {
            filasEgresos.push(`<tr class="fila-total"><td colspan="3">SUBTOTAL EGRESOS</td><td style="text-align:right">${totalEgresos.toFixed(2)}</td><td></td></tr>`);
        }

        const bodyHtml = `
      <section class="seccion">
        <h2 class="seccion-titulo">Ingresos</h2>
        ${renderTabla(columnas, filasIngresos, "No hay ingresos en este rango de fechas.")}
      </section>
      <section class="seccion">
        <h2 class="seccion-titulo">Egresos</h2>
        ${renderTabla(columnas, filasEgresos, "No hay egresos en este rango de fechas.")}
      </section>
    `;

        const html = renderInformeHTML({
            titulo: "Informe de Movimientos Financieros",
            subtitulo: "Ingresos y egresos agrupados por tipo",
            filtrosTexto,
            kpis,
            bodyHtml,
            orientacion: "landscape",
        });

        const pdfBuffer = await generarInformePdf(html, { landscape: true });
        return enviarInformePdf(res, pdfBuffer, "informe_movimientos_financieros.pdf");
    } catch (error) {
        console.error("Error en getMovimientosSummaryReport:", error);
        return res
            .status(500)
            .send("Error al generar informe de movimientos financieros.");
    }
};

/**
 * GET /api/financiero/tesoreria/presupuestos/:id/analytics
 */
export const getPresupuestoAnalytics = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { tipo, categoria, fecha_desde, fecha_hasta } = req.query;

        const where: any = { id_presupuesto: id, estado: 'COMPLETADO' }; // Solo completados
        if (tipo) where.tipo_movimiento = String(tipo);
        if (categoria) where.categoria = String(categoria);
        if (fecha_desde || fecha_hasta) {
            where.fecha_movimiento = {};
            if (fecha_desde) where.fecha_movimiento.gte = new Date(String(fecha_desde));
            if (fecha_hasta) where.fecha_movimiento.lte = new Date(String(fecha_hasta) + 'T23:59:59');
        }

        const movimientos = await prismaClient.movimientos_financieros.findMany({
            where,
            orderBy: { fecha_movimiento: 'asc' },
        });

        let totalIngresos = 0;
        let totalEgresos = 0;
        movimientos.forEach((m) => {
            const monto = Number(m.monto ?? 0);
            if (m.tipo_movimiento === 'INGRESO') totalIngresos += monto;
            else if (m.tipo_movimiento === 'EGRESO') totalEgresos += monto;
        });

        const mensualMap = new Map<string, { ingresos: number; egresos: number }>();
        movimientos.forEach((m) => {
            if (!m.fecha_movimiento) return;
            const mes = new Date(m.fecha_movimiento).toISOString().slice(0, 7);
            if (!mensualMap.has(mes)) mensualMap.set(mes, { ingresos: 0, egresos: 0 });
            const entry = mensualMap.get(mes)!;
            const monto = Number(m.monto ?? 0);
            if (m.tipo_movimiento === 'INGRESO') entry.ingresos += monto;
            else if (m.tipo_movimiento === 'EGRESO') entry.egresos += monto;
        });
        const evolucion_mensual = Array.from(mensualMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([mes, vals]) => ({ mes, ...vals }));

        const catMap = new Map<string, { monto: number; cantidad: number; tipo: string; anio: string }>();
        const metodoMap = new Map<string, { monto: number; cantidad: number }>();
        const origenMap = new Map<string, { monto: number; cantidad: number }>();

        movimientos.forEach((m) => {
            const cat = m.categoria ?? 'Sin categoria';
            const anio = m.fecha_movimiento ? new Date(m.fecha_movimiento).getFullYear().toString() : 'N/A';
            const key = `${anio}|${cat}`;
            if (!catMap.has(key)) catMap.set(key, { monto: 0, cantidad: 0, tipo: m.tipo_movimiento ?? 'EGRESO', anio });
            const entry = catMap.get(key)!;
            entry.monto += Number(m.monto ?? 0);
            entry.cantidad += 1;

            const met = m.metodo_pago ?? 'NO_REGISTRADO';
            if (!metodoMap.has(met)) metodoMap.set(met, { monto: 0, cantidad: 0 });
            const entryM = metodoMap.get(met)!;
            entryM.monto += Number(m.monto ?? 0);
            entryM.cantidad += 1;

            const ori = m.tipo_origen_label ?? 'MANUAL';
            if (!origenMap.has(ori)) origenMap.set(ori, { monto: 0, cantidad: 0 });
            const entryO = origenMap.get(ori)!;
            entryO.monto += Number(m.monto ?? 0);
            entryO.cantidad += 1;
        });
        const por_categoria = Array.from(catMap.entries())
            .map(([key, vals]) => {
                const [, categoria] = key.split('|');
                return { categoria, ...vals };
            })
            .sort((a, b) => b.monto - a.monto);

        const por_metodo_pago = Array.from(metodoMap.entries()).map(([metodo, vals]) => ({ metodo, ...vals }));
        const por_origen = Array.from(origenMap.entries()).map(([origen, vals]) => ({ origen, ...vals }));

        const hoy = new Date();
        const ultimos6: { mes: string; ingresos: number; egresos: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            const mes = d.toISOString().slice(0, 7);
            const found = mensualMap.get(mes) ?? { ingresos: 0, egresos: 0 };
            ultimos6.push({ mes, ...found });
        }

        return res.status(200).json({
            resumen: { total_ingresos: totalIngresos, total_egresos: totalEgresos, balance: totalIngresos - totalEgresos, total_movimientos: movimientos.length },
            evolucion_mensual,
            por_categoria,
            por_metodo_pago,
            por_origen,
            ultimos6_meses: ultimos6,
        });
    } catch (error) {
        console.error('Error getPresupuestoAnalytics:', error);
        return res.status(500).json({ message: 'Error al obtener analytics.' });
    }
};

/**
 * GET /api/financiero/tesoreria/presupuestos/:id/movimientos-filtrados
 */
export const getMovimientosFiltrados = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { page = 1, limit = 10, tipo, categoria, fecha_desde, fecha_hasta, search, sortOrder = 'desc', sortBy = 'actividad', metodo, origen, estado } = req.query;
        const pageNum = Number(page);
        const take = Number(limit);
        const skip = (pageNum - 1) * take;

        const where: any = { id_presupuesto: id };
        if (tipo) where.tipo_movimiento = String(tipo);
        if (categoria) where.categoria = String(categoria);
        if (metodo) where.metodo_pago = String(metodo);
        if (origen) where.tipo_origen_label = String(origen);
        if (estado) where.estado = String(estado);
        if (search) where.descripcion = { contains: String(search), mode: 'insensitive' };
        if (fecha_desde || fecha_hasta) {
            where.fecha_movimiento = {};
            if (fecha_desde) where.fecha_movimiento.gte = new Date(String(fecha_desde));
            if (fecha_hasta) where.fecha_movimiento.lte = new Date(String(fecha_hasta) + 'T23:59:59');
        }

        const orderByDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

        /**
         * Orden del listado.
         *
         * - "actividad" (por defecto): última vez que se tocó el movimiento, sea
         *   por alta, edición o anulación. Es lo que el usuario espera ver arriba.
         *   `updatedAt` lo mantiene Prisma con `@updatedAt`; el `nulls: 'last'` y
         *   los criterios de desempate cubren las filas antiguas que aún no lo
         *   tengan (en PostgreSQL un DESC pondría los NULL delante).
         * - "fecha": fecha contable del movimiento, que puede ser muy anterior.
         */
        const orderBy = String(sortBy) === 'fecha'
            ? [{ fecha_movimiento: orderByDirection }, { id_movimiento: orderByDirection }]
            : [
                { updatedAt: { sort: orderByDirection, nulls: 'last' } },
                { createdAt: orderByDirection },
                { id_movimiento: orderByDirection },
            ];

        const [movimientos, total] = await Promise.all([
            prismaClient.movimientos_financieros.findMany({
                where,
                skip,
                take,
                orderBy: orderBy as any,
                include: {
                    usuario: {
                        select: {
                            id_usuario: true,
                            nombre: true,
                            apellido: true,
                            roles: {
                                where: { activo: true },
                                select: { rol: true }
                            }
                        }
                    },
                    origen_movimiento: {
                        include: {
                            pagos_colegiados: {
                                select: { 
                                    comprobante: true,
                                    colegiados: {
                                        select: { nombre: true, apellido: true, carnet_identidad: true }
                                    }
                                }
                            },
                            colegiados_registrados_actividad_institucional: {
                                include: {
                                    colegiados: { select: { nombre: true, apellido: true, carnet_identidad: true } },
                                    invitados: { select: { nombre: true, apellido: true } },
                                    actividades_institucionales: { select: { nombre: true } }
                                }
                            },
                            postulaciones: {
                                select: { nombre: true, apellido: true, carnet_identidad: true }
                            }
                        }
                    }
                }
            }),
            prismaClient.movimientos_financieros.count({ where }),
        ]);

        const formatted = movimientos.map(m => {
            const comprobanteResuelto = m.comprobante || m.origen_movimiento?.pagos_colegiados?.comprobante || null;
            const rolActual = m.usuario?.roles?.[0]?.rol || null;
            
            let origenInfo: any = null;
            if (m.origen_movimiento) {
                const om = m.origen_movimiento;
                if (om.pagos_colegiados) {
                    const c = om.pagos_colegiados.colegiados;
                    origenInfo = { persona: `${c?.nombre} ${c?.apellido}`.trim(), carnet: c?.carnet_identidad };
                } else if (om.colegiados_registrados_actividad_institucional) {
                    const reg = om.colegiados_registrados_actividad_institucional;
                    const c = reg.colegiados;
                    const i = reg.invitados;
                    const act = reg.actividades_institucionales;
                    origenInfo = {
                        persona: c ? `${c.nombre} ${c.apellido}`.trim() : (i ? `${i.nombre} ${i.apellido}`.trim() : 'Desconocido'),
                        carnet: c?.carnet_identidad || null,
                        actividad: act?.nombre || null
                    };
                } else if (om.postulaciones) {
                    const p = om.postulaciones;
                    origenInfo = { persona: `${p.nombre} ${p.apellido}`.trim(), carnet: p.carnet_identidad };
                }
            }

            return {
                ...m,
                comprobante: buildPublicUrl(comprobanteResuelto),
                usuario: m.usuario ? {
                    id_usuario: m.usuario.id_usuario,
                    nombre_completo: `${m.usuario.nombre || ''} ${m.usuario.apellido || ''}`.trim(),
                    rol: rolActual
                } : null,
                origen_info: origenInfo
            };
        });

        return res.status(200).json({ data: formatted, total, page: pageNum, totalPages: Math.ceil(total / take) });
    } catch (error) {
        console.error('Error getMovimientosFiltrados:', error);
        return res.status(500).json({ message: 'Error al filtrar movimientos.' });
    }
};

/**
 * GET /api/financiero/tesoreria/presupuestos/:id/categorias
 */
export const getCategoriasByPresupuesto = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const movimientos = await prismaClient.movimientos_financieros.findMany({
            where: { id_presupuesto: id },
            select: { categoria: true },
        });
        const categorias = [...new Set(movimientos.map(m => m.categoria).filter(Boolean))];
        return res.status(200).json({ categorias });
    } catch (error) {
        console.error('Error getCategoriasByPresupuesto:', error);
        return res.status(500).json({ message: 'Error al obtener categorias.' });
    }
};
