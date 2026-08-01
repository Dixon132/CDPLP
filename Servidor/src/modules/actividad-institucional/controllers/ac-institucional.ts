// controllers/ac-institucionales.controller.ts
import { Request, Response } from "express";
import puppeteer from "puppeteer";
import prismaClient from "../../../utils/prismaClient";
import { registrarMovimientoPagoCurso } from "../../financiero/services/movimiento";
import { Origen } from "../../../types/movimientos";
import { Modulos } from "../../../types/auditoria";
import { describir } from "../../../utils/auditoria";
import { subirArchivo, eliminarArchivo } from "../../../utils/uploadS3";
import crypto from "crypto";
import { emitirNotificacion } from "../../notificaciones/services";
import { esc, generarInformePdf, enviarInformePdf, renderInformeHTML, renderTabla, renderBarraProgreso } from "../../../utils/informes";

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

    // Auto-transition logic
    await prismaClient.actividades_institucionales.updateMany({
        where: {
            estado: "EN_INSCRIPCION",
            fecha_programada: { lte: new Date() }
        },
        data: { estado: "EN_CURSO" }
    });


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

    describir(res, `Se creó la actividad institucional "${nueva.nombre}"`);
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

    describir(res, `Modificó la actividad institucional "${updated.nombre}"`);
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
    describir(res, `Cambió el estado de la actividad institucional "${updated.nombre}" a ${estado}`);
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

    // ─── Validación del inscrito ────────────────────────────────────────────
    if (!id_colegiado && !id_invitado) {
        return res.status(400).json({ error: "Debe indicarse un colegiado o un invitado" });
    }
    if (id_colegiado && id_invitado) {
        return res.status(400).json({ error: "Un registro corresponde a un colegiado o a un invitado, no a ambos" });
    }

    // ─── Validación de duplicado ────────────────────────────────────────────
    let existingRegistro = null;

    if (id_colegiado) {
        existingRegistro = await prismaClient.colegiados_registrados_actividad_institucional.findFirst({
            where: {
                id_actividad: Number(id_actividad),
                id_colegiado: Number(id_colegiado),
            }
        });
        if (existingRegistro && existingRegistro.estado_registro !== 'ANULADO') {
            return res.status(409).json({
                error: "El colegiado ya está registrado en esta actividad"
            });
        }
    }

    if (id_invitado) {
        existingRegistro = await prismaClient.colegiados_registrados_actividad_institucional.findFirst({
            where: {
                id_actividad: Number(id_actividad),
                id_invitado: Number(id_invitado),
            }
        });
        if (existingRegistro && existingRegistro.estado_registro !== 'ANULADO') {
            return res.status(409).json({
                error: "Este invitado ya está registrado en esta actividad"
            });
        }
    }
    // ────────────────────────────────────────────────────────────────────────

    const act = await prismaClient.actividades_institucionales.findFirstOrThrow({
        where: { id_actividad: Number(id_actividad) },
        select: { costo: true, nombre: true }
    });

    // El costo va directo a `pagos_*` y a tesorería, así que se valida antes de
    // crear nada: un costo nulo o negativo generaría un INGRESO inválido que
    // descuadra el saldo del presupuesto.
    const costo = Number(act.costo);
    if (act.costo === null || act.costo === undefined || Number.isNaN(costo) || costo <= 0) {
        return res.status(400).json({
            error: `La actividad "${act.nombre}" no tiene un costo válido (${act.costo}). Corrígelo antes de inscribir participantes.`
        });
    }

    // La subida va ANTES de la transacción: una transacción interactiva de
    // Prisma expira a los 5s, y mantenerla abierta durante una subida de red
    // la hace abortar con P2028.
    let urlComprobante: string | undefined = undefined;
    if (req.file) {
        const nombreAct = act.nombre || 'ACT';
        const prefix = nombreAct.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'A');
        const hash4 = crypto.createHash('md5').update(String(id_actividad)).digest('hex').substring(0, 4);
        const folderName = `${prefix}-${hash4}`;
        urlComprobante = await subirArchivo(req.file, `comprobantes_institucional/${folderName}`);
    }

    try {
        const configPresupuesto = await prismaClient.config_pago.findUnique({
            where: { clave: 'PRESUPUESTO_ACTIVO' }
        });
        const activePresupuestoId = configPresupuesto ? Number(configPresupuesto.valor) : 1;

        const reg = await prismaClient.$transaction(async (tx) => {
            let registro;
            if (existingRegistro) {
                // Re-inscripción: actualizar el registro existente
                registro = await tx.colegiados_registrados_actividad_institucional.update({
                    where: { id_registro: existingRegistro.id_registro },
                    data: {
                        fecha_registro: fecha_registro ? new Date(fecha_registro) : new Date(),
                        estado_registro,
                        metodo_pago,
                    },
                });
            } else {
                // Nuevo registro
                registro = await tx.colegiados_registrados_actividad_institucional.create({
                    data: {
                        id_actividad: Number(id_actividad),
                        id_colegiado: id_colegiado ? Number(id_colegiado) : null,
                        id_invitado: id_invitado ? Number(id_invitado) : null,
                        fecha_registro: fecha_registro ? new Date(fecha_registro) : new Date(),
                        estado_registro,
                        metodo_pago,
                    },
                });
            }

            const userId = req.user?.id_usuario;
            
            let idPagoColegiado = undefined;
            let idPagoInvitado = undefined;
            const conceptoPago = `Inscripción a Actividad Institucional: ${act.nombre}`;

            if (id_colegiado) {
                const pagoCol = await tx.pagos_colegiados.create({
                    data: {
                        id_colegiado: Number(id_colegiado),
                        concepto: conceptoPago,
                        fecha_pago: fecha_registro ? new Date(fecha_registro) : new Date(),
                        monto: act.costo,
                        metodo_pago,
                        comprobante: urlComprobante
                    }
                });
                idPagoColegiado = pagoCol.id_pago;
            } else if (id_invitado) {
                const pagoInv = await tx.pagos_invitados.create({
                    data: {
                        id_invitado: Number(id_invitado),
                        concepto: conceptoPago,
                        fecha_pago: fecha_registro ? new Date(fecha_registro) : new Date(),
                        monto: act.costo,
                        metodo_pago,
                        comprobante: urlComprobante
                    }
                });
                idPagoInvitado = pagoInv.id_pago;
            }

            await registrarMovimientoPagoCurso(registro.id_registro, Number(act.costo), Origen.CURSO, `Pago de la actividad institucional: ${act.nombre}`, activePresupuestoId, userId, metodo_pago, urlComprobante, tx, idPagoColegiado, idPagoInvitado);
            
            return registro;
        });

        describir(res, `Se registró una inscripción a la actividad institucional "${act.nombre}" por Bs. ${costo}`);
        await emitirNotificacion({
            modulo: Modulos.ACT_INSTITUCIONALES,
            tipo: 'info',
            titulo: 'Nueva inscripción a actividad',
            descripcion: `${act.nombre} · Bs. ${costo}`,
            enlace: '/dashboard/actividades_institucionales',
            idUsuario: req.user!.id_usuario,
        });
        return res.status(201).json(reg);
    } catch (error) {
        // La transacción revirtió pero el comprobante ya está en la nube: se borra
        // para no dejar archivos huérfanos.
        if (urlComprobante) {
            await eliminarArchivo(urlComprobante).catch(e => console.error("Error eliminando comprobante huérfano:", e));
        }
        console.error("Error en createRegistroInst:", error);
        return res.status(500).json({ error: "Error al registrar la inscripción y sus movimientos financieros" });
    }
};





export const anularRegistroInst = async (req: Request, res: Response) => {
    try {
        const id_registro = Number(req.params.id);
        const registro = await prismaClient.colegiados_registrados_actividad_institucional.findUnique({
            where: { id_registro }
        });
        if (!registro) return res.status(404).json({ error: "Registro no encontrado" });
        if (registro.estado_registro === 'ANULADO') return res.status(409).json({ error: "El registro ya está anulado" });

        const urlComprobante = await prismaClient.$transaction(async (tx) => {
            await tx.colegiados_registrados_actividad_institucional.update({
                where: { id_registro },
                data: { estado_registro: 'ANULADO' }
            });

            // Buscar el movimiento asociado y anularlo
            let urlComprobante = null;
            const origen = await tx.origen_movimiento.findFirst({
                where: { id_registro_actividad_institucional: id_registro },
                orderBy: { id_origen: 'desc' }
            });
            if (origen) {
                const movIngreso = await tx.movimientos_financieros.findFirst({
                    where: { id_origen: origen.id_origen }
                });
                if (movIngreso) {
                    urlComprobante = movIngreso.comprobante;
                    await tx.movimientos_financieros.update({
                        where: { id_movimiento: movIngreso.id_movimiento },
                        data: { estado: 'ANULADO', comprobante: null }
                    });
                }
                
                if (origen.id_pago_colegiado) {
                    await tx.pagos_colegiados.update({
                        where: { id_pago: origen.id_pago_colegiado },
                        data: { estado_pago: 'ANULADO', comprobante: null }
                    });
                }
                
                if (origen.id_pago_invitado) {
                    await tx.pagos_invitados.update({
                        where: { id_pago: origen.id_pago_invitado },
                        data: { estado_pago: 'ANULADO', comprobante: null }
                    });
                }
            }

            // Return URL para eliminar después de la tx
            return urlComprobante;
        });

        // El archivo se borra ya confirmada la transacción: si se borrara dentro
        // y la transacción revirtiera, el comprobante se perdería sin motivo.
        if (urlComprobante) {
            await eliminarArchivo(urlComprobante).catch(e => console.error("Error eliminando comprobante:", e));
        }

        describir(res, `Anuló el registro de inscripción #${id_registro} a una actividad institucional`);
        res.status(200).json({ message: "Registro anulado correctamente" });
    } catch (error) {
        console.error("Error anularRegistroInst:", error);
        res.status(500).json({ error: "Error al anular el registro" });
    }
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
        include: { colegiados: true, invitados: true },
    });
    return res.status(200).json(asis);
};





export const createAsistenciaInst = async (req: Request, res: Response) => {
    const { id_actividad, id_colegiado, id_invitado } = req.body;
    const a = await prismaClient.asistencias_actividad.create({
        data: {
            id_actividad: Number(id_actividad),
            id_colegiado: id_colegiado ? Number(id_colegiado) : null,
            id_invitado: id_invitado ? Number(id_invitado) : null,
        }
    });
    describir(res, `Marcó asistencia a la actividad institucional #${id_actividad}`);
    return res.status(201).json(a);
};

export const deleteAsistenciaInst = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const deleted = await prismaClient.asistencias_actividad.delete({
        where: { id_asistencia: id },
    });
    describir(res, `Eliminó una asistencia registrada (#${id})`);
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
                    tipo: "Invitado",
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

        // 2.3) Tasa de asistencia: asistencias marcadas / registros inscritos
        const tasaAsistencia = registros.length > 0 ? (asistencias.length / registros.length) * 100 : 0;

        const kpis = [
            { label: "Inscritos", value: registros.length, accent: "violeta" as const },
            { label: "Asistencias", value: asistencias.length, accent: "violeta" as const },
            { label: "Tasa de Asistencia", value: `${Math.round(tasaAsistencia)}%`, accent: "rosa" as const },
        ];

        const bodyHtml = `
      <section class="seccion">
        <h2 class="seccion-titulo">Datos Básicos</h2>
        <p><strong>Nombre:</strong> ${esc(nombre)}</p>
        <p><strong>Descripción:</strong> ${esc(descripcion)}</p>
        <p><strong>Tipo:</strong> ${esc(tipo)}</p>
        <p><strong>Fecha Programada:</strong> ${esc(fechaProg)}</p>
        <p><strong>Costo (Bs.):</strong> ${esc(costo)}</p>
        <p><strong>Estado:</strong> ${esc(estado)}</p>
      </section>

      <section class="seccion">
        <h2 class="seccion-titulo">Registros Inscritos (Colegiados &amp; Invitados)</h2>
        ${renderTabla(
            [
                { label: "Tipo" },
                { label: "Nombre Completo" },
                { label: "Correo" },
                { label: "Teléfono" },
                { label: "Detalles" },
                { label: "Estado Registro" },
                { label: "Fecha Registro" },
                { label: "Método Pago" },
            ],
            registros.map(
                (r) => `
            <tr>
              <td>${esc(r.tipo)}</td>
              <td>${esc(r.nombreCompleto)}</td>
              <td>${esc(r.correo)}</td>
              <td>${esc(r.telefono)}</td>
              <td>${esc(r.detalles)}</td>
              <td>${esc(r.estadoRegistro)}</td>
              <td>${esc(r.fechaRegistro)}</td>
              <td>${esc(r.metodoPago)}</td>
            </tr>`
            ),
            "No hay registros inscritos."
        )}
      </section>

      <section class="seccion">
        <h2 class="seccion-titulo">Asistencias Marcadas (solo Colegiados)</h2>
        ${renderTabla(
            [{ label: "Nombre Completo" }],
            asistencias.map((a) => `<tr><td>${esc(a.nombreCompleto)}</td></tr>`),
            "No hay asistencias registradas."
        )}
      </section>
    `;

        const html = renderInformeHTML({
            titulo: "Informe de Actividad Institucional",
            subtitulo: nombre,
            kpis,
            bodyHtml,
        });

        const pdfBuffer = await generarInformePdf(html);
        return enviarInformePdf(res, pdfBuffer, `informe_actividad_institucional_${id}.pdf`);
    } catch (error) {
        console.error("Error en getActividadInstDetailReport:", error);
        return res
            .status(500)
            .send("Error al generar informe detallado de actividad institucional.");
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
        let filtrosTexto = "Todos los registros.";
        if (fecha_inicio || fecha_fin) {
            const inicio = fecha_inicio ? String(fecha_inicio) : "—";
            const fin = fecha_fin ? String(fecha_fin) : "—";
            filtrosTexto = `Rango Fecha Programada: ${esc(inicio)} – ${esc(fin)}`;
        }

        const totalInscritosGlobal = datos.reduce((acc, d) => acc + d.totalInscritos, 0);
        const totalAsistenciasGlobal = datos.reduce((acc, d) => acc + d.totalAsistencias, 0);
        const tasaAsistenciaGlobal = totalInscritosGlobal > 0 ? (totalAsistenciasGlobal / totalInscritosGlobal) * 100 : 0;

        const kpis = [
            { label: "Actividades", value: datos.length, accent: "violeta" as const },
            { label: "Total Inscritos", value: totalInscritosGlobal, accent: "violeta" as const },
            { label: "Tasa de Asistencia Global", value: `${Math.round(tasaAsistenciaGlobal)}%`, accent: "rosa" as const },
        ];

        // 3.5) Construir tabla
        const bodyHtml = `
      <section class="seccion">
        ${renderTabla(
            [
                { label: "Nombre" },
                { label: "Tipo" },
                { label: "Fecha Programada" },
                { label: "Costo (Bs.)", align: "right" },
                { label: "Estado" },
                { label: "# Inscritos", align: "right" },
                { label: "# Asistencias", align: "right" },
                { label: "% Asistencia" },
            ],
            datos.map((d) => {
                const pctAsistencia = d.totalInscritos > 0 ? (d.totalAsistencias / d.totalInscritos) * 100 : 0;
                return `
            <tr>
              <td>${esc(d.nombre)}</td>
              <td>${esc(d.tipo)}</td>
              <td>${esc(d.fechaProg)}</td>
              <td style="text-align:right">${esc(d.costo)}</td>
              <td>${esc(d.estado)}</td>
              <td style="text-align:right">${d.totalInscritos}</td>
              <td style="text-align:right">${d.totalAsistencias}</td>
              <td>${renderBarraProgreso(pctAsistencia)}</td>
            </tr>`;
            }),
            "No hay actividades institucionales en este rango."
        )}
      </section>
    `;

        const html = renderInformeHTML({
            titulo: "Informe Consolidado de Actividades Institucionales",
            filtrosTexto,
            kpis,
            bodyHtml,
            orientacion: "landscape",
        });

        const pdfBuffer = await generarInformePdf(html, { landscape: true });
        return enviarInformePdf(res, pdfBuffer, "informe_actividades_institucionales.pdf");
    } catch (error) {
        console.error("Error en getActividadesInstSummaryReport:", error);
        return res
            .status(500)
            .send("Error al generar informe resumen de actividades institucionales.");
    }
};

/**
 * GET /api/ac-institucionales/registro/:id/certificado
 * Genera un PDF de certificado de participación para un registro individual.
 */
export const getCertificadoParticipacion = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        const registro = await prismaClient.colegiados_registrados_actividad_institucional.findUnique({
            where: { id_registro: id },
            include: {
                colegiados: { select: { nombre: true, apellido: true, carnet_identidad: true, especialidades: true } },
                invitados:  { select: { nombre: true, apellido: true } },
                actividades_institucionales: {
                    select: { nombre: true, tipo: true, fecha_programada: true, descripcion: true }
                }
            }
        });

        if (!registro) return res.status(404).send("Registro no encontrado");

        const persona = registro.colegiados
            ? `${registro.colegiados.nombre} ${registro.colegiados.apellido}`
            : registro.invitados
                ? `${registro.invitados.nombre} ${registro.invitados.apellido}`
                : "Participante";

        const carnet = registro.colegiados?.carnet_identidad ?? "—";
        const especialidad = registro.colegiados?.especialidades ?? "—";
        const act = registro.actividades_institucionales;
        const actNombre = act?.nombre ?? "Actividad Institucional";
        const actTipo = act?.tipo ?? "";
        const actFecha = act?.fecha_programada
            ? new Date(act.fecha_programada).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
            : "—";
        const emitidoEl = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #fff;
      width: 297mm; height: 210mm;
      display: flex; align-items: center; justify-content: center;
    }
    .cert {
      width: 100%; height: 100%;
      border: 20px solid transparent;
      background:
        linear-gradient(white, white) padding-box,
        linear-gradient(135deg, #7c3aed, #db2777, #7c3aed) border-box;
      padding: 40px 60px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center;
      position: relative;
    }
    .corner {
      position: absolute;
      width: 80px; height: 80px;
      opacity: 0.15;
    }
    .corner.tl { top: 20px; left: 20px; border-top: 4px solid #7c3aed; border-left: 4px solid #7c3aed; }
    .corner.tr { top: 20px; right: 20px; border-top: 4px solid #7c3aed; border-right: 4px solid #7c3aed; }
    .corner.bl { bottom: 20px; left: 20px; border-bottom: 4px solid #7c3aed; border-left: 4px solid #7c3aed; }
    .corner.br { bottom: 20px; right: 20px; border-bottom: 4px solid #7c3aed; border-right: 4px solid #7c3aed; }
    .logo-line {
      font-size: 13px; font-weight: 600; letter-spacing: 4px;
      color: #7c3aed; text-transform: uppercase; margin-bottom: 8px;
    }
    .title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 46px; font-weight: 700;
      background: linear-gradient(135deg, #7c3aed, #db2777);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      margin-bottom: 6px;
    }
    .subtitle { font-size: 13px; color: #6b7280; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 28px; }
    .divider {
      width: 80px; height: 3px;
      background: linear-gradient(90deg, #7c3aed, #db2777);
      border-radius: 2px; margin: 0 auto 28px;
    }
    .intro { font-size: 15px; color: #4b5563; margin-bottom: 12px; }
    .name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 38px; font-weight: 700; color: #1f2937;
      border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .ci { font-size: 13px; color: #9ca3af; margin-bottom: 24px; }
    .body-text { font-size: 15px; color: #4b5563; line-height: 1.8; margin-bottom: 6px; }
    .act-name { font-size: 22px; font-weight: 700; color: #7c3aed; margin: 4px 0; }
    .meta { font-size: 13px; color: #6b7280; margin-bottom: 30px; }
    .footer {
      position: absolute; bottom: 40px; width: calc(100% - 120px);
      display: flex; justify-content: space-between; align-items: flex-end;
    }
    .sign-block { text-align: center; }
    .sign-line { width: 160px; border-top: 1px solid #9ca3af; margin-bottom: 6px; }
    .sign-label { font-size: 11px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; }
    .date { font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>

    <p class="logo-line">Colegio Departamental de Profesionales de La Paz</p>
    <h1 class="title">Certificado</h1>
    <p class="subtitle">de participación</p>
    <div class="divider"></div>

    <p class="intro">Este certificado se otorga a</p>
    <p class="name">${persona}</p>
    <p class="ci">C.I.: ${carnet} &nbsp;|&nbsp; ${especialidad}</p>

    <p class="body-text">por su participación en la actividad institucional</p>
    <p class="act-name">"${actNombre}"</p>
    <p class="meta">${actTipo} &nbsp;•&nbsp; ${actFecha}</p>

    <div class="footer">
      <div class="sign-block">
        <div class="sign-line"></div>
        <p class="sign-label">Firma del Decano</p>
      </div>
      <p class="date">Emitido el ${emitidoEl}</p>
      <div class="sign-block">
        <div class="sign-line"></div>
        <p class="sign-label">Secretaría General</p>
      </div>
    </div>
  </div>
</body>
</html>`;

        const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        const certPage = await browser.newPage();
        await certPage.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await certPage.pdf({ format: "A4", landscape: true, printBackground: true });
        await browser.close();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="certificado_${id}.pdf"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Error en getCertificadoParticipacion:", error);
        return res.status(500).send("Error al generar el certificado.");
    }
};

export const getRegistrosByUser = async (req: Request, res: Response) => {
    const { id_colegiado } = req.params;
    if (isNaN(Number(id_colegiado))) {
        return res.status(400).json({ error: "ID de colegiado inválido" });
    }

    try {
        const registros = await prismaClient.colegiados_registrados_actividad_institucional.findMany({
            where: { id_colegiado: Number(id_colegiado) },
            include: {
                actividades_institucionales: true
            },
            orderBy: {
                actividades_institucionales: {
                    fecha_programada: 'desc'
                }
            }
        });

        res.status(200).json(registros);
    } catch (error) {
        console.error("Error en getRegistrosByUser:", error);
        res.status(500).json({ error: "Error interno del servidor al obtener registros institucionales" });
    }
};