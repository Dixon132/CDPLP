/**
 * Decorador `@Roles(...)` para anotar el/los rol(es) GDS requeridos por un
 * handler o controlador (Req. 24.3, 24.4, 24.6, 40.6).
 *
 * El `RolesGuard` lee esta metadata y, fail-closed, deniega el acceso si el
 * contexto resuelto (rol GDS) no esta entre los permitidos. Ejemplos:
 *  - Operacion de escritura:  `@Roles(RolGDS.ADMIN_PLATAFORMA, RolGDS.ANALISTA)`
 *  - Operacion administrativa: `@Roles(RolGDS.ADMIN_PLATAFORMA)`
 */
import { SetMetadata } from '@nestjs/common';

import { RolGDS } from '../auth/servicioAutenticacion';

/** Clave de metadata bajo la que se almacenan los roles permitidos. */
export const ROLES_KEY = 'roles_gds';

/** Anota el conjunto de roles GDS autorizados para el endpoint. */
export const Roles = (...roles: RolGDS[]) => SetMetadata(ROLES_KEY, roles);
