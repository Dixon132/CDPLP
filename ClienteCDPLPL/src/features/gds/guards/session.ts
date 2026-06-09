// Lógica pura de sesión para la Plataforma_GDS.
//
// Se mantiene separada del componente guard para poder validarla de forma
// determinista (sin DOM ni router). NO depende del módulo IREC.

// Roles propios de la Plataforma_GDS (D5). La autorización autoritativa la
// resuelve el backend; estos valores permiten al frontend restringir vistas.
export const GDS_ROLES = Object.freeze({
    ADMIN_PLATAFORMA: 'ADMIN_PLATAFORMA',
    ANALISTA: 'ANALISTA',
    OBSERVADOR: 'OBSERVADOR',
} as const);

/** Rol GDS válido (valor de `GDS_ROLES`). */
export type GdsRol = (typeof GDS_ROLES)[keyof typeof GDS_ROLES];

/**
 * Payload de JWT tal como puede llegar del backend del colegio o del
 * `ServidorGDS`. Todos los campos son opcionales: el guard valida su presencia.
 */
export interface JwtPayload {
    /** Expiración estándar del JWT, en segundos desde epoch. */
    exp?: number;
    /** Rol GDS dedicado, si el backend lo emite. */
    gdsRol?: string;
    /** Rol del colegio: puede ser un string o un objeto `{ rol }`. */
    rol?: string | { rol?: string } | null;
    [clave: string]: unknown;
}

/**
 * Extrae el rol de un payload de JWT de forma tolerante a la estructura.
 * Soporta tanto `payload.rol` (string) como `payload.rol.rol` (objeto del
 * colegio) y `payload.gdsRol` (rol GDS dedicado, si el backend lo emite).
 */
export function rolDesdePayload(payload: JwtPayload | null | undefined): string | null {
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.gdsRol === 'string') return payload.gdsRol;
    if (typeof payload.rol === 'string') return payload.rol;
    if (payload.rol && typeof payload.rol === 'object' && typeof payload.rol.rol === 'string') {
        return payload.rol.rol;
    }
    return null;
}

/**
 * Determina si un payload de JWT representa una sesión válida y vigente.
 * Una sesión es válida si el payload existe y, cuando declara expiración
 * (`exp`, en segundos), ésta aún no ha vencido respecto a `ahora` (ms).
 *
 * @param payload Payload ya decodificado del JWT (o null si ilegible).
 * @param ahora Marca de tiempo actual en milisegundos.
 */
export function isSesionValida(
    payload: JwtPayload | null | undefined,
    ahora: number = Date.now(),
): boolean {
    if (!payload || typeof payload !== 'object') return false;
    if (typeof payload.exp === 'number' && payload.exp * 1000 < ahora) {
        return false;
    }
    return true;
}
