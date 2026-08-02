import prismaClient from "../../../utils/prismaClient";
import { Modulos } from "../../../types/auditoria";
import { resolverMapaPermisos } from "../../permisos/services/resolverPermiso";

/**
 * Qué recurso del catálogo de permisos granulares corresponde a cada módulo
 * de auditoría/notificaciones. Reemplaza a la vieja `MODULOS_POR_ROL`
 * hardcodeada por rol: aquella se desincronizaba con cualquier rol nuevo
 * creado desde el catálogo dinámico (`catalogo_roles`), porque nadie se
 * acordaba de agregarlo a mano acá. Ahora se deriva en vivo de
 * `usuario_permisos`/`rol_permisos`, así que un rol nuevo (o un override
 * individual) queda bien enrutado sin tocar este archivo.
 */
const RECURSO_A_MODULO: Record<string, Modulos> = {
    usuarios: Modulos.USUARIOS,
    colegiados: Modulos.COLEGIADOS,
    'colegiados.postulaciones': Modulos.POSTULACIONES,
    correspondencia: Modulos.CORRESPONDENCIA,
    'correspondencia.buzon': Modulos.CORRESPONDENCIA,
    actividades_sociales: Modulos.ACT_SOCIALES,
    actividades_institucionales: Modulos.ACT_INSTITUCIONALES,
    tesoreria: Modulos.FINANCIERO,
    memorias: Modulos.MEMORIAS,
    'ajustes.instituciones': Modulos.INSTITUCIONES,
    ajustes: Modulos.CONFIGURACION,
};

/**
 * Módulos de auditoría/notificaciones a los que este usuario tiene acceso
 * ahora mismo, resueltos desde su permiso efectivo (rol + overrides).
 */
export const modulosDelUsuario = async (idUsuario: number): Promise<string[]> => {
    const permisos = await resolverMapaPermisos(idUsuario);
    const modulos = new Set<string>();
    for (const [clave, nivel] of Object.entries(permisos)) {
        if (nivel === 'SIN_ACCESO') continue;
        const modulo = RECURSO_A_MODULO[clave];
        if (modulo) modulos.add(modulo);
    }
    return Array.from(modulos);
};

/**
 * Emite una notificación.
 *
 * Se guarda UNA fila, no una por destinatario: quién puede verla se resuelve al
 * consultar (por módulo y rol) y quién la ha leído vive en
 * `notificaciones_leidas`. Así añadir un usuario nuevo no exige rellenar nada.
 *
 * Nunca lanza: un fallo notificando no debe tumbar la operación de negocio que
 * la originó.
 */
export const emitirNotificacion = async (params: {
    modulo: string;
    titulo: string;
    descripcion?: string;
    enlace?: string;
    tipo?: 'info' | 'exito' | 'aviso' | 'error';
    idUsuario?: number;
}) => {
    try {
        return await prismaClient.notificaciones.create({
            data: {
                modulo: params.modulo,
                titulo: params.titulo.slice(0, 160),
                descripcion: params.descripcion,
                enlace: params.enlace,
                tipo: params.tipo ?? 'info',
                id_usuario: params.idUsuario,
            },
        });
    } catch (e) {
        console.error('No se pudo emitir la notificación:', e);
        return null;
    }
};
