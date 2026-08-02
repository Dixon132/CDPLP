/**
 * Categorías de auditoría/notificación.
 *
 * Cada valor debe tener un mapeo en `MODELO_A_MODULO`
 * (`Servidor/src/utils/auditContext.ts`) para que la auditoría automática sepa
 * a qué categoría pertenece cada modelo de Prisma. Quién puede VER las
 * notificaciones de cada módulo ya no es una matriz aparte por rol: se deriva
 * en vivo del permiso efectivo (`RECURSO_A_MODULO` en
 * `Servidor/src/modules/notificaciones/services/index.ts`), así que un rol
 * nuevo del catálogo dinámico queda bien enrutado sin tocar nada acá.
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
    PERMISOS = 'Roles y Permisos',
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
