// controllers/tesoreria.controller.ts
import { Request, Response } from "express";

import { Prisma } from "../../../../generated/prisma";
import prismaClient from "../../../utils/prismaClient";
import puppeteer from "puppeteer";

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
                    where: { id_presupuesto: p.id_presupuesto },
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
            where: { id_presupuesto: id },
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
        await prismaClient.presupuestos.delete({ where: { id_presupuesto: id } });
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
        const { id_presupuesto, tipo_movimiento, categoria, descripcion, monto, fecha_movimiento } = req.body;

        const nuevoMov = await prismaClient.movimientos_financieros.create({
            data: {
                id_presupuesto: Number(id_presupuesto),
                tipo_movimiento,
                categoria,
                descripcion,
                monto: monto ? new Prisma.Decimal(monto) : new Prisma.Decimal(0),
                fecha_movimiento: fecha_movimiento ? new Date(fecha_movimiento) : undefined,
                id_origen: null, // Lo dejamos null porque es “MANUAL”
            },
        });

        return res.status(201).json(nuevoMov);
    } catch (error) {
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
        const { tipo_movimiento, categoria, descripcion, monto, fecha_movimiento } = req.body;

        const updatedMov = await prismaClient.movimientos_financieros.update({
            where: { id_movimiento: id },
            data: {
                tipo_movimiento,
                categoria,
                descripcion,
                monto: monto ? new Prisma.Decimal(monto) : undefined,
                fecha_movimiento: fecha_movimiento ? new Date(fecha_movimiento) : undefined,
            },
        });

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
        await prismaClient.movimientos_financieros.delete({
            where: { id_movimiento: id },
        });
        return res.status(200).json({ message: "Movimiento eliminado" });
    } catch (error) {
        console.error("Error deleteMovimientoFinanciero:", error);
        return res.status(400).json({ message: "Error al eliminar movimiento" });
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
                    where: { id_presupuesto: p.id_presupuesto },
                });
                const sumaMov = agg._sum.monto ?? new Prisma.Decimal(0);
                const montoTotalDecimal = p.monto_total ?? new Prisma.Decimal(0);
                const montoTotal = montoTotalDecimal.toNumber();
                const saldoRest = montoTotal - sumaMov.toNumber();

                return {
                    nombre_presupuesto: p.nombre_presupuesto || "",
                    descripcion: p.descripcion || "",
                    monto_total: montoTotal.toFixed(2),
                    fecha_asignacion: p.fecha_asignacion
                        ? p.fecha_asignacion.toISOString().split("T")[0]
                        : "",
                    estado: p.estado || "",
                    saldo_restante: saldoRest.toFixed(2),
                };
            })
        );

        // 1.1.4) Texto con filtros aplicados
        let filtrosTexto = "<p>Todos los presupuestos.</p>";
        if (fecha_inicio || fecha_fin) {
            const inicio = fecha_inicio ? String(fecha_inicio) : "—";
            const fin = fecha_fin ? String(fecha_fin) : "—";
            filtrosTexto = `<p><strong>Rango Fecha Asignación:</strong> ${inicio} – ${fin}</p>`;
        }

        // 1.1.5) Generar tabla HTML
        let tablaHTML = "";
        if (datos.length === 0) {
            tablaHTML = `<p>No hay presupuestos en este rango de fechas.</p>`;
        } else {
            tablaHTML = `
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Monto Total (Bs.)</th>
            <th>Fecha Asignación</th>
            <th>Estado</th>
            <th>Saldo Restante (Bs.)</th>
          </tr>
        </thead>
        <tbody>
          ${datos
                    .map(
                        (d) => `
            <tr>
              <td>${d.nombre_presupuesto}</td>
              <td>${d.descripcion}</td>
              <td>${d.monto_total}</td>
              <td>${d.fecha_asignacion}</td>
              <td>${d.estado}</td>
              <td>${d.saldo_restante}</td>
            </tr>
          `
                    )
                    .join("")}
        </tbody>
      </table>
      `;
        }

        // 1.1.6) HTML completo para PDF
        const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            p { margin: 4px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
            th { background-color: #eee; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Reporte Resumen de Presupuestos</h1>
          <h3>Generado: ${new Date().toLocaleString()}</h3>
          ${filtrosTexto}
          ${tablaHTML}
        </body>
      </html>
    `;

        // 1.1.7) Puppeteer → convertir a PDF
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
                .send("Error generando PDF resumen de presupuestos.");
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="resumen_presupuestos.pdf"`
        );
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Error en getPresupuestosSummaryReport:", error);
        return res
            .status(500)
            .send("Error al generar reporte resumen de presupuestos.");
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
            where: { id_presupuesto: id },
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
            tipo_movimiento: m.tipo_movimiento,
            categoria: m.categoria,
            descripcion: m.descripcion || "",
            monto: m.monto?.toNumber().toFixed(2),
        }));

        // 1.2.4) Construir HTML del detalle
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
          <h1>Detalle Presupuesto</h1>
          <h3>Generado: ${new Date().toLocaleString()}</h3>

          <div class="seccion">
            <h2>Información General</h2>
            <p><strong>Nombre:</strong> ${p.nombre_presupuesto}</p>
            <p><strong>Descripción:</strong> ${p.descripcion || ""}</p>
            <p><strong>Monto Total (Bs.):</strong> ${montoTotal.toFixed(2)}</p>
            <p><strong>Saldo Restante (Bs.):</strong> ${saldoRest.toFixed(2)}</p>
            <p><strong>Fecha Asignación:</strong> ${p.fecha_asignacion ? p.fecha_asignacion.toISOString().split("T")[0] : ""
            }</p>
            <p><strong>Estado:</strong> ${p.estado || ""}</p>
          </div>

          <div class="seccion">
            <h2>Movimientos Financieros</h2>
            ${movimientos.length === 0
                ? "<p>No hay movimientos para este presupuesto.</p>"
                : `
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Monto (Bs.)</th>
                  </tr>
                </thead>
                <tbody>
                  ${movimientos
                    .map(
                        (m) => `
                    <tr>
                      <td>${m.fecha_movimiento}</td>
                      <td>${m.tipo_movimiento}</td>
                      <td>${m.categoria}</td>
                      <td>${m.descripcion}</td>
                      <td>${m.monto}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            `
            }
          </div>
        </body>
      </html>
    `;

        // 1.2.5) Puppeteer → PDF
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
                .send("Error generando PDF detalle de presupuesto.");
        }

        const filename = `detalle_presupuesto_${id}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Error en getPresupuestoDetailReport:", error);
        return res
            .status(500)
            .send("Error al generar reporte detallado de presupuesto.");
    }
};





export const getMovimientosSummaryReport = async (req: Request, res: Response) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        // 2.1.1) Construir filtro “where” para Prisma
        const where: any = {};
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
            tipo_movimiento: m.tipo_movimiento,
            categoria: m.categoria,
            descripcion: m.descripcion || "",
            monto: m.monto?.toNumber().toFixed(2),
            presupuesto: m.presupuestos?.nombre_presupuesto || "",
        }));

        // 2.1.4) Texto con filtros aplicados
        let filtrosTexto = "<p>Todos los movimientos.</p>";
        if (fecha_inicio || fecha_fin) {
            const inicio = fecha_inicio ? String(fecha_inicio) : "—";
            const fin = fecha_fin ? String(fecha_fin) : "—";
            filtrosTexto = `<p><strong>Rango Fecha Movimiento:</strong> ${inicio} – ${fin}</p>`;
        }

        // 2.1.5) Construir tabla HTML
        let tablaHTML = "";
        if (datos.length === 0) {
            tablaHTML = `<p>No hay movimientos en este rango de fechas.</p>`;
        } else {
            tablaHTML = `
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Categoría</th>
            <th>Descripción</th>
            <th>Monto (Bs.)</th>
            <th>Presupuesto Asociado</th>
          </tr>
        </thead>
        <tbody>
          ${datos
                    .map(
                        (d) => `
            <tr>
              <td>${d.fecha_movimiento}</td>
              <td>${d.tipo_movimiento}</td>
              <td>${d.categoria}</td>
              <td>${d.descripcion}</td>
              <td>${d.monto}</td>
              <td>${d.presupuesto}</td>
            </tr>
          `
                    )
                    .join("")}
        </tbody>
      </table>
      `;
        }

        // 2.1.6) HTML completo
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
          <h1>Reporte de Movimientos Financieros</h1>
          <h3>Generado: ${new Date().toLocaleString()}</h3>
          ${filtrosTexto}
          ${tablaHTML}
        </body>
      </html>
    `;

        // 2.1.7) Puppeteer → PDF
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
                .send("Error generando PDF de movimientos financieros.");
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="reporte_movimientos_financieros.pdf"`
        );
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Error en getMovimientosSummaryReport:", error);
        return res
            .status(500)
            .send("Error al generar reporte de movimientos financieros.");
    }
};


