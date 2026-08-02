import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { Modulos } from "../../../types/auditoria";
import { modulosDelUsuario } from "../services";
import { obtenerResumenVencimientos } from "../../vencimientos/services";

/**
 * Resumen del panel de inicio.
 *
 * Cada métrica se acompaña de su variación respecto al período anterior
 * completo (mes contra mes anterior, por defecto), que es lo que alimenta las
 * flechas de subida/bajada.
 */

type Periodo = 'mes' | 'trimestre' | 'anio';

/** Inicio del período actual y del anterior, y fin del anterior. */
const calcularRangos = (periodo: Periodo) => {
    const hoy = new Date();
    let inicioActual: Date;
    let inicioAnterior: Date;

    if (periodo === 'anio') {
        inicioActual = new Date(hoy.getFullYear(), 0, 1);
        inicioAnterior = new Date(hoy.getFullYear() - 1, 0, 1);
    } else if (periodo === 'trimestre') {
        const t = Math.floor(hoy.getMonth() / 3);
        inicioActual = new Date(hoy.getFullYear(), t * 3, 1);
        inicioAnterior = new Date(hoy.getFullYear(), t * 3 - 3, 1);
    } else {
        // Por defecto: el corte es el día 1 de cada mes.
        inicioActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        inicioAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    }

    return { inicioActual, inicioAnterior, finAnterior: inicioActual, ahora: hoy };
};

/**
 * Variación porcentual. Devuelve `null` cuando el período anterior fue 0: un
 * "+100%" sobre una base de cero engaña más que informar.
 */
const variacion = (actual: number, anterior: number): number | null => {
    if (anterior === 0) return actual === 0 ? 0 : null;
    return Number((((actual - anterior) / anterior) * 100).toFixed(1));
};

const metrica = (etiqueta: string, valor: number, actual: number, anterior: number, extra: Record<string, unknown> = {}) => ({
    etiqueta,
    valor,
    periodoActual: actual,
    periodoAnterior: anterior,
    variacion: variacion(actual, anterior),
    ...extra,
});

export const getResumenDashboard = async (req: Request, res: Response) => {
    const idUsuario = req.user!.id_usuario;
    const periodo = (['mes', 'trimestre', 'anio'].includes(String(req.query.periodo))
        ? req.query.periodo
        : 'mes') as Periodo;

    const { inicioActual, inicioAnterior, finAnterior } = calcularRangos(periodo);

    const modulos = await modulosDelUsuario(idUsuario);
    const puede = (m: string) => modulos.includes(m);

    const metricas: any[] = [];

    // ── Colegiados ────────────────────────────────────────────────────────
    if (puede(Modulos.COLEGIADOS)) {
        const [activos, nuevosActual, nuevosAnterior, pasantesActivos, invitados] = await Promise.all([
            prismaClient.colegiados.count({ where: { estado: 'ACTIVO' } }),
            prismaClient.colegiados.count({ where: { fecha_inscripcion: { gte: inicioActual } } }),
            prismaClient.colegiados.count({
                where: { fecha_inscripcion: { gte: inicioAnterior, lt: finAnterior } },
            }),
            prismaClient.pasantes.count({ where: { estado: 'ACTIVO' } }),
            prismaClient.invitados.count({ where: { estado: 'ACTIVO' } }),
        ]);
        metricas.push(
            metrica('Colegiados activos', activos, nuevosActual, nuevosAnterior, {
                clave: 'colegiados', icono: 'UsersRound', color: 'indigo',
                enlace: '/dashboard/colegiados',
                pie: `${nuevosActual} nuevo(s) en el período`,
            }),
            metrica('Pasantes activos', pasantesActivos, pasantesActivos, pasantesActivos, {
                clave: 'pasantes', icono: 'Briefcase', color: 'blue',
                enlace: '/dashboard/pasantes', sinTendencia: true,
                pie: `${invitados} invitado(s) registrados`,
            }),
        );

        // Vencimientos: colegiaturas y documentos vencidos o por vencer en 30
        // días, calculados por el motor central de vencimientos (que también
        // alimenta la vista dedicada `/dashboard/vencimientos`).
        const sinFecha = await prismaClient.colegiados.count({
            where: { estado: 'ACTIVO', fecha_renovacion: null },
        });
        const resumenVenc = await obtenerResumenVencimientos();
        metricas.push(
            metrica('Vencimientos próximos (30 días)', resumenVenc.proximos30, resumenVenc.proximos30, resumenVenc.proximos30, {
                clave: 'vencimientos', icono: 'AlertTriangle', color: 'rose',
                enlace: '/dashboard/vencimientos', sinTendencia: true, menosEsMejor: true,
                pie: sinFecha > 0
                    ? `${resumenVenc.vencidos} ya vencido(s) · ${sinFecha} colegiado(s) sin fecha registrada`
                    : `${resumenVenc.vencidos} ya vencido(s)`,
            }),
        );
    }

    // ── Finanzas ──────────────────────────────────────────────────────────
    if (puede(Modulos.FINANCIERO)) {
        const sumar = async (desde: Date, hasta?: Date) => {
            const r = await prismaClient.movimientos_financieros.aggregate({
                where: {
                    estado: 'COMPLETADO',
                    tipo_movimiento: 'INGRESO',
                    fecha_movimiento: hasta ? { gte: desde, lt: hasta } : { gte: desde },
                },
                _sum: { monto: true },
            });
            return Number(r._sum.monto ?? 0);
        };
        const sumarEgresos = async (desde: Date, hasta?: Date) => {
            const r = await prismaClient.movimientos_financieros.aggregate({
                where: {
                    estado: 'COMPLETADO',
                    tipo_movimiento: 'EGRESO',
                    fecha_movimiento: hasta ? { gte: desde, lt: hasta } : { gte: desde },
                },
                _sum: { monto: true },
            });
            return Number(r._sum.monto ?? 0);
        };

        const [ingActual, ingAnterior, egActual, egAnterior] = await Promise.all([
            sumar(inicioActual),
            sumar(inicioAnterior, finAnterior),
            sumarEgresos(inicioActual),
            sumarEgresos(inicioAnterior, finAnterior),
        ]);

        metricas.push(
            metrica('Ingresos del período', ingActual, ingActual, ingAnterior, {
                clave: 'ingresos', icono: 'TrendingUp', color: 'emerald',
                enlace: '/dashboard/tesoreria', moneda: true,
            }),
            metrica('Egresos del período', egActual, egActual, egAnterior, {
                clave: 'egresos', icono: 'TrendingDown', color: 'rose',
                enlace: '/dashboard/tesoreria', moneda: true, menosEsMejor: true,
            }),
        );
    }

    // ── Actividades ───────────────────────────────────────────────────────
    if (puede(Modulos.ACT_INSTITUCIONALES)) {
        const [inscActual, inscAnterior, actividades] = await Promise.all([
            prismaClient.colegiados_registrados_actividad_institucional.count({
                where: { createdAt: { gte: inicioActual }, NOT: { estado_registro: 'ANULADO' } },
            }),
            prismaClient.colegiados_registrados_actividad_institucional.count({
                where: { createdAt: { gte: inicioAnterior, lt: finAnterior }, NOT: { estado_registro: 'ANULADO' } },
            }),
            prismaClient.actividades_institucionales.count({ where: { estado: 'ACTIVO' } }),
        ]);
        metricas.push(
            metrica('Inscripciones a cursos', inscActual, inscActual, inscAnterior, {
                clave: 'inscripciones', icono: 'BookMarked', color: 'amber',
                enlace: '/dashboard/actividades_institucionales',
                pie: `${actividades} actividad(es) activas`,
            }),
        );
    }

    if (puede(Modulos.ACT_SOCIALES)) {
        const [socActivas, asignaciones] = await Promise.all([
            prismaClient.actividades_sociales.count({ where: { estado: 'ACTIVO' } }),
            prismaClient.colegiados_asignados_social.count({ where: { estado: 'ACTIVO' } }),
        ]);
        metricas.push(
            metrica('Actividades sociales', socActivas, socActivas, socActivas, {
                clave: 'sociales', icono: 'HeartHandshake', color: 'purple',
                enlace: '/dashboard/actividades_sociales', sinTendencia: true,
                pie: `${asignaciones} participante(s) asignados`,
            }),
        );
    }

    // ── Correspondencia ───────────────────────────────────────────────────
    if (puede(Modulos.CORRESPONDENCIA)) {
        const pendientes = await prismaClient.correspondencia.count({
            where: { estado: { notIn: ['ARCHIVADO', 'ATENDIDO'] } },
        });
        metricas.push(
            metrica('Correspondencia pendiente', pendientes, pendientes, pendientes, {
                clave: 'correspondencia', icono: 'FolderDot', color: 'blue',
                enlace: '/dashboard/correspondencia', sinTendencia: true,
                menosEsMejor: true,
            }),
        );
    }

    // ── Postulaciones ─────────────────────────────────────────────────────
    if (puede(Modulos.COLEGIADOS)) {
        // El estado inicial real es 'EN_REVISION' (default del modelo), no
        // 'PENDIENTE' — con el valor viejo esta métrica nunca contaba nada.
        const [pendientes, recibidasActual, recibidasAnterior] = await Promise.all([
            prismaClient.postulaciones.count({ where: { estado: 'EN_REVISION' } }),
            prismaClient.postulaciones.count({ where: { createdAt: { gte: inicioActual } } }),
            prismaClient.postulaciones.count({
                where: { createdAt: { gte: inicioAnterior, lt: finAnterior } },
            }),
        ]);
        metricas.push(
            metrica('Postulaciones pendientes', pendientes, recibidasActual, recibidasAnterior, {
                clave: 'postulaciones', icono: 'ClipboardList', color: 'teal',
                enlace: '/dashboard/postulaciones',
                pie: `${recibidasActual} recibida(s) en el período`,
            }),
        );
    }

    // ── Serie mensual de ingresos vs egresos (últimos 6 meses) ────────────
    let serie: { mes: string; ingresos: number; egresos: number }[] = [];
    if (puede(Modulos.FINANCIERO)) {
        const hace6 = new Date();
        hace6.setMonth(hace6.getMonth() - 5, 1);
        hace6.setHours(0, 0, 0, 0);

        const movs = await prismaClient.movimientos_financieros.findMany({
            where: { estado: 'COMPLETADO', fecha_movimiento: { gte: hace6 } },
            select: { fecha_movimiento: true, monto: true, tipo_movimiento: true },
        });

        const mapa = new Map<string, { ingresos: number; egresos: number }>();
        for (let i = 0; i < 6; i++) {
            const d = new Date(hace6.getFullYear(), hace6.getMonth() + i, 1);
            mapa.set(d.toISOString().slice(0, 7), { ingresos: 0, egresos: 0 });
        }
        movs.forEach((m) => {
            if (!m.fecha_movimiento) return;
            const clave = m.fecha_movimiento.toISOString().slice(0, 7);
            const entrada = mapa.get(clave);
            if (!entrada) return;
            const v = Number(m.monto ?? 0);
            if (m.tipo_movimiento === 'INGRESO') entrada.ingresos += v;
            else if (m.tipo_movimiento === 'EGRESO') entrada.egresos += v;
        });
        serie = Array.from(mapa.entries()).map(([mes, v]) => ({ mes, ...v }));
    }

    // ── Actividad reciente (auditoría de los módulos permitidos) ──────────
    const actividadReciente = await prismaClient.auditoria.findMany({
        where: modulos.length > 0 ? { modulo: { in: modulos } } : { id_auditoria: -1 },
        orderBy: { fecha: 'desc' },
        take: 8,
        include: { usuario: { select: { nombre: true, apellido: true } } },
    });

    res.status(200).json({
        periodo,
        desde: inicioActual,
        metricas,
        serie,
        actividadReciente: actividadReciente.map((a) => ({
            id: a.id_auditoria,
            accion: a.accion,
            modulo: a.modulo,
            descripcion: a.descripcion,
            fecha: a.fecha,
            autor: `${a.usuario?.nombre ?? ''} ${a.usuario?.apellido ?? ''}`.trim() || 'Sistema',
        })),
    });
};
