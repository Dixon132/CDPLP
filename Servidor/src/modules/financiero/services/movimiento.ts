import { Origen } from "../../../types/movimientos";
import prismaClient from "../../../utils/prismaClient";

//CREAR
export const registrarMovimientoPagoColegiatura = async (id: number, monto: number, Origen: Origen, descripcion: string, presupuesto: number) => {
    try {
        await prismaClient.$transaction(async (tx) => {
            const origen = await tx.origen_movimiento.create({
                data: {
                    id_pago_colegiado: id,
                    monto,
                    tipo_origen: Origen,
                },
            });

            await tx.movimientos_financieros.create({
                data: {
                    id_presupuesto: presupuesto,
                    tipo_movimiento: 'INGRESO',
                    categoria: 'Colegiatura',
                    descripcion,
                    monto,
                    id_origen: origen.id_origen,
                },
            });
        });
    } catch {
        console.log('error al registrar pago de la colegiatura')
    }
}

export const registrarMovimientoPagoCurso = async (id: number, monto: number, Origen: Origen, descripcion: string, presupuesto: number) => {
    try {
        await prismaClient.$transaction(async (tx) => {
            const origen = await tx.origen_movimiento.create({
                data: {
                    id_registro_actividad_institucional: id,
                    monto,
                    tipo_origen: Origen,
                },
            });

            await tx.movimientos_financieros.create({
                data: {
                    id_presupuesto: presupuesto,
                    tipo_movimiento: 'INGRESO',
                    categoria: 'Curso',
                    descripcion,
                    monto,
                    id_origen: origen.id_origen,
                },
            });
        });
    } catch {
        console.log('error al registrar pago del curso')
    }
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
export const registrarAnulacionPago = async (id_pago: number, monto: number) => {
    try {
        await prismaClient.$transaction(async (tx) => {
            // Buscar el origen del movimiento original
            const origen = await tx.origen_movimiento.findFirstOrThrow({
                where: { id_pago_colegiado: id_pago }
            })

            // Buscar el movimiento de INGRESO original para saber a qué presupuesto pertenece
            const movIngreso = await tx.movimientos_financieros.findFirstOrThrow({
                where: { id_origen: origen.id_origen }
            })

            // Crear nuevo registro de EGRESO (reversión) vinculado al mismo origen
            await tx.movimientos_financieros.create({
                data: {
                    id_presupuesto: movIngreso.id_presupuesto,
                    tipo_movimiento: 'EGRESO',
                    categoria: 'Anulación de Colegiatura',
                    descripcion: `Reversión por anulación de pago (ID: ${id_pago})`,
                    monto,
                    id_origen: origen.id_origen,
                },
            })
        })
    } catch (e) {
        console.log('error al registrar la anulación del pago:', e)
    }
}