/**
 * Modulo `auth` - Servicio_Autenticacion (valida el JWT del colegio con el
 * `JWT_SECRET` compartido) + roles GDS propios resueltos en la BD dedicada.
 *
 * Politica fail-closed (Req. 24): solo una validacion exitosa concede acceso;
 * los fallos tecnicos deniegan y reintentan con backoff acotado; los tokens
 * criptograficamente invalidos o expirados deniegan (401) sin reintentar.
 */
import { env } from "../../config/env";
import { AlmacenRolesPrisma } from "./almacenRoles";
import {
    ServicioAutenticacionGDS,
    type OpcionesServicioAutenticacion,
    type ServicioAutenticacion,
} from "./servicioAutenticacion";
import { VerificadorJwtColegio } from "./verificadorJwt";

export const MODULE_NAME = "auth" as const;

export * from "./servicioAutenticacion";
export * from "./verificadorJwt";
export * from "./almacenRoles";

/**
 * Construye el Servicio_Autenticacion por defecto del servicio: verifica el JWT
 * del colegio con el `JWT_SECRET` compartido y resuelve los roles GDS contra la
 * PROPIA base de datos dedicada (Req. 24, 25.3).
 */
export function crearServicioAutenticacionPorDefecto(
    opciones?: OpcionesServicioAutenticacion
): ServicioAutenticacion {
    return new ServicioAutenticacionGDS(
        new VerificadorJwtColegio(env.jwtSecret),
        new AlmacenRolesPrisma(),
        opciones
    );
}
