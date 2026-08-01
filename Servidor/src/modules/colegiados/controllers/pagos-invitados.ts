import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { registrarMovimientoPagoInvitado, registrarAnulacionPago } from "../../financiero/services/movimiento";
import { Origen } from "../../../types/movimientos";
import { Modulos } from "../../../types/auditoria";
import { describir } from "../../../utils/auditoria";
import { subirArchivo, buildPublicUrl, eliminarArchivo } from "../../../utils/uploadS3";
import { crearPagoSchema } from "../schemas/pagos";
import { emitirNotificacion } from "../../notificaciones/services";

const ESTADOS_PAGO_VALIDOS = ["REALIZADO", "ANULADO"] as const;
type EstadoPago = typeof ESTADOS_PAGO_VALIDOS[number];

export const obtenerUrlComprobante = async (req: Request, res: Response) => {
    try {
        const id = +req.params.id;

        const pago = await prismaClient.pagos_invitados.findUnique({
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
    const data = await prismaClient.pagos_invitados.findMany({
        where: {
            id_invitado: +id
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
    const { concepto, fecha_pago, monto, metodo_pago } = parsed.data

    const col = await prismaClient.invitados.findFirstOrThrow({
        where: { id_invitado: +id },
        select: { nombre: true, apellido: true }
    });

    let rutaComprobante = null;
    if (req.file) {
        // Encontrar carpeta del invitado si existe en documentos o pagos
        let folderUser = '';

        if (!folderUser) {
            const existingPago = await prismaClient.pagos_invitados.findFirst({
                where: { id_invitado: +id, comprobante: { not: null } }
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
            const pago = await tx.pagos_invitados.create({
                data: {
                    id_invitado: +id,
                    concepto,
                    fecha_pago,
                    monto,
                    metodo_pago,
                    comprobante: rutaComprobante
                }
            });

            await registrarMovimientoPagoInvitado(
                pago.id_pago, 
                monto, 
                Origen.Invitado, 
                `Pago de Invitado de ${col.nombre} ${col.apellido}`, 
                activePresupuestoId, 
                req.user!.id_usuario, 
                metodo_pago ?? undefined, 
                rutaComprobante ?? undefined, 
                tx
            );
            
            return pago;
        });

        describir(res, `Se registró el pago de ${monto}Bs. de el invitado ${col.nombre} ${col.apellido}`)
        await emitirNotificacion({
            modulo: Modulos.FINANCIERO,
            tipo: 'exito',
            titulo: 'Pago de invitado registrado',
            descripcion: `${col.nombre} ${col.apellido} · Bs. ${monto}`,
            enlace: `/dashboard/invitados/pagos/${id}`,
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
        const pagoActual = await prismaClient.pagos_invitados.findUniqueOrThrow({
            where: { id_pago: +id },
            include: { invitados: { select: { nombre: true, apellido: true } } }
        });

        if (pagoActual.estado_pago === "ANULADO") {
            return res.status(409).json({ error: "Este pago ya fue anulado y no puede modificarse" });
        }

        const updatedPago = await prismaClient.$transaction(async (tx) => {
            let updateData: any = { estado_pago };

            // Si se anula, propagar la anulación a tesorería
            if (estado_pago === "ANULADO") {
                await registrarAnulacionPago(+id, tx, 'invitado');
                if (pagoActual.comprobante) updateData.comprobante = null;
            }

            const pagoUpdate = await tx.pagos_invitados.update({
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
            const nombre = `${pagoActual.invitados?.nombre || ''} ${pagoActual.invitados?.apellido || ''}`.trim();
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
        const pago = await prismaClient.pagos_invitados.findUnique({
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
