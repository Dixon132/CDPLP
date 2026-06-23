import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { subirArchivo, eliminarArchivos, buildPublicUrl, moverArchivo } from "../../../utils/uploadS3";
import { enviarCorreoAceptacion, enviarCorreoRechazo } from "../../../utils/mailer";

// ──────────────────────────────────────────────────────────────
//  PÚBLICO — sin auth
// ──────────────────────────────────────────────────────────────

/** GET /api/postulaciones/verificar/:ci
 *  Devuelve si el CI ya existe como colegiado activo o postulación pendiente
 */
export const verificarCI = async (req: Request, res: Response) => {
    const ci = req.params.ci;
    const [colegiado, postulacion] = await Promise.all([
        prismaClient.colegiados.findUnique({ where: { carnet_identidad: ci } }),
        prismaClient.postulaciones.findFirst({
            where: { carnet_identidad: ci, estado: { in: ['EN_REVISION', 'ACTIVO'] } }
        }),
    ]);

    if (colegiado) {
        return res.json({ existe: true, tipo: 'colegiado', mensaje: 'Este carnet ya está registrado como colegiado.' });
    }
    if (postulacion) {
        return res.json({ existe: true, tipo: 'postulacion', estado: postulacion.estado, mensaje: 'Ya tienes una postulación en proceso.' });
    }
    return res.json({ existe: false });
};

/** GET /api/postulaciones/config-pago
 *  Devuelve la configuración de pago (QR, cuenta, etc.) para mostrar en el formulario
 */
export const getConfigPago = async (_req: Request, res: Response) => {
    const configs = await prismaClient.config_pago.findMany();
    const resultado: Record<string, string> = {};
    configs.forEach(c => { resultado[c.clave] = c.valor; });
    return res.json(resultado);
};

/** POST /api/postulaciones
 *  Crea una nueva postulación.
 *  Espera multipart/form-data con campos:
 *    - carnet_identidad, nombre, apellido, correo, telefono, especialidades
 *    - archivos con fieldname "documentos[]"  (múltiples)
 *    - archivo  con fieldname "comprobante"   (uno)
 */
export const crearPostulacion = async (req: Request, res: Response) => {
    try {
        const { carnet_identidad, nombre, apellido, correo, telefono, especialidades } = req.body;

        if (!carnet_identidad || !nombre || !apellido || !correo || !telefono) {
            return res.status(400).json({ error: "Faltan campos obligatorios." });
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const docsFiles: Express.Multer.File[] = files?.['documentos'] ?? [];
        const comprFiles: Express.Multer.File[] = files?.['comprobante'] ?? [];

        // Crear nombre de subcarpeta personalizado: iniciales + hash corto
        const iniciales = `${nombre.charAt(0).toUpperCase()}${apellido.charAt(0).toUpperCase()}`;
        const hash = Math.random().toString(36).substring(2, 6);
        const folderUser = `${iniciales}-${hash}`;

        // Subir documentos
        const rutasDocs: string[] = [];
        for (const f of docsFiles) {
            const ruta = await subirArchivo(f, `postulaciones/${folderUser}`);
            rutasDocs.push(ruta);
        }

        // Subir comprobante
        let rutaComprobante: string | null = null;
        if (comprFiles.length > 0) {
            rutaComprobante = await subirArchivo(comprFiles[0], `comprobantes/${folderUser}`);
        }

        const postulacion = await prismaClient.postulaciones.create({
            data: {
                carnet_identidad,
                nombre,
                apellido,
                correo,
                telefono,
                especialidades: especialidades ?? null,
                documentos: rutasDocs.join(','),
                comprobante_pago: rutaComprobante,
                estado: 'EN_REVISION',
            }
        });

        return res.status(201).json({ message: 'Postulación enviada correctamente. Te notificaremos por correo.', postulacion });
    } catch (error) {
        console.error("Error crearPostulacion:", error);
        return res.status(500).json({ error: "Error al procesar la postulación." });
    }
};

// ──────────────────────────────────────────────────────────────
//  ADMIN — con auth
// ──────────────────────────────────────────────────────────────

/** GET /api/postulaciones
 *  Lista postulaciones con filtro de estado y paginación
 */
export const getPostulaciones = async (req: Request, res: Response) => {
    const { estado, page = 1, limit = 15, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (estado) where.estado = estado;
    if (search) {
        where.OR = [
            { nombre: { contains: search, mode: 'insensitive' } },
            { apellido: { contains: search, mode: 'insensitive' } },
            { carnet_identidad: { contains: search, mode: 'insensitive' } },
            { correo: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [data, total] = await Promise.all([
        prismaClient.postulaciones.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
        prismaClient.postulaciones.count({ where }),
    ]);

    return res.json({ data, total, page: Number(page), totalPages: Math.ceil(total / take) });
};

/** GET /api/postulaciones/:id
 *  Detalle de una postulación
 */
export const getPostulacionById = async (req: Request, res: Response) => {
    const id = +req.params.id;
    const p = await prismaClient.postulaciones.findUnique({ where: { id_postulacion: id } });
    if (!p) return res.status(404).json({ error: "Postulación no encontrada." });

    // Expandir rutas a URLs completas
    const docUrls = (p.documentos ?? '').split(',').filter(Boolean).map(r => buildPublicUrl(r));
    const comprUrl = buildPublicUrl(p.comprobante_pago);
    return res.json({ ...p, doc_urls: docUrls, comprobante_url: comprUrl });
};

/** PATCH /api/postulaciones/:id/aceptar
 *  Acepta la postulación → crea colegiado, envía correo, cambia estado a ACTIVO
 */
export const aceptarPostulacion = async (req: Request, res: Response) => {
    const id = +req.params.id;
    try {
        const p = await prismaClient.postulaciones.findUnique({ where: { id_postulacion: id } });
        if (!p) return res.status(404).json({ error: "Postulación no encontrada." });
        if (p.estado === 'ACTIVO') return res.status(409).json({ error: "Ya fue aceptada." });

        const pin = String(Math.floor(1000 + Math.random() * 9000));

        // Crear colegiado
        const colegiado = await prismaClient.colegiados.create({
            data: {
                carnet_identidad: p.carnet_identidad,
                nombre: p.nombre,
                apellido: p.apellido,
                correo: p.correo,
                telefono: p.telefono,
                especialidades: p.especialidades ?? '',
                fecha_inscripcion: new Date(),
                estado: 'ACTIVO',
                pin_acceso: pin,
            }
        });

        // Obtener monto inicial
        const configMonto = await prismaClient.config_pago.findUnique({ where: { clave: 'MONTO_INICIAL' } });
        const montoBase = parseFloat(configMonto?.valor || '0');

        // Mover documentos y registrar en BD
        const docRutas = (p.documentos ?? '').split(',').filter(Boolean);
        const nuevasRutasDocs: string[] = [];
        
        // Extraer el nombre de la carpeta del usuario si existe, o usar uno nuevo
        const firstDoc = docRutas[0] || '';
        let folderUser = firstDoc.includes('/') ? firstDoc.split('/')[1] : '';
        if (!folderUser) {
            const iniciales = `${p.nombre.charAt(0).toUpperCase()}${p.apellido.charAt(0).toUpperCase()}`;
            const hash = Math.random().toString(36).substring(2, 6);
            folderUser = `${iniciales}-${hash}`;
        }

        for (const ruta of docRutas) {
            const fileName = ruta.split('/').pop() || '';
            const nuevaRuta = `colegiados/${folderUser}/${fileName}`;
            try {
                await moverArchivo(ruta, nuevaRuta);
                nuevasRutasDocs.push(nuevaRuta);
            } catch (err) {
                console.error("No se pudo mover el doc:", ruta);
                nuevasRutasDocs.push(ruta); // Fallback: usar la original si falla
            }
        }

        if (nuevasRutasDocs.length > 0) {
            await prismaClient.documentos_colegiados.createMany({
                data: nuevasRutasDocs.map((ruta, i) => ({
                    id_colegiado: colegiado.id_colegiado,
                    tipo_documento: `Requisito_${i + 1}`,
                    archivo: ruta,
                    fecha_entrega: new Date(),
                    estado: 'VIGENTE',
                }))
            });
        }

        // Mover comprobante y registrar Pago
        let nuevaRutaComprobante = null;
        if (p.comprobante_pago) {
            const fileName = p.comprobante_pago.split('/').pop() || '';
            nuevaRutaComprobante = `comprobantes/${folderUser}/${fileName}`;
            try {
                await moverArchivo(p.comprobante_pago, nuevaRutaComprobante);
            } catch (err) {
                console.error("No se pudo mover el comprobante:", p.comprobante_pago);
                nuevaRutaComprobante = p.comprobante_pago;
            }
        }

        // Registrar Pago
        await prismaClient.pagos_colegiados.create({
            data: {
                id_colegiado: colegiado.id_colegiado,
                concepto: 'Inscripción Inicial',
                fecha_pago: new Date(),
                monto: montoBase,
                estado_pago: 'REALIZADO',
                comprobante: nuevaRutaComprobante
            }
        });

        // Actualizar postulación
        await prismaClient.postulaciones.update({
            where: { id_postulacion: id },
            data: { 
                estado: 'ACTIVO',
                documentos: nuevasRutasDocs.join(','),
                comprobante_pago: nuevaRutaComprobante
            }
        });

        // Correo
        try {
            await enviarCorreoAceptacion({ correo: p.correo, nombre: p.nombre, apellido: p.apellido, pin });
        } catch (mailErr) {
            console.error("Error enviando correo de aceptación:", mailErr);
        }

        return res.json({ message: 'Postulación aceptada. Colegiado creado.', colegiado, pin_temporal: pin });
    } catch (error) {
        console.error("Error aceptarPostulacion:", error);
        return res.status(500).json({ error: "Error al aceptar la postulación." });
    }
};

/** PATCH /api/postulaciones/:id/rechazar
 *  Rechaza la postulación → elimina archivos de Supabase, envía correo, cambia estado a RECHAZADO
 */
export const rechazarPostulacion = async (req: Request, res: Response) => {
    const id = +req.params.id;
    const { motivo } = req.body;
    try {
        const p = await prismaClient.postulaciones.findUnique({ where: { id_postulacion: id } });
        if (!p) return res.status(404).json({ error: "Postulación no encontrada." });

        // Eliminar archivos de Supabase
        const docRutas = (p.documentos ?? '').split(',').filter(Boolean);
        const toDelete = [...docRutas];
        if (p.comprobante_pago) toDelete.push(p.comprobante_pago);
        await eliminarArchivos(toDelete);

        await prismaClient.postulaciones.update({
            where: { id_postulacion: id },
            data: { estado: 'RECHAZADO', motivo_rechazo: motivo ?? null, documentos: null, comprobante_pago: null }
        });

        try {
            await enviarCorreoRechazo({ correo: p.correo, nombre: p.nombre, apellido: p.apellido, motivo });
        } catch (mailErr) {
            console.error("Error enviando correo de rechazo:", mailErr);
        }

        return res.json({ message: 'Postulación rechazada y archivos eliminados.' });
    } catch (error) {
        console.error("Error rechazarPostulacion:", error);
        return res.status(500).json({ error: "Error al rechazar la postulación." });
    }
};

/** DELETE /api/postulaciones/:id
 *  Elimina definitivamente el registro de la BD (solo disponible si estado=RECHAZADO)
 */
export const eliminarPostulacion = async (req: Request, res: Response) => {
    const id = +req.params.id;
    try {
        const p = await prismaClient.postulaciones.findUnique({ where: { id_postulacion: id } });
        if (!p) return res.status(404).json({ error: "Postulación no encontrada." });

        // Si aún tiene archivos (por si acaso), eliminarlos
        const docRutas = (p.documentos ?? '').split(',').filter(Boolean);
        const toDelete = [...docRutas];
        if (p.comprobante_pago) toDelete.push(p.comprobante_pago);
        if (toDelete.length) await eliminarArchivos(toDelete);

        await prismaClient.postulaciones.delete({ where: { id_postulacion: id } });
        return res.json({ message: 'Postulación eliminada definitivamente.' });
    } catch (error) {
        console.error("Error eliminarPostulacion:", error);
        return res.status(500).json({ error: "Error al eliminar la postulación." });
    }
};

// ──────────────────────────────────────────────────────────────
//  CONFIG PAGO (admin)
// ──────────────────────────────────────────────────────────────

/** GET /api/postulaciones/admin/config-pago */
export const getConfigPagoAdmin = async (_req: Request, res: Response) => {
    const configs = await prismaClient.config_pago.findMany();
    const resultado: Record<string, string> = {};
    configs.forEach(c => { resultado[c.clave] = c.valor; });
    return res.json(resultado);
};

/** PUT /api/postulaciones/admin/config-pago
 *  Body: [{ clave, valor, descripcion }]
 */
export const upsertConfigPago = async (req: Request, res: Response) => {
    const items: { clave: string; valor: string; descripcion?: string }[] = req.body;
    try {
        const ops = items.map(item =>
            prismaClient.config_pago.upsert({
                where: { clave: item.clave },
                update: { valor: item.valor, descripcion: item.descripcion ?? null },
                create: { clave: item.clave, valor: item.valor, descripcion: item.descripcion ?? null },
            })
        );
        const result = await Promise.all(ops);
        return res.json(result);
    } catch (error) {
        console.error("Error upsertConfigPago:", error);
        return res.status(500).json({ error: "Error al guardar configuración." });
    }
};

/** POST /api/postulaciones/admin/upload-qr
 *  Sube imagen QR y actualiza config_pago
 */
export const uploadQr = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: "No se subió ningún archivo." });

        const rutaQR = await subirArchivo(file, 'config');
        
        await prismaClient.config_pago.upsert({
            where: { clave: 'QR' },
            update: { valor: rutaQR },
            create: { clave: 'QR', valor: rutaQR, descripcion: 'Ruta de la imagen QR' }
        });

        return res.json({ message: 'QR subido correctamente.', ruta: rutaQR });
    } catch (error) {
        console.error("Error uploadQr:", error);
        return res.status(500).json({ error: "Error al subir el QR." });
    }
};
