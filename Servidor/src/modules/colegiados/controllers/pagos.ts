import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { registrarMovimientoPagoColegiatura, registrarAnulacionPago } from "../../financiero/services/movimiento";
import { Origen } from "../../../types/movimientos";
import { Modulos } from "../../../types/auditoria";
import { describir } from "../../../utils/auditoria";
import { subirArchivo, buildPublicUrl, eliminarArchivo } from "../../../utils/uploadS3";
import { crearPagoSchema } from "../schemas/pagos";
import { emitirNotificacion } from "../../notificaciones/services";
import { sumarAnios } from "../../../utils/fechas";

const ESTADOS_PAGO_VALIDOS = ["REALIZADO", "ANULADO"] as const;
type EstadoPago = typeof ESTADOS_PAGO_VALIDOS[number];

export const obtenerUrlComprobante = async (req: Request, res: Response) => {
    try {
        const id = +req.params.id;

        const pago = await prismaClient.pagos_colegiados.findUnique({
            where: { id_pago: id }
        });

        if (!pago || !pago.comprobante) return res.status(404).json({ error: "Comprobante no encontrado" });

        const url = buildPublicUrl(pago.comprobante);
        res.json({ url });
    } catch (error) {
        console.error("Error generando URL:", error);
        res.status(500).json({ error: "Error al generar el acceso al archivo" });
    }
};

export const getPagos = async (req: Request, res: Response) => {
    const id = req.params.id
    const data = await prismaClient.pagos_colegiados.findMany({
        where: {
            id_colegiado: +id
        }
    })
    res.status(200).json(data)
}

export const createPago = async (req: Request, res: Response) => {
    const id = req.params.id

    // Validación explícita: la petición es multipart, así que no pasa por
    // `validateBody`. Sin esto se aceptaban montos negativos o cero, que
    // entraban en tesorería como un INGRESO que restaba del presupuesto.
    const parsed = crearPagoSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({
            error: 'Datos del pago inválidos',
            detalles: parsed.error.issues.map(i => ({ campo: i.path.join('.'), mensaje: i.message }))
        })
    }
    const { concepto, fecha_pago, monto, metodo_pago, gestiones } = parsed.data

    const col = await prismaClient.colegiados.findFirstOrThrow({
        where: { id_colegiado: +id },
        select: { nombre: true, apellido: true, fecha_renovacion: true }
    });

    let rutaComprobante = null;
    if (req.file) {
        // Encontrar carpeta del colegiado si existe en documentos o pagos
        let folderUser = '';

        const existingDoc = await prismaClient.documentos_colegiados.findFirst({
            where: { id_colegiado: +id }
        });
        if (existingDoc && existingDoc.archivo?.includes('/')) {
            folderUser = existingDoc.archivo.split('/')[1];
        }

        if (!folderUser) {
            const existingPago = await prismaClient.pagos_colegiados.findFirst({
                where: { id_colegiado: +id, comprobante: { not: null } }
            });
            if (existingPago && existingPago.comprobante?.includes('/')) {
                folderUser = existingPago.comprobante.split('/')[1];
            }
        }

        if (!folderUser) {
            const iniciales = `${col.nombre?.charAt(0).toUpperCase() ?? ''}${col.apellido?.charAt(0).toUpperCase() ?? ''}`;
            const hash = Math.random().toString(36).substring(2, 6);
            folderUser = `${iniciales}-${hash}`;
        }
        
        rutaComprobante = await subirArchivo(req.file, `comprobantes/${folderUser}`);
    }

    try {
        const configPresupuesto = await prismaClient.config_pago.findUnique({
            where: { clave: 'PRESUPUESTO_ACTIVO' }
        });
        const activePresupuestoId = configPresupuesto ? Number(configPresupuesto.valor) : 1;

        const response = await prismaClient.$transaction(async (tx) => {
            const pago = await tx.pagos_colegiados.create({
                data: {
                    id_colegiado: +id,
                    concepto,
                    fecha_pago,
                    monto,
                    metodo_pago,
                    gestiones,
                    comprobante: rutaComprobante
                }
            });

            await registrarMovimientoPagoColegiatura(
                pago.id_pago,
                monto,
                Origen.COLEGIATURA,
                `Pago de colegiatura de ${col.nombre} ${col.apellido}`,
                activePresupuestoId,
                req.user!.id_usuario,
                metodo_pago ?? undefined,
                rutaComprobante ?? undefined,
                tx
            );

            // Extiende la renovación desde la fecha vigente si aún no venció (no se
            // pierden gestiones pagadas de más), o desde la fecha del pago si ya
            // estaba vencida o nunca se fijó.
            const base = col.fecha_renovacion && col.fecha_renovacion > fecha_pago
                ? col.fecha_renovacion
                : fecha_pago;
            await tx.colegiados.update({
                where: { id_colegiado: +id },
                data: { fecha_renovacion: sumarAnios(base, gestiones) }
            });

            return pago;
        });

        describir(res, `Se registró el pago de ${monto}Bs. de el colegiado ${col.nombre} ${col.apellido}`)
        await emitirNotificacion({
            modulo: Modulos.FINANCIERO,
            tipo: 'exito',
            titulo: 'Pago de colegiado registrado',
            descripcion: `${col.nombre} ${col.apellido} · Bs. ${monto}`,
            enlace: `/dashboard/colegiados/pagos/${id}`,
            idUsuario: req.user!.id_usuario,
        })
        res.status(200).json(response)
    } catch (error) {
        if (rutaComprobante) {
            await eliminarArchivo(rutaComprobante).catch(e => console.error("Error eliminando archivo huérfano de S3:", e));
        }
        console.error("Error en la transacción de creación de pago:", error);
        res.status(500).json({ error: "Error al registrar el pago y sus movimientos financieros" });
    }

}
export const updatePago = async (req: Request, res: Response) => {
    const id = req.params.id;
    const { estado_pago } = req.body;

    // Solo se permite cambiar el estado (no el monto ni concepto de un pago ya registrado)
    if (!ESTADOS_PAGO_VALIDOS.includes(estado_pago as EstadoPago)) {
        return res.status(400).json({
            error: `Estado inválido. Solo se permite: ${ESTADOS_PAGO_VALIDOS.join(", ")}`
        });
    }

    try {
        // Obtener el pago actual para verificar estado y obtener datos
        const pagoActual = await prismaClient.pagos_colegiados.findUniqueOrThrow({
            where: { id_pago: +id },
            include: { colegiados: { select: { nombre: true, apellido: true } } }
        });

        if (pagoActual.estado_pago === "ANULADO") {
            return res.status(409).json({ error: "Este pago ya fue anulado y no puede modificarse" });
        }

        const updatedPago = await prismaClient.$transaction(async (tx) => {
            let updateData: any = { estado_pago };

            // Si se anula, propagar la anulación a tesorería
            if (estado_pago === "ANULADO") {
                await registrarAnulacionPago(+id, tx);
                if (pagoActual.comprobante) updateData.comprobante = null;
            }

            const pagoUpdate = await tx.pagos_colegiados.update({
                where: { id_pago: +id },
                data: updateData,
            });

            return pagoUpdate;
        });

        // El archivo se borra ya confirmada la transacción: dentro de ella, un
        // fallo posterior revertiría la BD pero el comprobante ya estaría perdido.
        if (estado_pago === "ANULADO" && pagoActual.comprobante) {
            await eliminarArchivo(pagoActual.comprobante).catch(e => console.error("Error eliminando comprobante de S3:", e));
        }

        if (estado_pago === "ANULADO") {
            const nombre = `${pagoActual.colegiados?.nombre || ''} ${pagoActual.colegiados?.apellido || ''}`.trim();
            describir(res, `Anuló el pago de ${nombre} por monto de ${pagoActual.monto}Bs — se generó reversión en tesorería`);
        }

        res.status(200).json(updatedPago);
    } catch (error) {
        console.error("Error al actualizar pago:", error);
        res.status(500).json({ error: "Error al actualizar pago" });
    }
}
export const getPagoById = async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
        const pago = await prismaClient.pagos_colegiados.findUnique({
            where: { id_pago: +id }
        });

        if (!pago) {
            return res.status(404).json({ error: "Pago no encontrado" });
        }

        res.status(200).json(pago);
    } catch (error) {
        console.error("Error al obtener pago:", error);
        res.status(500).json({ error: "Error al obtener pago" });
    }
}