import prismaClient from "../../../utils/prismaClient";
import { Modulos } from "../../../types/auditoria";

/**
 * Módulos que puede ver cada rol.
 *
 * Es el equivalente en servidor de la navegación del cliente: una notificación
 * solo llega a quien tiene acceso al módulo que la originó. Debe mantenerse
 * alineado con `ClienteCDPLPL/src/layouts/navigation.js`.
 */
export const MODULOS_POR_ROL: Record<string, string[]> = {
    PRESIDENTE: Object.values(Modulos),
    VICEPRESIDENTE: [
        Modulos.USUARIOS, Modulos.COLEGIADOS, Modulos.CORRESPONDENCIA,
        Modulos.ACT_SOCIALES, Modulos.ACT_INSTITUCIONALES, Modulos.FINANCIERO,
        Modulos.POSTULACIONES, Modulos.MEMORIAS, Modulos.INSTITUCIONES, Modulos.CONFIGURACION,
    ],
    SECRETARIO_GENERAL: [
        Modulos.CORRESPONDENCIA, Modulos.ACT_SOCIALES,
        Modulos.ACT_INSTITUCIONALES, Modulos.FINANCIERO,
        Modulos.MEMORIAS, Modulos.INSTITUCIONES, Modulos.CONFIGURACION,
    ],
    SECRETARIO: [
        Modulos.CORRESPONDENCIA, Modulos.COLEGIADOS,
        Modulos.ACT_INSTITUCIONALES, Modulos.FINANCIERO,
        Modulos.POSTULACIONES, Modulos.MEMORIAS, Modulos.INSTITUCIONES, Modulos.CONFIGURACION,
    ],
    TESORERO: [Modulos.FINANCIERO, Modulos.CORRESPONDENCIA, Modulos.INSTITUCIONES, Modulos.CONFIGURACION],
    VOCAL: [
        Modulos.ACT_SOCIALES, Modulos.ACT_INSTITUCIONALES,
        Modulos.FINANCIERO, Modulos.CORRESPONDENCIA,
        Modulos.MEMORIAS, Modulos.INSTITUCIONES, Modulos.CONFIGURACION,
    ],
};

export const modulosDelRol = (rol?: string): string[] =>
    (rol && MODULOS_POR_ROL[rol]) || [];

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
