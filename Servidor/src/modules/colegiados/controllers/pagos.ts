import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { registrarMovimientoPagoColegiatura, registrarAnulacionPago } from "../../financiero/services/movimiento";
import { Origen } from "../../../types/movimientos";
import registrarAuditoria from "../../Auditorias/services";
import { Acciones, Modulos } from "../../../types/auditoria";
import { subirArchivo } from "../../../utils/uploadS3";

const ESTADOS_PAGO_VALIDOS = ["REALIZADO", "ANULADO"] as const;
type EstadoPago = typeof ESTADOS_PAGO_VALIDOS[number];

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
    const {
        concepto,
        fecha_pago,
        monto,

    } = req.body

    const col = await prismaClient.colegiados.findFirstOrThrow({
        where: { id_colegiado: +id },
        select: { nombre: true, apellido: true }
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

    const response = await prismaClient.pagos_colegiados.create({
        data: {
            id_colegiado: +id,
            concepto,
            fecha_pago: new Date(fecha_pago),
            monto,
            comprobante: rutaComprobante
        }
    });

    await registrarMovimientoPagoColegiatura(response.id_pago, monto, Origen.COLEGIATURA, `Pago de colegiatura de ${col.nombre} ${col.apellido}`, 1)
    await registrarAuditoria(req.user, Acciones.REGISTRO, Modulos.FINANCIERO, `Se registro el pago con monto de: ${monto}bs de el colegiado ${col.nombre} ${col.apellido}`)
    res.status(200).json(response)

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

        const updatedPago = await prismaClient.pagos_colegiados.update({
            where: { id_pago: +id },
            data: { estado_pago },
        });

        // Si se anula, registrar EGRESO de reversión en tesorería
        if (estado_pago === "ANULADO") {
            await registrarAnulacionPago(+id, Number(pagoActual.monto));
            const nombre = `${pagoActual.colegiados?.nombre || ''} ${pagoActual.colegiados?.apellido || ''}`.trim();
            await registrarAuditoria(
                req.user,
                Acciones.MODIFICO,
                Modulos.FINANCIERO,
                `Se anuló el pago de ${nombre} por monto de ${pagoActual.monto}Bs — se generó reversión en tesorería`
            );
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