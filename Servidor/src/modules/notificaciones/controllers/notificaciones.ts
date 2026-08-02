import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { modulosDelUsuario } from "../services";

/**
 * GET /api/notificaciones
 * query: ?limit=20&soloNoLeidas=true
 *
 * Devuelve las notificaciones de los módulos a los que el rol tiene acceso,
 * marcando cuáles ha leído ESTE usuario.
 */
export const listarNotificaciones = async (req: Request, res: Response) => {
    const idUsuario = req.user!.id_usuario;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const soloNoLeidas = req.query.soloNoLeidas === 'true';

    const modulos = await modulosDelUsuario(idUsuario);
    if (modulos.length === 0) {
        return res.status(200).json({ data: [], noLeidas: 0 });
    }

    const where = {
        modulo: { in: modulos },
        // No tiene sentido avisar a alguien de lo que acaba de hacer.
        //
        // Ojo con `NOT: { id_usuario: X }`: en SQL descartaría también las filas
        // con id_usuario NULL (las que emite el sistema sin autor), porque
        // `NULL = X` no es ni verdadero ni falso. Por eso los dos casos van
        // enumerados.
        OR: [{ id_usuario: null }, { id_usuario: { not: idUsuario } }],
        ...(soloNoLeidas ? { lecturas: { none: { id_usuario: idUsuario } } } : {}),
    };

    const [filas, noLeidas] = await Promise.all([
        prismaClient.notificaciones.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                // Solo la lectura de ESTE usuario: la de los demás no importa.
                lecturas: { where: { id_usuario: idUsuario }, select: { leida_en: true } },
                usuario: { select: { nombre: true, apellido: true } },
            },
        }),
        prismaClient.notificaciones.count({
            where: {
                modulo: { in: modulos },
                OR: [{ id_usuario: null }, { id_usuario: { not: idUsuario } }],
                lecturas: { none: { id_usuario: idUsuario } },
            },
        }),
    ]);

    res.status(200).json({
        data: filas.map((n) => ({
            id_notificacion: n.id_notificacion,
            modulo: n.modulo,
            tipo: n.tipo,
            titulo: n.titulo,
            descripcion: n.descripcion,
            enlace: n.enlace,
            createdAt: n.createdAt,
            autor: n.usuario ? `${n.usuario.nombre ?? ''} ${n.usuario.apellido ?? ''}`.trim() : null,
            leida: n.lecturas.length > 0,
        })),
        noLeidas,
    });
};

/**
 * POST /api/notificaciones/:id/leer
 * Marca una notificación como leída para el usuario actual, sin afectar a nadie más.
 */
export const marcarLeida = async (req: Request, res: Response) => {
    const idUsuario = req.user!.id_usuario;
    const idNotificacion = Number(req.params.id);

    const existe = await prismaClient.notificaciones.findUnique({
        where: { id_notificacion: idNotificacion },
        select: { modulo: true },
    });
    if (!existe) return res.status(404).json({ error: 'Notificación no encontrada' });

    const modulos = await modulosDelUsuario(idUsuario);
    if (!modulos.includes(existe.modulo)) {
        return res.status(403).json({ error: 'Sin acceso a esta notificación' });
    }

    // `upsert` para que pulsar dos veces no falle por clave duplicada.
    await prismaClient.notificaciones_leidas.upsert({
        where: { id_notificacion_id_usuario: { id_notificacion: idNotificacion, id_usuario: idUsuario } },
        update: {},
        create: { id_notificacion: idNotificacion, id_usuario: idUsuario },
    });

    res.status(200).json({ ok: true });
};

/**
 * POST /api/notificaciones/leer-todas
 * Marca como leídas todas las visibles para este usuario.
 */
export const marcarTodasLeidas = async (req: Request, res: Response) => {
    const idUsuario = req.user!.id_usuario;
    const modulos = await modulosDelUsuario(idUsuario);
    if (modulos.length === 0) return res.status(200).json({ marcadas: 0 });

    const pendientes = await prismaClient.notificaciones.findMany({
        where: {
            modulo: { in: modulos },
            OR: [{ id_usuario: null }, { id_usuario: { not: idUsuario } }],
            lecturas: { none: { id_usuario: idUsuario } },
        },
        select: { id_notificacion: true },
    });

    if (pendientes.length > 0) {
        await prismaClient.notificaciones_leidas.createMany({
            data: pendientes.map((n) => ({ id_notificacion: n.id_notificacion, id_usuario: idUsuario })),
            skipDuplicates: true,
        });
    }

    res.status(200).json({ marcadas: pendientes.length });
};
