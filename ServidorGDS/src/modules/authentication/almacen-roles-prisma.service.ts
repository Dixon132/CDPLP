/**
 * Almacen de roles GDS respaldado por el `PrismaService` PROPIO del servicio
 * (NestJS-idiomatico, Req. 24.2, 25.3).
 *
 * El rol GDS de cada usuario se resuelve SIEMPRE contra la PROPIA base de datos
 * dedicada del servicio (`gds_usuario_plataforma` / `gds_rol_plataforma`),
 * NUNCA contra la base de datos del colegio (aislamiento total). El `idUsuario`
 * es el claim del JWT del colegio (referencia logica, sin FK ni acceso fisico
 * al esquema del colegio).
 *
 * Ante un fallo TECNICO de la BD (indisponibilidad / red) lanza
 * `ErrorTecnicoValidacion`, de modo que el Servicio_Autenticacion aplique la
 * politica fail-closed con reintentos y backoff acotado (Req. 24.7).
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
    ErrorTecnicoValidacion,
    resolverRolMayorPrivilegio,
    type AlmacenRoles,
    type RolGDS,
} from '../auth/servicioAutenticacion';

@Injectable()
export class AlmacenRolesPrismaService implements AlmacenRoles {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Devuelve el rol de mayor privilegio del usuario, o `null` si el usuario
     * no existe o no tiene ningun rol GDS asignado (sin acceso, ni de lectura).
     */
    async obtenerRol(idUsuario: string): Promise<RolGDS | null> {
        try {
            const usuario = await this.prisma.usuarioPlataforma.findUnique({
                where: { idUsuario },
                include: { roles: true },
            });
            if (!usuario || usuario.roles.length === 0) {
                return null;
            }
            return resolverRolMayorPrivilegio(usuario.roles.map((r) => r.rol));
        } catch (error) {
            // Indisponibilidad / fallo de red de la BD -> tecnico (reintentable).
            throw new ErrorTecnicoValidacion(
                error instanceof Error ? error.message : 'bd_no_disponible',
            );
        }
    }
}
