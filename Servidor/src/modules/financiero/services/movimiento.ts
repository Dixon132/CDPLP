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



//UPDATE
export const updateMovimientoPagoColegiatura = async (id: number, monto: number) => {
    try {
        await prismaClient.$transaction(async (tx) => {
            const origen = await tx.origen_movimiento.findFirstOrThrow({
                where: {
                    id_pago_colegiado: id
                }
            })
            const mov = await tx.movimientos_financieros.findFirstOrThrow({
                where: {
                    id_origen: origen.id_origen
                }
            })
            await tx.origen_movimiento.update({
                where: {
                    id_origen: origen.id_origen
                },
                data: {
                    monto
                }
            })
            await tx.movimientos_financieros.update({
                where: {
                    id_movimiento: mov.id_movimiento
                },
                data: {
                    monto
                }
            })

        })
    } catch {
        console.log('error al actualizar el pago del colegiado')
    }
}

//DELETE
export const deleteMovimientoPagoColegiatura = async (id: number) => {
    try {
        await prismaClient.$transaction(async (tx) => {
            const origen = await tx.origen_movimiento.findFirstOrThrow({
                where: {
                    id_pago_colegiado: id
                }
            })
            const mov = await tx.movimientos_financieros.findFirstOrThrow({
                where: {
                    id_origen: origen.id_origen
                }
            })
            await tx.movimientos_financieros.delete({
                where: {
                    id_movimiento: mov.id_movimiento
                }
            })
            await tx.origen_movimiento.delete({
                where: {
                    id_origen: origen.id_origen
                }
            })
        })
    } catch {
        console.log('error al eliminar el pago del colegiado')
    }
}
export const deleteMovimientoPagoCurso = async (id: number) => {
    try {
        await prismaClient.$transaction(async (tx) => {
            const origen = await tx.origen_movimiento.findFirstOrThrow({
                where: {
                    id_registro_actividad_institucional: id
                }
            })
            const mov = await tx.movimientos_financieros.findFirstOrThrow({
                where: {
                    id_origen: origen.id_origen
                }
            })
            await tx.movimientos_financieros.delete({
                where: {
                    id_movimiento: mov.id_movimiento
                }
            })
            await tx.origen_movimiento.delete({
                where: {
                    id_origen: origen.id_origen
                }
            })
        })
    } catch {
        console.log('error al eliminar el pago del curso')
    }
}

/**
 * Registra un EGRESO de reversión cuando un pago es ANULADO.
 * El INGRESO original NO se borra — queda como trazabilidad de que el dinero entró y luego se revirtió.
 */
export const registrarAnulacionPago = async (id_pago: number, monto: number, id_usuario?: number, txClient: any = prismaClient, tipo: 'colegiado' | 'invitado' = 'colegiado') => {
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

    // En lugar de crear un EGRESO, actualizamos el estado a ANULADO
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