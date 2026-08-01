/**
 * Categorías de auditoría/notificación.
 *
 * Cada valor debe tener un mapeo en `MODELO_A_MODULO`
 * (`Servidor/src/utils/auditContext.ts`) para que la auditoría automática sepa
 * a qué categoría pertenece cada modelo de Prisma, y debe mantenerse alineado
 * con `MODULOS_POR_ROL` (`Servidor/src/modules/notificaciones/services/index.ts`)
 * y con la navegación del cliente (`ClienteCDPLPL/src/layouts/navigation.js`).
 */
export enum Modulos {
    USUARIOS = 'Usuarios',
    FINANCIERO = 'Financiero',
    ACT_SOCIALES = 'Actividades Sociales',
    ACT_INSTITUCIONALES = 'Actividades Institucionales',
    COLEGIADOS = 'Colegiados',
    CORRESPONDENCIA = 'Correspondencia',
    POSTULACIONES = 'Postulaciones',
    INSTITUCIONES = 'Instituciones',
    MEMORIAS = 'Memorias',
    CONFIGURACION = 'Configuración',
}

/**
 * NOTA: unas ~6 filas de auditoría escritas antes de este cambio usan la
 * ortografía vieja sin tilde ('Modifico', 'Desactivo', 'Elimino', 'Registro').
 * No se migran (no vale la pena tocar la BD por 6 filas); el frontend de
 * Auditorías compara por palabra clave sin acentos, así que muestra bien
 * tanto lo viejo como lo nuevo.
 */
export enum Acciones {
    CREO = 'Creó',
    MODIFICO = 'Modificó',
    ACTIVO = 'Activó',
    DESACTIVO = 'Desactivó',
    ELIMINO = 'Eliminó',
    INICIO_SESION = 'Inició Sesión',
    REGISTRO = 'Registró',
    RECHAZO = 'Rechazó',
}
