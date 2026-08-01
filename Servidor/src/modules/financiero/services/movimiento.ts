import { Origen } from "../../../types/movimientos";
import prismaClient from "../../../utils/prismaClient";

//CREAR
export const registrarMovimientoPagoColegiatura = async (id: number, monto: number, Origen: Origen, descripcion: string, presupuesto: number, id_usuario?: number, metodo_pago?: string, comprobante?: string, txClient: any = prismaClient) => {
    const origen = await txClient.origen_movimiento.create({
        data: {
            id_pago_colegiado: id,
            monto,
            tipo_origen: Origen,
        },
    });

    await txClient.movimientos_financieros.create({
        data: {
            id_presupuesto: presupuesto,
            id_usuario: id_usuario ? Number(id_usuario) : undefined,
            tipo_movimiento: 'INGRESO',
            categoria: 'Colegiatura',
            descripcion,
            monto,
            metodo_pago,
            comprobante,
            tipo_origen_label: 'COLEGIATURA',
            id_origen: origen.id_origen,
        },
    });
}

export const registrarMovimientoPagoInvitado = async (id: number, monto: number, Origen: Origen, descripcion: string, presupuesto: number, id_usuario?: number, metodo_pago?: string, comprobante?: string, txClient: any = prismaClient) => {
    const origen = await txClient.origen_movimiento.create({
        data: {
            id_pago_invitado: id,
            monto,
            tipo_origen: Origen,
        },
    });

    await txClient.movimientos_financieros.create({
        data: {
            id_presupuesto: presupuesto,
            id_usuario: id_usuario ? Number(id_usuario) : undefined,
            tipo_movimiento: 'INGRESO',
            categoria: 'Pago Invitado',
            descripcion,
            monto,
            metodo_pago,
            comprobante,
            tipo_origen_label: 'INVITADO',
            id_origen: origen.id_origen,
        },
    });
}

export const registrarMovimientoPagoCurso = async (id: number, monto: number, Origen: Origen, descripcion: string, presupuesto: number, id_usuario?: number, metodo_pago?: string, comprobante?: string, txClient: any = prismaClient, id_pago_colegiado?: number, id_pago_invitado?: number) => {
    const origen = await txClient.origen_movimiento.create({
        data: {
            id_registro_actividad_institucional: id,
            id_pago_colegiado,
            id_pago_invitado,
            monto,
            tipo_origen: Origen,
        },
    });

    const desc_final = (metodo_pago && metodo_pago.toUpperCase() === 'EFECTIVO') 
        ? `${descripcion} (Método: Efectivo)` 
        : descripcion;

    await txClient.movimientos_financieros.create({
        data: {
            id_presupuesto: presupuesto,
            id_usuario: id_usuario ? Number(id_usuario) : undefined,
            tipo_movimiento: 'INGRESO',
            categoria: 'Curso',
            descripcion: desc_final,
            monto,
            metodo_pago,
            comprobante,
            tipo_origen_label: 'ACTIVIDAD_INSTITUCIONAL',
            id_origen: origen.id_origen,
        },
    });
}



/**
 * Propaga la ANULACIÓN de un pago a tesorería.
 *
 * No borra nada ni genera un contra-asiento: marca el INGRESO original como
 * ANULADO y le quita el comprobante. Los informes y el saldo del presupuesto
 * solo suman movimientos en estado COMPLETADO, así que el importe deja de
 * contar mientras el registro permanece para trazabilidad.
 *
 * Si el pago venía de una inscripción a una actividad institucional, también
 * anula esa inscripción.
 */
export const registrarAnulacionPago = async (id_pago: number, txClient: any = prismaClient, tipo: 'colegiado' | 'invitado' = 'colegiado') => {
    // Buscar el origen del movimiento original
    const origen = await txClient.origen_movimiento.findFirst({
        where: tipo === 'colegiado' ? { id_pago_colegiado: id_pago } : { id_pago_invitado: id_pago },
        orderBy: { id_origen: 'desc' }
    })

    if (!origen) return;

    // Buscar el movimiento de INGRESO original
    const movIngreso = await txClient.movimientos_financieros.findFirst({
        where: { id_origen: origen.id_origen }
    })

    if (!movIngreso) return;

    await txClient.movimientos_financieros.update({
        where: { id_movimiento: movIngreso.id_movimiento },
        data: {
            estado: 'ANULADO',
            comprobante: null
        }
    });

    // Si el pago proviene de una inscripción a una actividad institucional, anularla también
    if (origen.id_registro_actividad_institucional) {
        await txClient.colegiados_registrados_actividad_institucional.update({
            where: { id_registro: origen.id_registro_actividad_institucional },
            data: { estado_registro: 'ANULADO' }
        });
    }
}