import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { subirArchivo, eliminarArchivos, buildPublicUrl, moverArchivo } from "../../../utils/uploadS3";
import { enviarCorreoAceptacion, enviarCorreoRechazo } from "../../../utils/mailer";
import { registrarMovimientoPagoColegiatura } from "../../financiero/services/movimiento";
import { Origen } from "../../../types/movimientos";
import { describir } from "../../../utils/auditoria";
import { Modulos } from "../../../types/auditoria";
import { emitirNotificacion } from "../../notificaciones/services";

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
    configs.forEach(c => { 
        if (c.clave === 'QR' && c.valor) {
            resultado['qr_url'] = buildPublicUrl(c.valor) || c.valor;
        } else if (c.clave === 'INSTRUCCIONES') {
            resultado['instrucciones'] = c.valor;
        } else if (c.clave === 'CUENTA_BANCARIA') {
            resultado['cuenta_bancaria'] = c.valor;
        } else {
            resultado[c.clave.toLowerCase()] = c.valor; 
        }
    });
    return res.json(resultado);
};

/** Normaliza un nombre de documento para comparación:
 *  minúsculas, sin tildes, sin espacios múltiples, recortado.
 */
function normalizarNombre(nombre: string): string {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** POST /api/postulaciones
 *  Crea una nueva postulación.
 *  Espera multipart/form-data con campos:
 *    - carnet_identidad, nombre, apellido, correo, telefono, especialidades
 *    - archivos con fieldname "documentos[]"  (múltiples)
 *    - archivo  con fieldname "comprobante"   (uno)
 */
export const crearPostulacion = async (req: Request, res: Response) => {
    try {
        const { carnet_identidad, nombre, apellido, correo, telefono, especialidades, metodo_pago } = req.body;

        if (!carnet_identidad || !nombre || !apellido || !correo || !telefono) {
            return res.status(400).json({ error: "Faltan campos obligatorios." });
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const docsFiles: Express.Multer.File[] = files?.['documentos'] ?? [];
        const comprFiles: Express.Multer.File[] = files?.['comprobante'] ?? [];

        // ── Validación dinámica de documentos requeridos (REQ 10.6, 10.7) ──────
        const requeridos = await prismaClient.documentos_requeridos.findMany({
            where: { activo: true, es_opcional: false },
            orderBy: { orden: 'asc' },
        });

        // Los archivos subidos se identifican por su originalname normalizado sin la extensión
        const nombresSubidos = docsFiles.map(f => {
            const nameWithoutExt = f.originalname.includes('.') ? f.originalname.substring(0, f.originalname.lastIndexOf('.')) : f.originalname;
            return normalizarNombre(nameWithoutExt);
        });

        const faltantes = requeridos
            .filter(doc => !nombresSubidos.includes(normalizarNombre(doc.nombre)))
            .map(doc => doc.nombre);

        if (faltantes.length > 0) {
            return res.status(400).json({ error: "Documentos faltantes", faltantes });
        }
        // ────────────────────────────────────────────────────────────────────────

        // Crear nombre de subcarpeta personalizado: iniciales + hash corto
        const iniciales = `${nombre.charAt(0).toUpperCase()}${apellido.charAt(0).toUpperCase()}`;
        const hash = Math.random().toString(36).substring(2, 6);
        const folderUser = `${iniciales}-${hash}`;

        // Subir documentos
        const rutasDocs: { ruta: string, nombre: string }[] = [];
        for (const f of docsFiles) {
            const ruta = await subirArchivo(f, `postulaciones/${folderUser}`);
            const nombreDoc = f.originalname.includes('.') ? f.originalname.substring(0, f.originalname.lastIndexOf('.')) : f.originalname;
            rutasDocs.push({ ruta, nombre: nombreDoc });
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
                documentos: JSON.stringify(rutasDocs),
                comprobante_pago: rutaComprobante,
                metodo_pago: metodo_pago ?? null,
                estado: 'EN_REVISION',
            }
        });

        // Sin describir(): las postulaciones son públicas y no se auditan (solo se
        // registran acciones de usuarios autenticados dentro del dashboard).
        await emitirNotificacion({
            modulo: Modulos.POSTULACIONES,
            tipo: 'info',
            titulo: 'Nueva postulación recibida',
            descripcion: `${postulacion.nombre} ${postulacion.apellido} · CI ${postulacion.carnet_identidad}`,
            enlace: `/dashboard/postulaciones`,
            idUsuario: undefined,
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
    let docUrls: { url: string | null, nombre: string }[] = [];
    try {
        const parsed = JSON.parse(p.documentos || '[]');
        if (Array.isArray(parsed)) {
            docUrls = parsed.map(d => ({ url: buildPublicUrl(d.ruta), nombre: d.nombre }));
        }
    } catch (e) {
        const rutas = (p.documentos ?? '').split(',').filter(Boolean);
        docUrls = rutas.map((r, i) => ({ url: buildPublicUrl(r), nombre: `Requisito_${i + 1}` }));
    }
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
        let docRutas: { ruta: string, nombre: string }[] = [];
        let isJson = false;
        try {
            const parsed = JSON.parse(p.documentos || '[]');
            if (Array.isArray(parsed)) {
                docRutas = parsed;
                isJson = true;
            }
        } catch (e) {
            const rutas = (p.documentos ?? '').split(',').filter(Boolean);
            docRutas = rutas.map((r, i) => ({ ruta: r, nombre: `Requisito_${i + 1}` }));
        }

        const nuevasRutasDocs: { ruta: string, nombre: string }[] = [];
        
        // Extraer el nombre de la carpeta del usuario si existe, o usar uno nuevo
        const firstDoc = docRutas[0]?.ruta || '';
        let folderUser = firstDoc.includes('/') ? firstDoc.split('/')[1] : '';
        if (!folderUser) {
            const iniciales = `${p.nombre.charAt(0).toUpperCase()}${p.apellido.charAt(0).toUpperCase()}`;
            const hash = Math.random().toString(36).substring(2, 6);
            folderUser = `${iniciales}-${hash}`;
        }

        for (const doc of docRutas) {
            const fileName = doc.ruta.split('/').pop() || '';
            const nuevaRuta = `colegiados/${folderUser}/${fileName}`;
            try {
                await moverArchivo(doc.ruta, nuevaRuta);
                nuevasRutasDocs.push({ ruta: nuevaRuta, nombre: doc.nombre });
            } catch (err) {
                console.error("No se pudo mover el doc:", doc.ruta);
                nuevasRutasDocs.push({ ruta: doc.ruta, nombre: doc.nombre }); // Fallback: usar la original si falla
            }
        }

        if (nuevasRutasDocs.length > 0) {
            await prismaClient.documentos_colegiados.createMany({
                data: nuevasRutasDocs.map((doc) => ({
                    id_colegiado: colegiado.id_colegiado,
                    tipo_documento: doc.nombre,
                    archivo: doc.ruta,
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
        const pagoCreado = await prismaClient.pagos_colegiados.create({
            data: {
                id_colegiado: colegiado.id_colegiado,
                concepto: 'Inscripción Inicial',
                fecha_pago: new Date(),
                monto: montoBase,
                estado_pago: 'REALIZADO',
                comprobante: nuevaRutaComprobante,
                metodo_pago: p.metodo_pago
            }
        });

        const configPresupuesto = await prismaClient.config_pago.findUnique({
            where: { clave: 'PRESUPUESTO_ACTIVO' }
        });
        const activePresupuestoId = configPresupuesto ? Number(configPresupuesto.valor) : 1;

        await registrarMovimientoPagoColegiatura(pagoCreado.id_pago, montoBase, Origen.COLEGIATURA, `Inscripción inicial de ${colegiado.nombre} ${colegiado.apellido}`, activePresupuestoId, req.user!.id_usuario, p.metodo_pago ?? undefined, nuevaRutaComprobante ?? undefined);

        const origenModificado = await prismaClient.origen_movimiento.findFirst({
            where: { id_pago_colegiado: pagoCreado.id_pago },
            orderBy: { id_origen: 'desc' }
        });

        if (origenModificado) {
            await prismaClient.origen_movimiento.update({
                where: { id_origen: origenModificado.id_origen },
                data: { id_postulacion: p.id_postulacion }
            });
            await prismaClient.movimientos_financieros.updateMany({
                where: { id_origen: origenModificado.id_origen },
                data: { tipo_origen_label: 'POSTULACION' }
            });
        }

        // Actualizar postulación
        await prismaClient.postulaciones.update({
            where: { id_postulacion: id },
            data: { 
                estado: 'ACTIVO',
                documentos: isJson ? JSON.stringify(nuevasRutasDocs) : nuevasRutasDocs.map(d => d.ruta).join(','),
                comprobante_pago: nuevaRutaComprobante
            }
        });

        // Correo (Desactivado según requerimiento)
        /*
        try {
            await enviarCorreoAceptacion({ correo: p.correo, nombre: p.nombre, apellido: p.apellido, pin });
        } catch (mailErr) {
            console.error("Error enviando correo de aceptación:", mailErr);
        }
        */

        describir(res, `Aceptó la postulación de ${p.nombre} ${p.apellido} y creó el colegiado correspondiente`);
        await emitirNotificacion({
            modulo: Modulos.COLEGIADOS,
            tipo: 'exito',
            titulo: 'Postulación aceptada',
            descripcion: `${colegiado.nombre} ${colegiado.apellido} fue dado de alta como colegiado.`,
            enlace: '/dashboard/colegiados',
            idUsuario: req.user!.id_usuario,
        });
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

        await prismaClient.postulaciones.update({
            where: { id_postulacion: id },
            data: { estado: 'RECHAZADO', motivo_rechazo: motivo ?? null }
        });

        await emitirNotificacion({
            modulo: Modulos.POSTULACIONES,
            tipo: 'aviso',
            titulo: 'Postulación rechazada',
            descripcion: `${p.nombre} ${p.apellido} · CI ${p.carnet_identidad}`,
            enlace: '/dashboard/postulaciones',
            idUsuario: req.user!.id_usuario,
        });

        // Correo de rechazo (Desactivado según requerimiento)
        /*
        try {
            await enviarCorreoRechazo({ correo: p.correo, nombre: p.nombre, apellido: p.apellido, motivo });
        } catch (mailErr) {
            console.error("Error enviando correo de rechazo:", mailErr);
        }
        */

        describir(res, `Rechazó la postulación de ${p.nombre} ${p.apellido}${motivo ? `: ${motivo}` : ''}`);
        return res.json({ message: 'Postulación rechazada. Los archivos se mantienen.' });
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
        let docRutas: string[] = [];
        try {
            const parsed = JSON.parse(p.documentos || '[]');
            if (Array.isArray(parsed)) docRutas = parsed.map(d => d.ruta);
        } catch(e) {
            docRutas = (p.documentos ?? '').split(',').filter(Boolean);
        }
        const toDelete = [...docRutas];
        if (p.comprobante_pago) toDelete.push(p.comprobante_pago);
        if (toDelete.length) await eliminarArchivos(toDelete);

        await prismaClient.origen_movimiento.updateMany({
            where: { id_postulacion: id },
            data: { id_postulacion: null }
        });

        await prismaClient.postulaciones.delete({ where: { id_postulacion: id } });
        describir(res, `Eliminó definitivamente la postulación de ${p.nombre} ${p.apellido}`);
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
        describir(res, `Modificó la configuración de pago de postulaciones (${items.map(i => i.clave).join(', ')})`);
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

        const existingQR = await prismaClient.config_pago.findUnique({ where: { clave: 'QR' } });
        if (existingQR && existingQR.valor) {
            try {
                await eliminarArchivos([existingQR.valor]);
            } catch (e) {
                console.error("Error eliminando QR anterior:", e);
            }
        }

        const rutaQR = await subirArchivo(file, 'config');
        
        await prismaClient.config_pago.upsert({
            where: { clave: 'QR' },
            update: { valor: rutaQR },
            create: { clave: 'QR', valor: rutaQR, descripcion: 'Ruta de la imagen QR' }
        });

        describir(res, `Actualizó el código QR de pago para postulaciones`);
        return res.json({ message: 'QR subido correctamente.', ruta: rutaQR });
    } catch (error) {
        console.error("Error uploadQr:", error);
        return res.status(500).json({ error: "Error al subir el QR." });
    }
};
